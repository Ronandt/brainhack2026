"""
BloodLine — 14-day blood supply forecast
Model: seasonality-adjusted daily balance, anchored to live Red Cross SG data.

Each blood type has a baseline net daily % change derived from Singapore's
supply/demand profile. That is modulated by:
  - Day-of-week donation patterns (SG weekend surge, Monday trough)
  - Singapore 2026 public holiday calendar (fewer donors on holidays)
  - Campaign effect: when % < 50, Red Cross activates campaigns (+donation rate)
  - Mean-reversion damping: stock levels are actively managed, so extremes
    pull back toward a type-specific equilibrium faster than the pure model implies.

/status reads directly from blood_stock_table (live Red Cross data).
/forecast reads from predictions_table (model output, refreshed hourly).
"""

import json
import os
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
dynamodb = boto3.resource("dynamodb")
predictions_table = dynamodb.Table(os.environ["PREDICTIONS_TABLE"])
blood_stock_table  = dynamodb.Table(os.environ["BLOOD_STOCK_TABLE"])

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
FORECAST_TTL_DAYS = 16

# ── Singapore 2026 public holidays ──────────────────────────────────────────
SG_HOLIDAYS = {
    "2026-01-01", "2026-01-29", "2026-01-30", "2026-01-31",
    "2026-04-03", "2026-05-01", "2026-05-13", "2026-06-07",
    "2026-08-09", "2026-10-20", "2026-12-25",
}

# ── Per-blood-type baseline net daily % change (no seasonality) ──────────────
# Derived from Singapore blood service data:
#   O-: only 6% of donors, used as universal donor in emergencies → fast depletion
#   B+: 18% of donors, moderate demand → near-balanced
#   AB types: low demand (universal recipient AB+ can get all types)
BT_NET_DAILY = {
    "O+":  -0.40,
    "O-":  -1.20,
    "A+":  -0.30,
    "A-":  -0.75,
    "B+":   0.05,
    "B-":  -0.65,
    "AB+": -0.20,
    "AB-": -0.45,
}

# Equilibrium % each type tends toward when actively managed
BT_EQUILIBRIUM = {
    "O+": 72, "O-": 42, "A+": 68, "A-": 50,
    "B+": 85, "B-": 55, "AB+": 70, "AB-": 60,
}


# ── Seasonality helpers ──────────────────────────────────────────────────────

def _dow_donation_multiplier(weekday: int) -> float:
    """0=Mon…6=Sun. Weekends see ~30% more donors in Singapore."""
    return [0.78, 0.85, 0.88, 0.90, 0.95, 1.20, 1.28][weekday]


def _holiday_multiplier(date_str: str) -> float:
    if date_str in SG_HOLIDAYS:
        return 0.68
    dt = datetime.fromisoformat(date_str)
    eve = (dt - timedelta(days=1)).date().isoformat()
    if eve in SG_HOLIDAYS:
        return 0.82
    return 1.0


# Per-blood-type risk thresholds (ok_min, low_min, urgent_min).
# Calibrated from observed Red Cross status vs percentage pairs.
# Rarer types with smaller donor pools need higher % buffers to be "ok".
_BT_THRESHOLDS = {
    "O+":  (65, 40, 18),   # 37% of donors, moderate demand
    "O-":  (62, 38, 16),   # 6% of donors, universal donor — burns fast
    "A+":  (55, 32, 14),   # 29% of donors, moderate demand → ok at lower %
    "A-":  (60, 36, 15),   # 5% of donors
    "B+":  (70, 45, 20),   # 18% of donors
    "B-":  (65, 40, 18),   # 4% of donors
    "AB+": (78, 52, 22),   # 6% of donors, universal recipient
    "AB-": (88, 62, 28),   # <1% of donors — needs large buffer to be safe
}

def _pct_to_risk(pct: float, blood_type: str = "O+") -> str:
    ok_min, low_min, urgent_min = _BT_THRESHOLDS.get(blood_type, (60, 35, 15))
    if pct >= ok_min:
        return "ok"
    if pct >= low_min:
        return "low"
    if pct >= urgent_min:
        return "urgent"
    return "critical"


def _status_to_risk(status: str) -> str:
    return {"Healthy": "ok", "Moderate": "low", "Low": "urgent", "Critical": "critical"}.get(status, "ok")


# ── Data access ──────────────────────────────────────────────────────────────

def _latest_stock(blood_type: str) -> dict | None:
    """Return the most recent Red Cross reading for a blood type."""
    result = blood_stock_table.query(
        KeyConditionExpression=Key("bloodType").eq(blood_type),
        ScanIndexForward=False,
        Limit=1,
    )
    items = result.get("Items", [])
    if not items:
        return None
    item = items[0]
    # Accept both new (percentage/status) and legacy (units) schemas
    if "percentage" in item:
        return {"percentage": float(item["percentage"]), "status": item.get("status", "Healthy")}
    # Legacy mock data used "units" (0-1000 scale); map to 0-100%
    units = float(item.get("units", 200))
    pct = min(100, round(units / 10, 1))
    return {"percentage": pct, "status": "Healthy" if pct >= 60 else "Moderate" if pct >= 35 else "Low"}


