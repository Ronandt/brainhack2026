import json
import os
import uuid
from datetime import datetime

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")
alerts_table = dynamodb.Table(os.environ["ALERTS_TABLE"])
SURGE_ALERT_TOPIC = os.environ["SURGE_ALERT_TOPIC"]

GEO_TIERS = ["5km", "15km", "island-wide"]


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


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    method = event["httpMethod"]

    if method == "POST":
        return _activate_surge(event)
    if method == "GET":
        return _monitor_surge(event)

    return _response(405, {"error": "Method not allowed"})


def _activate_surge(event: dict) -> dict:
    # Break-glass: require HSA admin group
    if not _is_hsa_admin(event):
        return _response(403, {"error": "HSA admin access required to activate surge alerts"})

    body = json.loads(event.get("body") or "{}")
    blood_type = body.get("bloodType")
    geo_tier = body.get("geoTier", "island-wide")
    message = body.get("message", "")
    approver_id = body.get("approverId")  # dual sign-off: second HSA officer

    if not blood_type:
        return _response(400, {"error": "bloodType is required"})
    if geo_tier not in GEO_TIERS:
        return _response(400, {"error": f"geoTier must be one of {GEO_TIERS}"})
    if not approver_id:
        return _response(400, {"error": "approverId required for dual sign-off"})

    alert_id = str(uuid.uuid4())
    activated_by = event["requestContext"]["authorizer"]["claims"]["sub"]
    now = datetime.utcnow().isoformat()

    alert = {
        "alertId": alert_id,
        "bloodType": blood_type,
        "geoTier": geo_tier,
        "message": message,
        "status": "active",
        "activatedBy": activated_by,
        "approverId": approver_id,
        "activatedAt": now,
        "donorsNotified": 0,
        "responses": 0,
        "bookings": 0,
    }

    alerts_table.put_item(Item=alert)

    # Publish to SNS — NotifyFunction picks this up
    sns.publish(
        TopicArn=SURGE_ALERT_TOPIC,
        Message=json.dumps({
            "alertId": alert_id,
            "bloodType": blood_type,
            "geoTier": geo_tier,
            "message": message,
        }),
        Subject=f"SURGE ALERT — {blood_type} blood needed",
        MessageAttributes={
            "bloodType": {"DataType": "String", "StringValue": blood_type},
            "geoTier": {"DataType": "String", "StringValue": geo_tier},
        },
    )

    logger.info("Surge alert activated", alert_id=alert_id, blood_type=blood_type, geo_tier=geo_tier)
    return _response(201, {"alertId": alert_id, "status": "active", "message": "Surge alert activated and notifications dispatched"})


def _monitor_surge(event: dict) -> dict:
    # List all active alerts with live metrics
    result = alerts_table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr("status").eq("active")
    )
    alerts = result.get("Items", [])

    for alert in alerts:
        for key in ("donorsNotified", "responses", "bookings"):
            if key in alert:
                alert[key] = int(alert[key])

    return _response(200, {"activeAlerts": alerts, "count": len(alerts)})
