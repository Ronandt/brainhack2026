import json
import os
import uuid
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
dynamodb = boto3.resource("dynamodb")
hospitals_table = dynamodb.Table(os.environ["HOSPITALS_TABLE"])
drives_table = dynamodb.Table(os.environ["BLOOD_DRIVES_TABLE"])

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def _hospital_id(event: dict) -> str:
    return event["requestContext"]["authorizer"]["claims"]["sub"]


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    method = event["httpMethod"]
    path = event.get("path", "")

    if "/profile" in path and method == "GET":
        return _get_profile(event)
    if "/profile" in path and method == "PUT":
        return _update_profile(event)
    if "/drives" in path and method == "GET":
        return _list_drives(event)
    if "/drives" in path and method == "POST":
        return _create_drive(event)

    return _response(404, {"error": "Not found"})


def _get_profile(event: dict) -> dict:
    hid = _hospital_id(event)
    result = hospitals_table.get_item(Key={"hospitalId": hid})
    item = result.get("Item")
    if not item:
        return _response(200, {"profile": None})
    return _response(200, {"profile": {"location": item.get("location", "")}})


def _update_profile(event: dict) -> dict:
    hid = _hospital_id(event)
    body = json.loads(event.get("body") or "{}")
    location = (body.get("location") or "").strip()
    if not location:
        return _response(400, {"error": "location is required"})
    hospitals_table.put_item(Item={"hospitalId": hid, "location": location})
    logger.info("Hospital profile updated", hospital_id=hid, location=location)
    return _response(200, {"location": location})


def _list_drives(event: dict) -> dict:
    hid = _hospital_id(event)
    result = drives_table.scan(FilterExpression=Attr("hospitalId").eq(hid))
    drives = result.get("Items", [])
    for drive in drives:
        for key in ("capacity", "booked", "availableSlots"):
            if key in drive:
                drive[key] = int(drive[key])
    return _response(200, {"drives": drives})


def _create_drive(event: dict) -> dict:
    hid = _hospital_id(event)

    profile_result = hospitals_table.get_item(Key={"hospitalId": hid})
    profile = profile_result.get("Item")
    if not profile or not profile.get("location"):
        return _response(400, {"error": "Hospital location not set — complete your profile first."})

    body = json.loads(event.get("body") or "{}")
    name = (body.get("name") or "").strip()
    date = (body.get("date") or "").strip()
    capacity = body.get("capacity")

    if not name or not date or not capacity:
        return _response(400, {"error": "name, date, and capacity are required"})

    drive_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    drives_table.put_item(Item={
        "driveId": drive_id,
        "hospitalId": hid,
        "location": profile["location"],
        "name": name,
        "date": date,
        "startTime": body.get("startTime", ""),
        "endTime": body.get("endTime", ""),
        "capacity": int(capacity),
        "booked": 0,
        "acceptedBloodTypes": body.get("acceptedBloodTypes") or BLOOD_TYPES,
        "notes": body.get("notes", ""),
        "status": "pending",
        "createdAt": now,
    })

    logger.info("Blood drive created", drive_id=drive_id, hospital_id=hid)
    return _response(201, {"driveId": drive_id, "status": "pending"})
