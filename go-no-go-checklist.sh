#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# DEPO-PRO — GO / NO-GO AUTOMATED CHECKLIST
# Run from project root: bash go-no-go-checklist.sh
# ═══════════════════════════════════════════════════════════════════════

set -uo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0
MANUAL=0

pass()  { echo -e "  ${GREEN}✅ PASS${NC}  $1"; ((PASS++)); }
fail()  { echo -e "  ${RED}❌ FAIL${NC}  $1"; ((FAIL++)); }
warn()  { echo -e "  ${YELLOW}⚠️  WARN${NC}  $1"; ((WARN++)); }
manual(){ echo -e "  ${CYAN}🔲 MANUAL${NC} $1"; ((MANUAL++)); }
header(){ echo ""; echo -e "${BOLD}═══ $1 ═══${NC}"; echo ""; }

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          DEPO-PRO GO / NO-GO CHECKLIST                     ║"
echo "║          $(date '+%Y-%m-%d %H:%M:%S')                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ═══════════════════════════════════════════════════════════════════════
header "SECTION 1: TECHNICAL READINESS"
# ═══════════════════════════════════════════════════════════════════════

# 1.1 TypeScript
echo -e "  Running typecheck..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  fail "TypeScript has errors (npx tsc --noEmit)"
else
  pass "TypeScript clean — zero errors"
fi

# 1.2 Build
echo -e "  Running production build..."
BUILD_OUTPUT=$(npm run build 2>&1)
if echo "$BUILD_OUTPUT" | grep -qi "error\|failed"; then
  fail "Production build has errors"
  echo "       Run: npm run build"
else
  pass "Production build clean"
fi

# 1.3 ESLint
echo -e "  Running linter..."
LINT_OUTPUT=$(npx eslint . --max-warnings=0 2>&1)
LINT_EXIT=$?
if [ $LINT_EXIT -ne 0 ]; then
  LINT_COUNT=$(echo "$LINT_OUTPUT" | grep -c "warning\|error" || true)
  fail "ESLint has warnings/errors ($LINT_COUNT issues)"
else
  pass "ESLint clean — zero warnings"
fi

# 1.4 Tests
echo -e "  Running test suite..."
TEST_OUTPUT=$(npx vitest run --reporter=verbose 2>&1)
TEST_PASSED=$(echo "$TEST_OUTPUT" | grep -oP '\d+ passed' | head -1 || echo "0 passed")
TEST_FAILED=$(echo "$TEST_OUTPUT" | grep -oP '\d+ failed' | head -1 || echo "")
if [ -n "$TEST_FAILED" ] && [ "$TEST_FAILED" != "0 failed" ]; then
  fail "Test suite: $TEST_PASSED, $TEST_FAILED"
else
  pass "Test suite: $TEST_PASSED"
fi

# ═══════════════════════════════════════════════════════════════════════
header "SECTION 2: ENVIRONMENT VARIABLE SAFETY"
# ═══════════════════════════════════════════════════════════════════════

# 2.1 Load .env.local
if [ ! -f .env.local ]; then
  fail ".env.local not found"
else
  set -a
  source <(grep -v '^#' .env.local | grep -v '^\s*$' | sed 's/^export //')
  set +a
  pass ".env.local loaded"
fi

# 2.2 Check for deprecated vars in .env.local
DEPRECATED_VARS=("DATABASE_URL" "DIRECT_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
DEPRECATED_FOUND=0
for var in "${DEPRECATED_VARS[@]}"; do
  if grep -q "^${var}=" .env.local 2>/dev/null; then
    fail "DEPRECATED: $var still in .env.local — remove before Vercel sync"
    ((DEPRECATED_FOUND++))
  fi
done
if [ $DEPRECATED_FOUND -eq 0 ]; then
  pass "No deprecated env vars in .env.local"
fi

# 2.3 Check required vars are set
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "DEEPGRAM_API_KEY"
  "ANTHROPIC_API_KEY"
)
MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    fail "REQUIRED var missing: $var"
    ((MISSING++))
  fi
done
if [ $MISSING -eq 0 ]; then
  pass "All 5 required env vars are set"
fi

# 2.4 Check USE_DEEPGRAM
if [ "${USE_DEEPGRAM:-}" = "true" ]; then
  pass "USE_DEEPGRAM=true (real transcription enabled)"
else
  warn "USE_DEEPGRAM is '${USE_DEEPGRAM:-not set}' — transcription may use mock"
fi

