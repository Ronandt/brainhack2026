import json
import os
import random
from datetime import datetime
from decimal import Decimal

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
dynamodb = boto3.resource("dynamodb")
blood_stock_table = dynamodb.Table(os.environ["BLOOD_STOCK_TABLE"])

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

# Realistic Singapore stock ranges (units) per blood type
# O- and AB- are rarer — typically lower stock
STOCK_RANGES = {
    "A+": (300, 700),
    "A-": (80, 200),
    "B+": (200, 500),
    "B-": (60, 150),
    "AB+": (150, 350),
    "AB-": (40, 100),
    "O+": (350, 750),
    "O-": (60, 180),
}


def _fetch_hsa_stock() -> dict[str, int]:
    """
    Mock HSA API response. Replace with real HTTP call to HSA API endpoint
    once credentials and API access are confirmed.

    Real call would look like:
        resp = requests.get(HSA_API_URL, headers={"Authorization": f"Bearer {token}"})
        return resp.json()["bloodStock"]
    """
    return {
        blood_type: random.randint(*STOCK_RANGES[blood_type])
        for blood_type in BLOOD_TYPES
    }


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    logger.info("Starting HSA blood stock sync")
    now = datetime.utcnow().isoformat()

    stock_data = _fetch_hsa_stock()

    with blood_stock_table.batch_writer() as batch:
        for blood_type, units in stock_data.items():
            batch.put_item(Item={
                "bloodType": blood_type,
                "updatedAt": now,
                "units": Decimal(str(units)),
                "source": "hsa-mock",
            })

    logger.info("HSA sync complete", blood_types=list(stock_data.keys()), timestamp=now)
    return {"statusCode": 200, "synced": len(stock_data)}
