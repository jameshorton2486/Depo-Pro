# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — PHASE 3B: JOB REQUEST & DOCUMENT INGESTION WORKFLOW
# Autonomous Implementation Prompt for Codex CLI / Claude Code
#
# Save to:  ai_prompts/phases/phase_03b_job_request_workflow.md
# Session:  claude code --no-resume
# Version:  1.0 — Production Grade · Self-Contained
#
# PURPOSE
# ───────
# Overhaul the /jobs/new page into a multi-step job request workflow.
#
# Step 1 — Upload the deposition notice document (optional but recommended)
# Step 2 — AI extracts structured data; user reviews and fills any gaps
# Step 3 — User submits as a REQUEST (pending admin review) or CONFIRMED JOB
#           depending on their role
# Step 4 — Admin reviews pending requests, approves, modifies, or declines
#
# REAL-WORLD TRIGGER
# ──────────────────
# A law firm paralegal uploads:
#   "03-04-26___10am___2pm_-_Goldman___Peterson.docx"
#
# The system automatically extracts:
#   Cause No. C-3123-25-J
#   Both deposition sessions (10am Arieana Bourbois, 2pm Ariella Bourbois)
#   Ordering attorney: Raul Garza, Goldman & Peterson
#   Opposing attorney: Aaron Ochoa, Dang & Zapata
#   Location: Via Zoom
#   13 Deepgram transcription keywords
#
# The paralegal reviews the extracted data, fills in any missing fields,
# and submits a transcript request. The admin is notified, reviews the
# request, and either approves it as a confirmed job or sends it back.
#
# READ THIS ENTIRE FILE BEFORE EXECUTING ANY COMMAND.
# Implement all steps in exact order. One commit per step.
# ═══════════════════════════════════════════════════════════════════════════════

---

## MISSION

Replace the current flat "Create New Job" form at `/jobs/new` with a
three-step guided workflow that begins with document upload, uses AI to
pre-populate all fields, and routes submissions through an admin-
controlled approval queue.

---

## EMBEDDED PLATFORM CONTEXT

**Stack:** Next.js 15 App Router · React · TypeScript · Tailwind CSS ·
Supabase (PostgreSQL + RLS + Storage) · Anthropic Claude API · Vercel

**Auth:**
- `createSupabaseServerClient()` from `lib/supabase/server.ts`
- `profiles` table only — never `users`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Auth failures → `/unauthorized?reason=missing_profile`
- All API routes use `withRouteProtection()`

**Multi-tenancy:** `firm_id` on every new table. RLS on every new table.

**Storage bucket:** `depo-files` (existing) — path: `{firm_id}/documents/{filename}`

**AI extraction:** Anthropic API, model `claude-sonnet-4-20250514`

**Frozen files — DO NOT MODIFY:**
```
lib/supabase/server.ts · lib/supabase/client.ts · lib/auth/session.ts
middleware.ts · supabase/migrations/**
```

---

## ROLE PERMISSION MATRIX

This is the definitive source of truth for this prompt.

| Role | Can Initiate? | Submission Type | Can Approve? | Can Override? |
|---|---|---|---|---|
| `ADMIN` | YES | Directly confirmed — no review needed | YES | YES |
| `COURT_REPORTER` | YES | Directly confirmed — no review needed | NO | NO |
| `SCOPIST` | NO | — | NO | NO |
| `ATTORNEY` | YES | Submitted as REQUEST — pending admin review | NO | NO |
| `PARALEGAL` | YES | Submitted as REQUEST — pending admin review | NO | NO |
| `LAW_FIRM` | YES | Submitted as REQUEST — pending admin review | NO | NO |
| `AGENCY` | YES | Submitted as REQUEST — pending admin review | NO | NO |

**Rule:** ADMIN and COURT_REPORTER create jobs directly. All other roles
submit transcript requests that enter a pending queue. The admin reviews
the queue and either approves (creating the confirmed job), modifies
fields, or declines with a reason.

**Admin override:** The admin can modify any field on any pending request
before approving it — date, time, deponent, attorney assignment, audio
processing type — and the submitter is notified of any changes.

---

## WORKFLOW ARCHITECTURE

