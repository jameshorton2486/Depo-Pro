# API Security Audit — Depo-Pro

**Generated**: 2026-02-23
**Total routes scanned**: 136
**Methodology**: Static analysis of all `app/api/**/route.ts` files

---

## 1. Executive Summary

| Metric | Value | Assessment |
|--------|-------|-----------|
| Routes with authentication | ~130 / 136 (95.6%) | ✅ GOOD |
| Routes with Zod validation | ~9 / 136 (6.6%) | ⚠️ LOW |
| Routes with rate limiting | ~11 / 136 (8.1%) | ⚠️ CRITICALLY LOW |
| Truly public routes (intentional) | 4 / 136 (2.9%) | ✅ CORRECT |
| Routes with webhook signature verify | 3 | ✅ GOOD |
| Routes with cron secret auth | 2 | ✅ GOOD |

**Overall Risk**: **MEDIUM-HIGH** — Auth coverage is strong. Validation and rate limiting are the primary gaps.

---

## 2. Auth Pattern Inventory

### 2a. Authentication Methods (Ranked by preference)

| Method | Routes | Description |
|--------|--------|-------------|
| `withRouteProtection()` | ~8 | Best — auth + role + rate limit in one wrapper |
| `requireAuthV2()` | ~4 | Good — v2 auth guard from `lib/permissions/api-guards` |
| `requireAuth()` | ~3 | Legacy — custom session check |
| `supabase.auth.getUser()` | ~10 | Direct SDK call — adequate |
| `getCurrentUser()` | ~15 | Session wrapper — adequate |
| `requireRole()` / `requireAdmin()` | ~4 | Role-specific guards — admin routes |
| Webhook signature | 3 | Correct for webhooks |
| CRON_SECRET / INTERNAL_API_SECRET | 3 | Correct for cron/internal |
| No auth (public) | 4 | Intentional: health, contact, webhooks/deepgram |

### 2b. Truly Public Routes

| Route | Reason |
|-------|--------|
| `GET /api/health` | Health check — intentionally public |
| `GET /api/health/supabase` | Health check — intentionally public |
| `POST /api/contact` | Contact form — rate-limited (5/hr/IP), Zod validated (post-WS4) |
| `POST /api/webhooks/deepgram` | Deepgram callback — signature verified |

---

## 3. Route Classification Table

### Critical / High-Traffic Routes

| Route | Methods | Auth | Zod | Rate Limit | Risk |
|-------|---------|------|-----|-----------|------|
| `/api/jobs` | GET, POST | `getUser` + `withRouteProtection` | ❌ | POST: 20/min | NEEDS VALIDATION |
| `/api/jobs/[id]` | GET, PUT, PATCH, DELETE | `requireAuth()` | ❌ | API_GLOBAL | NEEDS VALIDATION |
| `/api/jobs/[id]/flagged-words` | GET, PATCH, DELETE | `getCurrentUser` + `withRouteProtection` | ✅ PATCH (post-WS4) | PATCH: 60/min | OK |
| `/api/jobs/[id]/files` | GET, POST | `getCurrentUser()` | ❌ | None | NEEDS VALIDATION, RATE LIMIT |
| `/api/jobs/[id]/medical-records/[recordId]/extract` | POST | `getCurrentUser` + `withRouteProtection` | ❌ | 5/min | NEEDS VALIDATION |
| `/api/transcripts` | GET, POST, PUT, DELETE | `supabase.auth.getUser()` | ❌ | None | NEEDS VALIDATION, RATE LIMIT |
| `/api/transcripts/[id]` | GET, PUT, PATCH, DELETE | `supabase.auth.getUser()` | ❌ | None | NEEDS VALIDATION, RATE LIMIT |
| `/api/transcripts/[id]/corrections` | GET, POST | `getCurrentUser` + `withRouteProtection` | ❌ | 60/min | NEEDS VALIDATION |
| `/api/transcripts/[id]/words` | GET, PATCH | `getCurrentUser` + `withRouteProtection` | ❌ | Rate limited | NEEDS VALIDATION |
| `/api/transcripts/[id]/ai-review` | GET, POST | `supabase.auth.getUser()` | ❌ | None | NEEDS VALIDATION, RATE LIMIT |
| `/api/transcripts/[id]/score` | GET, POST | `supabase.auth.getUser()` | ✅ POST | None | NEEDS RATE LIMIT |
| `/api/transcripts/[id]/annotations` | GET, POST | `getCurrentUser()` | ✅ POST | None | NEEDS RATE LIMIT |
| `/api/transcripts/[id]/bookmarks` | GET, POST | `getCurrentUser()` | ✅ POST (post-WS4) | None | NEEDS RATE LIMIT |
| `/api/transcripts/[id]/highlights` | GET, POST | `getCurrentUser()` | ✅ POST (post-WS4) | None | NEEDS RATE LIMIT |
| `/api/transcripts/[id]/notes` | GET, POST | `getCurrentUser()` | ✅ POST (post-WS4) | None | NEEDS RATE LIMIT |
| `/api/transcripts/[id]/shares` | GET, POST | `getCurrentUser()` | ✅ POST | None | NEEDS RATE LIMIT |
| `/api/review-sessions` | POST | `getCurrentUser()` | ✅ (post-WS4) | None | NEEDS RATE LIMIT |
| `/api/profile` | GET, POST | Manual token | ❌ | None | CRITICAL: role changes, NO RATE LIMIT |
| `/api/contact` | POST | None (public) | ✅ (post-WS4) | 5/hr/IP | OK |