# 2.5 Check NEXT_PUBLIC_SITE_URL format
SITE_URL="${NEXT_PUBLIC_SITE_URL:-}"
if [ -z "$SITE_URL" ]; then
  warn "NEXT_PUBLIC_SITE_URL not set"
elif [[ "$SITE_URL" == */ ]]; then
  fail "NEXT_PUBLIC_SITE_URL has trailing slash: $SITE_URL"
elif [[ "$SITE_URL" != https://* ]]; then
  fail "NEXT_PUBLIC_SITE_URL not HTTPS: $SITE_URL"
else
  pass "NEXT_PUBLIC_SITE_URL: $SITE_URL (no trailing slash, HTTPS)"
fi

# 2.6 GITHUB_TOKEN / VERCEL_TOKEN should NOT be in .env.local for Vercel
for var in "GITHUB_TOKEN" "VERCEL_TOKEN"; do
  if grep -q "^${var}=" .env.local 2>/dev/null; then
    warn "$var in .env.local — do NOT push this to Vercel env vars"
  fi
done

# ═══════════════════════════════════════════════════════════════════════
header "SECTION 3: SECURITY — CODE PATTERN SCAN"
# ═══════════════════════════════════════════════════════════════════════

# 3.1 No auth bypass patterns
BYPASS_COUNT=$(grep -rn "skipAuth\|bypassAuth\|noAuth\|disableAuth" \
  --include="*.ts" app/ lib/ 2>/dev/null \
  | grep -v node_modules | grep -v test | grep -v ".next" | wc -l)
if [ "$BYPASS_COUNT" -gt 0 ]; then
  fail "$BYPASS_COUNT auth bypass patterns found in app/ or lib/"
  grep -rn "skipAuth\|bypassAuth\|noAuth\|disableAuth" \
    --include="*.ts" app/ lib/ 2>/dev/null \
    | grep -v node_modules | grep -v test | grep -v ".next" | head -5
else
  pass "No auth bypass patterns (skipAuth/bypassAuth/noAuth/disableAuth)"
fi

# 3.2 Service role key not exposed to client components
CLIENT_LEAK=$(grep -rn "SUPABASE_SERVICE_ROLE_KEY" \
  --include="*.ts" --include="*.tsx" components/ app/ 2>/dev/null \
  | grep -v "process\.env\." | grep -v node_modules | wc -l)
if [ "$CLIENT_LEAK" -gt 0 ]; then
  fail "SUPABASE_SERVICE_ROLE_KEY may be exposed client-side ($CLIENT_LEAK hits)"
  grep -rn "SUPABASE_SERVICE_ROLE_KEY" \
    --include="*.ts" --include="*.tsx" components/ app/ 2>/dev/null \
    | grep -v "process\.env\." | grep -v node_modules | head -5
else
  pass "Service role key not exposed in client-side code"
fi

# 3.3 No remaining production throws in stubs
THROW_COUNT=$(grep -rn "throw.*not implemented\|NODE_ENV.*production.*throw" \
  --include="*.ts" lib/ 2>/dev/null | grep -v node_modules | wc -l)
if [ "$THROW_COUNT" -gt 0 ]; then
  fail "$THROW_COUNT production throw patterns in lib/ (crash risk)"
  grep -rn "throw.*not implemented\|NODE_ENV.*production.*throw" \
    --include="*.ts" lib/ 2>/dev/null | grep -v node_modules | head -5
else
  pass "No production throw patterns in lib/ stubs"
fi

# 3.4 Admin client usage audit
echo ""
echo -e "  ${CYAN}Admin client usage in API routes (review each for auth gating):${NC}"
ADMIN_ROUTES=$(grep -rn "getSupabaseAdmin\|createAdminClient\|getSupabaseAdminClient" \
  app/api --include="*.ts" -l 2>/dev/null | sort)
if [ -n "$ADMIN_ROUTES" ]; then
  echo "$ADMIN_ROUTES" | while read -r route; do
    # Check if the route also has auth gating
    HAS_AUTH=$(grep -c "withRouteProtection\|getCurrentUser\|requireAuth\|getUser" "$route" 2>/dev/null || echo "0")
    if [ "$HAS_AUTH" -gt 0 ]; then
      echo -e "    ${GREEN}✓${NC} $route (has auth check)"
    else
      echo -e "    ${RED}✗${NC} $route ${RED}(NO AUTH CHECK BEFORE ADMIN CLIENT)${NC}"
      ((FAIL++))
    fi
  done
else
  pass "No admin client usage in API routes"
fi

# 3.5 Stale Prisma references
PRISMA_REFS=$(grep -rn "prisma\|Prisma" --include="*.ts" lib/ app/ 2>/dev/null \
  | grep -v node_modules | grep -v ".next" | grep -v "comment\|Comment\|removed\|deprecated" \
  | grep -iv "// .*prisma" | wc -l)
if [ "$PRISMA_REFS" -gt 5 ]; then
  warn "$PRISMA_REFS potential Prisma references remain (some may be stale comments)"
else
  pass "Minimal Prisma references ($PRISMA_REFS — likely comments only)"
fi

# 3.6 Remaining deprecated auth imports
OLD_AUTH=$(grep -rn "from '@/lib/permissions/api-guards'" --include="*.ts" app/ 2>/dev/null \
  | grep -v node_modules | wc -l)
if [ "$OLD_AUTH" -gt 0 ]; then
  warn "$OLD_AUTH routes still import from deprecated api-guards (deferred to post-beta)"
  grep -rn "from '@/lib/permissions/api-guards'" --include="*.ts" app/ 2>/dev/null \
    | grep -v node_modules | head -5
else
  pass "Zero deprecated api-guards imports"
fi

# ═══════════════════════════════════════════════════════════════════════
header "SECTION 4: LIVE KEY VALIDATION"
# ═══════════════════════════════════════════════════════════════════════

# 4.1 Supabase connection
if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    pass "Supabase anon key — connected (HTTP $HTTP_CODE)"
  else
    fail "Supabase anon key — HTTP $HTTP_CODE (expected 200)"
  fi
fi

# 4.2 Supabase service role
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    pass "Supabase service role key — DB access confirmed (HTTP $HTTP_CODE)"
  else
    fail "Supabase service role key — HTTP $HTTP_CODE"
  fi
fi

# 4.3 Deepgram key
if [ -n "${DEEPGRAM_API_KEY:-}" ]; then
  DG_HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.deepgram.com/v1/projects" \
    -H "Authorization: Token ${DEEPGRAM_API_KEY}" 2>/dev/null || echo "000")
  if [ "$DG_HTTP" = "200" ]; then
    pass "Deepgram API key — valid (HTTP 200)"
  elif [ "$DG_HTTP" = "401" ] || [ "$DG_HTTP" = "403" ]; then
    fail "Deepgram API key — rejected (HTTP $DG_HTTP)"
  else
    warn "Deepgram API key — unexpected response (HTTP $DG_HTTP)"
  fi
fi

# 4.4 Anthropic key
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  ANTH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"Reply OK"}]}' \
    2>/dev/null || echo "000")
  if [ "$ANTH_HTTP" = "200" ]; then
    pass "Anthropic API key — valid (HTTP 200)"
  elif [ "$ANTH_HTTP" = "429" ]; then
    pass "Anthropic API key — valid but rate-limited (HTTP 429)"
  elif [ "$ANTH_HTTP" = "401" ]; then
    fail "Anthropic API key — rejected (HTTP 401)"
  else
    warn "Anthropic API key — unexpected (HTTP $ANTH_HTTP)"
  fi