```
ANY PERMITTED ROLE
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 1 — DOCUMENT UPLOAD (Optional but recommended)          │
│  ─────────────────────────────────────────────────────────    │
│  Upload deposition notice, court order, or scheduling form   │
│  Supported: DOCX · PDF · TXT · RTF · Google Docs URL         │
│  AI extracts case data → pre-fills form fields               │
│  User sees preview: "12 fields populated automatically"      │
│  [Skip — enter manually] also always available               │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 2 — REVIEW & COMPLETE FORM                              │
│  ─────────────────────────────────────────────────────────    │
│  All extracted fields shown pre-filled (editable)            │
│  Empty fields shown with clear "required" / "optional" label │
│  If multiple sessions detected: select which one this job is │
│  Audio processing type selection                             │
│  Notes field                                                 │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
              ┌──────────┴──────────┐
              │                     │
      ADMIN / COURT_REPORTER    ATTORNEY / PARALEGAL /
              │                 LAW_FIRM / AGENCY
              ▼                         │
    ┌─────────────────┐                 ▼
    │  CONFIRMED JOB  │       ┌──────────────────────┐
    │  Created immed. │       │  TRANSCRIPT REQUEST  │
    │  Status: PENDING│       │  Status: PENDING_    │
    │  → enters job   │       │  REVIEW              │
    │    pipeline     │       │  → admin queue       │
    └─────────────────┘       └──────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │  ADMIN REVIEW QUEUE  │
                              │  /admin/requests     │
                              │                      │
                              │  Admin can:          │
                              │  ✓ Approve           │
                              │  ✎ Modify + Approve  │
                              │  ✗ Decline w/ reason │
                              └──────────────────────┘
                                        │
                              ┌─────────┴──────────┐
                              │                    │
                           APPROVE              DECLINE
                              │                    │
                              ▼                    ▼
                     Creates confirmed      Submitter notified
                     job + notifies         with reason shown
                     submitter              on their dashboard
```

---

## DATABASE MIGRATION

**Commit:** `feat(db): add transcript_requests and job_requests tables`

Create: `supabase/migrations/20260312_019_job_requests.sql`

```sql
-- ══════════════════════════════════════════════════════════════════
-- Migration 019: Job Request Workflow
-- ══════════════════════════════════════════════════════════════════

-- ── transcript_requests ───────────────────────────────────────────
-- Stores submission from non-admin roles pending admin review.
-- When approved, a row in `jobs` is created from this data.

CREATE TABLE IF NOT EXISTS transcript_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id             UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  submitted_by        UUID NOT NULL REFERENCES profiles(id),
  submitted_by_role   TEXT NOT NULL,        -- role at time of submission

  -- Status lifecycle
  status              TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  -- 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED' | 'MODIFIED_AND_APPROVED'

  -- Linked records (populated after approval)
  approved_job_id     UUID REFERENCES jobs(id) ON DELETE SET NULL,
  document_id         UUID,                 -- FK to deposition_documents if doc was uploaded

  -- Core job fields (mirrors jobs table — populated by submitter)
  job_title           TEXT NOT NULL,
  case_name           TEXT,
  case_number         TEXT,
  cause_number        TEXT,
  case_style          TEXT,

  deponent_name       TEXT,
  deposition_date     DATE,
  start_time          TIME,
  timezone            TEXT DEFAULT 'America/Chicago',

  location            TEXT,
  is_remote           BOOLEAN DEFAULT FALSE,
  remote_platform     TEXT,
  zoom_link           TEXT,

  ordering_attorney   TEXT,
  ordering_firm       TEXT,
  ordering_email      TEXT,
  ordering_phone      TEXT,

  audio_processing    TEXT DEFAULT 'automated',
  -- 'automated' | 'forensic'

  notes               TEXT,

  -- Case metadata from document ingestion
  court_name          TEXT,
  court_number        TEXT,
  county              TEXT,
  state               TEXT DEFAULT 'Texas',

  -- Admin review fields
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  admin_notes         TEXT,
  decline_reason      TEXT,

  -- Admin override tracking (what fields admin changed before approving)
  admin_overrides     JSONB,
  -- Example: {"deposition_date": {"original": "2026-03-04", "changed_to": "2026-03-05"}}

  -- Extracted data snapshot (full AI extraction stored for reference)
  extracted_data      JSONB,

  submitted_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transcript_requests ENABLE ROW LEVEL SECURITY;

-- Submitter can see their own requests
CREATE POLICY "submitter_view_own_requests" ON transcript_requests
  FOR SELECT USING (submitted_by = auth.uid());

-- Admin can see all requests within their firm
CREATE POLICY "admin_view_all_requests" ON transcript_requests
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE INDEX idx_requests_status      ON transcript_requests(status);
CREATE INDEX idx_requests_firm_id     ON transcript_requests(firm_id);
CREATE INDEX idx_requests_submitted_by ON transcript_requests(submitted_by);
CREATE INDEX idx_requests_reviewed_by ON transcript_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- ── Add request_id tracking to jobs ───────────────────────────────
-- Allows tracing a confirmed job back to the original request.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES transcript_requests(id),
  ADD COLUMN IF NOT EXISTS created_by_role   TEXT;

-- ── Add document tracking to jobs ─────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS intake_document_id UUID;
```

