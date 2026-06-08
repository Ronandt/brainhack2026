import json
import math
import os
from datetime import datetime, timedelta, timezone

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr
from botocore.config import Config

logger = Logger()
dynamodb = boto3.resource("dynamodb")
ses = boto3.client("ses", config=Config(connect_timeout=5, read_timeout=10, retries={"max_attempts": 2}))
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])
alerts_table = dynamodb.Table(os.environ["ALERTS_TABLE"])
hospitals_table = dynamodb.Table(os.environ.get("HOSPITALS_TABLE", "bloodline-hospitals-dev"))
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "")

# Surge tier radii in km. island-wide = no distance filter (everyone).
TIER_RADIUS_KM = {"5km": 5.0, "15km": 15.0, "island-wide": None}
# A live device fix older than this falls back to the donor's home location.
LIVE_FIX_FRESHNESS_HOURS = 3


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two lat/lng points, in km."""
    r = 6371.0
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (math.sin(d_phi / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lambda / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


def _effective_location(donor: dict) -> tuple[float, float] | None:
    """Freshest known donor location: a recent live fix, else home. None if unknown."""
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
    """Reference points for radius tiers: every hospital/blood bank with coordinates."""
    items = hospitals_table.scan(ProjectionExpression="lat, lng").get("Items", [])
    coords = []
    for h in items:
        if h.get("lat") is not None and h.get("lng") is not None:
            coords.append((float(h["lat"]), float(h["lng"])))
    return coords


def _within_radius(donor: dict, banks: list[tuple[float, float]], radius_km: float) -> bool:
    """True if the donor's effective location is within radius_km of any blood bank."""
    loc = _effective_location(donor)
    if loc is None:
        return False  # unknown location → not matched for narrow tiers
    dlat, dlng = loc
    return any(_haversine_km(dlat, dlng, blat, blng) <= radius_km for blat, blng in banks)


def _scan_all(filter_expr=None) -> list:
    """Scan the donors table fully, following pagination (1MB page cap).

    Pass filter_expr=None to return every donor (used for island-wide surges).
    """
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
    for record in event.get("Records", []):
        message = json.loads(record["Sns"]["Message"])
        _dispatch_notifications(message)
    return {"statusCode": 200}


def _dispatch_notifications(message: dict) -> None:
    alert_id = message["alertId"]
    # Accept a list of blood types (bloodTypes) or a single one (bloodType, legacy)
    blood_types = message.get("bloodTypes")
    if not blood_types:
        single = message.get("bloodType")
        blood_types = [single] if single else []
    geo_tier = message["geoTier"]
    blood_label = "/".join(blood_types) if blood_types else "blood"
    alert_message = message.get("message") or f"Urgent: {blood_label} blood needed!"

    logger.info("Dispatching notifications", alert_id=alert_id, blood_types=blood_types, geo_tier=geo_tier)

    # Match the donor-app banner: an island-wide surge reaches every donor,
    # narrower tiers are scoped to the requested blood types. We don't exclude
    # donors in their rest window (the app surfaces the surge to them too so they
    # can rally others), and `eligible` is computed at read-time, never stored,
    # so it can't be used as a scan filter.
    if geo_tier == "island-wide":
        donors = _scan_all()
    else:
        type_filter = None
        for bt in blood_types:
            cond = Attr("bloodType").eq(bt)
            type_filter = cond if type_filter is None else (type_filter | cond)
        donors = _scan_all(type_filter)

    # Geo radius filter for narrow tiers: keep donors within N km of any blood bank
    # (freshest of live device location or geocoded home). island-wide skips this.
    radius_km = TIER_RADIUS_KM.get(geo_tier)
    if radius_km is not None:
        banks = _hospital_coords()
        before = len(donors)
        if banks:
            donors = [d for d in donors if _within_radius(d, banks, radius_km)]
        else:
            logger.warning("No hospital coordinates available — radius filter skipped", alert_id=alert_id)
        logger.info("Radius filter applied", alert_id=alert_id, radius_km=radius_km, banks=len(banks), before=before, after=len(donors))

    logger.info("Donors matched for surge", alert_id=alert_id, blood_types=blood_types, geo_tier=geo_tier, matched=len(donors))

    # Every matched donor is moved into surge mode and sees the in-app alert
    # banner (the donor app polls /surge/monitor), so they all count as notified.
    # Email + push are supplementary channels, tracked separately.
    notified = len(donors)
    emails_sent = 0
    push_sent = 0
    for donor in donors:
        push_token = donor.get("pushToken")
        if push_token:
            _send_push(push_token, blood_label, alert_message, alert_id)
            push_sent += 1

        email = donor.get("email")
        if email and _send_email(email, blood_label, alert_message, alert_id):
            emails_sent += 1

    # Update alert with notification counts (surfaced live on the HSA console + donor site)
    alerts_table.update_item(
        Key={"alertId": alert_id},
        UpdateExpression="SET donorsNotified = :n, emailsSent = :e, pushSent = :p, lastUpdated = :t",
        ExpressionAttributeValues={
            ":n": notified,
            ":e": emails_sent,
            ":p": push_sent,
            ":t": datetime.utcnow().isoformat(),
        },
    )

    logger.info("Notifications dispatched", alert_id=alert_id, notified=notified, emails=emails_sent, push=push_sent)


def _send_push(push_token: str, blood_type: str, message: str, alert_id: str) -> None:
    """
    Push notification stub. In production: integrate AWS SNS mobile push or Expo push API.
    For hackathon: log the intent; wire up the real push service before demo.
    """
    logger.info(
        "Push notification queued",
        push_token=push_token[:8] + "...",
        blood_type=blood_type,
        alert_id=alert_id,
        message=message,
    )
    # TODO: Replace with real push delivery:
    # sns_client.publish(TargetArn=push_token, Message=message, ...)
    # or: requests.post("https://exp.host/--/api/v2/push/send", ...)


def _send_email(email: str, blood_type: str, message: str, alert_id: str) -> bool:
    """Send a surge alert email to a donor via SES. Returns True on success."""
    if not SENDER_EMAIL:
        logger.warning("SENDER_EMAIL not configured — skipping email", alert_id=alert_id)
        return False

    subject = f"Urgent: {blood_type} blood needed — Bloodline surge alert"
    body_text = (
        f"{message}\n\n"
        f"You're receiving this because you're a registered {blood_type} donor and HSA has "
        f"activated a surge alert. If you're eligible, please open the Bloodline app to book a "
        f"slot. You can opt out of surge alerts in Profile -> Notifications."
    )

    try:
        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body_text}},
            },
        )
        logger.info("Surge email sent", alert_id=alert_id, blood_type=blood_type)
        return True
    except Exception:
        logger.exception("Failed to send surge email", alert_id=alert_id)
        return False
