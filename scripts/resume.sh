#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
MODE="${1:-up}"

echo "== gpu-job-manager resume =="

case "$MODE" in
  up)
    docker compose up -d --build
    ;;
  api)
    docker compose up -d --force-recreate api
    ;;
  worker)
    docker compose up -d --force-recreate worker
    ;;
  all)
    docker compose up -d --force-recreate
    ;;
  *)
    echo "Usage: $0 [up|api|worker|all]"
    exit 1
    ;;
esac

echo
echo "== compose ps =="
docker compose ps

echo
echo "== waiting for api =="
for _ in $(seq 1 30); do
  if curl -sf "$BASE_URL/docs" >/dev/null; then
    echo "api up: $BASE_URL"
    exit 0
  fi
  sleep 1
done

echo "api did not become ready in time"
exit 1