---

## IMPLEMENTATION ORDER

One commit per step. Run `npx tsc --noEmit && npm run lint` before each commit.

---

## ═══ STEP 1 — INGESTION LIBRARY (TEXT EXTRACTION + AI) ═══
**Commit:** `feat(ingestion): implement multi-format text extractor and AI extraction engine`

This step creates the shared extraction library used by the intake form.

### 1A — Create `lib/ingestion/types.ts`

```typescript
export type DocumentType =
  | 'notice_of_deposition'
  | 'court_order'
  | 'subpoena'
  | 'scheduling_form'
  | 'duces_tecum'
  | 'other'

export interface DepositionExtractionResult {
  document_type: DocumentType | null
  confidence: number               // 0.00–1.00

  case_information: {
    cause_number: string | null
    case_style: string | null
    court_name: string | null
    court_number: string | null
    county: string | null
    state: string | null
  }

  parties: {
    plaintiffs: string[]
    defendants: string[]
    third_parties: string[]
  }

  attorneys: Array<{
    name: string
    firm: string | null
    role: 'ordering' | 'opposing' | 'copy' | null
    represents: 'plaintiff' | 'defendant' | null
    address: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    phone: string | null
    fax: string | null
    email: string | null
    delivery_format: string | null
    is_rush: boolean
  }>

  deposition_sessions: Array<{
    deponent_name: string
    deposition_date: string | null   // ISO: "2026-03-04"
    start_time: string | null        // 24h: "10:00" or "14:00"
    location: string | null
    is_remote: boolean
    remote_platform: string | null   // 'zoom' | 'teams' | 'webex'
    zoom_link: string | null
    is_videotaped: boolean
    includes_duces_tecum: boolean
  }>

  court_reporter: {
    firm: string | null
    name: string | null
    phone: string | null
  }

  transcription_keywords: {
    names: string[]
    firms: string[]
    locations: string[]
    legal_terms: string[]
    all_keywords: string[]
  }

  ordered_by: string | null
  notes: string | null
}
```

### 1B — Create `lib/ingestion/text-extractor.ts`

Support these formats. Check `package.json` before installing anything.
Install `mammoth` and `pdf-parse` only if not already present.

| Format | MIME / Extension | Method |
|---|---|---|
| DOCX | `.docx` | `mammoth.extractRawText({ buffer })` |
| DOC | `.doc` | Convert via LibreOffice, then mammoth |
| PDF | `.pdf` | `pdf-parse(buffer)` |
| TXT | `.txt` | `buffer.toString('utf-8')` |
| RTF | `.rtf` | Strip control words with regex |
| Google Docs URL | URL contains `docs.google.com/document` | Fetch `/export?format=txt` |

```typescript
export interface ExtractionResult {
  text: string
  pageCount?: number
  extractionMethod: string
  warnings: string[]
  error?: string
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  sourceUrl?: string,
): Promise<ExtractionResult>
```

Always return a result — never throw. If extraction fails, return
`{ text: '', error: 'reason', warnings: [] }`.

### 1C — Create `lib/ingestion/ai-extractor.ts`

```typescript
const EXTRACTION_SYSTEM_PROMPT = `You are a legal document parser for a court reporting platform.

Extract structured deposition scheduling information from any legal document
(notice of deposition, court order, subpoena, scheduling confirmation form).

RULES:
1. Return ONLY valid JSON — no preamble, no markdown, no explanation.
2. If a field is not found, return null (strings) or [] (arrays).
3. Never invent data not explicitly in the document.
4. Convert dates to ISO format: "2026-03-04"
5. Convert times to 24-hour format: "10:00" for 10am, "14:00" for 2pm
6. Detect MULTIPLE deposition sessions if present (e.g., 10am + 2pm same day)
7. Extract ALL party and attorney names for transcription_keywords
8. confidence: 1.0 = all key fields found · 0.5 = partial · 0.0 = failed

Return JSON matching the DepositionExtractionResult schema exactly.`

export async function extractDepositionData(
  rawText: string,
  fileName: string,
): Promise<DepositionExtractionResult>
```

