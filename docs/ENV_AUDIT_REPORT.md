# Depo-Pro Environment Audit Report

Generated: 2026-03-08

## Executive Summary

- **Total checks run:** 21
- **Passing:** 17 (including 1 reclassified false positive)
- **Failures (must fix):** 3
- **Warnings (should fix):** 1
- **Production readiness:** NOT READY — Stripe keys missing from all environments

## Critical Failures

### 1. STRIPE_SECRET_KEY — Missing from .env.local and all Vercel environments
- **Impact:** All billing features broken — subscription creation, invoice generation, payment processing
- **Fix:** Add `sk_test_*` key to .env.local for dev, `sk_live_*` to Vercel Production, `sk_test_*` to Vercel Preview/Development
- **Get key from:** https://dashboard.stripe.com/apikeys

### 2. STRIPE_WEBHOOK_SECRET — Missing from .env.local and all Vercel environments
- **Impact:** Stripe webhook events (payment confirmations, subscription changes) will be rejected
- **Fix:** Create webhook endpoint in Stripe Dashboard, copy signing secret (`whsec_*`)
- **Get key from:** https://dashboard.stripe.com/webhooks → endpoint → Signing secret

### 3. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — Missing from .env.local and all Vercel environments
- **Impact:** Stripe Checkout and payment forms will not render
- **Fix:** Add `pk_test_*` to dev/preview, `pk_live_*` to production
- **Get key from:** https://dashboard.stripe.com/apikeys
- **Note:** .env.example lists this as "DEPRECATED / not referenced" — verify if billing UI code actually uses it before adding

## Reclassified: False Positive

### NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — PASS (not a failure)
- Raw REST API returned HTTP 401, but the Supabase JS client works correctly
- The new `sb_publishable_*` key format is translated by the JS client — raw REST calls don't accept it directly
- **Result:** Key is valid. App authentication works.
- **Note:** `profiles` table returned "permission denied for schema public" — this is a separate RLS/grants issue, not a key validity problem

## Warnings

### 1. UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — Not configured anywhere
- **Impact:** Rate limiting falls back to in-memory store (not distributed across Vercel functions)
- **Severity:** Medium — acceptable for beta, must fix before production scale
- **Note:** .env.example says these are deprecated ("code uses REDIS_URL instead") — verify which pattern the codebase actually uses before provisioning

## Environment Coverage Matrix

| Variable | .env.local | Vercel Prod | Vercel Preview | Vercel Dev |
|---|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | SET | SET | SET | SET |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | SET | SET | SET | SET |
| SUPABASE_SERVICE_ROLE_KEY | SET | SET | SET | SET |
| DEEPGRAM_API_KEY | SET | SET | SET | SET |
| USE_DEEPGRAM | SET | SET | SET | SET |
| DEEPGRAM_WEBHOOK_SECRET | SET | SET | SET | SET |
| ANTHROPIC_API_KEY | SET | SET | SET | SET |
| RESEND_API_KEY | SET | SET | SET | SET |
| STRIPE_SECRET_KEY | MISSING | MISSING | MISSING | MISSING |
| STRIPE_WEBHOOK_SECRET | MISSING | MISSING | MISSING | MISSING |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | MISSING | MISSING | MISSING | MISSING |
| UPSTASH_REDIS_REST_URL | SET | MISSING | MISSING | MISSING |
| UPSTASH_REDIS_REST_TOKEN | SET | MISSING | MISSING | MISSING |
| NEXT_PUBLIC_APP_URL | SET | SET | SET | SET |
| NEXT_PUBLIC_SITE_URL | SET | SET | SET | SET |
| CRON_SECRET | SET | SET | SET | SET |

## Deprecated Variables Status

All deprecated variables have been successfully cleaned up:

| Variable | .env.local | Vercel | Status |
|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Present | Present | ACTIVE |
| NEXTAUTH_SECRET | Not present | Not present | CLEAN |
| NEXTAUTH_URL | Not present | Not present | CLEAN |
| DATABASE_URL | Not present | Not present | CLEAN |
| DIRECT_URL | Not present | Not present | CLEAN |
| SMTP_* / ZOHO_SMTP_* | Not present | Not present | CLEAN |

## Extra Variables (not in master list)

| Variable | Location | Notes |
|---|---|---|
| VERCEL_OIDC_TOKEN | .env.local | Used for Vercel CLI auth — not needed in Vercel env vars |

## Live API Test Results

| Service | Variable | Status | Detail |
|---|---|---|---|
| Supabase | NEXT_PUBLIC_SUPABASE_URL | PASS | https://ildhcfspbmhuemzgvzyx.supabase.co |
| Supabase | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | PASS | JS client authenticates successfully (sb_p\*\*\*\*bdY0) |
| Supabase | SUPABASE_SERVICE_ROLE_KEY | PASS | Admin API accessible (sb_s\*\*\*\*h_9c) |
| Supabase | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | PASS | Present (correct — active) |
| Deepgram | DEEPGRAM_API_KEY | PASS | 1 project found (a496\*\*\*\*6731) |
| Deepgram | DEEPGRAM_WEBHOOK_SECRET | PASS | Present (b338\*\*\*\*879e) |
| Deepgram | USE_DEEPGRAM | PASS | Set to: true |
| Anthropic | ANTHROPIC_API_KEY | PASS | API responded successfully (sk-a\*\*\*\*BQAA) |
| Resend | RESEND_API_KEY | PASS | Verified domain: depo-pro.com (re_5\*\*\*\*zQAR) |
| Resend | SMTP_CLEANUP | PASS | No deprecated SMTP vars found |
| Stripe | STRIPE_SECRET_KEY | FAIL | Missing from .env.local |
| Stripe | STRIPE_WEBHOOK_SECRET | FAIL | Missing from .env.local |
| Stripe | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | FAIL | Missing from .env.local |
| Upstash | UPSTASH_REDIS | WARN | Not configured — in-memory fallback |
| App | NEXT_PUBLIC_APP_URL | PASS | https://depo-pro.com |
| App | NEXT_PUBLIC_SITE_URL | PASS | https://depo-pro.com |
| App | CRON_SECRET | PASS | 64 chars (4002\*\*\*\*3557) |
| Deprecated | NEXTAUTH_SECRET | PASS | Not present |
| Deprecated | NEXTAUTH_URL | PASS | Not present |
| Deprecated | DATABASE_URL | PASS | Not present |
| Deprecated | DIRECT_URL | PASS | Not present |

## Recommendations (Priority Order)

1. **Decide on Stripe billing timeline** — if billing is not launching with beta, the 3 missing Stripe keys are acceptable. If billing IS launching, add keys immediately:
   - `STRIPE_SECRET_KEY` (sk_test_* for dev/preview, sk_live_* for prod)
   - `STRIPE_WEBHOOK_SECRET` (whsec_* from Stripe Dashboard)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_* for dev/preview, pk_live_* for prod)
   - Run `vercel env add` for each across all 3 Vercel environments

2. **Clarify Upstash vs REDIS_URL** — .env.example says Upstash vars are deprecated and code uses `REDIS_URL`. Verify which pattern is actually used in production code, then either:
   - Remove `UPSTASH_REDIS_REST_URL/TOKEN` from .env.local, or
   - Provision Upstash and add to Vercel if needed

3. **Investigate Supabase schema grants** — the publishable key returned "permission denied for schema public" on a table query. While auth works, this may affect client-side queries. Verify RLS policies grant SELECT on relevant tables to the `anon` role.

4. **Update .env.example** — sync the deprecated/not-referenced annotations for `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `UPSTASH_*`, and `USE_DEEPGRAM` based on actual codebase usage.
