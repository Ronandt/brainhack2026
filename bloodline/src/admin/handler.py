import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr, Key

logger = Logger()
dynamodb = boto3.resource("dynamodb")
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])
donations_table = dynamodb.Table(os.environ["DONATIONS_TABLE"])
drives_table = dynamodb.Table(os.environ["BLOOD_DRIVES_TABLE"])
alerts_table = dynamodb.Table(os.environ["ALERTS_TABLE"])
blood_stock_table = dynamodb.Table(os.environ["BLOOD_STOCK_TABLE"])
predictions_table = dynamodb.Table(os.environ["PREDICTIONS_TABLE"])

ELIGIBILITY_DAYS = 56
DORMANT_DAYS = 365
AT_RISK_DAYS = 180

# LTA DataMall — live traffic accidents. Browsers can't call DataMall directly
# (it sends no CORS headers), so this Lambda relays it for the HSA ops feed.
LTA_INCIDENTS_URL = "https://datamall2.mytransport.sg/ltaodataservice/TrafficIncidents"
LTA_ACCOUNT_KEY = os.environ.get("LTA_ACCOUNT_KEY", "")


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def _is_hsa_admin(event):
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    return "HSAAdmin" in claims.get("cognito:groups", "")


def _is_hospital_or_admin(event):
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    groups = claims.get("cognito:groups", "")
    return "HospitalStaff" in groups or "HSAAdmin" in groups


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    path = event.get("path", "")
    method = event["httpMethod"]

    # Hospital-accessible routes (HospitalStaff OR HSAAdmin)
    if "/hospital/donor" in path and method == "GET":
        if not _is_hospital_or_admin(event):
            return _response(403, {"error": "Hospital staff or HSA admin access required"})
        return _lookup_donor(event)
    if "/admin/donations" in path and method == "POST":
        if not _is_hospital_or_admin(event):
            return _response(403, {"error": "Hospital staff or HSA admin access required"})
        return _record_donation(event)

    # All other routes: HSA admin only
    if not _is_hsa_admin(event):
        return _response(403, {"error": "HSA admin access required"})

    if "/admin/donors/segments" in path:
        return _donor_segments()
    if "/admin/drives/pending" in path and method == "GET":
        return _pending_drives()
    if "/admin/drives/" in path and "/approve" in path and method == "POST":
        drive_id = path.split("/drives/")[1].split("/approve")[0]
        return _approve_drive(drive_id, event)
    if "/admin/drives/" in path and "/reject" in path and method == "POST":
        drive_id = path.split("/drives/")[1].split("/reject")[0]
        return _reject_drive(drive_id)
    if "/admin/stock" in path:
        return _blood_stock_overview()
    if "/admin/alerts" in path:
        return _all_alerts()
    if "/admin/traffic-incidents" in path and method == "GET":
        return _traffic_incidents()
    if "/admin/demand" in path and method == "POST":
        return _submit_hospital_demand(event)

    return _response(404, {"error": "Not found"})


def _donor_segments():
    """Segment donor pool: active / at-risk / dormant / lapsed."""
    result = donors_table.scan()
    donors = result.get("Items", [])
    today = datetime.utcnow()

    segments = {"active": [], "atRisk": [], "dormant": [], "lapsed": [], "neverDonated": []}

    for donor in donors:
        last = donor.get("lastDonatedAt")
        entry = {
            "donorId": donor.get("donorId"),
            "name": donor.get("name", "Unknown"),
            "bloodType": donor.get("bloodType", "—"),
            "email": donor.get("email", ""),
            "lastDonatedAt": last,
        }
        if not last:
            segments["neverDonated"].append(entry)
            continue

        days_since = (today - datetime.fromisoformat(last)).days
        if days_since <= ELIGIBILITY_DAYS:
            segments["active"].append(entry)
        elif days_since <= AT_RISK_DAYS:
            segments["atRisk"].append(entry)
        elif days_since <= DORMANT_DAYS:
            segments["dormant"].append(entry)
        else:
            segments["lapsed"].append(entry)

    summary = {k: len(v) for k, v in segments.items()}
    return _response(200, {"segments": segments, "summary": summary, "total": len(donors)})


def _pending_drives():
    result = drives_table.scan(
        FilterExpression=Attr("status").eq("pending_approval")
    )
    drives = result.get("Items", [])
    for d in drives:
        for k in ("capacity", "booked"):
            if k in d:
                d[k] = int(d[k])
    return _response(200, {"drives": drives, "count": len(drives)})


def _approve_drive(drive_id, event):
    approver = event["requestContext"]["authorizer"]["claims"]["sub"]
    drives_table.update_item(
        Key={"driveId": drive_id},
        UpdateExpression="SET #s = :s, approvedBy = :a, approvedAt = :t",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "upcoming",
            ":a": approver,
            ":t": datetime.utcnow().isoformat(),
        },
    )
    logger.info("Drive approved", drive_id=drive_id, approver=approver)
    return _response(200, {"driveId": drive_id, "status": "upcoming"})


def _reject_drive(drive_id):
    drives_table.update_item(
        Key={"driveId": drive_id},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "rejected"},
    )
    return _response(200, {"driveId": drive_id, "status": "rejected"})


def _blood_stock_overview():
    blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    stock = {}
    for bt in blood_types:
        result = blood_stock_table.query(
            KeyConditionExpression=Key("bloodType").eq(bt),
            ScanIndexForward=False,
            Limit=1,
        )
        items = result.get("Items", [])
        stock[bt] = {
            "units": int(items[0]["units"]) if items else 0,
            "updatedAt": items[0].get("updatedAt") if items else None,
        }
    return _response(200, {"stock": stock, "asOf": datetime.utcnow().isoformat()})


