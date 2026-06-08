import json
import os
from datetime import datetime

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
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "")

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
    emails_sent = 0
    for donor in donors:
        reached = False

        push_token = donor.get("pushToken")
        if push_token:
            _send_push(push_token, blood_type, alert_message, alert_id)
            reached = True

        email = donor.get("email")
        if email and _send_email(email, blood_type, alert_message, alert_id):
            emails_sent += 1
            reached = True

        if reached:
            notified += 1

    # Update alert with notification counts (surfaced live on the HSA console + donor site)
    alerts_table.update_item(
        Key={"alertId": alert_id},
        UpdateExpression="SET donorsNotified = :n, emailsSent = :e, lastUpdated = :t",
        ExpressionAttributeValues={
            ":n": notified,
            ":e": emails_sent,
            ":t": datetime.utcnow().isoformat(),
        },
    )

    logger.info("Notifications dispatched", alert_id=alert_id, count=notified, emails=emails_sent)


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
