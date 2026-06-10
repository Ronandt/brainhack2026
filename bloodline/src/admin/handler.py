import json
import os
import urllib.error
import urllib.request
import uuid
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
notifs_table = dynamodb.Table(os.environ.get("NOTIFICATIONS_TABLE", f"bloodline-notifications-{os.environ.get('STAGE', 'dev')}"))

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


def _is_redcross(event):
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    return "RedCrossSG" in claims.get("cognito:groups", "")


def _is_hospital_or_admin(event):
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    groups = claims.get("cognito:groups", "")
    return "HospitalStaff" in groups or "HSAAdmin" in groups


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    try:
        return _dispatch(event)
    except Exception:
        # Always return a CORS-headed error — an unhandled exception otherwise
        # escapes to API Gateway as a bare 500 with no CORS header, which the
        # browser misreports as a CORS failure.
        logger.exception("Unhandled error in admin handler")
        return _response(500, {"error": "Internal server error"})


def _dispatch(event: dict) -> dict:
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

    # Red Cross final approval routes
    if "/redcross/drives/pending" in path and method == "GET":
        if not _is_redcross(event):
            return _response(403, {"error": "Red Cross access required"})
        return _redcross_pending_drives()
    if "/redcross/drives/" in path and "/approve" in path and method == "POST":
        if not _is_redcross(event):
            return _response(403, {"error": "Red Cross access required"})
        drive_id = path.split("/drives/")[1].split("/approve")[0]
        return _redcross_approve_drive(drive_id, event)
    if "/redcross/drives/" in path and "/reject" in path and method == "POST":
        if not _is_redcross(event):
            return _response(403, {"error": "Red Cross access required"})
        drive_id = path.split("/drives/")[1].split("/reject")[0]
        return _redcross_reject_drive(drive_id, event)

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
    if "/admin/drives/" in path and "/notify-donor" in path and method == "POST":
        drive_id = path.split("/drives/")[1].split("/notify-donor")[0]
        return _notify_donor_of_src_rejection(drive_id)
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
    today = datetime.now(timezone.utc)

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

        # Stored dates may be tz-aware (…+00:00) or naive — normalise to UTC so the
        # subtraction below can't raise "can't subtract offset-naive and offset-aware".
        try:
            last_dt = datetime.fromisoformat(last)
        except ValueError:
            segments["neverDonated"].append(entry)
            continue
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)

        days_since = (today - last_dt).days
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


def _write_notification(donor_id, notif_type, drive_id, drive_title, message, reason=""):
    now = datetime.now(timezone.utc)
    notifs_table.put_item(Item={
        "donorId": donor_id,
        "notifId": str(uuid.uuid4()),
        "type": notif_type,
        "driveId": drive_id,
        "driveTitle": drive_title,
        "message": message,
        "reason": reason,
        "read": False,
        "createdAt": now.isoformat(),
        "ttl": int(now.timestamp()) + 90 * 24 * 3600,
    })


def _pending_drives():
    result = drives_table.scan(
        FilterExpression=Attr("status").eq("pending_approval") | Attr("status").eq("redcross_rejected")
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
        UpdateExpression="SET #s = :s, approvedBy = :a, approvedAt = :t REMOVE redCrossRejectedReason, redCrossRejectedBy, redCrossRejectedAt",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "pending_redcross_approval",
            ":a": approver,
            ":t": datetime.now(timezone.utc).isoformat(),
        },
    )
    logger.info("Drive approved", drive_id=drive_id, approver=approver)
    return _response(200, {"driveId": drive_id, "status": "pending_redcross_approval"})


def _reject_drive(drive_id):
    result = drives_table.get_item(Key={"driveId": drive_id})
    drive = result.get("Item", {})
    creator_id = drive.get("createdBy")
    drive_title = drive.get("name", "Your blood drive")

    drives_table.update_item(
        Key={"driveId": drive_id},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "rejected"},
    )
    if creator_id:
        _write_notification(
            creator_id, "drive_rejected_hsa", drive_id, drive_title,
            f"Your drive request \"{drive_title}\" was reviewed by HSA and could not be approved at this time.",
        )
    return _response(200, {"driveId": drive_id, "status": "rejected"})