Handle invalid JSON responses: wrap parse in try/catch, return safe
fallback with `confidence: 0` and all fields null. Never throw.

### 1D — Create `lib/ingestion/index.ts`

```typescript
export interface IngestionOptions {
  buffer: Buffer
  mimeType: string
  fileName: string
  sourceUrl?: string
}

export interface IngestionResult {
  success: boolean
  extraction: DepositionExtractionResult | null
  rawText: string
  confidence: number
  sessionsFound: number
  keywordsFound: number
  error?: string
  warnings: string[]
}

export async function parseDocument(options: IngestionOptions): Promise<IngestionResult>
```

This function: extract text → pass to AI extractor → return result.
Does NOT write to database — that happens in the API route.
Separation keeps the parser reusable and testable.

---

## ═══ STEP 2 — INTAKE API ROUTES ═══
**Commit:** `feat(api): add document parse and job request API routes`

### 2A — POST /api/intake/parse-document

Create: `app/api/intake/parse-document/route.ts`

Accepts a `multipart/form-data` upload or a JSON body with `source_url`.
Runs the ingestion pipeline and returns the `IngestionResult`.
Does NOT persist anything to the database — this is a pure parse endpoint
used to preview extracted data before the user submits.

```typescript
export const POST = withRouteProtection(handler, {
  roles: ['ADMIN', 'COURT_REPORTER', 'ATTORNEY', 'PARALEGAL', 'LAW_FIRM', 'AGENCY'],
  requireFirmId: true,
})
```

Accepted formats: DOCX, PDF, TXT, RTF (max 10MB). For Google Docs, accept
JSON body `{ source_url: "https://docs.google.com/..." }`.

Return:
```typescript
{
  success: boolean
  extraction: DepositionExtractionResult | null
  confidence: number        // 0.0–1.0
  sessionsFound: number
  keywordsFound: number
  warnings: string[]
  error?: string
}
```

### 2B — POST /api/intake/submit-request

Create: `app/api/intake/submit-request/route.ts`

Accepts the completed job form data. Behavior branches by role:

```typescript
async function handler(request: NextRequest) {
  // 1. Get authenticated user + profile (including role)
  // 2. Validate required fields
  // 3. If ADMIN or COURT_REPORTER:
  //      → Insert directly into `jobs` table with status 'PENDING'
  //      → Return { type: 'job_created', jobId: '...' }
  // 4. If ATTORNEY | PARALEGAL | LAW_FIRM | AGENCY:
  //      → Insert into `transcript_requests` with status 'PENDING_REVIEW'
  //      → Notify all ADMIN users in the firm (Supabase Realtime + email)
  //      → Return { type: 'request_submitted', requestId: '...' }
}

export const POST = withRouteProtection(handler, {
  roles: ['ADMIN', 'COURT_REPORTER', 'ATTORNEY', 'PARALEGAL', 'LAW_FIRM', 'AGENCY'],
  requireFirmId: true,
  auditAction: 'JOB_REQUEST_SUBMITTED',
})
```

**Admin notification:** When a request is submitted by a non-admin role,
insert a notification row into the `notifications` table (or equivalent)
and if Supabase Realtime is configured, broadcast to the admin channel.

### 2C — GET /api/intake/requests

Create: `app/api/intake/requests/route.ts`

- ADMIN: returns all `transcript_requests` for the firm, sortable by status
- Other roles: returns only the authenticated user's own requests

```typescript
export const GET = withRouteProtection(handler, {
  roles: ['ADMIN', 'COURT_REPORTER', 'ATTORNEY', 'PARALEGAL', 'LAW_FIRM', 'AGENCY'],
})
```

### 2D — PATCH /api/intake/requests/[id]/review

Create: `app/api/intake/requests/[id]/review/route.ts`

ADMIN only. Accepts:
```typescript
{
  action: 'approve' | 'decline' | 'modify_and_approve'
  overrides?: Partial<JobFormData>   // fields admin changed
  admin_notes?: string
  decline_reason?: string
}
```

On `approve` or `modify_and_approve`:
1. Apply any `overrides` to the request fields
2. Record `admin_overrides` JSONB with before/after for each changed field
3. Insert confirmed row into `jobs` table with `source_request_id`
4. Update `transcript_requests.status = 'APPROVED'`, `approved_job_id`
5. Notify submitter (in-app + email)

