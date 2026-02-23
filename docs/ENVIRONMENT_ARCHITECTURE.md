# Environment Architecture

Canonical reference for all environment variables in Depo-Pro.

> **Rule**: If a variable is used in code it must be in this doc. If it is in this doc it must be in `.env.example`.

---

## Quick Classification

| Symbol | Meaning |
|--------|---------|
| `PUB` | `NEXT_PUBLIC_*` — embedded at build time, visible in browser |
| `SRV` | Server-only — never accessible to browser |
| `CLI` | Used by CI/CD or Supabase CLI, not by the running app |
| `REQ` | Required — app will not start without it |
| `OPT` | Optional — has default or feature is gated |
| `DEP` | Deprecated — do not use in new code |

---

## Variable Matrix

| Variable | Class | Env: Local | Env: CI | Env: Production | Required | Notes |
|----------|-------|-----------|---------|-----------------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | PUB | `.env.local` | build placeholder | Vercel | REQ | Must be `https://*.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | PUB | `.env.local` | build placeholder (`sb_publishable_*`) | Vercel | REQ | Must start with `sb_publishable_` |
| `SUPABASE_SERVICE_ROLE_KEY` | SRV | `.env.local` | build placeholder (`sb_secret_*`) | Vercel | REQ | Must start with `sb_secret_`. Never in client code. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUB | `.env.local` | — | — | OPT | Legacy alias for publishable key. Scripts only. |
| `SUPABASE_URL` | SRV | `.env.local` | — | — | OPT | Legacy alias for NEXT_PUBLIC_SUPABASE_URL. Scripts only. |
| `DEEPGRAM_API_KEY` | SRV | `.env.local` | — | Vercel | REQ | Transcription API |
| `ANTHROPIC_API_KEY` | SRV | `.env.local` | — | Vercel | REQ | Medical extraction pipeline |
| `NEXT_PUBLIC_SITE_URL` | PUB | `.env.local` | — | Vercel | OPT | Public URL for email links and OAuth redirects. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_URL` | PUB | `.env.local` | — | Vercel | OPT | Internal base URL for self-calls in transcription scheduler. Defaults to `http://localhost:3000`. |

### Database / CLI (not used by running app)

| Variable | Class | Notes |
|----------|-------|-------|
| `DIRECT_URL` | CLI | Direct PostgreSQL connection on port **5432** (not pooler 6543). Used by CI org-isolation tests and `psql` scripts. |
| `SUPABASE_ACCESS_TOKEN` | CLI | Supabase CLI auth token (`sbp_*`). Required for `supabase` CLI commands in CI. |
| `SUPABASE_PROJECT_ID` | CLI | Project reference ID. Required for CLI `--project-id` flag. |
| `SUPABASE_DB_PASSWORD` | CLI | Database password. Required for CLI migration pushes. |

### Email (SMTP)

| Variable | Class | Default | Notes |
|----------|-------|---------|-------|
| `EMAIL_HOST` | SRV | `smtp.zoho.com` | SMTP host |
| `EMAIL_PORT` | SRV | `587` | SMTP port |
| `EMAIL_USER` | SRV | — | SMTP username. Email disabled if unset. |
| `EMAIL_PASSWORD` | SRV | — | SMTP password/app-password. Email disabled if unset. |
| `EMAIL_FROM` | SRV | — | From address (e.g. `Depo-Pro <info@depo-pro.com>`) |
| `ADMIN_EMAIL` | SRV | — | Admin notification recipient |

### Webhooks / Cron / Security

| Variable | Class | Notes |
|----------|-------|-------|
| `CRON_SECRET` | SRV | Protects `/api/cron/*` endpoints |
| `INTERNAL_API_SECRET` | SRV | Auth for internal transcription chunk calls. Falls back to `CRON_SECRET`. |
| `WEBHOOK_SECRET` | SRV | Webhook signing secret |
| `DEEPGRAM_WEBHOOK_SECRET` | SRV | Validates Deepgram async callbacks |

### Billing

| Variable | Class | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | SRV | Stripe billing (gated behind `USE_STRIPE=true`) |
| `STRIPE_WEBHOOK_SECRET` | SRV | Stripe webhook validation |

### Queue / Infrastructure

| Variable | Class | Default | Notes |
|----------|-------|---------|-------|
| `REDIS_URL` | SRV | In-memory fallback | BullMQ job queue |
| `USE_QUEUE` | SRV | `false` | Enables Redis-backed queue |
| `WORKER_CONCURRENCY` | SRV | `5` | Worker concurrency limit |
| `WORKER_MAX_JOBS_PER_MINUTE` | SRV | `10` | Rate limit for job processing |

