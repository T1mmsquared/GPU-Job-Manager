#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"

if [[ -z "${TOKEN:-}" ]]; then
  echo "TOKEN is not set."
  echo "Run: eval \"\$(./scripts/login.sh | tail -n 4)\""
  exit 1
fi

LAST_BODY=""
LAST_STATUS=""

request() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local body_file
  body_file="$(mktemp)"

  local status
  if [[ -n "$data" ]]; then
    status="$(curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$data")"
  else
    status="$(curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN")"
  fi

  LAST_BODY="$(cat "$body_file")"
  LAST_STATUS="$status"
  rm -f "$body_file"
}

expect_status() {
  local expected="$1"
  if [[ "$LAST_STATUS" != "$expected" ]]; then
    echo "Expected HTTP $expected but got $LAST_STATUS"
    echo "$LAST_BODY"
    exit 1
  fi
}

json_field() {
  local field="$1"
  python3 -c "import sys, json; print(json.load(sys.stdin)$field)" <<< "$LAST_BODY"
}

wait_for_job_status() {
  local job_id="$1"
  local expected="$2"
  local attempts="${3:-15}"
  local delay="${4:-1}"

  for ((i=1; i<=attempts; i++)); do
    request GET "$BASE_URL/jobs/$job_id"
    expect_status 200
    local status_val
    status_val="$(json_field "['status']")"
    echo "job=$job_id attempt=$i status=$status_val"
    if [[ "$status_val" == "$expected" ]]; then
      return 0
    fi
    sleep "$delay"
  done

  echo "Timed out waiting for job $job_id to reach status=$expected"
  echo "$LAST_BODY"
  exit 1
}

assert_job_missing() {
  local job_id="$1"
  request GET "$BASE_URL/jobs/$job_id"
  expect_status 404
}

assert_artifact_missing() {
  local job_id="$1"
  request GET "$BASE_URL/jobs/$job_id/artifact"
  expect_status 404
}

assert_events_contain() {
  local needle="$1"
  python3 -c '
import json, sys
needle = sys.argv[1]
try:
    events = json.load(sys.stdin)
except Exception as e:
    print("Failed to parse JSON:", e)
    raise
types = [e.get("event_type") for e in events]
if needle not in types:
    print("Missing event_type:", needle)
    print("Saw:", types)
    raise SystemExit(1)
' "$needle" <<< "$LAST_BODY"
}


echo "== submit succeeded job =="
request POST "$BASE_URL/jobs" '{"model_name":"llama3.1","params":{"prompt":"success case"}}'
expect_status 201
echo "$LAST_BODY"
SUCCESS_JOB_ID="$(json_field "['id']")"
echo "SUCCESS_JOB_ID=$SUCCESS_JOB_ID"

echo
echo "== submit failed job =="
request POST "$BASE_URL/jobs" '{"model_name":"llama3.1","params":{"prompt":"failure case","should_fail":true}}'
expect_status 201
echo "$LAST_BODY"
FAILED_JOB_ID="$(json_field "['id']")"
echo "FAILED_JOB_ID=$FAILED_JOB_ID"

echo
echo "== wait for success/failure jobs =="
wait_for_job_status "$SUCCESS_JOB_ID" "succeeded" 15 1
wait_for_job_status "$FAILED_JOB_ID" "failed" 15 1

echo
echo "== verify succeeded job =="
request GET "$BASE_URL/jobs/$SUCCESS_JOB_ID"
expect_status 200
echo "$LAST_BODY"

request GET "$BASE_URL/jobs/$SUCCESS_JOB_ID/events"
expect_status 200
echo "$LAST_BODY"
assert_events_contain "queued"
assert_events_contain "running"
assert_events_contain "succeeded"

request GET "$BASE_URL/jobs/$SUCCESS_JOB_ID/artifact"
expect_status 200
echo "$LAST_BODY"

echo
echo "== verify failed job =="
request GET "$BASE_URL/jobs/$FAILED_JOB_ID"
expect_status 200
echo "$LAST_BODY"

request GET "$BASE_URL/jobs/$FAILED_JOB_ID/events"
expect_status 200
echo "$LAST_BODY"
assert_events_contain "queued"
assert_events_contain "running"
assert_events_contain "failed"

request GET "$BASE_URL/jobs/$FAILED_JOB_ID/artifact"
expect_status 404
echo "$LAST_BODY"

echo
echo "== delete succeeded + failed jobs =="
request DELETE "$BASE_URL/jobs/$SUCCESS_JOB_ID"
expect_status 204
echo "deleted $SUCCESS_JOB_ID"