On `decline`:
1. Update `transcript_requests.status = 'DECLINED'`, `decline_reason`
2. Notify submitter with decline reason

```typescript
export const PATCH = withRouteProtection(handler, {
  roles: ['ADMIN'],
  auditAction: 'REQUEST_REVIEWED',
})
```

---

## ═══ STEP 3 — THREE-STEP JOB INTAKE FORM ═══
**Commit:** `feat(jobs): overhaul /jobs/new as multi-step intake workflow`

**File:** `app/(dashboard)/jobs/new/page.tsx` — replace entirely.

This is a client component (`'use client'`). Use React `useState` to
manage the three-step wizard state.

### Step indicator (always visible at top)

```
[1] Upload Document → [2] Review Details → [3] Confirm & Submit
     ●─────────────────────○──────────────────────○
```

Step circles: completed = filled indigo, current = outlined indigo,
future = grey outline. Steps are clickable only to go backward —
not to skip forward.

---

### STEP 1 — Upload Document

**File:** `components/intake/IntakeUploadStep.tsx`

```
┌────────────────────────────────────────────────────────────────────┐
│  Start with a Document  (Optional — you can skip and enter         │
│  manually)                                                         │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │    📄  Drag & drop or click to upload                       │ │
│  │                                                              │ │
│  │    DOCX  ·  PDF  ·  TXT  ·  RTF                            │ │
│  │    Notice of Deposition · Court Order · Scheduling Form     │ │
│  │    Max 10MB                                                  │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ─── or import from ─────────────────────────────────────────     │
│                                                                    │
│  Google Docs URL                                                   │
│  [ https://docs.google.com/document/d/...          ] [Import]     │
│                                                                    │
│             [Skip — Enter Manually]   [Next →]                    │
└────────────────────────────────────────────────────────────────────┘
```

**Upload behavior:**
1. User drops or selects file
2. Show spinner + "Extracting case data..." (call `POST /api/intake/parse-document`)
3. On success: show green summary panel

**Extraction success panel:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ✓ Document Parsed                                                 │
│  ────────────────────────────────────────────────────────────      │
│  Cause No.      C-3123-25-J                                        │
│  Case           Bourbois et al. v. Hernandez et al.               │
│  Court          430th Judicial District · Hidalgo County · TX     │
│                                                                    │
│  Sessions found:                                                   │
│  ● Arieana Skye Bourbois  —  Mar 4, 2026 @ 10:00 AM  (Zoom)      │
│  ● Ariella Starr Bourbois  —  Mar 4, 2026 @ 2:00 PM  (Zoom)      │
│                                                                    │
│  Ordering Attorney: Raul Garza (Goldman & Peterson)               │
│  Keywords added: 13 terms for transcription accuracy             │
│                                                                    │
│  [✎ Use Different Document]           [Next: Review Details →]   │
└────────────────────────────────────────────────────────────────────┘
```

If multiple sessions detected: show a radio button selector:
```
Which deposition session is this job for?
  ◉ Arieana Skye Bourbois — March 4, 2026 @ 10:00 AM
  ○ Ariella Starr Bourbois — March 4, 2026 @ 2:00 PM
  ○ Create separate jobs for both sessions
```

**Confidence indicator:** show a small badge next to extracted fields:
- Green "Auto-filled" tag on fields populated from the document
- Grey "Manual" label on fields the user fills themselves

---

### STEP 2 — Review & Complete Form

**File:** `components/intake/IntakeFormStep.tsx`

This replaces the current Create New Job form. All fields from the
existing form are preserved plus new intake fields.

Render fields in these groups:

#### Group A — Basic Information
```
Job Title *          [Deposition of Arieana Skye Bourbois    ] ← auto-filled
Cause Number         [C-3123-25-J                            ] ← auto-filled
Case Name *          [Bourbois v. Hernandez                  ] ← auto-filled
Case Number          [                                       ]
Case Style (full)    [Arieana Skye Bourbois... v. Ethan...  ] ← auto-filled
```

#### Group B — Court Information
```
Court Name           [430th Judicial District Court          ] ← auto-filled
County               [Hidalgo                                ] ← auto-filled
State                [Texas                                  ] ← auto-filled
```

#### Group C — Deposition Details
```
Deponent Name *      [Arieana Skye Bourbois                  ] ← auto-filled
Deposition Date *    [03/04/2026                             ] ← auto-filled
Start Time *         [10:00 AM                               ] ← auto-filled
Timezone             [Central Time (America/Chicago)    ▼   ]
```

#### Group D — Location
```
Location Type        ◉ Remote (Zoom/Teams)   ○ In-Person
Remote Platform      [Zoom                           ▼      ] ← auto-filled
Zoom / Meeting Link  [                                      ]
Physical Address     [                                      ] (shown if In-Person)
```

#### Group E — Ordering Attorney
```
Attorney Name        [Raul Garza                             ] ← auto-filled
Firm                 [Goldman & Peterson, PLLC               ] ← auto-filled
Phone                [(210) 340-9800                        ] ← auto-filled
Email                [Raul@LJGLaw.com                       ] ← auto-filled
```

#### Group F — Audio Processing
```
Audio Processing *
  ◉ Automated Enhancement (Recommended)
    Industry-standard audio processing. Fast turnaround with AI-powered enhancement.
    Best for: Most depositions, Zoom/Teams recordings, courtroom audio.

  ○ Manual Forensic Enhancement (Premium — $150/file)
    Human-assisted forensic audio cleanup using professional tools.
    Best for: Poor audio quality, heavy crosstalk, whispered testimony,
    severe background noise.