### Feature Flags

| Variable | Default | Notes |
|----------|---------|-------|
| `ENABLE_TRANSCRIPTION` | — | Enables Deepgram pipeline routes |
| `ENABLE_MEDICAL_CHRONOLOGY` | — | Enables Anthropic extraction routes |
| `ENABLE_EXPORT` | — | Enables document export |
| `ENABLE_AI_EXTRACTION` | — | Enables AI document extraction |
| `ENABLE_DEMAND_BUILDER` | — | Enables demand builder |
| `ENABLE_REALTIME` | — | Enables Supabase realtime |
| `ENABLE_EXHIBITS` | — | Enables exhibits module |
| `ENABLE_VOCABULARY` | — | Enables custom vocabulary |
| `ENABLE_SHARING` | — | Enables transcript sharing |
| `ENABLE_BILLING_PHASE_6` | `false` | Billing feature gate |
| `USE_STRIPE` | `false` | Stripe integration gate |

### Third-Party Integrations

| Variable | Class | Notes |
|----------|-------|-------|
| `GOOGLE_CLIENT_ID` | SRV | Google Calendar OAuth |
| `GOOGLE_CLIENT_SECRET` | SRV | Google Calendar OAuth |
| `GOOGLE_REDIRECT_URI` | SRV | Google OAuth callback URL |

### Runtime / Observability

| Variable | Default | Notes |
|----------|---------|-------|
| `LOG_LEVEL` | `info` (prod), `debug` (dev) | Logger verbosity |
| `LOW_CONFIDENCE_THRESHOLD` | `0.85` | Flagged-word confidence cutoff |
| `UPLOADS_DIR` | `./uploads` | Local upload staging dir |
| `SENTRY_DSN` | — | Error telemetry (empty = disabled) |
| `NODE_ENV` | Set by runtime | `development` / `production` |
| `VERCEL_ENV` | Set by Vercel | `development` / `preview` / `production` |

### Testing

| Variable | Notes |
|----------|-------|
| `PLAYWRIGHT_BASE_URL` | Base URL for Playwright E2E tests |
| `TEST_API_URL` | API base URL for integration tests |
| `TEST_USER_EMAIL` | Seed test user email |
| `TEST_USER_PASSWORD` | Seed test user password |

---

## CI Secret Requirements

GitHub Actions secrets required per workflow:

### `ci.yml` (build + lint + typecheck)
Build-time placeholders are hard-coded in the workflow — no secrets needed.

### `quality-gates.yml` (lint, typecheck, unit tests)
No secrets required.

### `version-guard.yml`
No secrets required.

### `org-isolation.yml` (Windows runner — full isolation suite)
| Secret | Purpose |
|--------|---------|
| `DIRECT_URL` | Direct DB connection (port 5432) |
| `TEST_USER_A` | Org-A test user credential |
| `TEST_USER_B` | Org-B test user credential |

### `org-isolation-suite.yml` (Linux runner — isolation + RLS upload)
| Secret | Purpose |
|--------|---------|
| `DIRECT_URL` | Direct DB connection (port 5432) |
| `TEST_USER_A` | Org-A test user credential (same secret as org-isolation.yml) |
| `TEST_USER_B` | Org-B test user credential (same secret as org-isolation.yml) |

> **Note**: Both org-isolation workflows now use the same `TEST_USER_A/B` secrets. No duplicate secrets needed.

---

## Security Rules

1. **Never prefix server secrets with `NEXT_PUBLIC_`** — they would be embedded in the client bundle.
2. **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS** — only use in `lib/supabase/admin.ts` and never in client components.
3. **`DIRECT_URL` uses port 5432** — never port 6543 (pooler). The pooler does not support DDL/migrations.
4. **`INTERNAL_API_SECRET`** protects transcription chunk endpoints from unauthorized external calls. It falls back to `CRON_SECRET` if unset.

---

## Variable Name Conflicts to Be Aware Of

| Code Reads | .env.example Had | Status |
|-----------|-----------------|--------|
| `EMAIL_HOST` | `ZOHO_SMTP_HOST` | Fixed — `.env.example` now uses `EMAIL_*` |
| `EMAIL_PORT` | `ZOHO_SMTP_PORT` | Fixed |
| `EMAIL_USER` | `ZOHO_SMTP_USER` | Fixed |
| `EMAIL_PASSWORD` | `ZOHO_SMTP_PASS` | Fixed |
| `NEXT_PUBLIC_APP_URL` | (missing) | Fixed — added |
| `INTERNAL_API_SECRET` | (missing) | Fixed — added |
| `DIRECT_URL` | (missing) | Fixed — added under CI section |
