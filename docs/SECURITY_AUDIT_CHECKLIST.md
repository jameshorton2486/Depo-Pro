# Security Audit Checklist

> **Last Updated:** 2026-03-01
> **Status:** Pre-Beta Stabilization Phase
> **Frozen Layer:** see [Architecture Overview](./ARCHITECTURE_OVERVIEW.md#-frozen-layer--do-not-modify)
> **Related Tasks:** SEC-01 through SEC-07 in [Remaining Tasks](./REMAINING_TASKS_ANALYSIS.md)

---

## Authentication

- [x] Supabase Auth handles all password storage and hashing
- [x] Application never stores passwords directly
- [x] JWT session validation via `createSupabaseServerClient()`
- [x] Password reset flow functional
- [x] Email verification enabled
- [ ] SSO readiness — **DEFERRED to Phase 2**

---

## Auth Pattern Standard

**Use this:** `lib/middleware/withRouteProtection.ts`
**Do NOT use for new code:**
- `lib/security.ts` — @deprecated
- `lib/auth/require-auth.ts` — @deprecated
- `lib/permissions/api-guards.ts` — @deprecated

---

## Route Protection Coverage

**Current:** 23/140 routes use `withRouteProtection`. Target: 43+ after SEC-01.

### Routes intentionally without standard auth:

| Route | Auth Method | Intentional? |
|-------|-----------|-------------|
| `/api/health` | None (public) | ✅ |
| `/api/health/supabase` | None (public) | ✅ |
| `/api/auth/health` | None (public) | ✅ |
| `/api/webhooks/stripe` | Signature verification | ✅ |
| `/api/webhooks/deepgram` | Signature verification | ✅ |
| `/api/cron/process-jobs` | CRON_SECRET header | ✅ — verify enforcement |
| `/api/jobs/[id]/transcribe/process-chunk` | INTERNAL_API_SECRET | ✅ — verify enforcement |
| `/api/client-errors` | None | ⚠️ Add rate limiting |
| `/api/profile` | Manual token extraction | ⚠️ Migrate to standard pattern |

### Stub routes needing auth call (SEC-02):

- [ ] `app/api/medical-records/route.ts`
- [ ] `app/api/firms/route.ts`
- [ ] `app/api/audit-logs/route.ts`
- [ ] `app/api/matters/route.ts`
- [ ] `app/api/depositions/route.ts`
- [ ] `app/api/exhibits/route.ts`
- [ ] `app/api/demands/route.ts`

### Priority routes for withRouteProtection migration (SEC-01):

**Jobs routes:**
- [ ] `app/api/jobs/route.ts`
- [ ] `app/api/jobs/[id]/route.ts`
- [ ] `app/api/jobs/[id]/assign/route.ts`
- [ ] `app/api/jobs/[id]/status/route.ts`
- [ ] `app/api/jobs/[id]/transcribe/route.ts`
- [ ] `app/api/jobs/[id]/review/route.ts`
- [ ] `app/api/jobs/[id]/review/submit/route.ts`
- [ ] `app/api/jobs/[id]/flagged-words/route.ts`
- [ ] `app/api/jobs/[id]/export/route.ts`
- [ ] `app/api/jobs/[id]/medical-records/route.ts`
- [x] `app/api/jobs/[id]/lock/route.ts` ✅ (template)

**Transcript routes:**
- [ ] `app/api/transcripts/route.ts`
- [ ] `app/api/transcripts/[id]/route.ts`
- [ ] `app/api/transcripts/[id]/corrections/route.ts`
- [ ] `app/api/transcripts/[id]/export/route.ts`
- [ ] `app/api/transcripts/[id]/finalize/route.ts`
- [ ] `app/api/transcripts/[id]/status/route.ts`
- [ ] `app/api/transcripts/[id]/words/route.ts`

**Attorney routes:**
- [ ] All routes in `app/api/attorney/*`

**Calendar routes:**
- [ ] All routes in `app/api/calendar/*`

---

## Row Level Security (RLS)

### Verification checklist:

- [ ] Every table with user data has RLS **enabled**
- [ ] `profiles` — users read own, admins read all
- [ ] `jobs` — scoped to firm_id + creator/assignee
- [ ] `transcriptions` — scoped to job ownership chain
- [ ] `transcription_corrections` — scoped to transcript ownership
- [ ] `review_sessions` — scoped to reviewer or job owner
- [ ] `medical_records` — scoped to job ownership
- [ ] `chronology_entries` — scoped to record ownership
- [ ] `calendar_events` — scoped to firm_id
- [ ] `audit_events` — admin read-only, system write
- [ ] `job_locks` — scoped to job ownership
- [ ] `error_logs` — admin read-only
- [ ] **No `USING (true)` policies on any sensitive table**

**Migration history:** 6 RLS-related migrations applied (see Architecture Overview).
**Command:** `npm run verify:rls` (if available)

---

## Storage Security

- [ ] `depo-audio` — auth required for uploads, public read for playback
- [ ] `depo-files` — private, signed URLs only (1 hr expiry)
- [ ] `depo-exports` — private, scoped to user/firm
- [ ] `depo-chunks` — private, temporary processing only
- [ ] No buckets have permissive default policies
- [ ] Signed URL expiry ≤ 1 hour for private buckets

**Reference:** `supabase/migrations/20260225180101_b3_storage_bucket_security.sql`

---

## HTTP Security Headers

Configured in `next.config.ts` (**FROZEN — do not modify**):

- [x] `Content-Security-Policy`
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `X-XSS-Protection: 1; mode=block`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` — camera disabled, microphone self-only
- [x] `Strict-Transport-Security` — 1 year, includeSubDomains

**Verify in production:**
```bash
curl -I https://depo-pro.com
```

---

## Concurrency Protection

- [x] Job-level locking via `lib/supabase/queries/locks.ts`
- [x] Lock endpoints at `app/api/jobs/[id]/lock/route.ts`
- [ ] Optimistic locking on transcript corrections (SEC-03)
- [ ] Lock timeout/expiry prevents permanent locks

---

## Environment Variables

| Variable | Type | Verified? |
|----------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | [ ] |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | [ ] |
| `NEXT_PUBLIC_APP_URL` | Public | [ ] |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | [ ] |
| `DEEPGRAM_API_KEY` | Secret | [ ] |
| `ANTHROPIC_API_KEY` | Secret | [ ] |
| `INTERNAL_API_SECRET` | Secret | [ ] |
| `CRON_SECRET` | Secret | [ ] |
| `DEEPGRAM_WEBHOOK_SECRET` | Secret | [ ] |

---

## Audit Trail

- [x] `createAuditLog` captures: actor, action, target, metadata, IP
- [x] Audit events table with RLS
- [ ] Verify logging on: job creation, transcription start, corrections, exports, role changes

---

## Rate Limiting

- [x] Contact form: 5/hour per IP
- [x] `checkUserRateLimit` utility available
- [ ] Verify on: transcription trigger, export, medical extraction
