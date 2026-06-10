import base64
import html
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr
from botocore.config import Config

logger = Logger()
dynamodb = boto3.resource("dynamodb")
ses = boto3.client("ses", config=Config(connect_timeout=5, read_timeout=10, retries={"max_attempts": 2}))
sns = boto3.client("sns", config=Config(connect_timeout=5, read_timeout=10, retries={"max_attempts": 2}))
donors_table = dynamodb.Table(os.environ["DONORS_TABLE"])
alerts_table = dynamodb.Table(os.environ["ALERTS_TABLE"])
hospitals_table = dynamodb.Table(os.environ.get("HOSPITALS_TABLE", "bloodline-hospitals-dev"))
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "")

# VAPID (Web Push). Bodyless pushes — the service worker renders the text, so we
# only need to sign the VAPID JWT (ES256) and POST to each subscription endpoint.
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:bloodlineapps@gmail.com")
# Public donor-app URL used as the email call-to-action target (blank → no link)
APP_URL = os.environ.get("APP_URL", "")
# SMS is a billable, outward-facing channel — opt-in via env flag (default off)
SMS_ENABLED = os.environ.get("SMS_ENABLED", "false").lower() == "true"
SMS_SENDER_ID = os.environ.get("SMS_SENDER_ID", "")

# Brand tokens mirrored from frontend/src/tokens.js so emails match the app
_SURGE = "#d62828"
_SURGE_BG = "#fdecec"
_PAPER = "#fafaf9"
_INK = "#1a1917"
_INK2 = "#3c3a36"
_MUTED = "#6b6862"
_FAINT = "#a8a49d"
_HAIR = "#e7e4dd"
_RED_INK = "#7a1f1a"
_SANS = "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
_MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

# Surge tier radii in km. island-wide = no distance filter (everyone).
TIER_RADIUS_KM = {"5km": 5.0, "15km": 15.0, "island-wide": None}
# A live device fix older than this falls back to the donor's home location.
LIVE_FIX_FRESHNESS_HOURS = 3


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two lat/lng points, in km."""
    r = 6371.0
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (math.sin(d_phi / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lambda / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


def _effective_location(donor: dict) -> tuple[float, float] | None:
    """Freshest known donor location: a recent live fix, else home. None if unknown."""
    live_seen = donor.get("liveSeenAt")
    if live_seen and donor.get("liveLat") is not None and donor.get("liveLng") is not None:
        try:
            seen = datetime.fromisoformat(live_seen)
            if seen.tzinfo is None:
                seen = seen.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - seen <= timedelta(hours=LIVE_FIX_FRESHNESS_HOURS):
                return float(donor["liveLat"]), float(donor["liveLng"])
        except ValueError:
            pass
    if donor.get("homeLat") is not None and donor.get("homeLng") is not None:
        return float(donor["homeLat"]), float(donor["homeLng"])
    return None


def _hospital_coords() -> list[tuple[float, float]]:
    """Reference points for radius tiers: every hospital/blood bank with coordinates."""
    items = hospitals_table.scan(ProjectionExpression="lat, lng").get("Items", [])
    coords = []
    for h in items:
        if h.get("lat") is not None and h.get("lng") is not None:
            coords.append((float(h["lat"]), float(h["lng"])))
    return coords


def _within_radius(donor: dict, banks: list[tuple[float, float]], radius_km: float) -> bool:
    """True if the donor's effective location is within radius_km of any blood bank."""
    loc = _effective_location(donor)
    if loc is None:
        return False  # unknown location → not matched for narrow tiers
    dlat, dlng = loc
    return any(_haversine_km(dlat, dlng, blat, blng) <= radius_km for blat, blng in banks)


def _scan_all(filter_expr=None) -> list:
    """Scan the donors table fully, following pagination (1MB page cap).

    Pass filter_expr=None to return every donor (used for island-wide surges).
    """
    items = []
    kwargs = {"FilterExpression": filter_expr} if filter_expr is not None else {}
    while True:
        result = donors_table.scan(**kwargs)
        items.extend(result.get("Items", []))
        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            return items
        kwargs["ExclusiveStartKey"] = last_key


@logger.inject_lambda_context
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    for record in event.get("Records", []):
        message = json.loads(record["Sns"]["Message"])
        _dispatch_notifications(message)
    return {"statusCode": 200}


