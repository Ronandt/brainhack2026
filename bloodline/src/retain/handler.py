import json
import os
from datetime import datetime
from collections import defaultdict

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Key

logger = Logger()
dynamodb = boto3.resource("dynamodb")
donations_table = dynamodb.Table(os.environ["DONATIONS_TABLE"])
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])

BADGE_TIERS = [
    {"name": "honorary", "threshold": 100, "label": "Honorary Donor"},
    {"name": "gold", "threshold": 50, "label": "Gold Donor"},
    {"name": "silver", "threshold": 25, "label": "Silver Donor"},
    {"name": "bronze", "threshold": 10, "label": "Bronze Donor"},
]

# Average volume per whole blood donation (ml)
ML_PER_DONATION = 450
# Approximate patients helped per unit (1 donation → ~3 components)
PATIENTS_PER_DONATION = 3


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def _donor_id_from_event(event: dict) -> str:
    return event["requestContext"]["authorizer"]["claims"]["sub"]


def _compute_badge(count: int) -> dict:
    for tier in BADGE_TIERS:
        if count >= tier["threshold"]:
            return {"tier": tier["name"], "label": tier["label"], "achieved": True}

    # Progress toward next badge
    next_tier = next((t for t in reversed(BADGE_TIERS) if count < t["threshold"]), BADGE_TIERS[-1])
    return {
        "tier": "none",
        "label": "New Donor",
        "achieved": False,
        "nextBadge": next_tier["label"],
        "donationsToNext": next_tier["threshold"] - count,
    }


def _build_history_chart(donations: list[dict]) -> list[dict]:
    """Aggregate donations by year for the annual history chart."""
    by_year: dict[str, int] = defaultdict(int)
    for d in donations:
        year = d.get("donatedAt", "")[:4]
        if year:
            by_year[year] += 1
    return [{"year": y, "count": c} for y, c in sorted(by_year.items())]


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    donor_id = _donor_id_from_event(event)

    result = donations_table.query(
        KeyConditionExpression=Key("donorId").eq(donor_id),
        ScanIndexForward=False,
    )
    donations = result.get("Items", [])
    total = len(donations)

    badge = _compute_badge(total)
    history = _build_history_chart(donations)

    last_donated = donations[0].get("donatedAt") if donations else None
    # Streak: consecutive months with at least one donation
    streak = _compute_streak(donations)

    impact = {
        "totalDonations": total,
        "volumeMl": total * ML_PER_DONATION,
        "patientsReached": total * PATIENTS_PER_DONATION,
        # "hospitalBreakdown": []  — requires HSA API with per-unit tracking
    }

    logger.info("Retain stats fetched", donor_id=donor_id, total_donations=total)
    return _response(200, {
        "impact": impact,
        "badge": badge,
        "streak": streak,
        "lastDonatedAt": last_donated,
        "annualHistory": history,
    })


def _compute_streak(donations: list[dict]) -> int:
    """Count consecutive months (most-recent first) with at least one donation."""
    if not donations:
        return 0

    months_seen = set()
    for d in donations:
        donated_at = d.get("donatedAt", "")
        if donated_at:
            month_key = donated_at[:7]  # "YYYY-MM"
            months_seen.add(month_key)

    today = datetime.utcnow()
    streak = 0
    year, month = today.year, today.month

    while True:
        key = f"{year}-{month:02d}"
        if key in months_seen:
            streak += 1
            month -= 1
            if month == 0:
                month = 12
                year -= 1
        else:
            break

    return streak
