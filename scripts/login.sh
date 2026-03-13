#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
EMAIL="${EMAIL:-you@example.com}"
PASSWORD="${PASSWORD:-Strong#Pass123}"

echo "== login setup =="
echo "BASE_URL=$BASE_URL"
echo "EMAIL=$EMAIL"

LOGIN_RESPONSE="$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

if echo "$LOGIN_RESPONSE" | grep -q '"access_token"'; then
  TOKEN="$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")"
else
  echo "login failed, attempting register..."
  curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" ; echo

  LOGIN_RESPONSE="$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

  TOKEN="$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")"
fi

echo
echo "== token =="
echo "$TOKEN"

echo
echo "== export command =="
echo "export BASE_URL=\"$BASE_URL\""
echo "export EMAIL=\"$EMAIL\""
echo "export PASSWORD=\"$PASSWORD\""
echo "export TOKEN=\"$TOKEN\""
