import zipfile, os, tempfile

tmp = tempfile.gettempdir()

# ── State sync Lambda ────────────────────────────────────────
state_code = r'''import json, os, boto3, time
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["STATE_TABLE_NAME"])

def _coerce(value):
    if isinstance(value, float): return Decimal(str(value))
    if isinstance(value, list): return [_coerce(i) for i in value]
    if isinstance(value, dict): return {k: _coerce(v) for k, v in value.items()}
    return value

def _resp(code, body):
    return {"statusCode": code, "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type"}, "body": json.dumps(body, default=str)}

def handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    claims = ((event.get("requestContext") or {}).get("authorizer") or {}).get("jwt", {}).get("claims", {})
    user_sub = claims.get("sub")
    if not user_sub: return _resp(401, {"error": "missing_sub"})
    if method == "GET":
        result = table.query(KeyConditionExpression=boto3.dynamodb.conditions.Key("userSub").eq(user_sub))
        items = result.get("Items", [])
        out = {}
        for item in items:
            key = item.get("scopedKey", "")
            payload = item.get("payload")
            if payload is not None:
                out[key] = json.loads(json.dumps(payload, default=str))
        return _resp(200, {"ok": True, "state": out})
    body = json.loads(event.get("body") or "{}")
    scoped_key = body.get("scopedKey")
    if not scoped_key: return _resp(400, {"error": "missing_scoped_key"})
    item = {"userSub": user_sub, "scopedKey": scoped_key, "module": body.get("module") or "", "storageScope": body.get("storageScope") or "", "updatedAt": int(body.get("updatedAt") or int(time.time() * 1000)), "payload": _coerce(body.get("payload"))}
    table.put_item(Item=item)
    return _resp(200, {"ok": True, "scopedKey": scoped_key})
'''

# ── Activity log Lambda ──────────────────────────────────────
activity_code = r'''import json, os, time, boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["ACTIVITY_TABLE_NAME"])

def _resp(code, body):
    return {"statusCode": code, "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type"}, "body": json.dumps(body)}

def handler(event, context):
    claims = ((event.get("requestContext") or {}).get("authorizer") or {}).get("jwt", {}).get("claims", {})
    user_sub = claims.get("sub")
    if not user_sub: return _resp(401, {"error": "missing_sub"})
    body = json.loads(event.get("body") or "{}")
    ts = int(body.get("ts") or int(time.time() * 1000))
    ttl = int(time.time()) + (30 * 24 * 60 * 60)
    item = {"userSub": user_sub, "activityTs": ts, "activityId": body.get("id") or f"log-{ts}", "module": body.get("module") or "", "action": body.get("action") or "", "label": body.get("label") or "", "storageScope": body.get("storageScope") or "", "app": body.get("app") or "", "version": body.get("version") or "", "ttl": ttl}
    table.put_item(Item=item)
    return _resp(200, {"ok": True, "activityTs": ts})
'''

for name, code in [("hp_state", state_code), ("hp_activity", activity_code)]:
    zpath = os.path.join(tmp, f"{name}.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.py", code)
    print(f"Created {zpath} ({os.path.getsize(zpath)} bytes)")
