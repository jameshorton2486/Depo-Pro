# Depo-Pro Environment Audit Report

Generated: 2026-03-08

## Executive Summary

| Metric | Count |
|--------|-------|
| Total checks run | 21 |
| Passing | 12 |
| Failures (must fix) | 7 |
| Warnings (should fix) | 2 |
| **Production readiness** | **NOT READY** |

The app will start but **5 critical integrations are broken** in production:
Supabase publishable key fails live auth, Deepgram API key is rejected,
Resend email is not configured, Stripe billing is not configured, and
Deepgram webhook verification has no secret set.

---

## Critical Failures

### FAIL 1 — NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (CRITICAL)

- **Status:** Key exists in all environments but **fails live authentication** (HTTP 401)
- **Impact:** Client-side Supabase calls (auth, realtime, storage) will fail
- **Key format:** `sb_publishable_••••••••Lrpv` (new format)
- **Root cause:** The Supabase REST API `/rest/v1/` endpoint returned 401 when tested with this key. The new `sb_publishable_` format may not be accepted by the REST API, or the key may have been rotated in the Supabase dashboard.
- **Fix:** Go to Supabase Dashboard → Settings → API → Copy the `anon` / `public` key (starts with `eyJ...`). Update in:
  - `.env.local`
  - Vercel: `vercel env rm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` then `vercel env add`
- **Note:** The `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_` format) works fine against the admin API, so the issue is specific to the publishable key format.

### FAIL 2 — DEEPGRAM_API_KEY (CRITICAL)

- **Status:** Key exists in all environments but **rejected by Deepgram API** (HTTP 401)
- **Impact:** All transcription will fail — core feature completely broken
- **Key format:** `c51d••••••••14d4`
- **Fix:** Go to Deepgram Console → API Keys → Generate new key with Nova-3 access. Update in:
  - `.env.local`
  - Vercel: all three environments

### FAIL 3 — DEEPGRAM_WEBHOOK_SECRET (CRITICAL)

- **Status:** Missing from `.env.local` AND all Vercel environments
- **Impact:** Deepgram transcription callbacks will be **rejected** by the fail-closed webhook handler. Completed transcriptions will never be saved.
- **Fix:**
  1. Generate a random secret: `openssl rand -hex 32`
  2. Configure in Deepgram Console as the webhook signing secret
  3. Add to `.env.local`
  4. Add to Vercel: `vercel env add DEEPGRAM_WEBHOOK_SECRET` (all environments)

### FAIL 4 — RESEND_API_KEY (CRITICAL)

- **Status:** Missing from `.env.local` AND all Vercel environments
- **Impact:** Password reset emails, notifications, and all transactional email **completely broken**
- **Fix:**
  1. Go to Resend Dashboard → API Keys → Create key
  2. Add domain `depo-pro.com` in Resend and verify DNS records
  3. Add to `.env.local`: `RESEND_API_KEY=re_...`
  4. Add to Vercel: `vercel env add RESEND_API_KEY` (all environments)

### FAIL 5 — STRIPE_SECRET_KEY (HIGH)

- **Status:** Missing from `.env.local` AND all Vercel environments
- **Impact:** All billing features broken — invoices, subscriptions, payment processing
- **Fix:**
  1. Go to Stripe Dashboard → Developers → API keys
  2. For `.env.local`: use **test key** (`sk_test_...`)
  3. For Vercel production: use **live key** (`sk_live_...`)
  4. For Vercel preview/development: use **test key** (`sk_test_...`)

### FAIL 6 — STRIPE_WEBHOOK_SECRET (HIGH)

- **Status:** Missing from `.env.local` AND all Vercel environments
- **Impact:** Stripe webhook signature verification will **reject all events** — billing events (payment success, subscription changes) will not be processed
- **Fix:**
  1. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
  2. Endpoint URL: `https://depo-pro.com/api/webhooks/stripe`
  3. Copy the signing secret (`whsec_...`)
  4. Add to all environments

