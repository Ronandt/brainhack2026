import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.config import Config
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
_cfg = Config(connect_timeout=5, read_timeout=5, retries={"max_attempts": 2})
dynamodb = boto3.resource("dynamodb", config=_cfg)
drives_table = dynamodb.Table(os.environ["BLOOD_DRIVES_TABLE"])
bookings_table = dynamodb.Table(os.environ["BOOKINGS_TABLE"])
slots_table = dynamodb.Table(os.environ["DONATION_SLOTS_TABLE"])
slot_bookings_table = dynamodb.Table(os.environ["SLOT_BOOKINGS_TABLE"])


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

    # Donation slots (hospital-posted availability for donors to book)
    if "/slots" in path and "/book" in path and method == "POST":
        return _book_slot(event)
    if "/slots" in path and "/book" in path and method == "DELETE":
        return _cancel_slot_booking(event)
    if "/slots" in path and method == "GET":
        return _list_slots(event)

    # Blood drives (hospital-created events, admin-approved)
    if "/hospital/drives" in path and method == "GET":
        return _list_hospital_drives(event)
    if "/bookings" in path and method == "GET":
        return _list_my_bookings(event)
    if "/drives" in path and method == "GET":
        return _list_drives(event)
    if "/drives" in path and method == "POST":
        return _create_drive(event)

    # Legacy donor bookings for drives
    if "/book" in path and method == "POST":
        return _create_booking(event)

    return _response(404, {"error": "Not found"})


def _list_my_bookings(event: dict) -> dict:
    """Return all upcoming confirmed bookings (drive + slot) for this donor."""
    donor_id = _donor_id_from_event(event)
    today = datetime.now(timezone.utc).date().isoformat()
    enriched = []

    # Drive bookings (legacy flow)
    drive_result = bookings_table.query(
        KeyConditionExpression=Key("donorId").eq(donor_id)
    )
    for booking in drive_result.get("Items", []):
        if booking.get("status") != "confirmed":
            continue
        drive = drives_table.get_item(Key={"driveId": booking["driveId"]}).get("Item", {})
        if drive.get("date", "") >= today:
            for key in ("capacity", "booked", "availableSlots"):
                if key in drive:
                    drive[key] = int(drive[key])
            enriched.append({**booking, "drive": drive})

    # Slot bookings (new flow) — normalise into the same shape
    slot_result = slot_bookings_table.query(
        KeyConditionExpression=Key("donorId").eq(donor_id)
    )
    for booking in slot_result.get("Items", []):
        if booking.get("status") != "confirmed":
            continue
        slot = slots_table.get_item(Key={"slotId": booking["slotId"]}).get("Item", {})
        if slot.get("date", "") >= today:
            for key in ("capacity", "booked"):
                if key in slot:
                    slot[key] = int(slot[key])
            enriched.append({
                **booking,
                "drive": {
                    "name": slot.get("name") or slot.get("location", ""),
                    "location": slot.get("location", ""),
                    "date": slot.get("date", ""),
                    "startTime": slot.get("startTime", ""),
                    "endTime": slot.get("endTime", ""),
                },
            })

    enriched.sort(key=lambda b: b.get("drive", {}).get("date", ""))
    logger.info("Bookings listed", donor_id=donor_id, count=len(enriched))
    return _response(200, {"bookings": enriched, "count": len(enriched)})


# ── Donation slots (donor-facing) ─────────────────────────────────────────────

def _list_slots(event: dict) -> dict:
    params = event.get("queryStringParameters") or {}
    blood_type = params.get("bloodType")

    filter_expr = Attr("status").eq("available")
    if blood_type:
        filter_expr = filter_expr & Attr("acceptedBloodTypes").contains(blood_type)

    result = slots_table.scan(FilterExpression=filter_expr)
    slots = result.get("Items", [])
    for slot in slots:
        for key in ("capacity", "booked"):
            if key in slot:
                slot[key] = int(slot[key])
        for key in ("lat", "lng"):
            if key in slot and slot[key] is not None:
                slot[key] = float(slot[key])
    return _response(200, {"slots": slots, "count": len(slots)})