# ── Forecast model ───────────────────────────────────────────────────────────

def _forecast_blood_type(blood_type: str, current_pct: float) -> list[dict]:
    today = datetime.now(timezone.utc).date()
    base_net = BT_NET_DAILY.get(blood_type, -0.5)
    equilibrium = BT_EQUILIBRIUM.get(blood_type, 65.0)

    pct = current_pct
    forecast = []

    for day_offset in range(14):
        date = today + timedelta(days=day_offset)
        date_str = date.isoformat()

        if day_offset > 0:
            dow   = _dow_donation_multiplier(date.weekday())
            hol   = _holiday_multiplier(date_str)

            # Campaign boost when stock is critically low (Red Cross activates appeals)
            campaign = 1.0
            if pct < 30:
                campaign = 1.45
            elif pct < 50:
                campaign = 1.18

            # Mean-reversion pull — managed supply resists extremes
            reversion = (equilibrium - pct) * 0.04

            daily_change = (
                base_net * dow * hol * campaign
                + reversion
                + random.gauss(0, 1.0)
            )
            pct = max(0.0, min(100.0, pct + daily_change))

        forecast.append({
            "date": date_str,
            "bloodType": blood_type,
            "percentage": round(pct, 1),
            "riskLevel": _pct_to_risk(pct, blood_type),
        })

    return forecast


# ── Refresh job (EventBridge hourly) ────────────────────────────────────────

def _refresh_forecasts() -> None:
    logger.info("Refreshing 14-day forecasts")
    generated_at = datetime.now(timezone.utc).isoformat()

    for blood_type in BLOOD_TYPES:
        stock = _latest_stock(blood_type)
        current_pct = stock["percentage"] if stock else 65.0

        forecast = _forecast_blood_type(blood_type, current_pct)

        for day in forecast:
            forecast_dt = datetime.fromisoformat(day["date"]).replace(tzinfo=timezone.utc)
            ttl = int((forecast_dt + timedelta(days=FORECAST_TTL_DAYS)).timestamp())

            predictions_table.put_item(Item={
                "bloodType": blood_type,
                "forecastDate": day["date"],
                "percentage": Decimal(str(day["percentage"])),
                "riskLevel": day["riskLevel"],
                "generatedAt": generated_at,
                "ttl": ttl,
            })

    logger.info("Forecast refresh complete")


# ── HTTP handlers ────────────────────────────────────────────────────────────

def _handle_status() -> dict:
    """Current reality — reads directly from Red Cross live data."""
    severity = {"ok": 0, "low": 1, "urgent": 2, "critical": 3}
    worst = "ok"
    type_statuses = []

    for blood_type in BLOOD_TYPES:
        stock = _latest_stock(blood_type)
        if stock:
            pct  = stock["percentage"]
            # Use Red Cross's own status as ground truth for current day
            risk = _status_to_risk(stock.get("status", "Healthy"))
        else:
            pct  = 65.0
            risk = "ok"

        type_statuses.append({
            "bloodType": blood_type,
            "riskLevel": risk,
            "percentage": pct,
        })
        if severity.get(risk, 0) > severity.get(worst, 0):
            worst = risk

    return _response(200, {
        "nationalStatus": worst,
        "asOf": datetime.now(timezone.utc).date().isoformat(),
        "byBloodType": type_statuses,
    })


def _handle_forecast(blood_type: str | None) -> dict:
    """14-day projection from predictions_table (model output)."""
    today = datetime.now(timezone.utc).date()
    dates = [(today + timedelta(days=i)).isoformat() for i in range(14)]
    types_to_fetch = [blood_type] if blood_type else BLOOD_TYPES
    forecast_by_type = {}

    for bt in types_to_fetch:
        days = []
        for date in dates:
            result = predictions_table.get_item(Key={"bloodType": bt, "forecastDate": date})
            item = result.get("Item")
            if item:
                days.append({
                    "date": item["forecastDate"],
                    "percentage": float(item.get("percentage", 65)),
                    "riskLevel": item["riskLevel"],
                })
        # If no forecast exists yet for this type, generate on-the-fly
        if not days:
            stock = _latest_stock(bt)
            current_pct = stock["percentage"] if stock else 65.0
            days = _forecast_blood_type(bt, current_pct)
        forecast_by_type[bt] = days

    return _response(200, {"forecast": forecast_by_type, "generatedFor": today.isoformat()})


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if event.get("source") == "eventbridge":
        _refresh_forecasts()
        return {"statusCode": 200}

    path = event.get("path", "")

    if "/status" in path:
        return _handle_status()
    if "/forecast" in path:
        params = event.get("queryStringParameters") or {}
        return _handle_forecast(params.get("bloodType"))

    return _response(404, {"error": "Not found"})