### Admin Routes

| Route | Methods | Auth | Risk |
|-------|---------|------|------|
| `/api/admin/audit` | GET | `requireAdmin()` | OK |
| `/api/admin/incidents` | GET, PATCH | `requireAdmin()` | NEEDS VALIDATION (PATCH) |
| `/api/admin/metrics` | GET | `requireAdmin()` | OK |
| `/api/auth/health` | GET | `requireRole([ADMIN, SUPER_ADMIN])` | OK |
| `/api/audit` | GET | `getCurrentUser` + `requireAuthV2` | OK (Zod present) |
| `/api/audit-logs` | ALL | `requireAuthV2()` | 501 Not Implemented |
| `/api/audit/export` | GET | `requireAdmin()` | OK |

### Webhook / Cron Routes (Correctly Authenticated)

| Route | Auth Method | Status |
|-------|------------|--------|
| `POST /api/webhooks/stripe` | `STRIPE_WEBHOOK_SECRET` signature | ✅ OK |
| `POST /api/webhooks/deepgram` | `DEEPGRAM_WEBHOOK_SECRET` signature | ✅ OK |
| `POST /api/webhooks/[provider]` | `verifyWebhookRequest()` | ✅ OK |
| `GET/POST /api/cron/process-jobs` | `CRON_SECRET` bearer | ✅ OK |
| `GET /api/cron/cleanup` | `CRON_SECRET` bearer | ✅ OK |
| `POST /api/jobs/[id]/transcribe/process-chunk` | `INTERNAL_API_SECRET` | ✅ OK |

---

## 4. Service Role (Admin Client) Usage Audit

Routes that use `createAdminClient()` or `getSupabaseAdmin()` — these bypass RLS:

| File | Justification | Risk |
|------|--------------|------|
| `lib/storage.ts` | Storage upload (service must write to private buckets) | ✅ Acceptable |
| `lib/exhibits/storage.ts` | Exhibit file management | ✅ Acceptable |
| `app/api/jobs/[id]/medical-records/[recordId]/extract/route.ts` | AI extraction (service role for cross-table writes) | ✅ Acceptable |
| `app/api/webhooks/deepgram/route.ts` | Webhook callback (no user context) | ✅ Acceptable |
| `app/api/cron/process-jobs/route.ts` | Background job processing | ✅ Acceptable |
| `scripts/create-test-users.ts` | CI test setup only | ✅ Acceptable |

**Finding**: Service role usage is well-scoped. No routes expose admin client unnecessarily.

---

## 5. Storage Security Audit

### Bucket Configuration

| Bucket | Visibility | Usage |
|--------|-----------|-------|
| `depo-audio` | **PUBLIC** | Audio files for browser streaming |
| `depo-files` | **PRIVATE** | Job documents, exhibits |
| `depo-exports` | **PRIVATE** | Generated exports (PDF, DOCX) |
| `depo-chunks` | **PRIVATE** | Audio processing chunks |

### URL Generation (post-WS3)

| Function | Bucket | URL Type | Status |
|----------|--------|----------|--------|
| `uploadFileToSupabase()` audio path | `depo-audio` (public) | Public URL (permanent) | ✅ FIXED |
| `uploadFileToSupabase()` file path | `depo-files` (private) | Signed URL (1hr) | ✅ FIXED |
| `uploadExhibitOriginal()` | `depo-files` (private) | Signed URL (1hr) | ✅ FIXED |
| `uploadExhibitStamped()` | `depo-files` (private) | Signed URL (1hr) | ✅ FIXED |
| `getExhibitSignedUrl()` | `depo-files` (private) | Signed URL (1hr) | ✅ Already correct |