### FAIL 7 — NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (HIGH)

- **Status:** Missing from `.env.local` AND all Vercel environments
- **Impact:** Stripe Checkout and payment forms will not load on the client
- **Fix:**
  1. Go to Stripe Dashboard → Developers → API keys → Publishable key
  2. For production: `pk_live_...`
  3. For dev/preview: `pk_test_...`
  4. **IMPORTANT:** The publishable key mode (live/test) must match the secret key mode

---

## Warnings

### WARN 1 — UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

- **Status:** Not configured in any environment
- **Impact:** Rate limiting falls back to in-memory store — not distributed across serverless instances. Multiple Vercel functions can independently hit rate limits.
- **Priority:** Medium — should be configured before production launch
- **Fix:**
  1. Create an Upstash Redis database at console.upstash.com
  2. Copy REST URL and token
  3. Add both variables to `.env.local` and all Vercel environments

### WARN 2 — NEXT_PUBLIC_APP_URL

- **Status:** Not set in any environment
- **Impact:** Code that references `NEXT_PUBLIC_APP_URL` will fall back to `NEXT_PUBLIC_SITE_URL` (which is set). Low risk since `NEXT_PUBLIC_SITE_URL` is the primary variable used in the codebase.
- **Fix:** Optional — add `NEXT_PUBLIC_APP_URL=https://depo-pro.com` if any code path specifically requires it

---

## Environment Coverage Matrix

| Variable | .env.local | Vercel Prod | Vercel Preview | Vercel Dev |
|---|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | SET | SET | SET | SET |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | SET (BROKEN) | SET (BROKEN) | SET (BROKEN) | SET (BROKEN) |
| SUPABASE_SERVICE_ROLE_KEY | SET | SET | SET | SET |
| DEEPGRAM_API_KEY | SET (BROKEN) | SET (BROKEN) | SET (BROKEN) | SET (BROKEN) |
| USE_DEEPGRAM | SET | SET | SET | SET |
| DEEPGRAM_WEBHOOK_SECRET | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| ANTHROPIC_API_KEY | SET | SET | SET | SET |
| RESEND_API_KEY | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| STRIPE_SECRET_KEY | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| STRIPE_WEBHOOK_SECRET | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| UPSTASH_REDIS_REST_URL | MISSING | MISSING | MISSING | MISSING |
| UPSTASH_REDIS_REST_TOKEN | MISSING | MISSING | MISSING | MISSING |
| NEXT_PUBLIC_APP_URL | MISSING | MISSING | MISSING | MISSING |
| NEXT_PUBLIC_SITE_URL | SET | SET | SET | SET |
| CRON_SECRET | SET (64 chars) | SET | SET | SET |

**Legend:** SET = present and non-empty, MISSING = not present, SET (BROKEN) = present but fails live API test

---

## Deprecated Variables

| Variable | .env.local | Vercel | Status |
|---|---|---|---|
| NEXTAUTH_SECRET | Not present | Not present | Clean |
| NEXTAUTH_URL | Not present | Not present | Clean |
| DATABASE_URL | Not present | Not present | Clean |
| DIRECT_URL | Not present | Not present | Clean |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Not present | Not present | Clean |
| SMTP_HOST/PORT/USER/PASS | Not present | Not present | Clean |
| ZOHO_SMTP_* | Not present | Not present | Clean |

All deprecated variables have been successfully removed.

---

## Additional Findings

### NEXT_PUBLIC_SITE_URL contains `\r\n` in Vercel snapshots

The cached Vercel env files (`.env.vercel.prod`, `.env.vercel.preview`, `.env.vercel.dev`) show:
```
NEXT_PUBLIC_SITE_URL="https://depo-pro.com\r\n"
```

This trailing `\r\n` can corrupt URL construction (e.g., `https://depo-pro.com\r\n/auth/callback`).