def _dispatch_notifications(message: dict) -> None:
    alert_id = message["alertId"]
    # Accept a list of blood types (bloodTypes) or a single one (bloodType, legacy)
    blood_types = message.get("bloodTypes")
    if not blood_types:
        single = message.get("bloodType")
        blood_types = [single] if single else []
    geo_tier = message["geoTier"]
    blood_label = "/".join(blood_types) if blood_types else "blood"
    alert_message = message.get("message") or f"Urgent: {blood_label} blood needed!"

    logger.info("Dispatching notifications", alert_id=alert_id, blood_types=blood_types, geo_tier=geo_tier)

    # A surge always targets its blood type(s) — a donor is only alerted if their
    # type matches. The tier only controls geography: island-wide = anywhere,
    # narrower tiers add a radius filter below. (`eligible` is computed at
    # read-time, never stored, so it can't be used as a scan filter.)
    type_filter = None
    for bt in blood_types:
        cond = Attr("bloodType").eq(bt)
        type_filter = cond if type_filter is None else (type_filter | cond)
    donors = _scan_all(type_filter)

    # Geo radius filter for narrow tiers: keep donors within N km of any blood bank
    # (freshest of live device location or geocoded home). island-wide skips this.
    radius_km = TIER_RADIUS_KM.get(geo_tier)
    if radius_km is not None:
        banks = _hospital_coords()
        before = len(donors)
        if banks:
            donors = [d for d in donors if _within_radius(d, banks, radius_km)]
        else:
            logger.warning("No hospital coordinates available — radius filter skipped", alert_id=alert_id)
        logger.info("Radius filter applied", alert_id=alert_id, radius_km=radius_km, banks=len(banks), before=before, after=len(donors))

    # Honour the opt-out the alert email/SMS advertise ("opt out in Profile >
    # Notifications"). A donor with surgeOptOut set is dropped from every channel
    # (email, push, SMS) and from the notified count — not just suppressed silently.
    opted_in = [d for d in donors if not d.get("surgeOptOut")]
    if len(opted_in) != len(donors):
        logger.info("Opt-outs excluded", alert_id=alert_id, excluded=len(donors) - len(opted_in))
    donors = opted_in

    logger.info("Donors matched for surge", alert_id=alert_id, blood_types=blood_types, geo_tier=geo_tier, matched=len(donors))

    # Every matched donor is moved into surge mode and sees the in-app alert
    # banner (the donor app polls /surge/monitor), so they all count as notified.
    # Email + push are supplementary channels, tracked separately.
    notified = len(donors)
    emails_sent = 0
    push_sent = 0
    sms_sent = 0
    for donor in donors:
        sub = donor.get("pushSubscription")
        if sub and _send_web_push(sub, alert_id):
            push_sent += 1

        email = donor.get("email")
        if email and _send_email(email, blood_label, alert_message, alert_id):
            emails_sent += 1

        phone = donor.get("phone")
        if SMS_ENABLED and phone and _send_sms(phone, blood_label, alert_message, alert_id):
            sms_sent += 1

    # Update alert with notification counts (surfaced live on the HSA console + donor site)
    alerts_table.update_item(
        Key={"alertId": alert_id},
        UpdateExpression="SET donorsNotified = :n, emailsSent = :e, pushSent = :p, smsSent = :s, lastUpdated = :t",
        ExpressionAttributeValues={
            ":n": notified,
            ":e": emails_sent,
            ":p": push_sent,
            ":s": sms_sent,
            ":t": datetime.utcnow().isoformat(),
        },
    )

    logger.info("Notifications dispatched", alert_id=alert_id, notified=notified, emails=emails_sent, push=push_sent, sms=sms_sent)


def _send_push(push_token: str, blood_type: str, message: str, alert_id: str) -> None:
    """
    Push notification stub. In production: integrate AWS SNS mobile push or Expo push API.
    For hackathon: log the intent; wire up the real push service before demo.
    """
    logger.info(
        "Push notification queued",
        push_token=push_token[:8] + "...",
        blood_type=blood_type,
        alert_id=alert_id,
        message=message,
    )
    # TODO: Replace with real push delivery:
    # sns_client.publish(TargetArn=push_token, Message=message, ...)
    # or: requests.post("https://exp.host/--/api/v2/push/send", ...)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _vapid_jwt(audience: str) -> str:
    """Sign a VAPID JWT (ES256) with the private key, using pure-Python ecdsa."""
    import hashlib

    import ecdsa

    header = _b64url(json.dumps({"typ": "JWT", "alg": "ES256"}).encode())
    claims = _b64url(json.dumps({
        "aud": audience,
        "exp": int(time.time()) + 12 * 3600,
        "sub": VAPID_SUBJECT,
    }).encode())
    signing_input = f"{header}.{claims}".encode()
    sk = ecdsa.SigningKey.from_string(_b64url_decode(VAPID_PRIVATE_KEY), curve=ecdsa.NIST256p, hashfunc=hashlib.sha256)
    sig = sk.sign_deterministic(signing_input, hashfunc=hashlib.sha256)  # raw r||s (64 bytes)
    return f"{signing_input.decode()}.{_b64url(sig)}"


