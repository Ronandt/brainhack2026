import json
import os
from datetime import datetime, timedelta, timezone

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
dynamodb = boto3.resource("dynamodb")
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])
donations_table = dynamodb.Table(os.environ["DONATIONS_TABLE"])

# Singapore HSA eligibility: whole blood donors must wait 56 days between donations
ELIGIBILITY_DAYS = 56


def _donor_id_from_event(event: dict) -> str:
    return event["requestContext"]["authorizer"]["claims"]["sub"]


def _compute_eligibility(last_donated_at: str | None) -> dict:
    if not last_donated_at:
        return {"eligible": True, "daysUntilEligible": 0, "nextEligibleDate": None}

    last_date = datetime.fromisoformat(last_donated_at)
    next_eligible = last_date + timedelta(days=ELIGIBILITY_DAYS)
    today = datetime.now(timezone.utc)
    days_remaining = max(0, (next_eligible - today).days)

    return {
        "eligible": days_remaining == 0,
        "daysUntilEligible": days_remaining,
        "nextEligibleDate": next_eligible.date().isoformat(),
    }


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    method = event["httpMethod"]
    donor_id = _donor_id_from_event(event)

    if method == "GET":
        return _get_donor(donor_id)
    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        return _update_donor(donor_id, body)

    return _response(405, {"error": "Method not allowed"})


def _get_donor(donor_id: str) -> dict:
    result = donors_table.get_item(Key={"donorId": donor_id})
    donor = result.get("Item")

    if not donor:
        return _response(404, {"error": "Donor profile not found"})

    eligibility = _compute_eligibility(donor.get("lastDonatedAt"))
    donor.update(eligibility)

    # Fetch donation count for badge tier
    donations = donations_table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("donorId").eq(donor_id)
    )
    count = donations["Count"]
    donor["totalDonations"] = count
    donor["badgeTier"] = _badge_tier(count)

    logger.info("Donor profile fetched", donor_id=donor_id)
    return _response(200, donor)


def _update_donor(donor_id: str, body: dict) -> dict:
    allowed_fields = {"name", "bloodType", "postalCode", "pushToken", "lastDonatedAt", "department", "phone"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}

    if not updates:
        return _response(400, {"error": "No valid fields to update"})

    expr_parts = [f"#{k} = :{k}" for k in updates]
    expression = "SET " + ", ".join(expr_parts)
    attr_names = {f"#{k}": k for k in updates}
    attr_values = {f":{k}": v for k, v in updates.items()}
    attr_values[":updatedAt"] = datetime.utcnow().isoformat()
    expr_parts.append("#updatedAt = :updatedAt")
    attr_names["#updatedAt"] = "updatedAt"
    expression = "SET " + ", ".join(expr_parts)

    donors_table.update_item(
        Key={"donorId": donor_id},
        UpdateExpression=expression,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
    )

    logger.info("Donor profile updated", donor_id=donor_id, fields=list(updates.keys()))
    return _response(200, {"message": "Profile updated"})


def _badge_tier(count: int) -> str:
    if count >= 100:
        return "honorary"
    if count >= 50:
        return "gold"
    if count >= 25:
        return "silver"
    if count >= 10:
        return "bronze"
    return "none"
