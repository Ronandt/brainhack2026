import json
import os
import uuid
from datetime import datetime

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr

logger = Logger()
dynamodb = boto3.resource("dynamodb")
drives_table = dynamodb.Table(os.environ["BLOOD_DRIVES_TABLE"])
bookings_table = dynamodb.Table(os.environ["BOOKINGS_TABLE"])


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def _donor_id_from_event(event: dict) -> str:
    return event["requestContext"]["authorizer"]["claims"]["sub"]


def _is_hsa_admin(event: dict) -> bool:
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    groups = claims.get("cognito:groups", "")
    return "HSAAdmin" in groups


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    method = event["httpMethod"]
    path = event.get("path", "")

    if "/hospital/drives" in path and method == "GET":
        return _list_hospital_drives(event)
    if "/drives" in path and method == "GET":
        return _list_drives(event)
    if "/drives" in path and method == "POST":
        return _create_drive(event)
    if "/book" in path and method == "POST":
        return _create_booking(event)

    return _response(404, {"error": "Not found"})


def _list_hospital_drives(event: dict) -> dict:
    """Returns drives created by this hospital user (filtered by createdBy = Cognito sub)."""
    user_id = _donor_id_from_event(event)
    result = drives_table.scan(
        FilterExpression=Attr("createdBy").eq(user_id)
    )
    drives = result.get("Items", [])
    for drive in drives:
        for key in ("capacity", "booked", "availableSlots"):
            if key in drive:
                drive[key] = int(drive[key])
    return _response(200, {"drives": drives, "count": len(drives)})


def _create_drive(event: dict) -> dict:
    body = json.loads(event.get("body") or "{}")
    name = body.get("name")
    location = body.get("location")
    date = body.get("date")
    capacity = body.get("capacity")

    if not all([name, location, date, capacity]):
        return _response(400, {"error": "name, location, date, and capacity are required"})

    creator_id = _donor_id_from_event(event)
    drive_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    drive = {
        "driveId": drive_id,
        "name": name,
        "location": location,
        "date": date,
        "startTime": body.get("startTime", ""),
        "endTime": body.get("endTime", ""),
        "capacity": int(capacity),
        "booked": 0,
        "availableSlots": int(capacity),
        "acceptedBloodTypes": body.get("acceptedBloodTypes", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
        "notes": body.get("notes", ""),
        "status": "upcoming",
        "createdAt": now,
        "createdBy": creator_id,
    }

    drives_table.put_item(Item=drive)

    logger.info("Blood drive created", drive_id=drive_id, name=name)
    return _response(201, drive)


def _list_drives(event: dict) -> dict:
    params = event.get("queryStringParameters") or {}
    blood_type = params.get("bloodType")
    status_filter = params.get("status", "upcoming")

    filter_expr = Attr("status").eq(status_filter)
    if blood_type:
        filter_expr = filter_expr & Attr("acceptedBloodTypes").contains(blood_type)

    result = drives_table.scan(FilterExpression=filter_expr)
    drives = result.get("Items", [])

    for drive in drives:
        for key in ("capacity", "booked", "availableSlots"):
            if key in drive:
                drive[key] = int(drive[key])

    logger.info("Blood drives listed", count=len(drives))
    return _response(200, {"drives": drives, "count": len(drives)})


def _create_booking(event: dict) -> dict:
    donor_id = _donor_id_from_event(event)
    body = json.loads(event.get("body") or "{}")
    drive_id = body.get("driveId")
    slot_time = body.get("slotTime")

    if not drive_id or not slot_time:
        return _response(400, {"error": "driveId and slotTime are required"})

    # Verify drive exists and has capacity
    result = drives_table.get_item(Key={"driveId": drive_id})
    drive = result.get("Item")
    if not drive:
        return _response(404, {"error": "Blood drive not found"})

    booked = int(drive.get("booked", 0))
    capacity = int(drive.get("capacity", 0))
    if booked >= capacity:
        return _response(409, {"error": "No slots available for this drive"})

    # Check for existing booking
    existing = bookings_table.get_item(Key={"donorId": donor_id, "driveId": drive_id})
    if existing.get("Item"):
        return _response(409, {"error": "You already have a booking for this drive"})

    booking_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    bookings_table.put_item(Item={
        "donorId": donor_id,
        "driveId": drive_id,
        "bookingId": booking_id,
        "slotTime": slot_time,
        "status": "confirmed",
        "createdAt": now,
    })

    # Increment booked count on drive
    drives_table.update_item(
        Key={"driveId": drive_id},
        UpdateExpression="SET booked = booked + :one",
        ExpressionAttributeValues={":one": 1},
    )

    logger.info("Booking created", donor_id=donor_id, drive_id=drive_id, booking_id=booking_id)
    return _response(201, {
        "bookingId": booking_id,
        "driveId": drive_id,
        "slotTime": slot_time,
        "status": "confirmed",
        "bringAFriend": True,  # triggers "bring a friend" prompt in app
    })