def _send_web_push(subscription: dict, alert_id: str) -> bool:
    """Send a bodyless Web Push to one subscription. Returns True on accept."""
    if not (VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY):
        logger.warning("VAPID keys not configured — skipping web push", alert_id=alert_id)
        return False
    endpoint = (subscription or {}).get("endpoint")
    if not endpoint:
        return False

    parsed = urllib.parse.urlparse(endpoint)
    audience = f"{parsed.scheme}://{parsed.netloc}"
    try:
        jwt = _vapid_jwt(audience)
        req = urllib.request.Request(endpoint, data=b"", method="POST")
        req.add_header("Authorization", f"vapid t={jwt}, k={VAPID_PUBLIC_KEY}")
        req.add_header("TTL", "86400")
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310 (push service endpoint)
            return resp.status in (200, 201, 202)
    except urllib.error.HTTPError as e:
        # 404/410 = subscription gone; caller may prune it later
        logger.info("Web push rejected", alert_id=alert_id, code=e.code)
        return False
    except Exception:
        logger.exception("Web push error", alert_id=alert_id)
        return False


def _badge_font_size(label: str) -> int:
    """Shrink the blood-type badge text so multi-type labels (e.g. 'O-/A-') still fit."""
    n = len(label)
    if n <= 2:
        return 38
    if n <= 3:
        return 32
    if n <= 5:
        return 23
    return 17


