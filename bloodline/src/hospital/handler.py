import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.config import Config
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
_cfg = Config(connect_timeout=5, read_timeout=5, retries={"max_attempts": 2})
dynamodb = boto3.resource("dynamodb", config=_cfg)
hospitals_table    = dynamodb.Table(os.environ["HOSPITALS_TABLE"])
slots_table        = dynamodb.Table(os.environ["DONATION_SLOTS_TABLE"])
slot_bookings_table = dynamodb.Table(os.environ.get("SLOT_BOOKINGS_TABLE", "bloodline-slot-bookings-dev"))
donors_table       = dynamodb.Table(os.environ.get("DONORS_TABLE", "bloodline-donors-dev"))

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

    if path.endswith("/hospitals") and method == "GET":
        return _list_hospitals(event)
    if "/slots" in path and method == "POST":
        return _create_slot(event)
    if "/slots" in path and method == "GET":
        params = event.get("queryStringParameters") or {}
        if params.get("slotId"):
            return _get_slot_bookings(event)
        return _list_hospital_slots(event)
    if "/profile" in path and method == "GET":
        return _get_profile(event)
    if "/profile" in path and method == "PUT":
        return _update_profile(event)

    return _response(404, {"error": "Not found"})


# ── Hospital directory ────────────────────────────────────────────────────────

def _list_hospitals(_event: dict) -> dict:
    result = hospitals_table.scan(
        ProjectionExpression="hospitalId, #loc, lat, lng",
        ExpressionAttributeNames={"#loc": "location"},
    )
    hospitals = []
    for item in result.get("Items", []):
        hospitals.append({
            "hospitalId": item["hospitalId"],
            "location": item.get("location", ""),
            "lat": float(item["lat"]) if item.get("lat") is not None else None,
            "lng": float(item["lng"]) if item.get("lng") is not None else None,
        })
    return _response(200, {"hospitals": hospitals})


# ── Hospital profile ──────────────────────────────────────────────────────────

def _get_profile(event: dict) -> dict:
    hid = _hospital_id(event)
    result = hospitals_table.get_item(Key={"hospitalId": hid})
    item = result.get("Item")
    if not item:
        return _response(200, {"profile": None})
    return _response(200, {"profile": {
        "location": item.get("location", ""),
        "lat": float(item["lat"]) if item.get("lat") is not None else None,
        "lng": float(item["lng"]) if item.get("lng") is not None else None,
    }})


def _update_profile(event: dict) -> dict:
    hid = _hospital_id(event)
    body = json.loads(event.get("body") or "{}")
    location = (body.get("location") or "").strip()
    if not location:
        return _response(400, {"error": "location is required"})

    lat = body.get("lat")
    lng = body.get("lng")
    item = {"hospitalId": hid, "location": location}
    if lat is not None and lng is not None:
        item["lat"] = Decimal(str(lat))
        item["lng"] = Decimal(str(lng))

    hospitals_table.put_item(Item=item)
    logger.info("Hospital profile updated", hospital_id=hid, location=location)
    return _response(200, {"location": location, "lat": lat, "lng": lng})


# ── Donation slots ────────────────────────────────────────────────────────────

def _create_slot(event: dict) -> dict:
    hid = _hospital_id(event)
    body = json.loads(event.get("body") or "{}")

    # Accept location from body (BloodBank flow) or fall back to hospital profile
    location = (body.get("location") or "").strip()
    lat, lng = None, None

    if not location:
        profile_result = hospitals_table.get_item(Key={"hospitalId": hid})
        profile = profile_result.get("Item")
        if not profile or not profile.get("location"):
            return _response(400, {"error": "Hospital location not set — complete your profile first."})
        location = profile["location"]
        if profile.get("lat") is not None:
            lat = profile["lat"]
            lng = profile["lng"]

    date = (body.get("date") or "").strip()
    capacity = body.get("capacity")
    if not date or not capacity:
        return _response(400, {"error": "date and capacity are required"})

    slot_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "slotId": slot_id,
        "hospitalId": hid,
        "location": location,
        "date": date,
        "startTime": body.get("startTime", ""),
        "endTime": body.get("endTime", ""),
        "capacity": int(capacity),
        "booked": 0,
        "acceptedBloodTypes": body.get("acceptedBloodTypes") or BLOOD_TYPES,
        "notes": body.get("notes", ""),
        "status": "available",
        "createdAt": now,
    }
    if lat is not None and lng is not None:
        item["lat"] = lat
        item["lng"] = lng

    slots_table.put_item(Item=item)
    logger.info("Donation slot created", slot_id=slot_id, hospital_id=hid)
    return _response(201, {"slotId": slot_id})


def _list_hospital_slots(event: dict) -> dict:
    hid = _hospital_id(event)
    result = slots_table.scan(FilterExpression=Attr("hospitalId").eq(hid))
    slots = result.get("Items", [])
    for slot in slots:
        for key in ("capacity", "booked"):
            if key in slot:
                slot[key] = int(slot[key])
        for key in ("lat", "lng"):
            if key in slot and slot[key] is not None:
                slot[key] = float(slot[key])
    return _response(200, {"slots": slots})


def _get_slot_bookings(event: dict) -> dict:
    params = event.get("queryStringParameters") or {}
    slot_id = params.get("slotId")
    if not slot_id:
        return _response(400, {"error": "slotId is required"})

    result = slot_bookings_table.scan(FilterExpression=Attr("slotId").eq(slot_id))
    bookings = []
    for item in result.get("Items", []):
        if item.get("status") != "confirmed":
            continue
        donor = donors_table.get_item(Key={"donorId": item["donorId"]}).get("Item", {})
        bookings.append({
            "donorId": item["donorId"],
            "bookingId": item.get("bookingId", ""),
            "bookedAt": item.get("createdAt", ""),
            "name": donor.get("name", "—"),
            "bloodType": donor.get("bloodType", "—"),
            "postalCode": donor.get("postalCode", ""),
        })

    return _response(200, {"bookings": bookings, "count": len(bookings)})