def _all_alerts():
    result = alerts_table.scan()
    alerts = result.get("Items", [])
    for a in alerts:
        for k in ("donorsNotified", "responses", "bookings"):
            if k in a:
                a[k] = int(a[k])
    alerts.sort(key=lambda x: x.get("activatedAt", ""), reverse=True)
    return _response(200, {"alerts": alerts, "count": len(alerts)})


def _traffic_incidents():
    """Relay live LTA DataMall traffic incidents (accidents & incidents) for the HSA ops feed."""
    if not LTA_ACCOUNT_KEY:
        logger.warning("LTA_ACCOUNT_KEY not configured — returning empty incident feed")
        return _response(200, {"incidents": [], "count": 0, "error": "LTA_ACCOUNT_KEY not configured"})

    req = urllib.request.Request(
        LTA_INCIDENTS_URL,
        headers={"AccountKey": LTA_ACCOUNT_KEY, "accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError):
        logger.exception("Failed to fetch LTA traffic incidents")
        return _response(502, {"error": "Could not reach LTA DataMall"})

    incidents = []
    for item in payload.get("value", []):
        if (item.get("Type") or "") != "Accident":
            continue
        incidents.append({
            "type": "Accident",
            "message": item.get("Message", ""),
            "latitude": item.get("Latitude"),
            "longitude": item.get("Longitude"),
            "tone": "critical",
        })

    logger.info("Traffic accidents fetched", count=len(incidents))
    return _response(200, {
        "incidents": incidents,
        "count": len(incidents),
        "asOf": datetime.utcnow().isoformat(),
    })


def _submit_hospital_demand(event):
    """HSA staff inputs upcoming procedure counts to feed into forecast."""
    body = json.loads(event.get("body") or "{}")
    hospital = body.get("hospital")
    blood_type = body.get("bloodType")
    procedure_count = body.get("procedureCount", 0)
    date = body.get("date")

    if not all([hospital, blood_type, date]):
        return _response(400, {"error": "hospital, bloodType, and date are required"})

    # Store demand signal in predictions table as a special marker
    predictions_table.put_item(Item={
        "bloodType": blood_type,
        "forecastDate": f"demand#{date}#{hospital}",
        "procedureCount": procedure_count,
        "hospital": hospital,
        "submittedAt": datetime.utcnow().isoformat(),
        "type": "hospital_demand",
    })

    logger.info("Hospital demand submitted", hospital=hospital, blood_type=blood_type, date=date)
    return _response(201, {"message": "Demand signal recorded", "hospital": hospital, "bloodType": blood_type, "date": date})


def _lookup_donor(event: dict) -> dict:
    """Look up a single donor by donorId — used by hospital check-in flow."""
    params = event.get("queryStringParameters") or {}
    donor_id = params.get("donorId")
    if not donor_id:
        return _response(400, {"error": "donorId query parameter is required"})

    result = donors_table.get_item(Key={"donorId": donor_id})
    donor = result.get("Item")
    if not donor:
        return _response(404, {"error": "Donor not found"})

    # Compute eligibility
    last_donated = donor.get("lastDonatedAt")
    if last_donated:
        from datetime import timedelta
        last_date = datetime.fromisoformat(last_donated)
        next_eligible = last_date + timedelta(days=ELIGIBILITY_DAYS)
        days_remaining = max(0, (datetime.now(timezone.utc) - next_eligible).days * -1)
        eligible = days_remaining == 0
    else:
        eligible = True
        days_remaining = 0

    return _response(200, {
        "donorId": donor.get("donorId"),
        "name": donor.get("name", "Unknown"),
        "bloodType": donor.get("bloodType", "—"),
        "eligible": eligible,
        "daysUntilEligible": days_remaining,
        "lastDonatedAt": last_donated,
    })


def _record_donation(event: dict) -> dict:
    """Record a completed donation — called by hospital staff after blood draw."""
    import uuid
    staff_id = event["requestContext"]["authorizer"]["claims"]["sub"]
    body = json.loads(event.get("body") or "{}")

    donor_id = body.get("donorId")
    blood_type = body.get("bloodType")
    volume_ml = int(body.get("volumeMl", 450))
    facility = body.get("facility", "HSA Bloodbank")
    donated_at = body.get("donatedAt", datetime.utcnow().isoformat())

    if not donor_id or not blood_type:
        return _response(400, {"error": "donorId and bloodType are required"})

    donation_id = str(uuid.uuid4())

    # Write to donations table — retain Lambda queries this for impact stats
    donations_table.put_item(Item={
        "donorId": donor_id,
        "donationId": donation_id,
        "bloodType": blood_type,
        "volumeMl": volume_ml,
        "donatedAt": donated_at,
        "facility": facility,
        "recordedBy": staff_id,
        "createdAt": datetime.utcnow().isoformat(),
    })

    # Update donor's lastDonatedAt so eligibility recalculates correctly
    donors_table.update_item(
        Key={"donorId": donor_id},
        UpdateExpression="SET lastDonatedAt = :d",
        ExpressionAttributeValues={":d": donated_at},
    )

    logger.info("Donation recorded", donor_id=donor_id, donation_id=donation_id, blood_type=blood_type)
    return _response(201, {
        "donationId": donation_id,
        "donorId": donor_id,
        "bloodType": blood_type,
        "volumeMl": volume_ml,
        "donatedAt": donated_at,
        "patientsReached": 3,
    })