**Pre-WS3 issue**: `lib/storage.ts` and `lib/exhibits/storage.ts` called `getPublicUrl()` on private buckets, which returns broken URLs (Supabase returns the URL format but the bucket denies access). Fixed in WS3.

**Remaining concern**: Signed URLs stored in the database (`storage_url` column on `job_files`) will expire after 1 hour. Callers should re-generate signed URLs at access time using the stored `storage_path`. This is a planned Phase 1 improvement.

---

## 6. Input Validation Coverage (post-WS4)

### Routes with Zod Validation

| Route | Method | Schema | Added In |
|-------|--------|--------|---------|
| `/api/transcripts/[id]/annotations` | POST | `createAnnotationSchema` | Pre-existing |
| `/api/transcripts/[id]/shares` | POST | `createShareSchema` | Pre-existing |
| `/api/transcripts/[id]/score` | POST | `ScoreSchema` | Pre-existing |
| `/api/audit` | GET | `querySchema` | Pre-existing |
| `/api/transcripts/[id]/bookmarks` | POST | `createBookmarkSchema` | WS4 |
| `/api/transcripts/[id]/highlights` | POST | `createHighlightSchema` | WS4 |
| `/api/transcripts/[id]/notes` | POST | `createNoteSchema` | WS4 |
| `/api/review-sessions` | POST | `createReviewSessionSchema` | WS4 |
| `/api/contact` | POST | `contactFormSchema` | WS4 |
| `/api/jobs/[id]/flagged-words` | PATCH | `updateFlaggedWordSchema` | WS4 |

### High-Priority Routes Still Needing Validation

| Route | Method | Body Fields |
|-------|--------|------------|
| `/api/jobs` | POST | `{ caseName, title, depositionDate, caseNumber, deponentName, location, notes }` |
| `/api/jobs/[id]` | PUT, PATCH | Job update fields |
| `/api/transcripts/[id]/corrections` | POST | `{ corrections, reviewedWordIndices, expectedUpdatedAt, ... }` |
| `/api/transcripts/[id]/ai-review` | POST | `{ prompt, options }` |
| `/api/transcripts` | POST | `{ job_id }` |
| `/api/admin/incidents` | PATCH | `{ resolved, resolutionNotes }` |
| `/api/profile` | POST | Role + profile update fields |

---

## 7. Priority Fix List

### P0 — Before Production
1. **`/api/profile` POST — add rate limiting** (currently allows unlimited role-change attempts)
2. **`/api/transcripts/[id]/ai-review` POST — add rate limit** (LLM cost risk)
3. **`/api/jobs/[id]/medical-records` extract — add Zod** (validates AI extraction parameters)

### P1 — Phase 1 Sprint
4. Add Zod to `/api/jobs` POST + `/api/jobs/[id]` PUT/PATCH
5. Add Zod to `/api/transcripts/[id]/corrections` POST
6. Add rate limiting to all transcript write endpoints (annotations, shares, corrections)
7. Fix signed URL expiry: re-generate at access time rather than storing in DB
8. Add `withRouteProtection` to bookmarks, highlights, notes, review-sessions POST

### P2 — Phase 2+
9. Standardize on single auth method (deprecate `requireAuth()` and `requireAuthV2()` in favor of `withRouteProtection`)
10. Add Zod to remaining ~25 mutation endpoints
11. Implement Redis-backed rate limiting (current in-memory resets on deploy)

---

## 8. Rate Limiting Coverage

**Current state**: Only 11 of 136 routes (8.1%) have rate limiting.

### Routes With Rate Limiting

| Route | Limit | Method |
|-------|-------|--------|
| `POST /api/jobs` | 20/min | `withRouteProtection` |
| `PATCH /api/jobs/[id]/flagged-words` | 60/min | `withRouteProtection` |
| `POST /api/transcripts/[id]/corrections` | 60/min | `withRouteProtection` |
| `POST /api/jobs/[id]/medical-records/.../extract` | 5/min | `withRouteProtection` |
| `GET/PUT/PATCH/DELETE /api/jobs/[id]` | API_GLOBAL | `checkRateLimit()` |
| `POST /api/contact` | 5/hr/IP | In-memory IP rate limit |
| Deepgram/Stripe webhook routes | N/A | External rate limit by provider |

### Highest-Risk Routes Without Rate Limiting

| Route | Risk Reason |
|-------|------------|
| `POST /api/transcripts/[id]/ai-review` | LLM API cost — unbounded requests |
| `POST /api/profile` | Role changes — brute-force risk |
| `POST /api/transcripts` | Transcript creation — resource intensive |
| `GET /api/entities/extract` | AI extraction — LLM cost |
| `POST /api/calendar/google/sync` | External API calls |
