import json
import os
import urllib.parse
import urllib.request
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
hospitals_table    = dynamodb.Table(os.environ.get("HOSPITALS_TABLE", "bloodline-hospitals-dev"))
slots_table        = dynamodb.Table(os.environ.get("DONATION_SLOTS_TABLE", "bloodline-slots-dev"))
slot_bookings_table = dynamodb.Table(os.environ.get("SLOT_BOOKINGS_TABLE", "bloodline-slot-bookings-dev"))
donors_table       = dynamodb.Table(os.environ.get("DONORS_TABLE", "bloodline-donors-dev"))

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

ONEMAP_SEARCH = "https://www.onemap.gov.sg/api/common/elastic/search"
# Fixed sites whose names OneMap can't resolve (app labels, not real places).
KNOWN_COORDS = {
    "Bloodbank@HSA":          (1.2812, 103.8389),
    "Bloodbank@Dhoby Ghaut":  (1.2993, 103.8455),
    "Bloodbank@Woodlands":    (1.4360, 103.7865),
    "Bloodbank@Westgate":     (1.3338, 103.7430),
    "Bloodbank@One Punggol":  (1.4050, 103.9020),
    "HSA Bloodbank":          (1.2812, 103.8389),
    "Singapore Red Cross":    (1.2966, 103.8485),
}


def _geocode_location(location: str):
    """Resolve a slot location to (lat, lng) at creation time. Known fixed sites
    are applied directly; otherwise OneMap (no auth/CORS). Returns (None, None)
    on failure so a geocode hiccup never blocks slot creation.
    """
    if location in KNOWN_COORDS:
        return KNOWN_COORDS[location]
    try:
        qs = urllib.parse.urlencode({
            "searchVal": location, "returnGeom": "Y",
            "getAddrDetails": "N", "pageNum": 1,
        })
        req = urllib.request.Request(f"{ONEMAP_SEARCH}?{qs}", headers={"User-Agent": "bloodline"})
        with urllib.request.urlopen(req, timeout=3) as resp:  # noqa: S310 (trusted host)
            data = json.loads(resp.read().decode())
        results = data.get("results") or []
        if results:
            return float(results[0]["LATITUDE"]), float(results[0]["LONGITUDE"])
    except Exception:
        logger.warning("Slot geocode failed (list endpoint will retry)", location=location)
    return None, None


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

    # Geocode at creation so the slot has coordinates immediately (the /slots
    # list endpoint still backfills any that are missing, as a safety net).
    if lat is None or lng is None:
        glat, glng = _geocode_location(location)
        if glat is not None and glng is not None:
            lat, lng = Decimal(str(glat)), Decimal(str(glng))

    date = (body.get("date") or "").strip()
    capacity = body.get("capacity")
    if not date or not capacity:
        return _response(400, {"error": "date and capacity are required"})

    slot_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "slotId": slot_id,
        "hospitalId": hid,
        "name": (body.get("name") or "").strip() or location,
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