```

#### Group G — Notes
```
Additional Notes     [                                       ]
```

**Auto-filled field styling:**
Fields populated from the document should show a subtle visual indicator:
- Left border: `border-l-2 border-l-indigo-400`
- Background: `bg-indigo-50/40`
- Small tag below the field: `✓ From document` in `text-xs text-indigo-500`

All auto-filled fields remain editable — user can clear or override any value.

**Required fields:** Job Title, Deposition Date, Start Time.
All others are optional but encouraged.

---

### STEP 3 — Confirm & Submit

**File:** `components/intake/IntakeConfirmStep.tsx`

Show a clean summary of all entered data in a read-only view.

At the bottom, show the submit action — which varies by role:

**For ADMIN or COURT_REPORTER:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ✓ Ready to Create Job                                             │
│                                                                    │
│  This job will be created immediately and enter the               │
│  transcription pipeline.                                          │
│                                                                    │
│           [← Back]          [Create Job →]                        │
└────────────────────────────────────────────────────────────────────┘
```

**For ATTORNEY, PARALEGAL, LAW_FIRM, AGENCY:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ⏳ Transcript Request                                             │
│                                                                    │
│  Your request will be submitted for admin review. You will        │
│  be notified once it has been approved and a job is created.      │
│                                                                    │
│  Typical review time: same business day                           │
│                                                                    │
│           [← Back]          [Submit Request →]                    │
└────────────────────────────────────────────────────────────────────┘
```

**After successful submission:**

For direct job creation (ADMIN/REPORTER):
```
✓ Job Created
"Deposition of Arieana Skye Bourbois" has been created.
[View Job →]   [Create Another →]
```

For request submission:
```
✓ Request Submitted
Your transcript request has been submitted for review.
You'll receive a notification once it's been approved.
[View My Requests →]   [Submit Another →]
```

---

## ═══ STEP 4 — ADMIN REVIEW QUEUE ═══
**Commit:** `feat(admin): add transcript request review queue at /admin/requests`

Create: `app/(dashboard)/admin/requests/page.tsx`

This page is visible to ADMIN role only (enforce in middleware and page).

### Page layout

**Header:**
```
Transcript Requests
──────────────────────────────────────────────────────────
Pending Review (3)    Approved (12)    Declined (1)
```

Tabs for status filtering. Default view: Pending Review.

**Request card (in the list):**
```
┌────────────────────────────────────────────────────────────────────┐
│  Deposition of Arieana Skye Bourbois          ⏳ PENDING REVIEW   │
│  Cause No. C-3123-25-J  ·  Mar 4, 2026 @ 10:00 AM  ·  Zoom       │
│  Submitted by: Jane Paralegal (PARALEGAL) · 2 hours ago           │
│  Ordering: Raul Garza · Goldman & Peterson                        │
│                                                                    │
│  [Review →]                                                        │
└────────────────────────────────────────────────────────────────────┘
```

### Request review modal/page

Create: `app/(dashboard)/admin/requests/[id]/page.tsx`

Show the full request data in read-only view with editable override fields.

**Admin actions section:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Admin Review                                                    │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Override any field before approving (optional):                │
│                                                                  │
│  Deposition Date:  [03/04/2026]   ← admin can change           │
│  Start Time:       [10:00 AM  ]   ← admin can change           │
│  Audio Processing: [Automated ▼]  ← admin can change           │
│                                                                  │
│  Admin Notes (visible to submitter):                            │
│  [                                                   ]          │
│                                                                  │
│  Decline Reason (required if declining):                        │
│  [                                                   ]          │
│                                                                  │
│  [✗ Decline]          [✎ Modify & Approve]     [✓ Approve]    │
└──────────────────────────────────────────────────────────────────┘
```

