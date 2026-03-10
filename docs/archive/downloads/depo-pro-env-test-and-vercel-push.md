# DEPO-PRO — ENV TEST + VERCEL PUSH (SAFE VERSION)
# =============================================================================
# Phases:
#   1 — Read and mask .env.local
#   2 — Live test every key against its service
#   3 — Push verified keys to Vercel (ADD ONLY — nothing deleted)
#   4 — Lock down .gitignore
#   5 — Final report
#
# SAFETY RULE: This prompt NEVER deletes any Vercel variable.
# It only adds or updates. Deprecated variable cleanup is
# listed for manual review only — human decides what to remove.
# =============================================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — READ AND MASK .env.local
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read .env.local. For every variable found, print:
  KEY_NAME = SET (••••[last4]) | EMPTY | MISSING

Never print the full value of any secret under any circumstances.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — LIVE TEST EVERY KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create and run /tmp/test-keys.mjs using Node.
Load .env.local manually — do not use dotenv package.

Parse .env.local like this:
  const lines = fs.readFileSync('.env.local','utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    env[trimmed.slice(0,idx).trim()] = trimmed.slice(idx+1).trim();
  }

── SUPABASE ────────────────────────────────────────────────

Test 1: NEXT_PUBLIC_SUPABASE_URL
  PASS if value contains "ildhcfspbmhuemzgvzyx.supabase.co"
  FAIL if missing or different project ID

Test 2: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  Make real HTTP call:
  GET ${SUPABASE_URL}/rest/v1/
  Headers: { apikey: KEY, Authorization: "Bearer KEY" }
  PASS = HTTP 200 or 404  (key accepted, table may not exist)
  FAIL = HTTP 401          (key rejected)