fi

# 4.5 Production site reachable
PROD_URL="${NEXT_PUBLIC_SITE_URL:-https://app.depo-pro.com}"
SITE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" 2>/dev/null || echo "000")
if [ "$SITE_HTTP" = "200" ] || [ "$SITE_HTTP" = "302" ] || [ "$SITE_HTTP" = "307" ]; then
  pass "Production site reachable: $PROD_URL (HTTP $SITE_HTTP)"
else
  fail "Production site unreachable: $PROD_URL (HTTP $SITE_HTTP)"
fi

# ═══════════════════════════════════════════════════════════════════════
header "SECTION 5: VERCEL ENVIRONMENT (via CLI)"
# ═══════════════════════════════════════════════════════════════════════

if command -v vercel &>/dev/null; then
  echo -e "  Pulling Vercel env vars list..."
  VERCEL_ENVS=$(vercel env ls 2>&1 || echo "ERROR")
  if echo "$VERCEL_ENVS" | grep -q "ERROR\|not linked"; then
    warn "Cannot read Vercel env vars (not linked or auth issue)"
  else
    # Check required vars exist in Vercel
    for var in "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
               "SUPABASE_SERVICE_ROLE_KEY" "DEEPGRAM_API_KEY" "ANTHROPIC_API_KEY" \
               "USE_DEEPGRAM" "NEXT_PUBLIC_SITE_URL"; do
      if echo "$VERCEL_ENVS" | grep -q "$var"; then
        pass "Vercel has: $var"
      else
        fail "Vercel MISSING: $var"
      fi
    done
    # Check deprecated vars are NOT in Vercel
    for var in "DATABASE_URL" "DIRECT_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL"; do
      if echo "$VERCEL_ENVS" | grep -q "$var"; then
        fail "Vercel has DEPRECATED: $var — remove it"
      fi
    done
  fi