def _render_email_html(blood_type: str, message: str, alert_id: str) -> str:
    """Brand-matched HTML surge alert. Table-based + inline styles for email-client compatibility."""
    safe_type = html.escape(blood_type)
    safe_msg = html.escape(message)
    preheader = html.escape(message[:140])
    badge_size = _badge_font_size(blood_type)
    cta_href = APP_URL or "#"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Bloodline surge alert</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  body {{ margin:0; padding:0; }}
  a {{ text-decoration:none; }}
  @media only screen and (max-width:620px) {{
    .card {{ width:100% !important; border-radius:0 !important; }}
    .pad {{ padding-left:22px !important; padding-right:22px !important; }}
    .h1 {{ font-size:23px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{_PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:{_PAPER};">{preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{_PAPER};">
 <tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid {_HAIR};border-radius:16px;overflow:hidden;">

   <tr><td style="height:5px;line-height:5px;font-size:0;background:{_SURGE};">&nbsp;</td></tr>

   <tr><td class="pad" style="padding:24px 32px 6px;">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
       <td align="left" style="font-family:{_SANS};font-size:17px;font-weight:700;color:{_INK};letter-spacing:-0.2px;">
         <span style="font-size:18px;">&#129656;</span>&nbsp;Bloodline
       </td>
       <td align="right">
         <span style="display:inline-block;background:{_SURGE_BG};color:#b3261e;font-family:{_MONO};font-size:10px;font-weight:600;letter-spacing:1.5px;padding:6px 11px;border-radius:999px;border:1px solid #f6cfcf;">HSA SURGE ALERT</span>
       </td>
     </tr></table>
   </td></tr>

   <tr><td align="center" style="padding:20px 32px 2px;">
     <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
       <td align="center" valign="middle" width="92" height="92" style="width:92px;height:92px;background:{_SURGE};border-radius:50%;color:#ffffff;font-family:{_SANS};font-size:{badge_size}px;font-weight:700;letter-spacing:-0.5px;text-align:center;">{safe_type}</td>
     </tr></table>
   </td></tr>

   <tr><td class="pad" align="center" style="padding:18px 32px 0;">
     <h1 class="h1" style="margin:0;font-family:{_SANS};font-size:26px;line-height:1.25;font-weight:700;color:{_INK};letter-spacing:-0.4px;">Urgent: {safe_type} blood needed</h1>
   </td></tr>
   <tr><td class="pad" align="center" style="padding:10px 44px 0;">
     <p style="margin:0;font-family:{_SANS};font-size:15px;line-height:1.6;color:{_MUTED};">A surge alert has been activated. Eligible donors are being called in now.</p>
   </td></tr>

   <tr><td class="pad" style="padding:24px 32px 0;">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{_SURGE_BG};border-radius:10px;">
       <tr>
         <td width="4" style="width:4px;background:{_SURGE};border-radius:10px 0 0 10px;font-size:0;line-height:0;">&nbsp;</td>
         <td style="padding:16px 18px;font-family:{_SANS};font-size:15px;line-height:1.6;color:{_RED_INK};">{safe_msg}</td>
       </tr>
     </table>
   </td></tr>

   <tr><td class="pad" align="center" style="padding:28px 32px 6px;">
     <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
       <td align="center" bgcolor="{_SURGE}" style="border-radius:12px;">
         <a href="{cta_href}" style="display:inline-block;padding:15px 34px;font-family:{_SANS};font-size:15px;font-weight:600;color:#ffffff;border-radius:12px;">Open the Bloodline app &rarr;</a>
       </td>
     </tr></table>
   </td></tr>
   <tr><td class="pad" align="center" style="padding:0 32px;">
     <p style="margin:8px 0 0;font-family:{_SANS};font-size:12px;color:{_FAINT};">Book a slot in seconds &middot; every unit counts</p>
   </td></tr>

   <tr><td class="pad" style="padding:26px 32px 0;">
     <div style="border-top:1px solid {_HAIR};font-size:0;line-height:0;">&nbsp;</div>
   </td></tr>
   <tr><td class="pad" style="padding:18px 32px 0;">
     <p style="margin:0;font-family:{_SANS};font-size:13px;line-height:1.6;color:{_MUTED};">
       <strong style="color:{_INK2};">Why am I getting this?</strong><br>
       You're a registered {safe_type} donor and HSA has activated a surge alert for your blood type. If you're within your eligibility window, please consider booking a donation slot.
     </p>
   </td></tr>

   <tr><td class="pad" style="padding:22px 32px 30px;">
     <p style="margin:0;font-family:{_SANS};font-size:12px;line-height:1.6;color:{_FAINT};">
       Don't want surge alerts? Turn them off anytime in <span style="color:{_MUTED};">Profile &rsaquo; Notifications</span>.<br>
       Bloodline &middot; in partnership with HSA Singapore
     </p>
   </td></tr>
  </table>

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <tr><td align="center" style="padding:14px 0 0;font-family:{_MONO};font-size:10px;color:#c9c5bd;letter-spacing:0.5px;">Alert ref {alert_id}</td></tr>
  </table>

 </td></tr>
</table>
</body>
</html>"""


def _send_email(email: str, blood_type: str, message: str, alert_id: str) -> bool:
    """Send a surge alert email to a donor via SES. Returns True on success.

    Sends a multipart message: a brand-matched HTML part plus a plain-text
    fallback (better rendering everywhere + healthier spam score than text-only).
    """
    if not SENDER_EMAIL:
        logger.warning("SENDER_EMAIL not configured — skipping email", alert_id=alert_id)
        return False

    subject = f"Urgent: {blood_type} blood needed — Bloodline surge alert"
    body_text = (
        f"{message}\n\n"
        f"You're receiving this because you're a registered {blood_type} donor and HSA has "
        f"activated a surge alert. If you're eligible, please open the Bloodline app to book a "
        f"slot. You can opt out of surge alerts in Profile -> Notifications."
    )
    body_html = _render_email_html(blood_type, message, alert_id)

    try:
        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": body_text, "Charset": "UTF-8"},
                    "Html": {"Data": body_html, "Charset": "UTF-8"},
                },
            },
        )
        logger.info("Surge email sent", alert_id=alert_id, blood_type=blood_type)
        return True
    except Exception:
        logger.exception("Failed to send surge email", alert_id=alert_id)
        return False


def _normalize_sg_phone(raw: str) -> str | None:
    """Best-effort E.164 for Singapore numbers — SNS requires +<country><number>.

    Returns None for formats we can't confidently normalise, so we skip rather
    than publish a malformed number.
    """
    raw = (raw or "").strip()
    if raw.startswith("+"):
        digits = "".join(ch for ch in raw if ch.isdigit())
        return "+" + digits if digits else None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) == 8:                       # local SG mobile/landline
        return "+65" + digits
    if len(digits) == 10 and digits.startswith("65"):
        return "+" + digits
    return None


def _send_sms(phone: str, blood_type: str, message: str, alert_id: str) -> bool:
    """Send a surge alert SMS via SNS. Returns True on success."""
    number = _normalize_sg_phone(phone)
    if not number:
        logger.warning("Skipping SMS — unrecognised phone format", alert_id=alert_id)
        return False

    text = f"{message} Open Bloodline to book a slot. Opt out in Profile > Notifications."
    attrs = {"AWS.SNS.SMS.SMSType": {"DataType": "String", "StringValue": "Transactional"}}
    if SMS_SENDER_ID:
        attrs["AWS.SNS.SMS.SenderID"] = {"DataType": "String", "StringValue": SMS_SENDER_ID}

    try:
        sns.publish(PhoneNumber=number, Message=text, MessageAttributes=attrs)
        logger.info("Surge SMS sent", alert_id=alert_id, blood_type=blood_type)
        return True
    except Exception:
        logger.exception("Failed to send surge SMS", alert_id=alert_id)
        return False