Buttons:
- **Decline** (red, left): requires decline reason field filled
- **Modify & Approve** (amber, center): saves admin overrides + approves
- **Approve** (green, right): approves with no changes

When any action is confirmed: call `PATCH /api/intake/requests/[id]/review`.
Show a success toast. Return to the requests list.

---

## ═══ STEP 5 — MY REQUESTS PAGE ═══
**Commit:** `feat(dashboard): add My Requests panel for non-admin roles`

Create: `components/dashboard/MyRequestsPanel.tsx`

Add this component to the dashboards of ATTORNEY, PARALEGAL, LAW_FIRM,
and AGENCY roles. It shows the status of their submitted requests.

```
My Transcript Requests
──────────────────────────────────────────────────────
 📋 Deposition of Arieana Bourbois     ⏳ Pending Review
    C-3123-25-J · Mar 4, 2026          Submitted 2 hrs ago

 ✓  Deposition of John Smith           ✅ Approved
    CV-2025-001 · Feb 14, 2026         Job #1042 created
    [View Job →]

 ✗  Deposition of Jane Doe             ❌ Declined
    CV-2025-002 · Feb 10, 2026         "Date unavailable —
                                        please resubmit"
```

Status badge colors:
- `PENDING_REVIEW` → amber `⏳`
- `APPROVED` / `MODIFIED_AND_APPROVED` → green `✅`
- `DECLINED` → red `❌`
- `UNDER_REVIEW` → indigo (admin opened it) `👁`

For APPROVED requests, show a link to the created job.
For DECLINED requests, show the decline reason inline.
For MODIFIED_AND_APPROVED, show a "Changes were made" note linking to the diff.

---

## ═══ STEP 6 — SIDEBAR NAVIGATION UPDATES ═══
**Commit:** `feat(nav): add Requests and My Requests links to sidebar`

In `components/layouts/app-sidebar.tsx`, add:

**For ADMIN:**
```
Administration section:
  ...existing items...
  Transcript Requests    → /admin/requests   [badge: pending count]
```

Show a red badge with the count of `PENDING_REVIEW` requests. Fetch count
on sidebar load using a lightweight `GET /api/intake/requests?status=PENDING_REVIEW&count=true`.

**For ATTORNEY, PARALEGAL, LAW_FIRM, AGENCY:**
```
Main section:
  My Requests            → /requests         [badge: pending count]
```

Also add "New Transcript Request" as a CTA button at the top of their
dashboards that routes to `/jobs/new`.

---

## ═══ STEP 7 — DATABASE VOCABULARY WRITER ═══
**Commit:** `feat(ingestion): write extracted keywords to vocabulary_terms on job creation`

When a job is confirmed (either directly by ADMIN/REPORTER or via admin
approval of a request), write the `transcription_keywords.all_keywords`
from the extraction result to the `vocabulary_terms` table.

Add this logic to the `submit-request` and `review` API routes.

```typescript
async function writeKeywords(
  keywords: string[],
  firmId: string,
  jobId: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (!keywords.length) return
  const rows = keywords.map(term => ({
    firm_id: firmId,
    job_id: jobId,
    term,
    source: 'document_ingestion',
    boost_factor: 1.5,
  }))
  await supabase.from('vocabulary_terms').upsert(rows, {
    onConflict: 'firm_id,term',
    ignoreDuplicates: false,
  })
}
```

---

## ═══ STEP 8 — TESTS ═══
**Commit:** `test(intake): add unit and integration tests for job request workflow`

### Unit tests

Create: `tests/unit/ingestion/text-extractor.test.ts`
- TXT extraction returns correct text
- RTF strips control words
- Empty buffer returns empty string without throwing
- Unsupported mime type returns error gracefully

Create: `tests/unit/ingestion/ai-extractor.test.ts`
- Valid JSON response → correct DepositionExtractionResult
- Invalid JSON → safe fallback with confidence: 0
- Multiple sessions detected correctly

Create: `tests/unit/components/IntakeUploadStep.test.tsx`
- Renders upload zone
- Shows extraction summary after mock successful parse
- Shows session selector when multiple sessions found
- Skip button advances to step 2