else
  warn "Vercel CLI not found — skipping Vercel env check"
  manual "Verify Vercel env vars manually in dashboard"
fi

# ═══════════════════════════════════════════════════════════════════════
header "SECTION 6: MANUAL VERIFICATION REMINDERS"
# ═══════════════════════════════════════════════════════════════════════

manual "Supabase: RLS enabled on ALL tables (run SQL: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public')"
manual "Supabase: user_belongs_to_firm() function exists"
manual "Storage: depo-files bucket is PRIVATE (test with incognito URL)"
manual "Storage: depo-exports bucket is PRIVATE"
manual "Storage: depo-chunks bucket is PRIVATE"
manual "Storage: depo-audio paths use UUIDs (not sequential IDs)"
manual "Browser: No SUPABASE_SERVICE_ROLE_KEY in page source (DevTools → Sources → Cmd+F)"
manual "Browser: Zero console errors on login → dashboard → job list → logout"
manual "Browser: Zero hydration warnings on dashboard and review pages"
manual "Middleware: /api/health returns 200 without auth"
manual "Middleware: /api/jobs returns 401 without auth (curl test)"
manual "Middleware: /dashboard redirects to /auth/login without auth"
manual "Multi-tenant: User B CANNOT see User A's jobs via direct URL"
manual "Multi-tenant: User B CANNOT export User A's transcripts via API"
manual "Smoke test: 10 consecutive upload→transcribe→review→export workflows completed"
manual "DOCX export opens in Microsoft Word without corruption"
manual "PDF export opens and text is selectable"
manual "Audio player syncs correctly to flagged words on review page"
manual "Corrections persist after hard refresh (Ctrl+Shift+R)"
manual "Supabase database backup taken today"
manual "GitHub branch protection enabled (require PR, disable force-push)"
manual "Rollback deployment identified in Vercel (last known-good)"

# ═══════════════════════════════════════════════════════════════════════
header "FINAL VERDICT"
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    RESULTS SUMMARY                         ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  ${GREEN}Passed:  %-4s${NC}                                            ║\n" "$PASS"
printf "║  ${RED}Failed:  %-4s${NC}                                            ║\n" "$FAIL"
printf "║  ${YELLOW}Warnings:%-4s${NC}                                            ║\n" "$WARN"
printf "║  ${CYAN}Manual:  %-4s${NC} (requires human verification)              ║\n" "$MANUAL"
echo "║                                                            ║"

if [ "$FAIL" -eq 0 ]; then
  echo -e "║  ${GREEN}${BOLD}AUTOMATED CHECKS: ALL PASSED${NC}                            ║"
  echo "║                                                            ║"
  echo -e "║  Complete the ${CYAN}$MANUAL manual checks${NC} above.                  ║"
  echo "║  If ALL manual checks pass → ${GREEN}GO FOR BETA${NC}                 ║"
else
  echo -e "║  ${RED}${BOLD}AUTOMATED CHECKS: $FAIL FAILURE(S) — NOT READY${NC}              ║"
  echo "║                                                            ║"
  echo "║  Fix all failures before proceeding to manual checks.     ║"
  echo -e "║  Status: ${RED}NO-GO${NC}                                             ║"
fi

echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Save results to file
RESULTS_FILE="go-no-go-results-$(date '+%Y%m%d-%H%M%S').txt"
echo "Results saved to: $RESULTS_FILE"
{
  echo "DEPO-PRO GO/NO-GO — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Passed: $PASS | Failed: $FAIL | Warnings: $WARN | Manual: $MANUAL"
  echo ""
  if [ "$FAIL" -eq 0 ]; then
    echo "VERDICT: AUTOMATED CHECKS PASSED — complete manual verification"
  else
    echo "VERDICT: NO-GO — $FAIL automated check(s) failed"
  fi
} > "$RESULTS_FILE"

exit $FAIL
