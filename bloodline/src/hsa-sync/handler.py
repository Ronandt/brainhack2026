import json
import os
from datetime import datetime, timezone
from decimal import Decimal

import boto3
import requests
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Key
from botocore.config import Config
from bs4 import BeautifulSoup, Comment

logger = Logger()
dynamodb = boto3.resource("dynamodb", config=Config(connect_timeout=5, read_timeout=10))
blood_stock_table = dynamodb.Table(os.environ["BLOOD_STOCK_TABLE"])

REDCROSS_URL = "https://redcross.sg/"
BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
STATUS_FALLBACK = {"Healthy": 80, "Moderate": 50, "Low": 25, "Critical": 10}


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def _extract_percentage(hover_div, status: str) -> int:
    if hover_div:
        for node in hover_div.children:
            if isinstance(node, Comment):
                try:
                    return int(node.strip())
                except (ValueError, AttributeError):
                    pass
    return STATUS_FALLBACK.get(status, 50)


def _scrape_redcross() -> list[dict]:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    resp = requests.get(REDCROSS_URL, timeout=15, headers=headers)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    for box in soup.select(".blood-grp-img"):
        blood_type_el = box.select_one(".blood-grp-text h3")
        status_el = box.select_one(".blood-grp-text h5")
        if not blood_type_el or not status_el:
            continue

        blood_type = blood_type_el.get_text(strip=True)
        status = status_el.get_text(strip=True)
        percentage = _extract_percentage(box.select_one(".blood-grp-hover"), status)

        results.append({"bloodType": blood_type, "status": status, "percentage": percentage})

    logger.info("Scraped blood stock", count=len(results))
    return results


def _write_to_dynamodb(stock_data: list[dict], synced_at: str) -> None:
    with blood_stock_table.batch_writer() as batch:
        for entry in stock_data:
            batch.put_item(Item={
                "bloodType": entry["bloodType"],
                "updatedAt": synced_at,
                "units": Decimal(str(entry["percentage"])),
                "status": entry["status"],
                "percentage": Decimal(str(entry["percentage"])),
                "source": "redcross-sg",
            })


def _read_latest_stock() -> tuple[list[dict], str]:
    results = []
    updated_at = ""
    for bt in BLOOD_TYPES:
        result = blood_stock_table.query(
            KeyConditionExpression=Key("bloodType").eq(bt),
            ScanIndexForward=False,
            Limit=1,
        )
        items = result.get("Items", [])
        if items:
            item = items[0]
            results.append({
                "bloodType": item["bloodType"],
                "status": item.get("status", "Unknown"),
                "percentage": int(item.get("percentage", item.get("units", 50))),
            })
            if not updated_at:
                updated_at = item.get("updatedAt", "")
    return results, updated_at


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    # EventBridge scheduled sync — scrape and cache to DynamoDB
    if event.get("source") == "eventbridge":
        logger.info("EventBridge sync: scraping Red Cross SG")
        synced_at = datetime.now(timezone.utc).isoformat()
        stock_data = _scrape_redcross()
        _write_to_dynamodb(stock_data, synced_at)
        logger.info("Sync complete", synced=len(stock_data), at=synced_at)
        return {"statusCode": 200, "synced": len(stock_data)}

    # HTTP GET /api/v1/blood-stock — serve cached data; scrape live if stale/legacy
    http_method = event.get("httpMethod", "")
    if http_method == "GET":
        stock, updated_at = _read_latest_stock()
        # DynamoDB has old mock data (no status field) or is empty — scrape now and cache
        is_stale = not stock or any(s["status"] == "Unknown" for s in stock)
        if is_stale:
            logger.info("Stale/missing data detected — scraping live")
            synced_at = datetime.now(timezone.utc).isoformat()
            stock_data = _scrape_redcross()
            _write_to_dynamodb(stock_data, synced_at)
            stock = [{"bloodType": e["bloodType"], "status": e["status"], "percentage": e["percentage"]} for e in stock_data]
            updated_at = synced_at
        return _response(200, {
            "bloodStock": stock,
            "updatedAt": updated_at,
            "source": "redcross-sg",
        })

    return _response(405, {"error": "Method not allowed"})