Create: `tests/unit/components/IntakeConfirmStep.test.tsx`
- Shows "Create Job" for ADMIN role
- Shows "Submit Request" for ATTORNEY role
- Shows "Submit Request" for PARALEGAL role

### Integration test

Create: `tests/integration/job-request-workflow.test.ts`

Mock the Anthropic API. Test:
1. Document parse endpoint returns extraction result
2. ADMIN role → `submit-request` → `jobs` row created, status PENDING
3. ATTORNEY role → `submit-request` → `transcript_requests` row created, status PENDING_REVIEW
4. Admin approve → `transcript_requests` status APPROVED, `jobs` row created with `source_request_id`
5. Admin decline → `transcript_requests` status DECLINED, `decline_reason` persisted
6. Admin modify + approve → `admin_overrides` JSONB records changed fields

---

## FINAL VERIFICATION

```bash
npx tsc --noEmit
npm run lint
npm run build
npx vitest run tests/unit/ingestion/
npx vitest run tests/unit/components/IntakeUploadStep.test.tsx
npx vitest run tests/unit/components/IntakeConfirmStep.test.tsx
npx vitest run tests/integration/job-request-workflow.test.ts
```

**Manual smoke test:**
1. Log in as ATTORNEY role
2. Navigate to `/jobs/new`
3. Upload `03-04-26___10am___2pm_-_Goldman___Peterson.docx`
4. Confirm extraction shows both sessions (10am and 2pm)
5. Select "Arieana Skye Bourbois — 10:00 AM"
6. Confirm form fields are pre-filled (Cause No., case style, attorney, Zoom location)
7. Submit → confirm "Request Submitted" confirmation shown
8. Log in as ADMIN
9. Navigate to `/admin/requests`
10. Confirm pending request is visible
11. Click Review → modify Start Time to 10:30 AM → Modify & Approve
12. Confirm `admin_overrides` shows `start_time` change
13. Log back in as ATTORNEY → confirm request shows "Approved" with "Changes were made" note
14. Confirm `vocabulary_terms` table has Bourbois-case keywords

---

## FILE MANIFEST

```
CREATED:
  supabase/migrations/20260312_019_job_requests.sql
  lib/ingestion/types.ts
  lib/ingestion/text-extractor.ts
  lib/ingestion/ai-extractor.ts
  lib/ingestion/index.ts
  app/api/intake/parse-document/route.ts
  app/api/intake/submit-request/route.ts
  app/api/intake/requests/route.ts
  app/api/intake/requests/[id]/review/route.ts
  components/intake/IntakeUploadStep.tsx
  components/intake/IntakeFormStep.tsx
  components/intake/IntakeConfirmStep.tsx
  components/dashboard/MyRequestsPanel.tsx
  app/(dashboard)/admin/requests/page.tsx
  app/(dashboard)/admin/requests/[id]/page.tsx
  tests/unit/ingestion/text-extractor.test.ts
  tests/unit/ingestion/ai-extractor.test.ts
  tests/unit/components/IntakeUploadStep.test.tsx
  tests/unit/components/IntakeConfirmStep.test.tsx
  tests/integration/job-request-workflow.test.ts

MODIFIED:
  app/(dashboard)/jobs/new/page.tsx     ← three-step wizard replaces flat form
  components/layouts/app-sidebar.tsx   ← add Requests links + badge
```

---

## COMPLETION REPORT

```
╔══════════════════════════════════════════════════════════════════════╗
║    DEPO-PRO — PHASE 3B JOB REQUEST WORKFLOW COMPLETE               ║
╠══════════════════════════════════════════════════════════════════════╣
║  Migration 019 applied:               YES / NO                     ║
║  Ingestion library:                   CREATED                      ║
║  API routes (4):                      CREATED                      ║
║  Intake wizard (3 steps):             CREATED                      ║
║  Admin review queue:                  CREATED                      ║
║  My Requests panel:                   CREATED                      ║
║  Sidebar navigation updated:          YES / NO                     ║
║  Keyword writer wired in:             YES / NO                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  Unit tests:          __ / __ passing                              ║
║  Integration tests:   __ / 6 passing                               ║
║  Build gate:          PASSING / FAILING                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  EXIT CRITERION                                                     ║
║  Attorney uploads Goldman doc → request created → admin approves   ║
║  → job created with keywords → smoke test passes:                  ║
║    [ ] YES — Phase 3B COMPLETE                                     ║
║    [ ] NO  — document failure, stop here                           ║
╚══════════════════════════════════════════════════════════════════════╝
```
