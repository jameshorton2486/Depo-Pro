# Depo-Pro System Blueprint

> Master Architecture Reference
> Version: 1.0 | Date: 2026-03-10
> Status: Authoritative — this document consolidates all architecture specifications
>
> Source Documents:
> - `CANONICAL_DOMAIN_MODEL.md` — entity hierarchy and ownership
> - `ASYNC_IDEMPOTENCY_MODEL.md` — idempotency keys and worker model
> - `DEPO_PRO_CORE_ARCHITECTURE_RULES.md` — system invariants
> - `TRANSCRIPT_FORMATTER_ARCHITECTURE.md` — formatter pipeline
> - `EVENT_WORKFLOW_ORCHESTRATION.md` — event-driven pipeline
> - `TRANSCRIPT_INTEGRITY_AUDIT.md` — verbatim record protection
> - `DEPO_AUTH_ARCHITECTURE.md` — authentication and authorization

---

## 1 — System Vision

Depo-Pro is a **deposition intelligence and transcript production platform** for the legal industry.

**Users:** Court reporters, scopists, attorneys, paralegals, agency managers.

**Core workflow:**

```
Court reporter receives deposition notice
  → Upload notice document
  → AI extracts case metadata (parties, cause number, deponent)
  → Case and deposition records created
  → Job created for the reporter
  → Reporter uploads audio recording
  → Deepgram Nova-3 transcribes audio to word-level transcript
  → Scopist reviews flagged low-confidence words
  → Reporter certifies transcript
  → Formatter produces legal-grade DOCX (Texas UFM format)
  → Quality gate validates before export
  → Attorney receives certified transcript
```

**Platform vision:** "Deposition OS" — from audio capture through certified transcript delivery, with AI-assisted accuracy, legal formatting, and attorney intelligence tools.

---

## 2 — System Architecture

