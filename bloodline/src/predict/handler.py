import json
import os
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
dynamodb = boto3.resource("dynamodb")
predictions_table = dynamodb.Table(os.environ["PREDICTIONS_TABLE"])
blood_stock_table = dynamodb.Table(os.environ["BLOOD_STOCK_TABLE"])

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
STOCK_THRESHOLDS = {"ok": 500, "low": 300, "urgent": 150, "critical": 0}

# Forecasts older than 16 days are useless — expire them automatically
FORECAST_TTL_DAYS = 16


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _risk_level(units: int) -> str:
    if units > STOCK_THRESHOLDS["ok"]:
        return "ok"
    if units > STOCK_THRESHOLDS["low"]:
        return "low"
    if units > STOCK_THRESHOLDS["urgent"]:
        return "urgent"
    return "critical"


def _mock_forecast(blood_type: str, current_stock: int) -> list[dict]:
    forecast = []
    stock = current_stock
    today = _now().date()

    for day in range(14):
        date = today + timedelta(days=day)
        is_weekend = date.weekday() >= 5
        daily_donations = random.randint(8, 18) if is_weekend else random.randint(4, 12)
        daily_usage = random.randint(10, 20)
        stock = max(0, stock + daily_donations - daily_usage)

        forecast.append({
            "date": date.isoformat(),
            "bloodType": blood_type,
            "projectedUnits": stock,
            "riskLevel": _risk_level(stock),
            "dailyDonations": daily_donations,
            "dailyUsage": daily_usage,
        })

    return forecast


def _get_current_stock(blood_type: str) -> int:
    result = blood_stock_table.get_item(Key={"bloodType": blood_type})
    item = result.get("Item")
    if item:
        return int(item.get("units", 200))
    return 200


def _refresh_forecasts() -> None:
    logger.info("Refreshing 14-day forecasts for all blood types")
    generated_at = _now().isoformat()

    for blood_type in BLOOD_TYPES:
        current_stock = _get_current_stock(blood_type)
        forecast = _mock_forecast(blood_type, current_stock)

        for day in forecast:
            # TTL: expire this row FORECAST_TTL_DAYS after its forecast date
            forecast_dt = datetime.fromisoformat(day["date"]).replace(tzinfo=timezone.utc)
            ttl = int((forecast_dt + timedelta(days=FORECAST_TTL_DAYS)).timestamp())

            predictions_table.put_item(Item={
                "bloodType": blood_type,
                "forecastDate": day["date"],
                "projectedUnits": Decimal(str(day["projectedUnits"])),
                "riskLevel": day["riskLevel"],
                "dailyDonations": Decimal(str(day["dailyDonations"])),
                "dailyUsage": Decimal(str(day["dailyUsage"])),
                "generatedAt": generated_at,
                "ttl": ttl,
            })

    logger.info("Forecast refresh complete")


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


def _handle_status() -> dict:
    today = _now().date().isoformat()
    worst = "ok"
    severity = {"ok": 0, "low": 1, "urgent": 2, "critical": 3}
    type_statuses = []

    for blood_type in BLOOD_TYPES:
        result = predictions_table.get_item(
            Key={"bloodType": blood_type, "forecastDate": today}
        )
        item = result.get("Item", {})
        risk = item.get("riskLevel", "ok")
        type_statuses.append({
            "bloodType": blood_type,
            "riskLevel": risk,
            "units": int(item.get("projectedUnits", 200)),
        })
        if severity.get(risk, 0) > severity.get(worst, 0):
            worst = risk

    return _response(200, {
        "nationalStatus": worst,
        "asOf": today,
        "byBloodType": type_statuses,
    })


def _handle_forecast(blood_type: str | None) -> dict:
    today = _now().date()
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
                    "projectedUnits": int(item["projectedUnits"]),
                    "riskLevel": item["riskLevel"],
                })
        forecast_by_type[bt] = days

    return _response(200, {"forecast": forecast_by_type, "generatedFor": today.isoformat()})