def _redcross_pending_drives():
    result = drives_table.scan(
        FilterExpression=Attr("status").eq("pending_redcross_approval")
    )
    drives = result.get("Items", [])
    for d in drives:
        for k in ("capacity", "booked"):
            if k in d:
                d[k] = int(d[k])
    return _response(200, {"drives": drives, "count": len(drives)})


def _redcross_approve_drive(drive_id, event):
    approver = event["requestContext"]["authorizer"]["claims"]["sub"]
    result = drives_table.get_item(Key={"driveId": drive_id})
    drive = result.get("Item", {})
    creator_id = drive.get("createdBy")
    drive_title = drive.get("name", "Your blood drive")

    drives_table.update_item(
        Key={"driveId": drive_id},
        UpdateExpression="SET #s = :s, redCrossApprovedBy = :a, redCrossApprovedAt = :t REMOVE redCrossRejectedReason",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "upcoming",
            ":a": approver,
            ":t": datetime.now(timezone.utc).isoformat(),
        },
    )
    if creator_id:
        _write_notification(
            creator_id, "drive_approved", drive_id, drive_title,
            f"Great news! Your drive request \"{drive_title}\" has been fully approved by HSA and the Red Cross. It is now live.",
        )
    logger.info("Drive approved by Red Cross", drive_id=drive_id, approver=approver)
    return _response(200, {"driveId": drive_id, "status": "upcoming"})


def _redcross_reject_drive(drive_id, event):
    body = json.loads(event.get("body") or "{}")
    reason = (body.get("reason") or "").strip()
    if not reason:
        return _response(400, {"error": "reason is required"})

    rejector = event["requestContext"]["authorizer"]["claims"]["sub"]
    drives_table.update_item(
        Key={"driveId": drive_id},
        UpdateExpression="SET #s = :s, redCrossRejectedBy = :r, redCrossRejectedAt = :t, redCrossRejectedReason = :reason",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "redcross_rejected",
            ":r": rejector,
            ":t": datetime.now(timezone.utc).isoformat(),
            ":reason": reason,
        },
    )
    logger.info("Drive rejected by Red Cross", drive_id=drive_id, rejector=rejector)
    return _response(200, {"driveId": drive_id, "status": "redcross_rejected", "reason": reason})


def _notify_donor_of_src_rejection(drive_id):
    """HSA admin manually notifies the donor after reviewing a Red Cross rejection."""
    result = drives_table.get_item(Key={"driveId": drive_id})
    drive = result.get("Item", {})
    creator_id = drive.get("createdBy")
    if not creator_id:
        return _response(404, {"error": "Drive not found or has no requesting donor"})
    if drive.get("status") != "redcross_rejected":
        return _response(400, {"error": "Drive is not in redcross_rejected state"})

    drive_title = drive.get("name", "Your blood drive")
    reason = drive.get("redCrossRejectedReason", "")
    _write_notification(
        creator_id, "drive_rejected_src", drive_id, drive_title,
        f"HSA has reviewed your drive request \"{drive_title}\". Unfortunately the Red Cross was unable to approve it.",
        reason=reason,
    )
    logger.info("Donor notified of Red Cross rejection", drive_id=drive_id, donor_id=creator_id)
    return _response(200, {"notified": True, "driveId": drive_id, "donorId": creator_id})


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
    return _response(200, {"stock": stock, "asOf": datetime.now(timezone.utc).isoformat()})


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
        "asOf": datetime.now(timezone.utc).isoformat(),
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
        "submittedAt": datetime.now(timezone.utc).isoformat(),
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
        last_date = datetime.fromisoformat(last_donated)
        if last_date.tzinfo is None:
            last_date = last_date.replace(tzinfo=timezone.utc)
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
    donated_at = body.get("donatedAt", datetime.now(timezone.utc).isoformat())

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
        "createdAt": datetime.now(timezone.utc).isoformat(),
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