request DELETE "$BASE_URL/jobs/$FAILED_JOB_ID"
expect_status 204
echo "deleted $FAILED_JOB_ID"

echo
echo "== verify deleted jobs are gone =="
assert_job_missing "$SUCCESS_JOB_ID"
assert_job_missing "$FAILED_JOB_ID"

echo
echo "== submit running job candidate =="
request POST "$BASE_URL/jobs" '{"model_name":"llama3.1","params":{"prompt":"running case"}}'
expect_status 201
echo "$LAST_BODY"
RUNNING_JOB_ID="$(json_field "['id']")"
echo "RUNNING_JOB_ID=$RUNNING_JOB_ID"

sleep 1

echo
echo "== try deleting running job =="
request DELETE "$BASE_URL/jobs/$RUNNING_JOB_ID"
expect_status 409
echo "$LAST_BODY"

request GET "$BASE_URL/jobs/$RUNNING_JOB_ID"
expect_status 200
echo "$LAST_BODY"

request GET "$BASE_URL/jobs/$RUNNING_JOB_ID/events"
expect_status 200
echo "$LAST_BODY"
assert_events_contain "running"

echo
echo "== queued cancel test =="
docker compose stop worker >/dev/null

request POST "$BASE_URL/jobs" '{"model_name":"llama3.1","params":{"prompt":"queued cancel test"}}'
expect_status 201
echo "$LAST_BODY"
QUEUED_CANCEL_JOB_ID="$(json_field "['id']")"
echo "QUEUED_CANCEL_JOB_ID=$QUEUED_CANCEL_JOB_ID"

request POST "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/cancel"
expect_status 200
echo "$LAST_BODY"

request GET "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID"
expect_status 200
echo "$LAST_BODY"
QUEUED_CANCEL_STATUS="$(json_field "['status']")"
[[ "$QUEUED_CANCEL_STATUS" == "cancelled" ]] || { echo "Expected cancelled, got $QUEUED_CANCEL_STATUS"; exit 1; }

request GET "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/events"
expect_status 200
echo "$LAST_BODY"
assert_events_contain "cancelled"

bash scripts/resume.sh worker >/dev/null
sleep 3

request GET "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID"
expect_status 200
echo "$LAST_BODY"
QUEUED_CANCEL_STATUS="$(json_field "['status']")"
[[ "$QUEUED_CANCEL_STATUS" == "cancelled" ]] || { echo "Expected cancelled after worker restart, got $QUEUED_CANCEL_STATUS"; exit 1; }

request GET "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/events"
expect_status 200
echo "$LAST_BODY"
assert_events_contain "cancelled"

request GET "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/artifact"
expect_status 404
echo "$LAST_BODY"

echo
echo "== running cancel test =="
request POST "$BASE_URL/jobs" '{"model_name":"llama3.1","params":{"prompt":"running cancel test"}}'
expect_status 201
echo "$LAST_BODY"
RUNNING_CANCEL_JOB_ID="$(json_field "['id']")"
echo "RUNNING_CANCEL_JOB_ID=$RUNNING_CANCEL_JOB_ID"

sleep 1

request POST "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/cancel"
expect_status 200
echo "$LAST_BODY"

wait_for_job_status "$RUNNING_CANCEL_JOB_ID" "cancelled" 10 1

request GET "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/events"
expect_status 200
echo "$LAST_BODY"
assert_events_contain "running"
assert_events_contain "cancel_requested"
assert_events_contain "cancelled"

request GET "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/artifact"
expect_status 404
echo "$LAST_BODY"

echo
echo "== terminal cancel should fail with 409 =="
request POST "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/cancel"
expect_status 409
echo "$LAST_BODY"

request POST "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/cancel"
expect_status 409
echo "$LAST_BODY"

echo
echo "== delete cancelled jobs and verify cleanup =="
request DELETE "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID"
expect_status 204
echo "deleted $QUEUED_CANCEL_JOB_ID"

request DELETE "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID"
expect_status 204
echo "deleted $RUNNING_CANCEL_JOB_ID"

assert_job_missing "$QUEUED_CANCEL_JOB_ID"
assert_job_missing "$RUNNING_CANCEL_JOB_ID"
assert_artifact_missing "$QUEUED_CANCEL_JOB_ID"
assert_artifact_missing "$RUNNING_CANCEL_JOB_ID"

echo
echo "== final logs =="
docker compose logs --tail=80 api
docker compose logs --tail=80 worker

echo
echo "Smoke test passed."
