#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${1:-http://localhost:5000}
USER_ID=${2:-test-user}

echo "== Health"
curl -sS "$BASE_URL/health" | cat

echo
echo "== Record 5 interactions"
NOW=$(python - <<'PY'
import time
print(int(time.time()*1000))
PY
)

curl -sS -X POST "$BASE_URL/interactions/record" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"questionId\":\"q1\",\"conceptId\":\"inflation\",\"difficulty\":\"easy\",\"correct\":false,\"responseTime\":4200,\"timestamp\":$NOW}" | cat

echo
curl -sS -X POST "$BASE_URL/interactions/record" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"questionId\":\"q2\",\"conceptId\":\"inflation\",\"difficulty\":\"easy\",\"correct\":false,\"responseTime\":3800,\"timestamp\":$((NOW+1))}" | cat

echo
curl -sS -X POST "$BASE_URL/interactions/record" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"questionId\":\"q3\",\"conceptId\":\"compound_interest\",\"difficulty\":\"medium\",\"correct\":true,\"responseTime\":2500,\"timestamp\":$((NOW+2))}" | cat

echo
curl -sS -X POST "$BASE_URL/interactions/record" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"questionId\":\"q4\",\"conceptId\":\"rule_of_72\",\"difficulty\":\"easy\",\"correct\":true,\"responseTime\":2200,\"timestamp\":$((NOW+3))}" | cat

echo
curl -sS -X POST "$BASE_URL/interactions/record" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"questionId\":\"q5\",\"conceptId\":\"inflation\",\"difficulty\":\"medium\",\"correct\":false,\"responseTime\":4500,\"timestamp\":$((NOW+4))}" | cat

echo

echo "== Train"
curl -sS -X POST "$BASE_URL/train" | cat

echo

echo "== Recommend"
curl -sS -X POST "$BASE_URL/recommend" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"conceptIds\":[\"inflation\",\"compound_interest\",\"rule_of_72\"]}" | cat

echo
