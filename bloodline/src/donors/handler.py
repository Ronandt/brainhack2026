import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
dynamodb = boto3.resource("dynamodb")
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])
donations_table = dynamodb.Table(os.environ["DONATIONS_TABLE"])

# Singapore HSA whole-blood donation interval: 12 weeks (84 days / ~3 months) for all donors
ELIGIBILITY_DAYS = {"male": 84, "female": 84}
ELIGIBILITY_DAYS_DEFAULT = 84

ONEMAP_SEARCH = "https://www.onemap.gov.sg/api/common/elastic/search"


def _geocode_postal(postal_code: str) -> tuple[float | None, float | None]:
    """Geocode a Singapore postal code to (lat, lng) via OneMap (public, no key).

    Returns (None, None) on any failure so a bad postal code never blocks a save.
    """
    try:
        qs = urllib.parse.urlencode({
            "searchVal": str(postal_code), "returnGeom": "Y",
            "getAddrDetails": "N", "pageNum": 1,
        })
        req = urllib.request.Request(f"{ONEMAP_SEARCH}?{qs}", headers={"User-Agent": "bloodline"})
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310 (trusted host)
            data = json.loads(resp.read().decode())
        results = data.get("results") or []
        if results:
            return float(results[0]["LATITUDE"]), float(results[0]["LONGITUDE"])
    except Exception:
        logger.exception("OneMap geocode failed", postal_code=postal_code)
    return None, None


def _donor_id_from_event(event: dict) -> str:
    return event["requestContext"]["authorizer"]["claims"]["sub"]


def _email_from_event(event: dict) -> str | None:
    return event["requestContext"]["authorizer"]["claims"].get("email")


def _compute_eligibility(last_donated_at: str | None, gender: str | None = None) -> dict:
    wait_days = ELIGIBILITY_DAYS.get((gender or "").lower(), ELIGIBILITY_DAYS_DEFAULT)

    if not last_donated_at:
        return {
            "eligible": True, "daysUntilEligible": 0,
            "nextEligibleDate": None, "donationIntervalDays": wait_days,
        }

    last_date = datetime.fromisoformat(last_donated_at)
    next_eligible = last_date + timedelta(days=wait_days)
    today = datetime.now(timezone.utc)
    days_remaining = max(0, (next_eligible - today).days)

    return {
        "eligible": days_remaining == 0,
        "daysUntilEligible": days_remaining,
        "nextEligibleDate": next_eligible.date().isoformat(),
        "donationIntervalDays": wait_days,
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
    email = _email_from_event(event)

    if method == "GET":
        return _get_donor(donor_id, email)
    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        return _update_donor(donor_id, body, email)

    return _response(405, {"error": "Method not allowed"})


def _get_donor(donor_id: str, email: str | None = None) -> dict:
    result = donors_table.get_item(Key={"donorId": donor_id})
    donor = result.get("Item")

    if not donor:
        return _response(404, {"error": "Donor profile not found"})

    # Backfill the donor's email from their Cognito identity so surge alerts can
    # reach them, even for profiles created before email was captured.
    if email and donor.get("email") != email:
        donors_table.update_item(
            Key={"donorId": donor_id},
            UpdateExpression="SET email = :e",
            ExpressionAttributeValues={":e": email},
        )
        donor["email"] = email

    eligibility = _compute_eligibility(donor.get("lastDonatedAt"), donor.get("gender"))
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


def _update_donor(donor_id: str, body: dict, email: str | None = None) -> dict:
    allowed_fields = {"name", "bloodType", "postalCode", "pushToken", "pushSubscription", "lastDonatedAt", "department", "phone", "email", "gender"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}

    # Always keep the donor's contact email in sync with their Cognito identity
    # so surge alerts can reach them, even if the client didn't send it.
    if email:
        updates.setdefault("email", email)

    # Geocode the home postal code to coordinates (used as the fallback location
    # for surge radius filtering when no recent live fix exists).
    if updates.get("postalCode"):
        lat, lng = _geocode_postal(updates["postalCode"])
        if lat is not None and lng is not None:
            updates["homeLat"] = Decimal(str(lat))
            updates["homeLng"] = Decimal(str(lng))

    # Live device location from the browser Geolocation API, stamped server-side.
    live_lat, live_lng = body.get("liveLat"), body.get("liveLng")
    if live_lat is not None and live_lng is not None:
        updates["liveLat"] = Decimal(str(live_lat))
        updates["liveLng"] = Decimal(str(live_lng))
        updates["liveSeenAt"] = datetime.now(timezone.utc).isoformat()

    if not updates:
        return _response(400, {"error": "No valid fields to update"})

    expr_parts = [f"#{k} = :{k}" for k in updates]
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