def _book_slot(event: dict) -> dict:
    donor_id = _donor_id_from_event(event)
    slot_id = (event.get("pathParameters") or {}).get("slotId")
    if not slot_id:
        return _response(400, {"error": "slotId is required"})

    result = slots_table.get_item(Key={"slotId": slot_id})
    slot = result.get("Item")
    if not slot:
        return _response(404, {"error": "Slot not found"})
    if slot.get("status") != "available":
        return _response(409, {"error": "This slot is no longer available"})

    booked = int(slot.get("booked", 0))
    capacity = int(slot.get("capacity", 0))
    if booked >= capacity:
        return _response(409, {"error": "No slots available"})

    existing = slot_bookings_table.get_item(Key={"donorId": donor_id, "slotId": slot_id})
    if existing.get("Item"):
        return _response(409, {"error": "You already have a booking for this slot"})

    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    slot_bookings_table.put_item(Item={
        "donorId": donor_id,
        "slotId": slot_id,
        "bookingId": booking_id,
        "status": "confirmed",
        "createdAt": now,
    })

    new_booked = booked + 1
    update_expr = "SET booked = :b"
    expr_vals = {":b": new_booked}
    if new_booked >= capacity:
        update_expr += ", #st = :full"
        expr_vals[":full"] = "full"
        slots_table.update_item(
            Key={"slotId": slot_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_vals,
            ExpressionAttributeNames={"#st": "status"},
        )
    else:
        slots_table.update_item(
            Key={"slotId": slot_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_vals,
        )

    logger.info("Slot booked", donor_id=donor_id, slot_id=slot_id, booking_id=booking_id)
    return _response(201, {"bookingId": booking_id, "slotId": slot_id, "status": "confirmed"})


def _cancel_slot_booking(event: dict) -> dict:
    donor_id = _donor_id_from_event(event)
    slot_id = (event.get("pathParameters") or {}).get("slotId")
    if not slot_id:
        return _response(400, {"error": "slotId is required"})

    existing = slot_bookings_table.get_item(Key={"donorId": donor_id, "slotId": slot_id})
    if not existing.get("Item"):
        return _response(404, {"error": "Booking not found"})

    slot_bookings_table.delete_item(Key={"donorId": donor_id, "slotId": slot_id})

    # Free the seat: decrement booked and re-open the slot if it was full.
    slot = slots_table.get_item(Key={"slotId": slot_id}).get("Item")
    if slot:
        new_booked = max(int(slot.get("booked", 0)) - 1, 0)
        update_expr = "SET booked = :b"
        expr_vals = {":b": new_booked}
        if slot.get("status") == "full":
            update_expr += ", #st = :avail"
            expr_vals[":avail"] = "available"
            slots_table.update_item(
                Key={"slotId": slot_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_vals,
                ExpressionAttributeNames={"#st": "status"},
            )
        else:
            slots_table.update_item(
                Key={"slotId": slot_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_vals,
            )

    logger.info("Slot booking cancelled", donor_id=donor_id, slot_id=slot_id)
    return _response(200, {"slotId": slot_id, "status": "cancelled"})


# ── Blood drives ──────────────────────────────────────────────────────────────

def _list_hospital_drives(event: dict) -> dict:
    user_id = _donor_id_from_event(event)
    result = drives_table.scan(FilterExpression=Attr("createdBy").eq(user_id))
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
    now = datetime.now(timezone.utc).isoformat()

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
        "status": "pending_approval",
        "createdAt": now,
        "createdBy": creator_id,
    }
    # Persist the picked map coordinates so the booking list can sort by proximity
    # without re-geocoding the location name.
    lat, lng = body.get("lat"), body.get("lng")
    if lat is not None and lng is not None:
        drive["lat"] = Decimal(str(lat))
        drive["lng"] = Decimal(str(lng))
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
        for key in ("lat", "lng"):
            if key in drive and drive[key] is not None:
                drive[key] = float(drive[key])

    logger.info("Blood drives listed", count=len(drives))
    return _response(200, {"drives": drives, "count": len(drives)})


# ── Legacy drive bookings ─────────────────────────────────────────────────────

def _create_booking(event: dict) -> dict:
    donor_id = _donor_id_from_event(event)
    body = json.loads(event.get("body") or "{}")
    drive_id = body.get("driveId")
    slot_time = body.get("slotTime")

    if not drive_id or not slot_time:
        return _response(400, {"error": "driveId and slotTime are required"})

    result = drives_table.get_item(Key={"driveId": drive_id})
    drive = result.get("Item")
    if not drive:
        return _response(404, {"error": "Blood drive not found"})

    booked = int(drive.get("booked", 0))
    capacity = int(drive.get("capacity", 0))
    if booked >= capacity:
        return _response(409, {"error": "No slots available for this drive"})

    existing = bookings_table.get_item(Key={"donorId": donor_id, "driveId": drive_id})
    if existing.get("Item"):
        return _response(409, {"error": "You already have a booking for this drive"})

    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    bookings_table.put_item(Item={
        "donorId": donor_id,
        "driveId": drive_id,
        "bookingId": booking_id,
        "slotTime": slot_time,
        "status": "confirmed",
        "createdAt": now,
    })

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
        "bringAFriend": True,
    })
