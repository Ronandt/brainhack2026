import json
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
events = boto3.client("events")
sns = boto3.client("sns")
lambda_client = boto3.client("lambda")
sts = boto3.client("sts")

TABLES = {
    "donors": os.environ["DONORS_TABLE"],
    "donations": os.environ["DONATIONS_TABLE"],
    "predictions": os.environ["PREDICTIONS_TABLE"],
    "bloodStock": os.environ["BLOOD_STOCK_TABLE"],
    "drives": os.environ["BLOOD_DRIVES_TABLE"],
    "bookings": os.environ["BOOKINGS_TABLE"],
    "alerts": os.environ["ALERTS_TABLE"],
}

FUNCTIONS = {
    "hsa-sync": os.environ.get("HSA_SYNC_FUNCTION"),
    "predict": os.environ.get("PREDICT_FUNCTION"),
}


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def lambda_handler(event, context):
    method = event["httpMethod"]
    path = event.get("path", "")

    if "/diagnostics" in path and method == "GET":
        return _run_diagnostics()
    if "/trigger" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        return _trigger(body.get("target"))

    return _response(404, {"error": "Not found"})


def _run_diagnostics():
    results = {"timestamp": datetime.utcnow().isoformat(), "checks": {}}

    # 1. STS — AWS connectivity
    try:
        identity = sts.get_caller_identity()
        results["checks"]["aws_identity"] = {
            "status": "ok",
            "accountId": identity["Account"],
            "arn": identity["Arn"],
        }
    except Exception as e:
        results["checks"]["aws_identity"] = {"status": "error", "error": str(e)}

    # 2. DynamoDB — item counts per table
    results["checks"]["dynamodb"] = {}
    for name, table_name in TABLES.items():
        try:
            table = dynamodb.Table(table_name)
            count = table.scan(Select="COUNT")["Count"]
            results["checks"]["dynamodb"][name] = {"status": "ok", "itemCount": count, "tableName": table_name}
        except Exception as e:
            results["checks"]["dynamodb"][name] = {"status": "error", "error": str(e)}

    # 3. EventBridge — check rules are enabled
    results["checks"]["eventbridge"] = {}
    try:
        rules = events.list_rules(NamePrefix="bloodline")["Rules"]
        for rule in rules:
            results["checks"]["eventbridge"][rule["Name"]] = {
                "status": "ok",
                "state": rule["State"],
                "schedule": rule.get("ScheduleExpression", "—"),
            }
        if not rules:
            results["checks"]["eventbridge"]["_note"] = "No rules found with prefix 'bloodline'"
    except Exception as e:
        results["checks"]["eventbridge"]["error"] = str(e)

    # 4. SNS topic
    try:
        topic_arn = os.environ["SURGE_ALERT_TOPIC"]
        attrs = sns.get_topic_attributes(TopicArn=topic_arn)["Attributes"]
        results["checks"]["sns"] = {
            "status": "ok",
            "topicArn": topic_arn,
            "subscriptions": attrs.get("SubscriptionsConfirmed", "0"),
        }
    except Exception as e:
        results["checks"]["sns"] = {"status": "error", "error": str(e)}

    # 5. Predictions freshness — when was the last forecast generated?
    try:
        table = dynamodb.Table(TABLES["predictions"])
        items = table.scan(Limit=1).get("Items", [])
        last_generated = items[0].get("generatedAt") if items else None
        results["checks"]["predictions_freshness"] = {
            "status": "ok" if last_generated else "empty",
            "lastGeneratedAt": last_generated,
            "note": "Run trigger predict to populate" if not last_generated else None,
        }
    except Exception as e:
        results["checks"]["predictions_freshness"] = {"status": "error", "error": str(e)}

    # 6. Blood stock freshness
    try:
        table = dynamodb.Table(TABLES["bloodStock"])
        items = table.scan(Limit=1).get("Items", [])
        last_updated = items[0].get("updatedAt") if items else None
        results["checks"]["blood_stock_freshness"] = {
            "status": "ok" if last_updated else "empty",
            "lastUpdatedAt": last_updated,
            "note": "Run trigger hsa-sync to populate" if not last_updated else None,
        }
    except Exception as e:
        results["checks"]["blood_stock_freshness"] = {"status": "error", "error": str(e)}

    overall = "ok" if all(
        c.get("status") == "ok"
        for section in results["checks"].values()
        for c in (section.values() if isinstance(section, dict) else [section])
        if isinstance(c, dict) and "status" in c
    ) else "degraded"

    results["overall"] = overall
    return _response(200, results)


def _trigger(target):
    if target not in FUNCTIONS or not FUNCTIONS[target]:
        return _response(400, {"error": f"Unknown target '{target}'. Valid: {list(FUNCTIONS.keys())}"})

    try:
        resp = lambda_client.invoke(
            FunctionName=FUNCTIONS[target],
            InvocationType="Event",  # async
            Payload=json.dumps({"source": "eventbridge"}),
        )
        return _response(200, {
            "triggered": target,
            "statusCode": resp["StatusCode"],
            "message": f"{target} triggered successfully (async — check DynamoDB in ~5s)",
        })
    except Exception as e:
        return _response(500, {"error": str(e)})