### 2.1 — Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Next.js 16 App Router / React / TypeScript          │
│  Server Components + Client Components               │
│  Middleware auth guard (middleware.ts)                │
├─────────────────────────────────────────────────────┤
│                    API LAYER                          │
│  Next.js Route Handlers (/api/*)                     │
│  withRouteProtection() on 92+ routes                 │
│  Zod validation / rate limiting / audit logging      │
├─────────────────────────────────────────────────────┤
│                  BUSINESS LOGIC                       │
│  lib/transcription/* — pipeline, formatter, hydrate  │
│  lib/services/* — AI extraction, export, medical     │
│  lib/permissions/* — RBAC, role groups, API guards   │
│  lib/auth/* — session, require-role                  │
├─────────────────────────────────────────────────────┤
│                  EVENT SYSTEM                         │
│  pipeline_events table (database-as-queue)           │
│  Emit → Claim → Process → Complete/Retry/Dead-Letter │
│  Optional: BullMQ + Redis (when REDIS_URL configured)│
├─────────────────────────────────────────────────────┤
│                    DATABASE                           │
│  Supabase Postgres (RLS-enforced)                    │
│  Row Level Security on all tenant tables             │
│  firm_id isolation boundary                          │
├─────────────────────────────────────────────────────┤
│                    STORAGE                            │
│  Supabase Storage (S3-compatible)                    │
│  4 buckets: depo-audio, depo-files,                  │
│             depo-exports, depo-chunks                │
├─────────────────────────────────────────────────────┤
│                EXTERNAL SERVICES                     │
│  Deepgram Nova-3 — speech-to-text                    │
│  Anthropic Claude — AI metadata extraction           │
│  Stripe — billing and subscriptions                  │
│  Resend — transactional email                        │
│  Vercel — hosting and serverless functions            │
└─────────────────────────────────────────────────────┘
```

### 2.2 — Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend + API | Vercel | Auto-deploy on push to main |
| Database | Supabase (AWS us-east-1) | Postgres 15, connection pooler on 6543, direct on 5432 |
| Storage | Supabase Storage | S3-compatible, signed URLs for private buckets |
| Auth | Supabase Auth | SSR cookies, PKCE flow, email confirmation |
| DNS | Vercel | depo-pro.com |

---

## 3 — Canonical Domain Model

> Full specification: `CANONICAL_DOMAIN_MODEL.md`

### 3.1 — Entity Hierarchy

```
Firm (tenant boundary)
  └─→ Case (legal matter)
        └─→ Deposition (scheduled proceeding)
              └─→ Job (operational work record)
                    └─→ Transcription (processing record)
                          ├─→ transcript_words (word-level source data)
                          ├─→ transcript_paragraphs (derived formatter output)
                          └─→ Export (generated artifact)
```

### 3.2 — Entity Ownership

| Entity | Owns | Key Rule |
|--------|------|----------|
| `firms` | Billing, users, tenant isolation | Top-level isolation boundary |
| `profiles` | Identity, role, firm membership | 1:1 with auth.users; only application user table |
| `cases` | Cause number, style, court, dates | Canonical legal matter |
| `depositions` | Deponent, date, location, platform | Canonical scheduled proceeding |
| `jobs` | Processing state, assignments, audio mode | Canonical operational work record |
| `transcriptions` | Audio file ref, Deepgram payload, status | `deepgram_raw_json` is immutable |
| `transcript_words` | Corrected/display state, timing, speaker, flags | `original_word` is immutable |
| `transcript_paragraphs` | Paragraph structure, pagination | Derived — always rebuildable from words |
| `exports` | Format, file location, quality gate snapshot | Immutable artifact record |

### 3.3 — Non-Canonical Supporting Tables

| Table | Purpose | Rule |
|-------|---------|------|
| `case_metadata` | AI extraction snapshot | Never canonical once normalized into `cases` |
| `case_parties` | Party roster | Derived from case_metadata |
| `case_attorneys` | Attorney roster | Derived from case_metadata |
| `deposition_documents` | Input document lifecycle | Source documents for extraction |
| `transcript_requests` | Pre-job intake workflow | Becomes a `job` when accepted |

### 3.4 — Hard Rules

1. `profiles` is the only application user table — never query `auth.users` directly
2. `case_metadata` is never treated as canonical once normalized
3. `deepgram_raw_json` is immutable — ultimate backup of AI output
4. `transcript_words` are updatable (corrections) but never hard-deleted
5. All tenant-owned tables include `firm_id`

---

## 4 — Database Architecture

### 4.1 — Core Tables

```
firms
  ├─→ profiles (FK firm_id)
  ├─→ cases (FK firm_id)
  │     ├─→ case_metadata (FK case_id)
  │     ├─→ case_parties (FK case_id)
  │     └─→ case_attorneys (FK case_id)
  ├─→ depositions (FK case_id, firm_id)
  │     └─→ deposition_documents (FK deposition_id)
  ├─→ jobs (FK deposition_id, firm_id, reporter_id, scopist_id)
  │     ├─→ transcriptions (FK job_id)
  │     │     ├─→ transcript_words (FK transcription_id, firm_id)
  │     │     ├─→ transcript_paragraphs (FK transcription_id, firm_id)
  │     │     ├─→ transcription_edits (FK transcription_id)
  │     │     ├─→ transcription_corrections (FK transcription_id, firm_id)
  │     │     └─→ flagged_words (FK transcription_id)
  │     └─→ exports (FK job_id)
  ├─→ vocabulary_terms (FK firm_id)
  └─→ speaker_assignments (FK transcription_id, firm_id)
```

### 4.2 — Event & Pipeline Tables

| Table | Purpose |
|-------|---------|
| `pipeline_events` | Event queue with status tracking |
| `pipeline_event_log` | Append-only audit trail |
| `processed_webhook_events` | Webhook deduplication |
| `transcription_chunks` | Chunk processing state for long audio |

### 4.3 — Security Tables

| Table | Purpose |
|-------|---------|
| `audit_logs` | User action audit trail |
| `transcript_access_grants` | Attorney portal access control |
| `org_memberships` | Organization membership |
| `org_connections` | Inter-organization relationships |

### 4.4 — RLS Policy Model

Every tenant-owned table has RLS enabled with a policy pattern:

```sql
CREATE POLICY firm_isolation ON {table}
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));
```

The `user_belongs_to_firm()` helper function is used across 17+ tables.

---

## 5 — Multi-Tenant Security

> Full specification: `DEPO_AUTH_ARCHITECTURE.md`

### 5.1 — Role Hierarchy

**13 canonical roles** defined in `lib/enums/roles.ts`:

| Role | Level | Category |
|------|-------|----------|
| SUPER_ADMIN | 110 | Platform |
| AGENCY_OWNER | 100 | Agency |
| FIRM_OWNER | 100 | Law Firm |
| AGENCY_MANAGER | 80 | Agency |
| FIRM_MANAGER | 80 | Law Firm |
| REPORTER / COURT_REPORTER | 60 | Production |
| ATTORNEY | 50 | External |
| SCOPIST | 40 | Production |
| PARALEGAL | 35 | External |
| VIDEOGRAPHER | 30 | Production |
| INTERPRETER | 30 | Production |

Legacy roles are mapped via `LEGACY_ROLE_MAP` in `lib/enums/roles.ts`.

### 5.2 — Authorization Layers

| Layer | File | Scope |
|-------|------|-------|
| Route protection | `lib/middleware/withRouteProtection.ts` | API routes (92+) |
| Page protection | `lib/auth/require-role.ts` → `protectRoute()` | Page components |
| Action authorization | `lib/permissions/rbac.ts` | Business operations |
| Role groups | `lib/permissions/role-groups.ts` | Grouped role checks |
| API guards | `lib/permissions/api-guards.ts` | `requireAuthV2()`, `requireRole()` |
| RLS | Supabase policies | Database-level firm isolation |

### 5.3 — Internal vs External Users

**Internal users** (firm members) — authorized by `firm_id`:
- ADMIN, COURT_REPORTER, SCOPIST, REPORTER, AGENCY_*, FIRM_*

**External users** (attorneys/paralegals) — authorized by `transcript_access_grants`:
- ATTORNEY, PARALEGAL — can only access transcripts explicitly shared with them

### 5.4 — Authentication Flow

```
User → /login → Supabase signIn → /auth/callback
  → exchangeCodeForSession → session cookie → /dashboard
```

- Supabase SSR authentication only (no NextAuth)
- `middleware.ts` checks session cookie on every protected route
- `getCurrentUser()` from `lib/auth/session.ts` returns `{ id, email, role, name, firmId }`
- Service role key never exposed to client code

---

## 6 — Event Workflow System

> Full specification: `EVENT_WORKFLOW_ORCHESTRATION.md`

### 6.1 — Event Flow

```
document.uploaded → document.metadata_extracted → document.case_normalized
  → job.created → job.audio_uploaded → transcription.requested
  → transcription.chunk_completed (×N) → transcription.reassembled
  → transcription.completed → transcription.hydrated
  → transcription.formatted → transcription.quality_gate_passed
  → export.requested → export.generated
```

### 6.2 — Event Envelope

```typescript
interface DomainEvent {
  event_id: string            // UUIDv4
  event_type: string          // e.g. 'transcription.hydrated'
  aggregate_type: string      // e.g. 'transcription'
  aggregate_id: string        // entity UUID
  firm_id: string             // tenant isolation
  idempotency_key: string     // dedup key
  payload: Record<string, unknown>
  emitted_by: string          // producer identifier
  emitted_at: string          // ISO 8601
}
```

### 6.3 — Key Producers

| Producer | Events |
|----------|--------|
| Intake API | `document.uploaded` |
| Upload API | `job.audio_uploaded` |
| Transcription Scheduler | `transcription.requested`, `transcription.chunk_completed`, `transcription.completed` |
| Deepgram Webhook | `deepgram.webhook_received` |
| Formatter Engine | `transcription.formatted` |
| Quality Gate | `transcription.quality_gate_passed/failed` |

### 6.4 — Key Consumers

| Consumer | Listens For | Action |
|----------|-------------|--------|
| Transcription Scheduler | `job.audio_uploaded` | Start pipeline |
| Hydration Worker | `transcription.completed` | Write `transcript_words` |
| Formatter Worker | `transcription.hydrated` | Build paragraphs |
| Quality Gate | `transcription.formatted` | Validate export readiness |
| Export Worker | `export.requested` | Generate DOCX/PDF/TXT |
| Notification Worker | Multiple events | Email via Resend |

### 6.5 — Ordering Guarantees

Enforced by precondition checks, not event ordering:

| Must Complete | Before |
|--------------|--------|
| transcription.completed | Hydration |
| transcription.hydrated | Formatting |
| transcription.formatted | Quality gate |
| quality_gate_passed | Export |

---

## 7 — Transcription Pipeline

> Pipeline implementation: `lib/transcription/pipeline.ts`, `lib/transcription/scheduler.ts`

### 7.1 — Pipeline Stages

```
Stage 1:  VALIDATING      — Download audio, validate format/duration
Stage 1b: NORMALIZING     — Convert to 16kHz mono WAV
Stage 2:  CHUNKING        — Split into 30-min chunks (if > 1800s)
Stage 3:  TRANSCRIBING    — Send chunks to Deepgram Nova-3
Stage 4:  REASSEMBLING    — Merge chunks, deduplicate overlaps
Stage 4.5: POST-PROCESSING — Text cleanup, integrity hash (SHA-256)
Stage 5:  EXTRACTING FLAGS — Low-confidence words (< 0.85 threshold)
Stage 5.5: HYDRATING      — Write transcript_words rows
Stage 5.5b: FORMATTING    — Build paragraphs (non-fatal if fails)
Stage 6:  COMPLETE        — Job → AI_COMPLETE, audit logged
```

### 7.2 — Deepgram Configuration

- Model: Nova-3
- Features: Speaker diarization, punctuation, smart formatting
- Vocabulary boosting from `vocabulary_terms` table per firm
- Audio normalization: 16kHz mono WAV for optimal accuracy

### 7.3 — Confidence Classification

| Class | Range | Action |
|-------|-------|--------|
| HIGH | >= 0.95 | No review needed |
| MEDIUM | 0.85 — 0.94 | Optional review |
| LOW | 0.70 — 0.84 | Flagged for scopist |
| CRITICAL | < 0.70 | Requires review before export |

### 7.4 — Chunked Audio Processing

Audio > 30 minutes is split into overlapping chunks:

- Chunk duration: 1800s (30 min)
- Overlap: 15s between chunks
- Reassembly: Timestamp offset adjustment, overlap deduplication, speaker re-identification
- Resumability: Completed chunks are never reprocessed

### 7.5 — Serverless Execution Model

```
POST /api/jobs/[id]/transcribe → start pipeline, create chunks
  → POST /api/jobs/[id]/transcribe/process-chunk (chunk 0)
    → POST /api/jobs/[id]/transcribe/process-chunk (chunk 1)
      → ... (chain until all chunks done)
        → finalizePipeline()
```

Each chunk processes within a single Vercel Function invocation (< 300s). Chained via fire-and-forget HTTP calls.

---

## 8 — Transcript Integrity Model

> Full specification: `TRANSCRIPT_INTEGRITY_AUDIT.md`

### 8.1 — Verbatim Record Protection

| Column | Mutability | Purpose |
|--------|-----------|---------|
| `original_word` | IMMUTABLE | Deepgram verbatim output |
| `word` | IMMUTABLE | Normalized form |
| `punctuated_word` | IMMUTABLE | With punctuation |
| `corrected_word` | MUTABLE | Scopist/reporter correction |
| `display_word` | MUTABLE | Current display value |
| `is_deleted` | MUTABLE | Soft delete (never hard delete) |
| `start_time`, `end_time` | IMMUTABLE | Audio sync points |
| `confidence` | IMMUTABLE | AI confidence score |

### 8.2 — Protection Rules

1. `original_word` cannot be updated after hydration
2. Rows cannot be hard-deleted — soft delete only (`is_deleted = TRUE`)
3. All corrections recorded in `transcription_corrections` (with context) and `transcription_edits` (with integrity hashes)
4. `deepgram_raw_json` on `transcriptions` table is the immutable backup
5. SHA-256 integrity hash computed after transcription completion

### 8.3 — Database Enforcement (Required)

Three triggers must be deployed:
1. **Immutability trigger** — blocks UPDATE to source fields
2. **Soft-delete trigger** — converts DELETE to `is_deleted = TRUE`
3. **Correction audit trigger** — auto-logs corrections to `transcription_corrections`

### 8.4 — Paragraph Model

`transcript_paragraphs` is **derived, not canonical**:
- Built by the formatter from `transcript_words`
- Can be regenerated at any time
- Quality gate validates consistency before export
- `ON DELETE CASCADE` is appropriate (rebuildable)

---

## 9 — Transcript Editor Architecture

### 9.1 — Layout

```
┌─────────────────────────────────────────────┐
│  Audio Waveform Player (top)                 │
│  [▶ Play] ──────●───────── [02:45 / 45:30] │
├─────────────────────┬───────────────────────┤
│  Transcript View    │  Flagged Words Queue  │
│  (left panel)       │  (right panel)        │
│                     │                       │
│  Q.  What is your   │  "pharmacutical" 0.42 │
│  name?              │  "litigaton"     0.55 │
│  A.  My name is     │  "defendent"     0.61 │
│  John Smith.        │  [Confirm] [Correct]  │
│                     │  [Skip]               │
└─────────────────────┴───────────────────────┘
```

### 9.2 — Features

| Feature | Implementation |
|---------|---------------|
| Word corrections | Update `corrected_word` on `transcript_words`, log to corrections table |
| Speaker mapping | Update `speaker_index`, assign roles via `speaker_assignments` |
| Confidence highlighting | Color-coded by `confidence_class` (HIGH/MEDIUM/LOW/CRITICAL) |
| Keyboard navigation | Arrow keys (navigate), Space (play audio), Enter (confirm), Escape (skip) |
| Audio sync | Click word → jump to `start_time` in audio player |
| Optimistic locking | 409 STALE_DATA on concurrent edit conflict |
| Job locking | 423 LOCKED if another user is editing |

### 9.3 — Frozen Components

These components are architecture-frozen (import paths may change, internal logic must not):

- `lib/transcription/*`
- `components/review/*`
- `components/export/*`
- `components/audio/waveform-player.tsx`
- `components/transcripts/word-span.tsx`
- `components/transcripts/synced-transcript-viewer.tsx`
- `app/auth/callback/*`

---

## 10 — Transcript Formatter

> Full specification: `TRANSCRIPT_FORMATTER_ARCHITECTURE.md`

### 10.1 — Pipeline

```
transcript_words
  → Section Detector (Q/A/BY/COLLOQUY patterns)
  → Paragraph Builder (speaker change, punctuation, section boundaries)
  → Post Processor (em-dash normalization, reporter terms, quote fixes)
  → Paginator (25 lines/page, line numbers, Courier New 12pt)
  → transcript_paragraphs
  → Quality Gate
  → Inclusion Pages (Appearance, Index, Certification)
  → DOCX Assembler
  → Export
```

### 10.2 — Formatter Modules

| Module | File | Purpose |
|--------|------|---------|
| Section Detector | `lib/transcription/formatter/section-detector.ts` | Detect Q., A., BY MR./MS., COLLOQUY |
| Paragraph Builder | `lib/transcription/formatter/paragraph-builder.ts` | Group words into paragraphs |
| Post Processor | `lib/transcription/formatter/post-processor.ts` | Normalize text formatting |
| Paginator | `lib/transcription/formatter/paginator.ts` | Texas UFM page layout |
| Quality Gate | `lib/transcription/formatter/quality-gate.ts` | Validate export readiness |
| Inclusion Pages | `lib/transcription/formatter/inclusion-pages.ts` | Front matter generation |
| DOCX Assembler | `lib/transcription/formatter/docx-assembler.ts` | Final document creation |

### 10.3 — Legal Formatting Rules (Texas UFM)

| Rule | Value |
|------|-------|
| Font | Courier New |
| Font size | 12pt |
| Lines per page | 25 |
| Line numbers | Required |
| Q/A format | "Q." and "A." with indentation |
| Colloquy indent | Speaker label followed by indented text |
| Page headers | Case style, deponent name, date |

### 10.4 — Paragraph Types

`QUESTION`, `ANSWER`, `COLLOQUY`, `SECTION_HEADER`, `EXAMINATION_BYLINE`, `PARENTHETICAL`, `CLOSING_ASTERISKS`, `FURTHER_SAYETH`, `DEPO_CONCLUDED`

### 10.5 — Deposition Sections

`PREAMBLE`, `DIRECT_EXAMINATION`, `CROSS_EXAMINATION`, `REDIRECT_EXAMINATION`, `RECROSS_EXAMINATION`, `COLLOQUY`, `OFF_RECORD`, `CLOSING`

---

## 11 — Quality Gate

### 11.1 — Checks

| Check | Severity | Description |
|-------|----------|-------------|
| Unresolved VERIFY tags | ERROR (blocks export) | Words tagged [VERIFY] must be resolved |
| Missing answers | ERROR | Q without A detected |
| Invalid speaker labels | ERROR | Unknown or unassigned speakers |
| Page overflow | ERROR | > 25 lines on a page |
| Duplicate lines | WARNING | Identical text on consecutive lines |
| Missing certification page | WARNING | Certification required for filing |
| Timestamp inconsistencies | WARNING | Non-monotonic word timestamps |
| Paragraph errors | WARNING | Empty or malformed paragraphs |
| Speaker mismatch | WARNING | Speaker index not in assignments |
| Missing metadata | WARNING | Case style or deponent name absent |

### 11.2 — Export Blocking

```typescript
interface QualityGateResult {
  passed: boolean
  exportBlocked: boolean
  errors: QGCheck[]
  warnings: QGCheck[]
  canExportWithAcknowledgment: boolean
}
```

- `exportBlocked = true` → HTTP 422, export denied
- `canExportWithAcknowledgment = true` → export allowed with user acknowledgment of warnings

---

## 12 — Export Engine

### 12.1 — Formats

| Format | Library | Use Case |
|--------|---------|----------|
| DOCX | `docx` npm package | Standard legal transcript (primary) |
| PDF | Server-side generation | Sharing and printing |
| TXT/ASCII | Raw text | Case Catalyst / Eclipse import |

### 12.2 — Export Record

Exports are recorded in the `exports` table:

| Field | Purpose |
|-------|---------|
| `transcription_id` | Source transcript |
| `format` | docx / pdf / txt |
| `storage_path` | Supabase Storage location |
| `quality_gate_snapshot` | Quality gate result at export time |
| `exported_by` | User who generated |
| `created_at` | Export timestamp |

### 12.3 — Export Permissions

Allowed roles: `COURT_REPORTER`, `ADMIN`, `SCOPIST`

Export requires: quality gate pass (or acknowledgment of warnings).

---

## 13 — Attorney Portal

### 13.1 — Access Model

Attorneys are **external users** — they cannot see all firm data. Access is controlled by `transcript_access_grants`:

```
transcript_access_grants
  transcript_id   → which transcript
  granted_to      → attorney user id
  granted_by      → reporter/admin who shared
  access_level    → VIEW / DOWNLOAD / ANNOTATE
  expires_at      → optional expiration
```

> Note: `requireAttorneyCaseAccess()` is blocked by missing `case_memberships` table — Phase 1 future work.

### 13.2 — Attorney Capabilities

| Capability | Access Level | Status |
|-----------|-------------|--------|
| View transcript | VIEW | Planned |
| Download transcript | DOWNLOAD | Planned |
| Order copy | REQUEST | Planned |
| Annotate transcript | ANNOTATE | Future |

### 13.3 — Attorney Routes

All attorney routes require `ATTORNEY` role:
- `/attorney/cases` — case list
- `/attorney/transcripts` — transcript access
- `/attorney/exhibits` — exhibit viewer
- `/attorney/issues` — issue tracking
- `/attorney/reports` — reports

---

## 14 — Background Workers

### 14.1 — Worker Inventory

| Worker | Trigger Event | Action | Runtime |
|--------|--------------|--------|---------|
| AI Extraction | `document.uploaded` | Parse document via Claude, extract metadata | Vercel Function |
| Case Normalization | `document.metadata_extracted` | Create/update case, deposition, job records | Vercel Function |
| Transcription Pipeline | `job.audio_uploaded` | Validate, chunk, transcribe, reassemble | Vercel Function (chained) |
| Hydration | `transcription.completed` | Write `transcript_words` from Deepgram JSON | Vercel Function |
| Formatter | `transcription.hydrated` | Build paragraphs, paginate | Vercel Function |
| Quality Gate | `transcription.formatted` | Validate export readiness | Vercel Function |
| Export | `export.requested` | Generate DOCX/PDF/TXT file | Vercel Function |
| Notification | Multiple events | Send email via Resend | Vercel Function |
| Stale Lock Recovery | CRON (every 5 min) | Reclaim event locks > 10 min old | CRON endpoint |

### 14.2 — Execution Model

**Beta (current):** Database-as-queue via `pipeline_events` table. Workers poll or are triggered by API calls. Chained execution for long pipelines.

**Scale-up (post-beta):** BullMQ + Redis for queue. Dedicated workers on Railway/Fly.io. Supabase Realtime for dashboard updates.

---

## 15 — Storage Architecture

### 15.1 — Supabase Storage Buckets

| Bucket | Privacy | Purpose | URL Pattern |
|--------|---------|---------|-------------|
| `depo-audio` | PUBLIC | Audio files for transcription | Permanent public URL |
| `depo-files` | PRIVATE | Documents, PDFs for ingestion | 1-hour signed URL |
| `depo-exports` | PRIVATE | Generated DOCX/PDF exports | 1-hour signed URL |
| `depo-chunks` | PRIVATE | Audio chunk artifacts (temp) | 1-hour signed URL |

### 15.2 — Storage Rules

1. Database columns store **paths only** (e.g., `firm_123/job_456/audio.mp3`), never full URLs
2. URLs are generated at read-time via `getPublicUrl()` or `createSignedUrl()`
3. `extractStoragePath()` handles both legacy (full URL) and current (path) formats
4. Signed URLs expire after 1 hour — never cache or persist them

---

## 16 — Monitoring & Observability

### 16.1 — Structured Logging

`lib/monitoring.ts` provides:

| Function | Purpose |
|----------|---------|
| `logEvent()` | Structured log with level prefix ([CRITICAL], [ERROR], [WARN], [INFO]) |
| `logRouteError()` | Standardized unhandled error logging for API routes |
| `logSlowRequest()` | Performance warning for slow requests |

### 16.2 — Health Endpoint

`GET /api/health` checks 4 services in parallel:

| Service | Check | Timeout |
|---------|-------|---------|
| Database | `SELECT id FROM firms LIMIT 1` | 3.5s |
| Deepgram | `GET /v1/projects` | 3.5s |
| Anthropic | Minimal message request | 3.5s |
| Storage | `getBucket('depo-audio')` | 3.5s |

Returns: `{ status: 'healthy' | 'degraded' | 'unhealthy', services: {...}, uptime_seconds, version }`

Always returns HTTP 200 (status in body for uptime monitor compatibility).

### 16.3 — Pipeline Observability

Per-job pipeline progress is queryable from `pipeline_events`:

```sql
SELECT event_type, status, created_at, completed_at
FROM pipeline_events
WHERE aggregate_id = :job_id
ORDER BY created_at;
```

### 16.4 — Alert Thresholds

| Severity | Condition |
|----------|-----------|
| P0 Critical | Dead letter queue > 0, pipeline stalled > 30 min |
| P1 High | Failed event rate > 5% in 1 hour |
| P2 Medium | Stale event locks detected |
| P3 Low | Slow pipeline (> 2x expected duration) |

---

## 17 — Testing Strategy

### 17.1 — Test Structure

```
tests/
├── api/          — API route tests (calendar, cases, jobs)
├── e2e/          — Playwright E2E (auth, job creation, tenant isolation)
├── integration/  — Workflow tests (pipeline, export, review, formatter)
├── middleware/    — Auth middleware tests
├── performance/  — Benchmarks (flagged words)
├── security/     — RLS, integrity, tenant isolation
├── unit/         — Components, formatter, permissions, services
│   ├── components/
│   ├── editor/
│   ├── formatter/
│   ├── ingestion/
│   ├── permissions/
│   └── services/
├── fixtures/     — Shared test data
├── stubs/        — Mock implementations
└── utils/        — Test helpers
```

### 17.2 — Test Runner

- **Unit/Integration:** Vitest (`npm test`)
- **E2E:** Playwright (`npm run test:e2e`)
- **CI:** GitHub Actions (CI, Quality Gates, Version Guard, Org Isolation)

### 17.3 — Current Coverage

- 37 test suites, 192 tests passing
- 3 suites skipped (calendar-events, cases-intake, phase10-verification)

---

## 18 — Beta Constraints

### 18.1 — Simplified Rules

| Constraint | Beta | Production |
|-----------|------|-----------|
| Jobs per deposition | 1 | Multiple |
| Transcriptions per job | 1 | Multiple (versions) |
| External attorney access | Limited | Full portal |
| Payment processing | Manual | Stripe integration |
| Multi-firm onboarding | Manual | Self-service wizard |
| Audio duration | Up to 2 GB file | Same |
| Mobile support | Limited (desktop recommended) | Responsive |

### 18.2 — Beta Freeze Rules

During beta freeze, only the following changes are permitted:
- Bug fixes
- Security patches
- Tests
- Documentation
- Monitoring improvements

No new features, migrations, or architectural changes without explicit approval.

---

## 19 — Production Expansion Roadmap

### Phase 1 (Post-Beta)
- `case_memberships` table → `requireAttorneyCaseAccess()` guard
- Attorney portal with `transcript_access_grants`
- Stripe billing integration
- Multi-firm onboarding wizard
- `pipeline_events` table + event primitives

### Phase 2
- Multi-language transcription support
- AI summarization of depositions
- Trial exhibit linking
- Real-time collaborative editing

### Phase 3
- Case intelligence dashboard
- Cross-deposition analysis
- Medical chronology automation
- ElasticSearch/Typesense transcript search

### Phase 4
- Video deposition sync
- Live transcription viewer
- Attorney annotation tools

### Phase 5
- Trial preparation suite
- Expert witness analysis
- Litigation intelligence platform

---

## Appendix A — State Machines

### Job Status

```
SCHEDULED → AUDIO_UPLOADED → TRANSCRIBING → AI_COMPLETE
  → IN_REVIEW → REVIEW_COMPLETE → FINALIZED → EXPORTED

Error: TRANSCRIBING → PIPELINE_FAILED → (retry) → TRANSCRIBING
```

### Transcription Pipeline

```
PENDING → VALIDATING → NORMALIZING → CHUNKING → TRANSCRIBING
  → REASSEMBLING → POST_PROCESSING → EXTRACTING_FLAGS
  → HYDRATING → FORMATTING → COMPLETE

Any stage → PIPELINE_FAILED (on error)
```

### Export

```
REQUESTED → GENERATING → COMPLETE → DOWNLOADED
REQUESTED → BLOCKED (quality gate failed)
GENERATING → FAILED → (retry) → GENERATING
```

### Review Workflow

```
AWAITING_SCOPIST → SCOPIST_IN_PROGRESS → SCOPIST_COMPLETE
  → REPORTER_REVIEWING → APPROVED
```

---

## Appendix B — Key File Paths

| File | Purpose |
|------|---------|
| `lib/enums/roles.ts` | Canonical UserRole enum (13 roles) |
| `lib/auth/session.ts` | `getCurrentUser()` |
| `lib/middleware/withRouteProtection.ts` | API route auth guard |
| `lib/auth/require-role.ts` | Page auth + ROUTE_PERMISSIONS |
| `lib/permissions/rbac.ts` | Action permission matrix |
| `lib/transcription/pipeline.ts` | End-to-end transcription pipeline |
| `lib/transcription/scheduler.ts` | Serverless chunk chaining |
| `lib/transcription/hydrateWords.ts` | Write transcript_words from Deepgram |
| `lib/transcription/formatter/` | All formatter modules |
| `lib/monitoring.ts` | Structured logging |
| `lib/health.ts` | Health check service |
| `lib/storage.ts` | Supabase Storage utilities |
| `lib/storage/url.ts` | Signed URL generation |

---

## Appendix C — Environment Variables

Full specification: `docs/ENVIRONMENT_ARCHITECTURE.md`

**Critical runtime variables:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Admin key (server-only)
- `DEEPGRAM_API_KEY` — Deepgram transcription
- `ANTHROPIC_API_KEY` — Claude AI extraction
- `NEXT_PUBLIC_APP_URL` — Application base URL
- `CRON_SECRET` — CRON endpoint authentication
- `RESEND_API_KEY` — Transactional email

**CI/build placeholders:** See `.github/workflows/ci.yml` for build-time env block.
