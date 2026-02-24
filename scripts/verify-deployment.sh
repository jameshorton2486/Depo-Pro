#!/usr/bin/env bash
# scripts/verify-deployment.sh
# Post-deployment smoke test for Depo-Pro production.
#
# Usage:
#   BASE_URL=https://your-deployment.vercel.app bash scripts/verify-deployment.sh
#
# Set BASE_URL to your Vercel deployment URL (no trailing slash).
# Optionally set AUTH_TOKEN to a valid bearer token for authenticated checks.

set -euo pipefail

BASE_URL="${BASE_URL:-https://depo-pro.vercel.app}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
PASS=0
FAIL=0

green() { printf '\033[32m✓ %s\033[0m\n' "$1"; }
red()   { printf '\033[31m✗ %s\033[0m\n' "$1"; }

check() {
  local description="$1"
  local expected_status="$2"
  local url="$3"
  shift 3
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" "$@" "$url")
  if [ "$actual" = "$expected_status" ]; then
    green "$description (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "$description (expected $expected_status, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Depo-Pro Deployment Verification ==="
echo "Target: $BASE_URL"
echo "Date:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ---- Public endpoints ----
echo "--- Public Endpoints ---"
check "Health check responds 200"     "200" "$BASE_URL/api/health"
check "Unauthenticated /api/jobs → 401" "401" "$BASE_URL/api/jobs"
check "Unauthenticated export → 401"  "401" "$BASE_URL/api/transcripts/test-id/export"
check "Client error endpoint → 200"   "200" "$BASE_URL/api/client-errors" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"smoke-test","componentName":"verify-deployment"}'
check "404 route returns 404"         "404" "$BASE_URL/api/nonexistent-route-xyz"

# ---- Authenticated endpoints (requires AUTH_TOKEN) ----
echo ""
echo "--- Authenticated Endpoints ---"
if [ -n "$AUTH_TOKEN" ]; then
  check "GET /api/jobs with auth → 200" "200" "$BASE_URL/api/jobs" \
    -H "Authorization: Bearer $AUTH_TOKEN"
  check "GET /api/health with auth → 200" "200" "$BASE_URL/api/health" \
    -H "Authorization: Bearer $AUTH_TOKEN"
  check "Invalid job ID → 404" "404" "$BASE_URL/api/jobs/00000000-0000-0000-0000-000000000000" \
    -H "Authorization: Bearer $AUTH_TOKEN"
else
  echo "  (skipped — AUTH_TOKEN not set)"
fi

# ---- Summary ----
echo ""
echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "DEPLOYMENT VERIFICATION FAILED — investigate before marking deploy stable."
  exit 1
else
  echo "All checks passed. Deployment looks healthy."
  exit 0
fi
