import json
import math
import os
import uuid
from datetime import datetime, timedelta, timezone

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr

logger = Logger()
dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")
alerts_table = dynamodb.Table(os.environ["ALERTS_TABLE"])
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])
hospitals_table = dynamodb.Table(os.environ.get("HOSPITALS_TABLE", "bloodline-hospitals-dev"))
SURGE_ALERT_TOPIC = os.environ["SURGE_ALERT_TOPIC"]

GEO_TIERS = ["5km", "15km", "island-wide"]
# Must mirror notify/handler.py — the preview count below uses the same rules
# the notify Lambda uses when it actually dispatches.
TIER_RADIUS_KM = {"5km": 5.0, "15km": 15.0, "island-wide": None}
LIVE_FIX_FRESHNESS_HOURS = 3


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def _is_hsa_admin(event: dict) -> bool:
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    groups = claims.get("cognito:groups", "")
    return "HSAAdmin" in groups


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (math.sin(d_phi / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lambda / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


def _effective_location(donor: dict) -> tuple[float, float] | None:
    live_seen = donor.get("liveSeenAt")
    if live_seen and donor.get("liveLat") is not None and donor.get("liveLng") is not None:
        try:
            seen = datetime.fromisoformat(live_seen)
            if seen.tzinfo is None:
                seen = seen.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - seen <= timedelta(hours=LIVE_FIX_FRESHNESS_HOURS):
                return float(donor["liveLat"]), float(donor["liveLng"])
        except ValueError:
            pass
    if donor.get("homeLat") is not None and donor.get("homeLng") is not None:
        return float(donor["homeLat"]), float(donor["homeLng"])
    return None


def _hospital_coords() -> list[tuple[float, float]]:
    items = hospitals_table.scan(ProjectionExpression="lat, lng").get("Items", [])
    return [(float(h["lat"]), float(h["lng"])) for h in items
            if h.get("lat") is not None and h.get("lng") is not None]


def _within_radius(donor: dict, banks: list[tuple[float, float]], radius_km: float) -> bool:
    loc = _effective_location(donor)
    if loc is None:
        return False
    dlat, dlng = loc
    return any(_haversine_km(dlat, dlng, blat, blng) <= radius_km for blat, blng in banks)


def _scan_all(filter_expr=None) -> list:
    items = []
    kwargs = {"FilterExpression": filter_expr} if filter_expr is not None else {}
    while True:
        result = donors_table.scan(**kwargs)
        items.extend(result.get("Items", []))
        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            return items
        kwargs["ExclusiveStartKey"] = last_key


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    method = event["httpMethod"]
    path = event.get("path", "")

    if method == "POST" and "/end" in path:
        alert_id = (event.get("pathParameters") or {}).get("alertId")
        return _end_surge(event, alert_id)
    if method == "POST":
        return _activate_surge(event)
    if method == "GET" and "/reach" in path:
        return _preview_reach(event)
    if method == "GET":
        return _monitor_surge(event)

    return _response(405, {"error": "Method not allowed"})


def _preview_reach(event: dict) -> dict:
    """Dry-run the notify matching (blood type + radius) and return the donor count.

    Lets the HSA console show a real projected reach before activating.
    """
    if not _is_hsa_admin(event):
        return _response(403, {"error": "HSA admin access required"})

    params = event.get("queryStringParameters") or {}
    geo_tier = params.get("geoTier", "island-wide")
    blood_types = [bt for bt in (params.get("bloodTypes") or "").split(",") if bt]

    if geo_tier not in GEO_TIERS:
        return _response(400, {"error": f"geoTier must be one of {GEO_TIERS}"})

    # A surge always targets its blood type(s); the tier only adds a radius below.
    if not blood_types:
        return _response(200, {"notified": 0, "geoTier": geo_tier})
    type_filter = None
    for bt in blood_types:
        cond = Attr("bloodType").eq(bt)
        type_filter = cond if type_filter is None else (type_filter | cond)
    donors = _scan_all(type_filter)

    radius_km = TIER_RADIUS_KM.get(geo_tier)
    banks = []
    if radius_km is not None:
        banks = _hospital_coords()
        if banks:
            donors = [d for d in donors if _within_radius(d, banks, radius_km)]

    return _response(200, {"notified": len(donors), "geoTier": geo_tier, "banks": len(banks)})


def _activate_surge(event: dict) -> dict:
    # Break-glass: require HSA admin group. Single-officer activation — no dual sign-off.
    if not _is_hsa_admin(event):
        return _response(403, {"error": "HSA admin access required to activate surge alerts"})

    body = json.loads(event.get("body") or "{}")

    # Accept a list of blood types (bloodTypes) or a single one (bloodType, legacy)
    blood_types = body.get("bloodTypes")
    if not blood_types:
        single = body.get("bloodType")
        blood_types = [single] if single else []
    # de-dupe while preserving order
    blood_types = list(dict.fromkeys(bt for bt in blood_types if bt))

    geo_tier = body.get("geoTier", "island-wide")
    message = body.get("message", "")

    if not blood_types:
        return _response(400, {"error": "At least one bloodType is required"})
    if geo_tier not in GEO_TIERS:
        return _response(400, {"error": f"geoTier must be one of {GEO_TIERS}"})

    alert_id = str(uuid.uuid4())
    activated_by = event["requestContext"]["authorizer"]["claims"]["sub"]
    now = datetime.utcnow().isoformat()
    blood_type_label = ", ".join(blood_types)

    alert = {
        "alertId": alert_id,
        "bloodTypes": blood_types,
        "bloodType": blood_type_label,  # display / backward-compat
        "geoTier": geo_tier,
        "message": message,
        "status": "active",
        "activatedBy": activated_by,
        "activatedAt": now,
        "donorsNotified": 0,
        "emailsSent": 0,
        "responses": 0,
        "bookings": 0,
    }

    alerts_table.put_item(Item=alert)

    # Publish to SNS — NotifyFunction picks this up
    sns.publish(
        TopicArn=SURGE_ALERT_TOPIC,
        Message=json.dumps({
            "alertId": alert_id,
            "bloodTypes": blood_types,
            "geoTier": geo_tier,
            "message": message,
        }),
        Subject=f"SURGE ALERT — {blood_type_label} blood needed",
        MessageAttributes={
            "bloodTypes": {"DataType": "String", "StringValue": blood_type_label},
            "geoTier": {"DataType": "String", "StringValue": geo_tier},
        },
    )

    logger.info("Surge alert activated", alert_id=alert_id, blood_types=blood_types, geo_tier=geo_tier)
    return _response(201, {"alertId": alert_id, "status": "active", "bloodTypes": blood_types, "message": "Surge alert activated and notifications dispatched"})


def _end_surge(event: dict, alert_id: str) -> dict:
    if not _is_hsa_admin(event):
        return _response(403, {"error": "HSA admin access required"})
    if not alert_id:
        return _response(400, {"error": "alertId is required"})

    ended_by = event["requestContext"]["authorizer"]["claims"]["sub"]
    now = datetime.utcnow().isoformat()

    alerts_table.update_item(
        Key={"alertId": alert_id},
        UpdateExpression="SET #s = :s, endedBy = :e, endedAt = :t",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "ended", ":e": ended_by, ":t": now},
    )

    logger.info("Surge alert ended", alert_id=alert_id, ended_by=ended_by)
    return _response(200, {"alertId": alert_id, "status": "ended"})


def _monitor_surge(event: dict) -> dict:
    # List all active alerts with live metrics
    result = alerts_table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr("status").eq("active")
    )
    alerts = result.get("Items", [])

    for alert in alerts:
        for key in ("donorsNotified", "emailsSent", "responses", "bookings"):
            if key in alert:
                alert[key] = int(alert[key])

    return _response(200, {"activeAlerts": alerts, "count": len(alerts)})
