#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE_URL:-http://localhost:3000/api}
TS=$(date +%s)
RAND=$RANDOM
EMAIL="smoke-user-${TS}-${RAND}@example.com"
PASS="pass1234"
NICK="smoke-user-${RAND}"
GUEST="guest-${RAND}"

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

extract_access_token() {
  node -e 'const d = JSON.parse(process.argv[1]); process.stdout.write(d.accessToken);' "$1"
}

extract_poll_id() {
  node -e 'const d = JSON.parse(process.argv[1]); process.stdout.write(d.id || "");' "$1"
}

echo "1) Poll 목록 조회"
POLL_LIST_RESPONSE=$(curl -s "$BASE/polls")
[[ "$POLL_LIST_RESPONSE" == "["* ]] || fail "poll list"
pass "poll list"

echo "2) 회원 가입"
REGISTER_JSON=$(curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"nickname\":\"$NICK\"}")
[[ "$REGISTER_JSON" == *"accessToken"* ]] || fail "register"
TOKEN=$(extract_access_token "$REGISTER_JSON")
pass "register"

echo "3) 로그인"
LOGIN_JSON=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
[[ "$LOGIN_JSON" == *"accessToken"* ]] || fail "login"
USER_TOKEN=$(extract_access_token "$LOGIN_JSON")
pass "login"

echo "4) 세션 조회"
ME_JSON=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE/auth/me")
[[ "$ME_JSON" == *\"email\":\"$EMAIL\"* ]] || fail "me"
pass "auth me"

echo "5) 투표 생성(회원)"
POLL_JSON=$(curl -s -X POST "$BASE/polls" -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' -d '{"question":"smoke poll","description":"from script","options":[{"text":"A"},{"text":"B"}]}')
POLL_ID=$(extract_poll_id "$POLL_JSON")
[[ -n "$POLL_ID" ]] || fail "create poll"
pass "create poll"

echo "6) 투표"
VOTE_JSON=$(curl -s -X POST "$BASE/polls/$POLL_ID/vote" -H 'Content-Type: application/json' -d '{"optionId":1,"voterName":"Smoke","comment":"ok"}')
[[ "$VOTE_JSON" == *"$POLL_ID"* ]] || fail "vote"
pass "vote"

echo "7) 비회원 투표 생성(비인증)"
ANON_POLL_JSON=$(curl -s -X POST "$BASE/polls" -H 'Content-Type: application/json' -d '{"question":"anon poll","description":"","options":[{"text":"Yes"},{"text":"No"}]}')
ANON_POLL_ID=$(extract_poll_id "$ANON_POLL_JSON")
[[ -n "$ANON_POLL_ID" ]] || fail "create poll no token"
[[ "$ANON_POLL_JSON" == *\"creatorIsGuest\":true* ]] || fail "anon poll should be creatorIsGuest true"
pass "create poll no token"

echo "8) 비회원 등록"
GUEST_JSON=$(curl -s -X POST "$BASE/auth/guest" -H 'Content-Type: application/json' -d "{\"nickname\":\"$GUEST\"}")
[[ "$GUEST_JSON" == *"accessToken"* ]] || fail "guest register"
GUEST_TOKEN=$(extract_access_token "$GUEST_JSON")
pass "guest register"

echo "9) 비회원 투표 생성"
GUEST_POLL_JSON=$(curl -s -X POST "$BASE/polls" -H "Authorization: Bearer $GUEST_TOKEN" -H 'Content-Type: application/json' -d '{"question":"guest poll","description":"","options":[{"text":"Yes"},{"text":"No"}]}' )
[[ "$GUEST_POLL_JSON" == *\"creatorIsGuest\":true* ]] || fail "guest create poll"
pass "guest create poll"

echo "10) 중복 회원 가입 시나리오"
DUP_JSON=$(curl -s -o /tmp/smoke_dup_body -w '%{http_code}' -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"nickname\":\"$NICK\"}")
if [[ "$DUP_JSON" -ne 400 ]]; then
  fail "duplicate register status"
fi
pass "duplicate register returns 400"

echo "11) 잘못된 토큰 me 조회"
ME_BAD_STATUS=$(curl -s -o /tmp/smoke_me_bad_body -w '%{http_code}' -H 'Authorization: Bearer invalid_token' "$BASE/auth/me")
if [[ "$ME_BAD_STATUS" -ne 401 ]]; then
  fail "invalid token status"
fi
pass "invalid token returns 401"

echo "Smoke test completed successfully."
