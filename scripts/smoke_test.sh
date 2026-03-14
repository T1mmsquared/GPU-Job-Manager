#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"

if [[ -z "${TOKEN:-}" ]]; then
  echo "TOKEN is not set."
  echo "Run: eval \"\$(./scripts/login.sh | tail -n 4)\""
  exit 1
fi

echo "== submit succeeded job =="
SUCCESS_JOB_JSON="$(curl -s -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model_name":"llama3.1","params":{"prompt":"success case"}}')"
echo "$SUCCESS_JOB_JSON"
SUCCESS_JOB_ID="$(echo "$SUCCESS_JOB_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"
echo "SUCCESS_JOB_ID=$SUCCESS_JOB_ID"

echo
echo "== submit failed job =="
FAILED_JOB_JSON="$(curl -s -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model_name":"llama3.1","params":{"prompt":"failure case","should_fail":true}}')"
echo "$FAILED_JOB_JSON"
FAILED_JOB_ID="$(echo "$FAILED_JOB_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"
echo "FAILED_JOB_ID=$FAILED_JOB_ID"

echo
echo "== wait for jobs to settle =="
sleep 7

echo
echo "== verify succeeded job =="
curl -s "$BASE_URL/jobs/$SUCCESS_JOB_ID" -H "Authorization: Bearer $TOKEN" ; echo
curl -s "$BASE_URL/jobs/$SUCCESS_JOB_ID/events" -H "Authorization: Bearer $TOKEN" ; echo
curl -s "$BASE_URL/jobs/$SUCCESS_JOB_ID/artifact" -H "Authorization: Bearer $TOKEN" ; echo

echo
echo "== verify failed job =="
curl -s "$BASE_URL/jobs/$FAILED_JOB_ID" -H "Authorization: Bearer $TOKEN" ; echo
curl -s "$BASE_URL/jobs/$FAILED_JOB_ID/events" -H "Authorization: Bearer $TOKEN" ; echo
curl -s "$BASE_URL/jobs/$FAILED_JOB_ID/artifact" -H "Authorization: Bearer $TOKEN" ; echo

echo
echo "== delete succeeded + failed jobs =="
curl -i -X DELETE "$BASE_URL/jobs/$SUCCESS_JOB_ID" -H "Authorization: Bearer $TOKEN"
echo
curl -i -X DELETE "$BASE_URL/jobs/$FAILED_JOB_ID" -H "Authorization: Bearer $TOKEN"
echo

echo "== verify deleted jobs are gone =="
curl -s "$BASE_URL/jobs/$SUCCESS_JOB_ID" -H "Authorization: Bearer $TOKEN" ; echo
curl -s "$BASE_URL/jobs/$FAILED_JOB_ID" -H "Authorization: Bearer $TOKEN" ; echo

echo
echo "== submit running job candidate =="
RUNNING_JOB_JSON="$(curl -s -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model_name":"llama3.1","params":{"prompt":"running case"}}')"
echo "$RUNNING_JOB_JSON"
RUNNING_JOB_ID="$(echo "$RUNNING_JOB_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"
echo "RUNNING_JOB_ID=$RUNNING_JOB_ID"

echo
echo "== try deleting running job =="
sleep 1
curl -i -X DELETE "$BASE_URL/jobs/$RUNNING_JOB_ID" -H "Authorization: Bearer $TOKEN"
echo

echo "== running job status =="
curl -s "$BASE_URL/jobs/$RUNNING_JOB_ID" -H "Authorization: Bearer $TOKEN" ; echo
curl -s "$BASE_URL/jobs/$RUNNING_JOB_ID/events" -H "Authorization: Bearer $TOKEN" ; echo

echo
echo "== queued cancel test =="
docker compose stop worker

QUEUED_CANCEL_JOB_JSON="$(curl -s -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model_name":"llama3.1","params":{"prompt":"queued cancel test"}}')"
echo "$QUEUED_CANCEL_JOB_JSON"
QUEUED_CANCEL_JOB_ID="$(echo "$QUEUED_CANCEL_JOB_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"
echo "QUEUED_CANCEL_JOB_ID=$QUEUED_CANCEL_JOB_ID"

curl -s -X POST "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" ; echo

curl -s "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID" \
  -H "Authorization: Bearer $TOKEN" ; echo

curl -s "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/events" \
  -H "Authorization: Bearer $TOKEN" ; echo

bash scripts/resume.sh worker
sleep 3

curl -s "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID" \
  -H "Authorization: Bearer $TOKEN" ; echo

curl -s "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/events" \
  -H "Authorization: Bearer $TOKEN" ; echo

echo
echo "== running cancel test =="
RUNNING_CANCEL_JOB_JSON="$(curl -s -X POST "$BASE_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model_name":"llama3.1","params":{"prompt":"running cancel test"}}')"
echo "$RUNNING_CANCEL_JOB_JSON"
RUNNING_CANCEL_JOB_ID="$(echo "$RUNNING_CANCEL_JOB_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"
echo "RUNNING_CANCEL_JOB_ID=$RUNNING_CANCEL_JOB_ID"

sleep 1

curl -s -X POST "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" ; echo

sleep 2

curl -s "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID" \
  -H "Authorization: Bearer $TOKEN" ; echo

curl -s "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/events" \
  -H "Authorization: Bearer $TOKEN" ; echo

curl -s "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/artifact" \
  -H "Authorization: Bearer $TOKEN" ; echo

echo
echo "== terminal cancel should fail with 409 =="
curl -i -X POST "$BASE_URL/jobs/$QUEUED_CANCEL_JOB_ID/cancel" \
  -H "Authorization: Bearer $TOKEN"
echo
curl -i -X POST "$BASE_URL/jobs/$RUNNING_CANCEL_JOB_ID/cancel" \
  -H "Authorization: Bearer $TOKEN"
echo

echo
echo "== final logs =="
docker compose logs --tail=80 api
docker compose logs --tail=80 worker


