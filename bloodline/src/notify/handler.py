import json
import os
from datetime import datetime

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr

logger = Logger()
dynamodb = boto3.resource("dynamodb")
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])
alerts_table = dynamodb.Table(os.environ["ALERTS_TABLE"])

# Geo tier radius mapping (km) — used for filtering by postalCode prefix heuristic
GEO_TIER_RADIUS = {"5km": 1, "15km": 2, "island-wide": None}


def _postal_prefix_length(geo_tier: str) -> int | None:
    """Simple postal code prefix heuristic for geo filtering (Singapore 6-digit codes)."""
    return GEO_TIER_RADIUS.get(geo_tier)


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    for record in event.get("Records", []):
        message = json.loads(record["Sns"]["Message"])
        _dispatch_notifications(message)
    return {"statusCode": 200}


def _dispatch_notifications(message: dict) -> None:
    alert_id = message["alertId"]
    blood_type = message["bloodType"]
    geo_tier = message["geoTier"]
    alert_message = message.get("message", f"Urgent: {blood_type} blood needed!")

    logger.info("Dispatching notifications", alert_id=alert_id, blood_type=blood_type, geo_tier=geo_tier)

    # Scan for eligible donors matching blood type
    filter_expr = Attr("bloodType").eq(blood_type) & Attr("eligible").eq(True)
    result = donors_table.scan(FilterExpression=filter_expr)
    donors = result.get("Items", [])

    # TODO: add geo filtering by postal code when location data is populated
    # For hackathon: island-wide always matches, narrower tiers use postal prefix heuristic

    notified = 0
    for donor in donors:
        push_token = donor.get("pushToken")
        if push_token:
            _send_push(push_token, blood_type, alert_message, alert_id)
            notified += 1

    # Update alert with notification count
    alerts_table.update_item(
        Key={"alertId": alert_id},
        UpdateExpression="SET donorsNotified = :n, lastUpdated = :t",
        ExpressionAttributeValues={
            ":n": notified,
            ":t": datetime.utcnow().isoformat(),
        },
    )

    logger.info("Notifications dispatched", alert_id=alert_id, count=notified)


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
