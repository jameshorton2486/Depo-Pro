# DEPO-PRO MASTER ARCHITECTURE REFERENCE
**Version:** 1.0 | **Date:** March 2026 | **Status:** Authoritative  
**Classification:** Internal Engineering — Confidential

> **Purpose:** This document is the single source of truth for Depo-Pro's system
> architecture. All AI agents (Claude Code, Codex, Cursor), all developers, and all
> future prompts must reference this document before making any code changes.
> When in doubt — read this first.

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Infrastructure & Environment](#2-infrastructure--environment)
3. [Technology Stack](#3-technology-stack)
4. [Domain Model — Authoritative Database Tables](#4-domain-model--authoritative-database-tables)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [File Storage Structure](#6-file-storage-structure)
7. [API Surface Map](#7-api-surface-map)
8. [Architecture Layers & Rules](#8-architecture-layers--rules)
9. [Error Handling Standard](#9-error-handling-standard)
10. [Environment Variables](#10-environment-variables)
11. [Known Bugs & Security Issues](#11-known-bugs--security-issues)
12. [Real-World Reference Case](#12-real-world-reference-case)

---

## 1. System Overview

Depo-Pro is a **multi-tenant legal deposition transcription SaaS platform** for
court reporting agencies, independent court reporters, and the law firms they serve.

**Core mission:** *"AI Assists, Humans Decide."*  
AI transcribes, formats, and flags uncertain words. All corrections, certification,
and delivery decisions are made by licensed court reporters. Legal verbatim integrity
is paramount.

### End-to-End Workflow

```
1. Court reporter receives Notice of Deposition (NOD) via email
2. Reporter uploads NOD PDF to Depo-Pro → AI extracts case metadata
3. Job created, grouped under cause number (case)
4. Deposition held → audio/video recording uploaded
5. FFmpeg enhancement pipeline cleans and normalizes audio
6. Deepgram Nova-3 transcribes with word-level timestamps
7. AI formats transcript (Q/A, tabs, speaker labels, punctuation)
8. AI flags low-confidence words for human review
9. Scopist (if assigned) or reporter proofs and corrects
10. Scopist submits → reporter does final review → certifies
11. Reporter delivers via secure one-time download link to ordering attorney
12. Agency and law firm notified of delivery
13. Files archived per retention policy
```

---

## 2. Infrastructure & Environment

| Item | Value |
|---|---|
| **Supabase Project ID** | `ildhcfspbmhuemzgvzyx` |
| **Vercel Team** | `james-hortons-projects-6d806c91` |
| **GitHub Repo** | `github.com/jameshorton2486/depo-pro` |
| **Active Branch** | `DepoPro_Remaining_Development_Roadmap` |
| **Local Repo Path** | `C:\Users\james\depo-pro` |
| **Canonical Domain** | `depo-pro.com` (Bluehost registrar) |
| **Subdomain Redirects** | `www` and `app` → root (301) |
| **Admin Email** | `jameshorton2486@gmail.com` |
| **Admin Supabase UID** | `c12a8a09-2f66-48d2-b696-b75135c75eeb` |
| **Notification Sending Address** | `notifications@depo-pro.com` |
| **Support Display Email** | `info@depo-pro.com` (display only — not a sending address) |

---

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 16 App Router | TypeScript strict mode throughout |
| **UI** | React + Tailwind CSS | Component library: shadcn/ui |
| **Authentication** | Supabase Auth | NextAuth **fully removed** |
| **Database** | Supabase (PostgreSQL) | Row-Level Security enforced on all tables |
| **Storage** | Supabase Storage | Two buckets: active + archive |
| **ORM** | None — direct Supabase JS client | Prisma schema exists but is not used for migrations |
| **Speech Recognition** | Deepgram Nova-3 | Word-level timestamps, multi-speaker diarization |
| **Audio Processing** | FFmpeg via `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` | Server-side, no external API |
| **AI / NLP** | Anthropic Claude API | Medical term extraction, legal formatting |
| **Email** | Resend | `notifications@depo-pro.com` — Zoho fully removed |
| **Export** | `docx` library | DOCX generation with legal formatting |
| **Deployment** | Vercel | |
| **Queue** | Upstash Redis + BullMQ | Currently `USE_QUEUE=false` — in-memory acceptable at beta scale |
| **Monitoring** | `lib/monitoring.ts` | `logRouteError()`, `logSlowRequest()` |
| **Testing** | Vitest | 37 suites, 192 tests passing as of March 2026 |

### Session Pattern (Canonical)

```typescript
// CORRECT — flat SessionUser from lib/auth/session.ts
const user: SessionUser = await getCurrentUser();
// { id, email, role, name, firmId }

// WRONG — deprecated wrapped shape (fully removed)
// { user: { id, email, role } }
```

### Supabase Key Format

```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = YOUR_PUBLISHABLE_KEY_HERE
```
New format only. Legacy anon key format is rejected.

---

## 4. Domain Model — Authoritative Database Tables

> ⚠️ **NEVER INVENT NEW TABLES.** All entities are defined here.  
> Check `supabase/migrations/` before creating anything new.  
> The following phantom tables were referenced in code but **do not exist**  
> and must never be created: `job_assignments`, `cases`, `transcript_jobs`, `deposition_requests`

---

### `firms` — Top-level tenant

```sql
id          UUID PRIMARY KEY
name        TEXT
firm_type   TEXT  -- 'agency' | 'law_firm'
created_at  TIMESTAMPTZ
```

Every user, job, and file belongs to exactly one firm. All queries **must**
include `firm_id` filtering — this is the multi-tenant security boundary.

---

### `profiles` — One row per authenticated user

```sql
id          UUID   -- matches auth.users.id exactly
firm_id     UUID   REFERENCES firms(id)
role        TEXT   -- UserRole enum value
first_name  TEXT
last_name   TEXT
email       TEXT
csr_number  TEXT   -- e.g. "CSR No. 12129" for court reporters
```

---

### `jobs` — The central entity

One job = one deposition of one witness.  
Multiple jobs share a `cause_number` (grouped by `case_metadata`).

```sql
id                    UUID PRIMARY KEY
firm_id               UUID NOT NULL REFERENCES firms(id)  -- RLS boundary
case_name             TEXT NOT NULL   -- e.g. "Bianca Perez v. Simon Ugalde, et al."
case_number           TEXT            -- display format: "2025-CI-12281"
deponent_name         TEXT            -- e.g. "Bianca Perez"
deposition_date       DATE
location              TEXT            -- city or "Via Zoom"
court_name            TEXT            -- e.g. "285th Judicial District, Bexar County, TX"
status                TEXT            -- job_status enum — see lifecycle doc
priority              INTEGER NOT NULL DEFAULT 0
reporter_id           UUID NOT NULL REFERENCES profiles(id)
scopist_id            UUID REFERENCES profiles(id)  -- nullable
assigned_at           TIMESTAMPTZ
audio_file_url        TEXT            -- Supabase Storage URL
audio_file_name       TEXT
audio_duration_seconds FLOAT
case_metadata_id      UUID REFERENCES case_metadata(id)
intake_document_id    UUID REFERENCES deposition_documents(id)
source_request_id     UUID REFERENCES transcript_requests(id)
internal_notes        TEXT            -- JSON: audio processing mode, quality score
created_by_id         UUID            -- user who created the job
due_date              DATE
created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

> **Scopist assignment:** Lives directly on `jobs.scopist_id` — NOT in a separate
> `job_assignments` table. That table does not exist.

> **Attorney constraint:** DB-level trigger prevents ATTORNEY role from being  
> set as `reporter_id` or `scopist_id`.

---

### `deposition_documents` — Uploaded NOD PDFs and intake documents

```sql
id              UUID PRIMARY KEY
firm_id         UUID NOT NULL REFERENCES firms(id)
job_id          UUID REFERENCES jobs(id)   -- nullable until job created
uploaded_by     UUID NOT NULL REFERENCES profiles(id)
file_name       TEXT NOT NULL
file_url        TEXT NOT NULL              -- Supabase Storage URL
mime_type       TEXT
parse_status    TEXT DEFAULT 'pending'    -- pending|processing|completed|failed
parsed_at       TIMESTAMPTZ
extraction_id   UUID
```

---

### `case_metadata` — AI-extracted metadata from NOD

The cause number lives here — this is how jobs are grouped into cases.

```sql
id                  UUID PRIMARY KEY
firm_id             UUID NOT NULL REFERENCES firms(id)
job_id              UUID REFERENCES jobs(id)
document_id         UUID REFERENCES deposition_documents(id)
cause_number        TEXT    -- NORMALIZED: "2025CI12281" (no hyphens, for matching)
case_style          TEXT    -- e.g. "Bianca Perez v. Simon Ugalde, et al."
court_name          TEXT
court_reporter_name TEXT
confidence_score    NUMERIC(3,2)  -- 0.00–1.00 AI extraction confidence
raw_extraction      JSONB   -- full AI extraction output
```

**Cause Number Normalization Rule:**
- **Storage/matching:** Strip hyphens and spaces → `2025CI12281`
- **Display format:** Preserve original → `2025-CI-12281`
- When a new job is created, check for existing `case_metadata` with same
  normalized cause number. If found → attach. If not → create new.

---

### `case_attorneys` — Extracted from NOD, used for delivery notifications

```sql
id              UUID PRIMARY KEY
firm_id         UUID NOT NULL REFERENCES firms(id)
case_metadata_id UUID NOT NULL REFERENCES case_metadata(id)
attorney_name   TEXT NOT NULL
law_firm        TEXT
role            TEXT    -- 'plaintiff_counsel' | 'defense_counsel' | 'in_house'
represents      TEXT    -- party name
email           TEXT    -- used for delivery notification
is_rush         BOOLEAN DEFAULT FALSE
```

---

### `deposition_sessions` — Scheduled deposition events

```sql
id              UUID PRIMARY KEY
firm_id         UUID NOT NULL REFERENCES firms(id)
case_metadata_id UUID NOT NULL REFERENCES case_metadata(id)
job_id          UUID REFERENCES jobs(id)
deponent_name   TEXT NOT NULL
deposition_date DATE
start_time      TIME
end_time        TIME
timezone        TEXT DEFAULT 'America/Chicago'
is_remote       BOOLEAN DEFAULT FALSE
remote_platform TEXT    -- e.g. "Zoom"
is_videotaped   BOOLEAN DEFAULT FALSE
```

---

### `transcriptions` — One row per job, Deepgram output and AI results

```sql
id              UUID PRIMARY KEY
job_id          UUID UNIQUE REFERENCES jobs(id)
status          TEXT    -- TranscriptStatus enum
deepgram_json   JSONB   -- raw Deepgram response
metadata        JSONB   -- audio_quality_score, audio_quality_tier,
                        --   audio_quality_issues, risk_score_result,
                        --   confidence_analytics
formatted_text  TEXT    -- AI-formatted transcript
docx_url        TEXT    -- Supabase Storage URL of generated DOCX
```

**Metadata JSON shape:**
```json
{
  "audio_quality_score": 78,
  "audio_quality_tier": "GOOD",
  "audio_quality_issues": [],
  "risk_score_result": { "score": 0.23, "flagCount": 12 },
  "confidence_analytics": { "mean": 0.91, "flaggedPercent": 8.4 }
}
```

---

### `transcript_requests` — Intake requests before job approval

```sql
id              UUID PRIMARY KEY
firm_id         UUID NOT NULL REFERENCES firms(id)
submitted_by    UUID NOT NULL REFERENCES profiles(id)
status          TEXT DEFAULT 'PENDING_REVIEW'  -- PENDING_REVIEW|APPROVED|DECLINED
approved_job_id UUID REFERENCES jobs(id)
cause_number    TEXT
case_style      TEXT
deponent_name   TEXT
deposition_date DATE
ordering_attorney TEXT
ordering_email  TEXT
audio_processing TEXT DEFAULT 'automated'
```

---

### `flagged_words` — Low-confidence words for human review

```sql
id              UUID PRIMARY KEY
transcription_id UUID NOT NULL REFERENCES transcriptions(id)
word            TEXT NOT NULL
original_word   TEXT NOT NULL   -- IMMUTABLE after hydration — never update
confidence      FLOAT
start_time      FLOAT
end_time        FLOAT
reviewed        BOOLEAN DEFAULT FALSE
corrected_word  TEXT            -- null until scopist/reporter corrects
```

> ⚠️ **`original_word` is IMMUTABLE after hydration. Hard deletes on  
> `transcript_words` are PROHIBITED. This is a legal integrity requirement.**

---

## 5. User Roles & Permissions

Roles are defined in `lib/enums/roles.ts` as `UserRole` enum.

### Agency / Reporter Side

| Role | Description | Job Access |
|---|---|---|
| `SUPER_ADMIN` | Full access to all firms, all jobs, all data. No filters. | All jobs, all firms |
| `ADMIN` | Full access within their firm | All jobs in firm |
| `AGENCY_OWNER` | Legacy alias → treated as ADMIN | All jobs in firm |
| `AGENCY_MANAGER` | Manages reporters, scopists, assignments | All jobs in firm |
| `COURT_REPORTER` | Legacy → treated identically to REPORTER | Own jobs only |
| `REPORTER` | Creates/owns jobs, proofs, certifies, delivers | Own jobs only |
| `SCOPIST` | Assigned jobs only, proofs transcripts | Assigned jobs only |
| `VIDEOGRAPHER` | Post-beta — "Coming Soon" in UI | N/A |
| `INTERPRETER` | Post-beta — "Coming Soon" in UI | N/A |

### Law Firm Side (Post-Beta)

| Role | Description |
|---|---|
| `FIRM_OWNER` | Post-beta |
| `FIRM_MANAGER` | Post-beta |
| `ATTORNEY` | Cannot be reporter or scopist (DB trigger enforces). Receives one-time download links. |
| `PARALEGAL` | Post-beta |

### Key Permission Rules

- `SUPER_ADMIN` sees **ALL** jobs across **ALL** firms — no `firm_id` filter ever applied
- `REPORTER` and `COURT_REPORTER` see only jobs where `created_by_id = their id`
- `SCOPIST` sees only jobs where `scopist_id = their id` (on `jobs` table)
- `withRouteProtection` middleware automatically promotes `SUPER_ADMIN` to `ADMIN` for `requireRole` checks
- All data queries **MUST** include `firm_id` filtering — cross-tenant security requirement
- `ATTORNEY` role is blocked at DB trigger level from being set as `reporter_id` or `scopist_id`

---

## 6. File Storage Structure

All files are stored in Supabase Storage following a strict path hierarchy.

```
cases/{cause_number_normalized}/
  jobs/{job_id}/
    intake/
      notice_of_deposition.pdf
      [other intake documents]
    audio/
      original_audio.mp3          ← preserved original upload
      primary_audio.wav           ← normalized WAV sent to Deepgram
      backup_audio.wav            ← if multiple files uploaded
    video/
      deposition_video.mp4        ← as-is, for proofing reference
    transcripts/
      deepgram_raw.json           ← raw Deepgram response
      formatted_transcript.txt   ← AI-formatted text
      certified_transcript.docx  ← final generated DOCX
```

### DOCX Generation

Depo-Pro **generates** the certified DOCX automatically from corrected transcript
data. Reporters do NOT upload a Word document. The system owns formatting entirely.
This ensures legal formatting standards (from `DEPO_PRO_FORMATTER_SPEC.md`) are
consistently applied to every transcript.

### Retention Policy

| Asset Type | Active Visibility | Archive Trigger | Hard Delete |
|---|---|---|---|
| NOD / PDF intake | 60 days post-DELIVERED | Monthly sweep | Never — 6yr min |
| Audio files | 60 days post-DELIVERED | Monthly sweep | Never — 6yr min |
| Video files | 60 days post-DELIVERED | Monthly sweep | Never — 6yr min |
| Completed transcripts | 12–18 months (configurable) | Manual or auto | Never — 6yr min |
| All archived files | Admin only via archive bucket | — | After 6 years minimum |

- 60-day clock starts from `DELIVERED` (`COMPLETED`) date, not deposition date
- Scopist loses audio/video access after 60 days; transcript remains visible 18 months
- Monthly sweep job handles archiving
- 6-year hard delete is a future feature — no automated deletion at launch

---

## 7. API Surface Map

153 API routes are registered. Key routes by domain:

### Jobs
```
GET/POST  /api/jobs                           List all / create new
GET/PUT   /api/jobs/[id]                      Get / update single job
POST      /api/jobs/[id]/transcribe           Start transcription pipeline
POST      /api/jobs/[id]/status               Update job status
GET/POST  /api/jobs/[id]/files                Job file management
GET       /api/jobs/[id]/flagged-words        List flagged words
PATCH     /api/jobs/[id]/flagged-words        ⚠️ BUG: any SCOPIST can patch
GET/POST  /api/jobs/[id]/export               Generate DOCX export
POST      /api/jobs/[id]/review/submit        Scopist submits for review
POST      /api/jobs/[id]/assign               Assign scopist
```

### Transcripts
```
GET/PUT   /api/transcripts/[id]               Get / update transcript
POST      /api/transcripts/[id]/certify       Reporter certification
POST      /api/transcripts/[id]/finalize      Final delivery preparation
GET/POST  /api/transcripts/[id]/corrections   Correction tracking
GET/POST  /api/transcripts/[id]/words         Word-level operations
GET/POST  /api/transcripts/[id]/shares        Secure share links
GET       /api/transcripts/[id]/versions      Version history
```

### Intake
```
POST      /api/intake/parse-document          Parse NOD PDF with AI
GET/POST  /api/intake/requests                Transcript requests
POST      /api/intake/submit-request          Submit intake request
POST      /api/intake/requests/[id]/review    Admin reviews request
```

### Infrastructure
```
GET       /api/health                         System health check
GET       /api/admin/health                   Detailed health metrics
POST      /api/cron/process-jobs              Scheduled job processing
POST      /api/cron/cleanup                   Retention cleanup
POST      /api/webhooks/deepgram              Deepgram webhook
POST      /api/webhooks/stripe                Stripe webhook
```

---

## 8. Architecture Layers & Rules

```
┌─────────────────────────────────┐
│        Next.js UI (React)       │  ← No Supabase queries here
├─────────────────────────────────┤
│   Next.js API Routes            │  ← Orchestration ONLY
│   app/api/**                    │
├─────────────────────────────────┤
│   Services Layer                │  ← Business logic lives here
│   lib/services/**               │
├─────────────────────────────────┤
│   Query Layer                   │  ← Database operations isolated here
│   lib/supabase/queries/**       │
├─────────────────────────────────┤
│   Supabase Database             │  ← PostgreSQL + RLS
│   Supabase Storage              │  ← Object storage
├─────────────────────────────────┤
│   External Services             │  ← All wrapped in service classes
│   Deepgram → lib/deepgram/      │
│   Resend   → lib/email.ts       │
│   FFmpeg   → lib/transcription/ │
└─────────────────────────────────┘
```

### Inviolable Architecture Rules

1. **API routes orchestrate only** — no business logic in route handlers
2. **Business logic lives in `/lib/services/`** — not in routes, not in components
3. **Database queries isolated to `/lib/supabase/queries/`** — never inline
4. **No Supabase queries in React components** — always via API routes
5. **External services wrapped in service classes** — Deepgram, Resend, FFmpeg
6. **No duplicate logic across API routes** — extract to shared service if needed
7. **Use existing domain entities** — never invent new tables speculatively

### Coding Standards (Mandatory)

- TypeScript strict mode — no `any` without explicit justification and comment
- `console.log` **FORBIDDEN** — use `console.warn` or `console.error` only
- Background workers must be fully async — never block HTTP responses
- All queries must include `firm_id` filtering — cross-tenant security
- `original_word` field is **immutable** after hydration
- Hard deletes on `transcript_words` are **prohibited**

### Protected Files — Never Modify Without Explicit Instruction

```
lib/middleware/withRouteProtection.ts
lib/auth/session.ts
lib/supabase/server.ts
lib/supabase/admin.ts
supabase/migrations/**  (any migration file)
```

---

## 9. Error Handling Standard

All API routes must return errors in this consistent shape:

```typescript
// Success response
{
  success: true,
  data: { ... }
}

// Error response
{
  success: false,
  error: {
    code: string,      // machine-readable error code
    message: string    // human-readable description
  }
}
```

### Standard Error Codes

| Code | HTTP Status | When to Use |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `JOB_NOT_FOUND` | 404 | Job ID does not exist or not accessible |
| `TRANSCRIPT_NOT_FOUND` | 404 | Transcript not found |
| `INVALID_AUDIO_FILE` | 400 | File format, size, or quality rejection |
| `AUDIO_QUALITY_TOO_LOW` | 422 | File scored UNUSABLE — cannot transcribe |
| `TRANSCRIPTION_FAILED` | 500 | Deepgram pipeline error |
| `TRANSCRIPTION_IN_PROGRESS` | 409 | Already transcribing this job |
| `VALIDATION_ERROR` | 400 | Missing required fields |
| `RATE_LIMITED` | 429 | Too many requests |
| `FIRM_REQUIRED` | 400 | Multi-tenant firm_id missing |

---

## 10. Environment Variables

All variables required in Vercel across all environments (preview, production):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ildhcfspbmhuemzgvzyx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Speech Recognition
DEEPGRAM_API_KEY=
DEEPGRAM_WEBHOOK_SECRET=

# AI
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY_HERE

# Email (Resend — sole provider, Zoho fully removed)
RESEND_API_KEY=YOUR_RESEND_KEY_HERE
ADMIN_EMAIL=notifications@depo-pro.com

# Billing (Phase 4 — currently USE_STRIPE=false)
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE        # labeled "depo-pro secret key"
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET_HERE      # webhook: https://depo-pro.com/api/webhooks/stripe
USE_STRIPE=false

# Queue (currently disabled at beta scale)
REDIS_URL=                          # Upstash Redis URL when activated
USE_QUEUE=false

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://depo-pro.com
CRON_SECRET=
INTERNAL_API_SECRET=

# Thresholds
LOW_CONFIDENCE_THRESHOLD=0.85       # words below this confidence are flagged
```

### Deprecated — Remove From Vercel

```bash
NEXTAUTH_SECRET     # NextAuth removed
NEXTAUTH_URL        # NextAuth removed
DATABASE_URL        # Prisma not used for migrations
DIRECT_URL          # Prisma not used for migrations
NODE_ENV            # Vercel sets automatically
```

---

## 11. Known Bugs & Security Issues

### 🔴 Critical — Fix Before Beta Launch

| ID | File | Issue | Fix |
|---|---|---|---|
| BUG-001 | `app/api/jobs/route.ts` | POST returns 403 for SUPER_ADMIN role | Add `SUPER_ADMIN` to inline role check — Part 1 Task 1 |
| BUG-002 | `app/(dashboard)/jobs/page.tsx` | `job_assignments` FK error crashes entire jobs list | Remove join — table does not exist — Part 1 Task 2 |
| BUG-003 | `app/api/jobs/[id]/flagged-words/route.ts` | Any SCOPIST can PATCH flagged words regardless of assignment — security hole | Verify `job.scopist_id = user.id` before allowing PATCH |

### 🟡 Known Issues — Tracked, Non-Blocking

| ID | Component | Issue |
|---|---|---|
| ISSUE-001 | `lib/services/audio-enhancement-service.ts` | `enhanceWithDolby()` is a stub — returns original URL unchanged |
| ISSUE-002 | RX Queue | `addToRxQueue()`, `getRxQueue()`, `processRxItem()` are all stubs |
| ISSUE-003 | Medical chronology | POST route returns 404 — not yet implemented |
| ISSUE-004 | `transcript_shares` | RLS may have column name mismatch — verify in production |
| ISSUE-005 | Supabase SMTP | Password reset emails not sending — must configure via Resend SMTP bridge |

---

## 12. Real-World Reference Case

This case was used throughout architecture design. Use it for end-to-end testing.

| Field | Value |
|---|---|
| **Case Style** | Bianca Perez v. Simon Ugalde, Lewis Energy Group LP, Lewis Resource Management LLC |
| **Cause Number** | `2025-CI-12281` (normalized: `2025CI12281`) |
| **Court** | 285th Judicial District, Bexar County, Texas |
| **Deponent (Job 1)** | Bianca Perez — March 11, 2026 via Zoom, 9:05 a.m. – 10:39 a.m. |
| **Deponent (Job 2)** | Simon Ugalde — March 5, 2026 via Zoom |
| **Court Reporter** | Miah Bardot, CSR No. 12129 |
| **Agency** | SA Legal Solutions, 3201 Cherry Ridge Ste. 208, San Antonio TX 78230 |
| **Plaintiff Counsel** | Desiree Marrufo (note: two r's in NOD), Davis Law Firm, San Antonio TX |
| **Defense Counsel** | Jennifer Durbin, Allen Stein & Durbin P.C., San Antonio TX |
| **Ordering Attorney** | Jennifer Durbin (defense — she noticed the Ugalde deposition) |
| **Audio (Job 1)** | `3-11-2026-Bianca Perez_audio.mp3` — 234.9 MB |
| **Audio (Job 2)** | `3-11-2026-SIMON UGALDE_audio.mp3` |
| **First Beta User** | Miah Bardot — CSR #12129, SA Legal Solutions |

**Deepgram name recognition note:** Deepgram has misrecognized "Miah Bardot" as
"Miyamardeau" and "Mia Bardeau" — both incorrect. Correct spelling: B-A-R-D-O-T.
This must be corrected during proofing and can be used as a test case for the
custom vocabulary system.

**Two jobs, one case:** Both Bianca Perez and Simon Ugalde depositions share cause
number `2025-CI-12281`. This is the canonical example of the cause number grouping
architecture — two jobs filed under one case.