Test 3: SUPABASE_SERVICE_ROLE_KEY
  Make real HTTP call:
  GET ${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1
  Headers: { apikey: KEY, Authorization: "Bearer KEY" }
  PASS = HTTP 200
  FAIL = HTTP 401 or 403

── DEEPGRAM ────────────────────────────────────────────────

Test 4: DEEPGRAM_API_KEY
  Make real HTTP call:
  GET https://api.deepgram.com/v1/projects
  Headers: { Authorization: "Token KEY" }
  PASS = HTTP 200 (print number of projects found)
  FAIL = HTTP 401

Test 5: DEEPGRAM_WEBHOOK_SECRET
  PASS if present and value length >= 32
  FAIL if missing
  WARN if shorter than 32 chars

Test 6: USE_DEEPGRAM
  PASS if set to "true" or "false"
  WARN if missing (defaults to false — mock mode)

── ANTHROPIC ───────────────────────────────────────────────

Test 7: ANTHROPIC_API_KEY
  Make real HTTP call:
  POST https://api.anthropic.com/v1/messages
  Headers: { x-api-key: KEY, anthropic-version: "2023-06-01",
             content-type: "application/json" }
  Body: { model: "claude-haiku-4-5-20251001", max_tokens: 10,
          messages: [{role:"user", content:"say ok"}] }
  PASS = HTTP 200
  FAIL = HTTP 401 or 403

── RESEND ──────────────────────────────────────────────────

Test 8: RESEND_API_KEY
  Make real HTTP call:
  GET https://api.resend.com/domains
  Headers: { Authorization: "Bearer KEY" }
  PASS = HTTP 200 (print list of verified domain names)
  FAIL = HTTP 401 or 403
  WARN if no verified domains found (emails may not send)

── STRIPE ──────────────────────────────────────────────────

Test 9: STRIPE_SECRET_KEY
  Make real HTTP call:
  GET https://api.stripe.com/v1/balance
  Headers: { Authorization: "Bearer KEY" }
  PASS = HTTP 200
  FAIL = HTTP 401
  Also print: [LIVE MODE] if sk_live_ prefix
              [TEST MODE] if sk_test_ prefix

Test 10: STRIPE_WEBHOOK_SECRET
  PASS if starts with "whsec_" and length > 10
  FAIL if missing or wrong format

Test 11: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  PASS if starts with "pk_live_" or "pk_test_"
  FAIL if missing or wrong format
  WARN if mode (live/test) does not match STRIPE_SECRET_KEY

── APP CONFIG ──────────────────────────────────────────────

Test 12: NEXT_PUBLIC_APP_URL
  PASS if set to "https://depo-pro.com"
  WARN if set to "https://app.depo-pro.com" (old subdomain — update it)
  WARN if set to localhost (fine for dev but flag it)

Test 13: NEXT_PUBLIC_SITE_URL
  Same rules as Test 12

Test 14: CRON_SECRET
  PASS if present and length >= 32
  WARN if present but shorter than 32 chars
  FAIL if missing

── SUMMARY ─────────────────────────────────────────────────

After all tests print:

  ┌─────────────────────────────────────────┐
  │  DEPO-PRO KEY TEST RESULTS              │
  ├─────────────────────────────────────────┤
  │  ✅ PASS:   X                           │
  │  ❌ FAIL:   X                           │
  │  ⚠️  WARN:  X                           │
  └─────────────────────────────────────────┘

For every FAIL print:
  ❌ KEY_NAME — what is wrong — how to fix it

For every WARN print:
  ⚠️  KEY_NAME — what to be aware of

If ANY key is FAIL:
  Print: "STOPPING — fix the failed keys above before proceeding.
          Re-run this prompt after fixing them."
  Then STOP. Do not continue to Phase 3.

If all keys are PASS or WARN only:
  Print: "All keys verified. Continuing to Phase 3..."
  Then continue automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — PUSH VERIFIED KEYS TO VERCEL (ADD ONLY — NO DELETES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL SAFETY RULE:
  This phase ONLY sets/updates variables.
  It NEVER deletes any existing Vercel variable.
  Every current Vercel variable not in this list remains untouched.

Use the Vercel MCP to set variables on the project.
  Team:    james-hortons-projects-6d806c91
  Project: depo-pro

Set each variable below. For each one print:
  ✅ SET [env targets] VARIABLE_NAME

── Set in ALL THREE environments (Production + Preview + Development) ──

  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_SERVICE_ROLE_KEY
  DEEPGRAM_API_KEY
  USE_DEEPGRAM
  DEEPGRAM_WEBHOOK_SECRET
  ANTHROPIC_API_KEY
  RESEND_API_KEY
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_SITE_URL
  CRON_SECRET

── Set in Production environment only ──

  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  Note: if STRIPE_SECRET_KEY starts with sk_test_ set it anyway
  but print this warning:
  ⚠️  STRIPE: You are using a TEST key in Production.
      Replace with live keys before accepting real payments.
      Stripe Dashboard → Developers → API Keys → Live keys.

── If UPSTASH variables are set in .env.local (non-empty) ──

  Set these in ALL THREE environments:
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN

  If they are empty in .env.local, skip them and print:
  ⏭️  UPSTASH — skipped (not configured — in-memory fallback will be used)

── After setting all variables ──

Check what variables currently exist in Vercel that are NOT
in the list above. Print them under this heading:

  ┌──────────────────────────────────────────────────────┐
  │  EXISTING VERCEL VARIABLES — NOT MODIFIED            │
  │  (These were left exactly as-is)                     │
  ├──────────────────────────────────────────────────────┤
  │  List each variable name here                        │
  └──────────────────────────────────────────────────────┘

Then check if any of these known-deprecated names exist in Vercel:
  NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL, DIRECT_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY, ZOHO_SMTP_HOST, ZOHO_SMTP_PORT,
  ZOHO_SMTP_USER, ZOHO_SMTP_PASS, SMTP_HOST, SMTP_PORT,
  SMTP_USER, SMTP_PASS, NODE_ENV

If any are found, print:

  ┌──────────────────────────────────────────────────────┐
  │  ⚠️  DEPRECATED VARIABLES FOUND IN VERCEL            │
  │  These are safe to delete but were NOT removed.      │
  │  Review and delete manually if desired:              │
  │  Vercel → depo-pro → Settings → Environment Variables│
  ├──────────────────────────────────────────────────────┤
  │  List each deprecated variable name found            │
  └──────────────────────────────────────────────────────┘

DO NOT delete them. Only list them for the developer to review.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — LOCK DOWN .gitignore
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read the current .gitignore file.

Add any of these lines that are not already present:

  # Environment files — never commit secrets
  .env
  .env.local
  .env*.local
  .env.local.backup
  .env.vercel.dev
  .env.vercel.preview
  .env.vercel.prod
  .env.dev.check
  .env.prev.check
  .env.prod.check
  .env.production.example

Do NOT add .env.example — that file must stay committed to git
so other developers know what variables are required.

After updating .gitignore, check if any env files are currently
being tracked by git:

  git ls-files | grep "\.env" | grep -v "\.env.example"

If any are found, stop tracking them (but do not delete the files):

  git rm --cached [filename]

  Print: "⚠️  Removed [filename] from git tracking (file kept on disk)"

Commit:

  git add .gitignore
  git commit -m "chore: lock down .gitignore — exclude all env files except .env.example"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — FINAL REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Print this complete summary:

  ╔══════════════════════════════════════════════════════╗
  ║      DEPO-PRO ENVIRONMENT SETUP — COMPLETE           ║
  ╠══════════════════════════════════════════════════════╣
  ║  Keys tested:        X/X passed                      ║
  ║  Vercel variables:   X set across environments       ║
  ║  Vercel deletions:   0 (nothing was deleted)         ║
  ║  .gitignore:         X patterns confirmed/added      ║
  ║  Git tracking:       clean — no secrets tracked      ║
  ╚══════════════════════════════════════════════════════╝

  MANUAL STEPS STILL REQUIRED
  ────────────────────────────
  These cannot be done by code — do them now:

  1. SUPABASE DASHBOARD (critical for password reset)
     https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx

     → Authentication → Email Templates → Reset Password
       Change the URL to:
       {{ .SiteURL }}/auth/callback?next=/reset-password

     → Authentication → URL Configuration
       Site URL:      https://depo-pro.com
       Redirect URLs: https://depo-pro.com/auth/callback
                      http://localhost:3000/auth/callback

  2. STRIPE (if going live)
     Replace test keys with live keys in Vercel Production env:
     STRIPE_SECRET_KEY → sk_live_...
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → pk_live_...

  3. DEPRECATED VERCEL VARIABLES (optional cleanup)
     Review the list printed in Phase 3 and manually delete
     any deprecated variables you confirmed are unused.

  4. TRIGGER A REDEPLOYMENT
     After Vercel variables are set, redeploy to pick them up:
     Vercel Dashboard → depo-pro → Deployments → Redeploy
     OR: push a commit to trigger auto-deploy

  Environment is ready for beta testing once steps 1 and 4 are done.