**Fix:** Remove and re-add the variable in Vercel:
```bash
vercel env rm NEXT_PUBLIC_SITE_URL
vercel env add NEXT_PUBLIC_SITE_URL
# Enter: https://depo-pro.com (no trailing whitespace)
```

### CRON_SECRET strength varies by environment

- `.env.local`: 64-character hex string (strong)
- Vercel (all envs): Set but value is encrypted — verify it meets minimum 32-character requirement in the Vercel dashboard

---

## Recommendations (Priority Order)

1. **IMMEDIATE — Rotate Supabase publishable key**
   - The `sb_publishable_` format key fails authentication
   - Get the `eyJ...` format anon key from Supabase Dashboard → Settings → API
   - Update in `.env.local` and all Vercel environments

2. **IMMEDIATE — Rotate Deepgram API key**
   - Current key returns 401 — likely expired or revoked
   - Generate new key in Deepgram Console with Nova-3 model access
   - Update in `.env.local` and all Vercel environments

3. **IMMEDIATE — Add DEEPGRAM_WEBHOOK_SECRET**
   - Without this, all transcription callbacks are silently rejected
   - Generate: `openssl rand -hex 32`
   - Configure in Deepgram webhook settings AND all environments

4. **IMMEDIATE — Add RESEND_API_KEY**
   - Password reset flow is completely broken without email
   - Create key at resend.com, verify depo-pro.com domain
   - Add to all environments

5. **BEFORE BILLING LAUNCH — Add all Stripe variables**
   - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - Use test keys for dev/preview, live keys for production
   - Ensure key modes match (both test or both live)

6. **BEFORE PRODUCTION — Fix NEXT_PUBLIC_SITE_URL `\r\n` corruption**
   - Remove and re-add in Vercel without trailing whitespace

7. **RECOMMENDED — Add Upstash Redis**
   - Distributed rate limiting across serverless functions
   - Required for proper DDoS protection at scale

8. **LOW — Add NEXT_PUBLIC_APP_URL**
   - Optional since NEXT_PUBLIC_SITE_URL serves as fallback

---

## All Test Results

```
SUPABASE
  PASS  NEXT_PUBLIC_SUPABASE_URL: https://ildhcfspbmhuemzgvzyx.supabase.co
  FAIL  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Key rejected — HTTP 401
  PASS  SUPABASE_SERVICE_ROLE_KEY: Admin API accessible

DEEPGRAM
  FAIL  DEEPGRAM_API_KEY: Key rejected — HTTP 401
  PASS  USE_DEEPGRAM: Set to true
  FAIL  DEEPGRAM_WEBHOOK_SECRET: Missing

ANTHROPIC
  PASS  ANTHROPIC_API_KEY: API responded successfully

RESEND
  FAIL  RESEND_API_KEY: Missing
  PASS  DEPRECATED SMTP: No old SMTP variables found

STRIPE
  FAIL  STRIPE_SECRET_KEY: Missing
  FAIL  STRIPE_WEBHOOK_SECRET: Missing
  FAIL  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Missing

UPSTASH
  WARN  UPSTASH_REDIS_REST_URL/TOKEN: Not configured

APP CONFIG
  PASS  NEXT_PUBLIC_SITE_URL: https://depo-pro.com
  WARN  NEXT_PUBLIC_APP_URL: Not set (falls back to SITE_URL)
  PASS  CRON_SECRET: Present (64 chars)

DEPRECATED
  PASS  NEXTAUTH_SECRET: Removed
  PASS  NEXTAUTH_URL: Removed
  PASS  DATABASE_URL: Removed
  PASS  DIRECT_URL: Removed
  PASS  NEXT_PUBLIC_SUPABASE_ANON_KEY: Removed
```

---

*This report was generated by an automated audit script. No secret values are included.*
*All secrets are masked as: `xxxx••••••••xxxx`*
