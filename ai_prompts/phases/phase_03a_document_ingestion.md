# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — PHASE 3A: DOCUMENT INGESTION PIPELINE
# Autonomous Implementation Prompt for Codex CLI / Claude Code
#
# Save to:  ai_prompts/phases/phase_03a_document_ingestion.md
# Session:  claude code --no-resume
# Version:  1.0 — Production Grade · Self-Contained · Multi-Format
#
# PURPOSE
# ───────
# Build the Document Ingestion Pipeline — the system that allows court
# reporters and admins to upload any deposition-related document (notice,
# court order, subpoena, scheduling form) and automatically extract
# structured case data from it.
#
# The extracted data populates the deposition record, feeds Deepgram keyword
# boosting, generates title and appearance pages, and seeds the case
# knowledge base for all downstream features.
#
# REAL-WORLD EXAMPLE (Bourbois v. Hernandez — Cause No. C-3123-25-J)
# ────────────────────────────────────────────────────────────────────
# This is the type of document the pipeline processes. A court reporter
# uploads a Notice of Deposition and the system automatically extracts:
#
#   Cause Number:    C-3123-25-J
#   Case Style:      Arieana Skye Bourbois, Ariella Starr Bourbois and
#                    Cierra Toscano v. Ethan Hernandez and Jose Humberto
#                    Hernandez
#   Court:           430th Judicial District Court, Hidalgo County, Texas
#   Plaintiffs:      Arieana Skye Bourbois · Ariella Starr Bourbois · Cierra Toscano
#   Defendants:      Ethan Hernandez · Jose Humberto Hernandez
#   Deposition 1:    Arieana Skye Bourbois — March 4, 2026 @ 10:00 a.m. via Zoom
#   Deposition 2:    Ariella Starr Bourbois — March 4, 2026 @ 2:00 p.m. via Zoom
#   Ordering Atty:   Raul Garza, Goldman & Peterson PLLC
#                    10100 Reunion Place Suite 800, San Antonio TX 78216
#                    (210) 340-9800 · Raul@LJGLaw.com
#   Opposing Atty:   Aaron Ochoa, Dang & Zapata Law Firm
#                    1400 N. McColl Road Suite 204, McAllen TX 78501
#   Court Reporter:  SA Legal Solutions, San Antonio TX
#   Transcription keywords: Bourbois · Hernandez · Toscano · Goldman & Peterson ·
#                    Dang & Zapata · Hidalgo County · Zoom
#
# READ THIS ENTIRE FILE BEFORE EXECUTING ANY COMMAND.
# Implement all steps in exact order. One commit per step.
# ═══════════════════════════════════════════════════════════════════════════════

---

## MISSION

Implement the Depo-Pro Document Ingestion Pipeline.

This pipeline accepts uploaded legal documents in any of the following
formats, extracts structured case and deposition data using AI, and
automatically populates the deposition record, Deepgram keyword list,
title page, and appearance page.

**Supported input formats:**
- `.docx` / `.doc` — Microsoft Word (most common — scheduling forms, notices)
- `.pdf` — Court-filed notices, orders, subpoenas
- `.txt` — Plain text exports, pasted content
- `.rtf` — Rich Text Format
- Google Docs — via public share link (URL ingestion)
- Fallback: any other text-extractable format

This is critical infrastructure. Every deposition job benefits from
having structured case data extracted from the source document at intake
time rather than entered manually.

---

## PLATFORM CONTEXT (EMBEDDED — READ BEFORE WRITING CODE)

**Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS · Supabase
(PostgreSQL + RLS + Storage) · Deepgram Nova-3 · Anthropic Claude API · Vercel

**Auth rules:**
- `createSupabaseServerClient()` from `lib/supabase/server.ts`
- `profiles` table only — never `users`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Auth failures → `/unauthorized?reason=missing_profile`
- All API routes use `withRouteProtection()`

**Multi-tenancy:** Every query scoped by `firm_id`. Every new table has
`firm_id UUID NOT NULL`. RLS enabled on every new table.

**Storage bucket:** `depo-files` (already exists) — upload documents here.
Sub-path: `depo-files/{firm_id}/documents/{job_id}/{filename}`

**AI extraction:** Use Anthropic Claude API (`ANTHROPIC_API_KEY` env var).
Model: `claude-sonnet-4-20250514`. Return structured JSON only.

**Frozen files — DO NOT MODIFY:**
```
lib/supabase/server.ts
lib/supabase/client.ts
lib/auth/session.ts
middleware.ts
supabase/migrations/**  (existing — new migrations permitted)
```

**Roles permitted to upload documents:**
- `COURT_REPORTER` — primary user (uploads notices when scheduling)
- `ADMIN` — full access
- `SCOPIST` — read access to extracted data only, cannot upload

**Beta freeze rules:** No new npm packages without justification.
Check `package.json` before installing anything. `pdf-parse`, `mammoth`,
and `@anthropic-ai/sdk` may already be present.

---

## SUPPORTED DOCUMENT TYPES

| Document Type | What It Contains | Priority Fields |
|---|---|---|
| Notice of Deposition | Cause number, case style, court, parties, attorneys, date/time, location | All |
| Court Order | Cause number, court, parties, attorneys, hearing dates | case_information, parties, attorneys |
| Subpoena | Deponent name, date/time, location, ordering attorney | deposition_details, attorneys |
| Scheduling Confirmation | Deponent, date/time, location, both attorneys, CSR | deposition_details, attorneys |
| Deposition Notice + Duces Tecum | All of the above + document production list | All + duces_tecum_items |

The pipeline must handle all of these. Unknown document types should
still attempt extraction — partial results are always better than none.

---

## PIPELINE ARCHITECTURE

```
User uploads document
(DOCX · PDF · TXT · RTF · Google Docs URL)
          │
          ▼
  ┌──────────────────┐
  │  File Receiver   │  Validates format, saves to Supabase Storage
  │  (API route)     │  Creates deposition_documents row
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Text Extractor  │  Format-specific extraction
  │                  │  DOCX → mammoth
  │                  │  PDF  → pdf-parse
  │                  │  TXT  → direct read
  │                  │  RTF  → strip tags
  │                  │  URL  → Google Docs export API
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────────┐
  │  AI Structured       │  Claude extracts JSON from raw text
  │  Extraction          │  Returns: case_info · parties · attorneys ·
  │  (Claude API)        │  deposition_details · transcription_keywords
  └────────┬─────────────┘
           │
           ▼
  ┌──────────────────────┐
  │  Database Writer     │  Persists to:
  │                      │  deposition_documents
  │                      │  case_metadata
  │                      │  case_parties
  │                      │  case_attorneys
  │                      │  deposition_jobs (update if linked)
  │                      │  vocabulary_terms (keyword boost)
  └────────┬─────────────┘
           │
           ▼
  ┌──────────────────────┐
  │  Form Population     │  Returns structured JSON to client
  │  Response            │  Client pre-fills new deposition form
  └──────────────────────┘
```

---

## DATABASE MIGRATIONS

**Commit:** `feat(db): add document ingestion tables`

Create migration: `supabase/migrations/20260312_018_document_ingestion.sql`

```sql
-- ══════════════════════════════════════════════════════════════════
-- Migration 018: Document Ingestion Pipeline
-- ══════════════════════════════════════════════════════════════════

-- ── deposition_documents ──────────────────────────────────────────
-- Stores each uploaded legal document and its parse status.

CREATE TABLE IF NOT EXISTS deposition_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,
  uploaded_by      UUID NOT NULL REFERENCES profiles(id),

  file_name        TEXT NOT NULL,
  file_url         TEXT NOT NULL,          -- Supabase Storage URL
  file_size_bytes  INTEGER,
  mime_type        TEXT,                   -- 'application/pdf' etc.
  source_url       TEXT,                   -- populated for Google Docs imports

  document_type    TEXT,                   -- 'notice_of_deposition' | 'court_order'
                                           -- | 'subpoena' | 'scheduling_form'
                                           -- | 'duces_tecum' | 'other'

  parse_status     TEXT NOT NULL DEFAULT 'pending',
                   -- 'pending' | 'processing' | 'complete' | 'failed' | 'partial'
  parse_error      TEXT,
  parsed_at        TIMESTAMPTZ,

  extraction_id    UUID,                   -- FK to case_metadata.id after parse

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deposition_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_isolation_deposition_documents" ON deposition_documents
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_depdocs_job_id  ON deposition_documents(job_id)  WHERE job_id IS NOT NULL;
CREATE INDEX idx_depdocs_firm_id ON deposition_documents(firm_id);
CREATE INDEX idx_depdocs_status  ON deposition_documents(parse_status);

-- ── case_metadata ─────────────────────────────────────────────────
-- Structured case information extracted from the document.

CREATE TABLE IF NOT EXISTS case_metadata (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,
  document_id      UUID REFERENCES deposition_documents(id) ON DELETE CASCADE,

  cause_number     TEXT,
  case_style       TEXT,

  court_name       TEXT,
  court_number     TEXT,
  county           TEXT,
  state            TEXT DEFAULT 'Texas',

  -- Additional deposition-specific fields
  court_reporter_firm  TEXT,
  court_reporter_name  TEXT,
  videographer         TEXT,

  raw_extraction   JSONB,                  -- full AI output stored for audit
  confidence_score NUMERIC(3,2),           -- 0.00–1.00, AI self-reported

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_isolation_case_metadata" ON case_metadata
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_casemeta_job_id ON case_metadata(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_casemeta_cause  ON case_metadata(cause_number) WHERE cause_number IS NOT NULL;

-- ── case_parties ──────────────────────────────────────────────────
-- Individual parties extracted from the case style.

CREATE TABLE IF NOT EXISTS case_parties (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_metadata_id UUID NOT NULL REFERENCES case_metadata(id) ON DELETE CASCADE,

  party_name       TEXT NOT NULL,
  party_type       TEXT NOT NULL,          -- 'plaintiff' | 'defendant' | 'third_party'
  is_deponent      BOOLEAN DEFAULT FALSE,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_isolation_case_parties" ON case_parties
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

-- ── case_attorneys ────────────────────────────────────────────────
-- Attorneys and firms extracted from the document.

CREATE TABLE IF NOT EXISTS case_attorneys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_metadata_id UUID NOT NULL REFERENCES case_metadata(id) ON DELETE CASCADE,

  attorney_name    TEXT NOT NULL,
  law_firm         TEXT,
  role             TEXT,                   -- 'ordering' | 'opposing' | 'copy'
  represents       TEXT,                   -- 'plaintiff' | 'defendant'

  address_line1    TEXT,
  address_line2    TEXT,
  city             TEXT,
  state            TEXT,
  postal_code      TEXT,

  phone            TEXT,
  fax              TEXT,
  email            TEXT,

  delivery_format  TEXT,                   -- 'e-trans' | 'hard-copy' | 'both'
  is_rush          BOOLEAN DEFAULT FALSE,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_attorneys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_isolation_case_attorneys" ON case_attorneys
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

-- ── deposition_sessions ───────────────────────────────────────────
-- Individual deposition sessions extracted from a multi-deponent notice.
-- (e.g. 10am Arieana Bourbois + 2pm Ariella Bourbois from one document)

CREATE TABLE IF NOT EXISTS deposition_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_metadata_id UUID NOT NULL REFERENCES case_metadata(id) ON DELETE CASCADE,
  job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,

  deponent_name    TEXT NOT NULL,
  deposition_date  DATE,
  start_time       TIME,
  end_time         TIME,                   -- if known
  timezone         TEXT DEFAULT 'America/Chicago',

  location         TEXT,                   -- 'Via Zoom' | physical address
  is_remote        BOOLEAN DEFAULT FALSE,
  remote_platform  TEXT,                   -- 'zoom' | 'teams' | 'webex'
  remote_link      TEXT,

  is_videotaped    BOOLEAN DEFAULT FALSE,
  includes_duces_tecum BOOLEAN DEFAULT FALSE,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deposition_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_isolation_deposition_sessions" ON deposition_sessions
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));
```

---

## IMPLEMENTATION ORDER

One commit per step. Run `npx tsc --noEmit && npm run lint` before each commit.
No `@ts-ignore`. No new npm packages without checking `package.json` first.

---

## ═══ STEP 1 — TEXT EXTRACTOR ═══
**Commit:** `feat(ingestion): implement multi-format text extractor`

Create: `lib/ingestion/text-extractor.ts`

**Supported formats and extraction method:**

| Format | MIME Types | Method |
|---|---|---|
| DOCX / DOC | `application/vnd.openxmlformats-officedocument...` | `mammoth` npm package |
| PDF | `application/pdf` | `pdf-parse` npm package |
| TXT | `text/plain` | Direct buffer read |
| RTF | `application/rtf` / `text/rtf` | Strip RTF control words with regex |
| Google Docs URL | URL containing `docs.google.com/document` | Export as plain text via `/export?format=txt` |

Check `package.json` before installing. If `mammoth` or `pdf-parse` are
absent, install them. These are the only new dependencies permitted.

```typescript
// lib/ingestion/text-extractor.ts

export interface ExtractionResult {
  text: string
  pageCount?: number
  extractionMethod: 'mammoth' | 'pdf-parse' | 'plain-text' | 'rtf-strip' | 'google-docs-export'
  warnings: string[]
  error?: string
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  originalFileName: string,
  sourceUrl?: string,
): Promise<ExtractionResult> {
  // Route to correct extractor based on mime type
  // For Google Docs: check sourceUrl for docs.google.com
  // Always return ExtractionResult — never throw
  // If extraction fails: return { text: '', error: '...', warnings: [] }
}

// Individual extractors:
async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult>
async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult>
async function extractFromTxt(buffer: Buffer): Promise<ExtractionResult>
async function extractFromRtf(buffer: Buffer): Promise<ExtractionResult>
async function extractFromGoogleDoc(url: string): Promise<ExtractionResult>
```

**RTF stripping regex pattern:**
```typescript
// Remove RTF control words, groups, and binary data
text = text.replace(/\\[a-z]+[-]?[0-9]*[ ]?/gi, '')
           .replace(/[{}]/g, '')
           .replace(/\\\n/g, '\n')
           .replace(/\\par\b/gi, '\n')
           .replace(/\\\*/g, '')
           .trim()
```

**Google Docs export URL pattern:**
```typescript
// Convert share URL to plain text export
// https://docs.google.com/document/d/[ID]/edit
// → https://docs.google.com/document/d/[ID]/export?format=txt
const docId = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1]
if (docId) {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
  const response = await fetch(exportUrl)
  // Handle redirect — Google may return 200 or redirect
}
```

---

## ═══ STEP 2 — AI EXTRACTION ENGINE ═══
**Commit:** `feat(ingestion): implement Claude AI structured extraction engine`

Create: `lib/ingestion/ai-extractor.ts`

This module sends the extracted text to the Anthropic Claude API and
returns structured JSON conforming to `DepositionExtractionResult`.

**Extraction output type:**

```typescript
// lib/ingestion/types.ts  (create this first)

export interface DepositionExtractionResult {
  document_type: 'notice_of_deposition' | 'court_order' | 'subpoena'
               | 'scheduling_form' | 'duces_tecum' | 'other' | null
  confidence: number  // 0.0–1.0 AI self-reported

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
    deposition_date: string | null    // ISO format: "2026-03-04"
    start_time: string | null         // 24hr: "10:00" or "14:00"
    location: string | null
    is_remote: boolean
    remote_platform: string | null    // 'zoom' | 'teams' | 'webex' | null
    is_videotaped: boolean
    includes_duces_tecum: boolean
  }>

  court_reporter: {
    firm: string | null
    name: string | null
    address: string | null
    phone: string | null
  }

  transcription_keywords: {
    names: string[]           // All person names for Deepgram keyword boosting
    firms: string[]           // All law firm and company names
    locations: string[]       // Cities, courthouses, case locations
    legal_terms: string[]     // Case-specific legal terminology
    all_keywords: string[]    // Combined deduplicated list for Deepgram
  }

  ordered_by: string | null   // "Rose Soto-Oliveras" from scheduling form
  notes: string | null
}
```

**AI extraction prompt (embed this verbatim in the code):**

```typescript
const EXTRACTION_SYSTEM_PROMPT = `You are a legal document parser for a court reporting platform.

Your task is to extract structured deposition scheduling information from
legal documents including notices of deposition, court orders, subpoenas,
and scheduling confirmation forms.

CRITICAL RULES:
1. Return ONLY valid JSON — no preamble, no markdown, no explanation.
2. If a field cannot be found, return null for strings or [] for arrays.
3. Never invent or infer data that is not explicitly in the document.
4. For deposition_date, convert to ISO format: "2026-03-04"
5. For start_time, convert to 24-hour format: "10:00" or "14:00"
6. Extract ALL person names for transcription_keywords.names — these are
   critical for speech recognition accuracy.
7. Detect multiple deposition sessions if a single document covers more
   than one deponent (e.g., 10am and 2pm depositions on the same day).
8. For confidence: 1.0 = all key fields extracted, 0.5 = partial, 0.0 = failed.

Return a JSON object matching this exact structure:
[paste DepositionExtractionResult interface as JSON schema comment]`
```

**Implementation:**

```typescript
// lib/ingestion/ai-extractor.ts

import Anthropic from '@anthropic-ai/sdk'
import type { DepositionExtractionResult } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function extractDepositionData(
  rawText: string,
  documentFileName: string,
): Promise<DepositionExtractionResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Extract deposition data from this document.\n\nFile: ${documentFileName}\n\n---\n\n${rawText.slice(0, 15000)}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude API')

  // Strip any accidental markdown fencing before parsing
  const cleaned = content.text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  return JSON.parse(cleaned) as DepositionExtractionResult
}
```

**Error handling:** If Claude returns invalid JSON or the API call fails,
catch the error and return a partial result with `confidence: 0` and all
fields set to null/empty — never let a parse failure crash the upload.

---

## ═══ STEP 3 — DATABASE WRITER ═══
**Commit:** `feat(ingestion): implement extraction database writer`

Create: `lib/ingestion/db-writer.ts`

Persists the structured extraction result to all four tables.
Returns the `case_metadata.id` for linking back to the document record.

```typescript
// lib/ingestion/db-writer.ts

import { createAdminClient } from '@/lib/supabase/admin'
import type { DepositionExtractionResult } from './types'

export interface WriteResult {
  caseMetadataId: string
  partiesWritten: number
  attorneysWritten: number
  sessionsWritten: number
  keywordsWritten: number
}

export async function writeExtractionToDatabase(
  extraction: DepositionExtractionResult,
  documentId: string,
  firmId: string,
  jobId: string | null,
): Promise<WriteResult>
```

**Writing logic:**

1. Insert `case_metadata` row — include `raw_extraction` JSONB column
   with the full `DepositionExtractionResult` for audit purposes
2. Insert `case_parties` rows — one per plaintiff, defendant, third party.
   Mark as `is_deponent: true` for any party that appears in
   `deposition_sessions[].deponent_name`
3. Insert `case_attorneys` rows — one per attorney object
4. Insert `deposition_sessions` rows — one per session
5. Insert `vocabulary_terms` rows for each keyword in
   `transcription_keywords.all_keywords` — these feed Deepgram keyword
   boosting. Use `ON CONFLICT DO NOTHING` to avoid duplicates

   ```sql
   INSERT INTO vocabulary_terms (firm_id, job_id, term, source, boost_factor)
   VALUES ($1, $2, $3, 'document_ingestion', 1.5)
   ON CONFLICT (firm_id, term) DO UPDATE SET boost_factor = GREATEST(vocabulary_terms.boost_factor, 1.5)
   ```

6. If `jobId` is provided, update `jobs.case_metadata_id` to link them
7. Update `deposition_documents.parse_status = 'complete'`,
   `extraction_id = caseMetadataId`, `parsed_at = NOW()`

---

## ═══ STEP 4 — PIPELINE ORCHESTRATOR ═══
**Commit:** `feat(ingestion): implement document ingestion pipeline orchestrator`

Create: `lib/ingestion/index.ts`

```typescript
// lib/ingestion/index.ts

import { extractText } from './text-extractor'
import { extractDepositionData } from './ai-extractor'
import { writeExtractionToDatabase } from './db-writer'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DepositionExtractionResult } from './types'

export interface IngestionOptions {
  buffer: Buffer
  mimeType: string
  originalFileName: string
  firmId: string
  uploadedBy: string
  jobId?: string
  sourceUrl?: string    // for Google Docs imports
}

export interface IngestionResult {
  success: boolean
  documentId: string
  parseStatus: 'complete' | 'partial' | 'failed'
  extraction: DepositionExtractionResult | null
  caseMetadataId: string | null
  keywordsAdded: number
  sessionsFound: number
  error?: string
}

export async function ingestDocument(options: IngestionOptions): Promise<IngestionResult>
```

**Orchestration flow:**

```typescript
async function ingestDocument(options): Promise<IngestionResult> {
  const supabase = createAdminClient()
  let documentId: string | null = null

  try {
    // 1. Save file to Supabase Storage
    const filePath = `${options.firmId}/documents/${options.jobId ?? 'unlinked'}/${options.originalFileName}`
    const { data: upload } = await supabase.storage
      .from('depo-files')
      .upload(filePath, options.buffer, { contentType: options.mimeType, upsert: true })
    const fileUrl = supabase.storage.from('depo-files').getPublicUrl(filePath).data.publicUrl

    // 2. Create deposition_documents row with status 'processing'
    const { data: doc } = await supabase.from('deposition_documents').insert({
      firm_id: options.firmId,
      job_id: options.jobId ?? null,
      uploaded_by: options.uploadedBy,
      file_name: options.originalFileName,
      file_url: fileUrl,
      mime_type: options.mimeType,
      source_url: options.sourceUrl ?? null,
      parse_status: 'processing',
    }).select('id').single()
    documentId = doc!.id

    // 3. Extract text
    const textResult = await extractText(options.buffer, options.mimeType, options.originalFileName, options.sourceUrl)
    if (!textResult.text.trim()) throw new Error('Text extraction produced empty output')

    // 4. AI structured extraction
    const extraction = await extractDepositionData(textResult.text, options.originalFileName)

    // 5. Write to database
    const writeResult = await writeExtractionToDatabase(extraction, documentId, options.firmId, options.jobId ?? null)

    return {
      success: true,
      documentId,
      parseStatus: extraction.confidence >= 0.5 ? 'complete' : 'partial',
      extraction,
      caseMetadataId: writeResult.caseMetadataId,
      keywordsAdded: writeResult.keywordsWritten,
      sessionsFound: writeResult.sessionsWritten,
    }
  } catch (err) {
    console.error('[CRITICAL][ingestion]', err)
    if (documentId) {
      await supabase.from('deposition_documents').update({
        parse_status: 'failed',
        parse_error: err instanceof Error ? err.message : String(err),
      }).eq('id', documentId)
    }
    return {
      success: false, documentId: documentId ?? '', parseStatus: 'failed',
      extraction: null, caseMetadataId: null, keywordsAdded: 0, sessionsFound: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

---

## ═══ STEP 5 — API ROUTE ═══
**Commit:** `feat(api): add POST /api/depositions/upload-document endpoint`

Create: `app/api/depositions/upload-document/route.ts`

```typescript
// app/api/depositions/upload-document/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ingestDocument } from '@/lib/ingestion'

// Accepted MIME types
const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/pdf',
  'text/plain',
  'application/rtf',
  'text/rtf',
]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  // 10 MB

async function handler(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const jobId = formData.get('job_id') as string | null
  const sourceUrl = formData.get('source_url') as string | null

  // Handle Google Docs URL ingestion (no file upload required)
  if (sourceUrl?.includes('docs.google.com')) {
    const result = await ingestDocument({
      buffer: Buffer.alloc(0),
      mimeType: 'text/plain',
      originalFileName: 'google-doc.txt',
      firmId: profile.firm_id,
      uploadedBy: user.id,
      jobId: jobId ?? undefined,
      sourceUrl,
    })
    return NextResponse.json(result, { status: result.success ? 200 : 422 })
  }

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE_BYTES) return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 })
  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.rtf')) {
    return NextResponse.json({
      error: `Unsupported file type: ${file.type}. Accepted: DOCX, PDF, TXT, RTF, or Google Docs URL.`
    }, { status: 415 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await ingestDocument({
    buffer,
    mimeType: file.type,
    originalFileName: file.name,
    firmId: profile.firm_id,
    uploadedBy: user.id,
    jobId: jobId ?? undefined,
  })

  return NextResponse.json(result, { status: result.success ? 200 : 422 })
}

export const POST = withRouteProtection(handler, {
  roles: ['COURT_REPORTER', 'ADMIN'],
  requireFirmId: true,
  auditAction: 'DOCUMENT_UPLOADED',
})
```

Also create `app/api/depositions/[caseId]/extracted-data/route.ts` — GET
endpoint that returns the `case_metadata` + `case_parties` + `case_attorneys`
+ `deposition_sessions` for a given case, for pre-filling the deposition form.

---

## ═══ STEP 6 — UI UPLOAD COMPONENT ═══
**Commit:** `feat(ui): add DocumentUploadPanel component for deposition intake`

Create: `components/intake/DocumentUploadPanel.tsx`

**Component contract:**

```typescript
interface DocumentUploadPanelProps {
  jobId?: string                    // Link to existing job if available
  onExtractionComplete: (data: DepositionExtractionResult) => void
  onError?: (error: string) => void
}
```

**UI layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Upload Deposition Document                                  │
│  ─────────────────────────────────────────────────────────  │
│  Drag and drop or click to upload                           │
│                                                             │
│  [📄 Drop your file here or browse]                        │
│                                                             │
│  Supported: DOCX · PDF · TXT · RTF                         │
│                                                             │
│  ─── or ───────────────────────────────────────────────── │
│                                                             │
│  Google Docs URL                                           │
│  [https://docs.google.com/document/d/____  ] [Import]     │
│                                                             │
│  Max file size: 10MB                                       │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- Idle: drag-drop zone + URL input visible
- Dragging: blue border + "Drop to upload" text
- Uploading: progress bar + "Extracting data..."
- Complete: green checkmark + summary of what was found
- Error: red border + error message + retry button

**After successful extraction, show a preview panel:**

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Data Extracted                              [Use This ▼] │
│  ─────────────────────────────────────────────────────────  │
│  Cause No.    C-3123-25-J                                   │
│  Case         Bourbois et al. v. Hernandez et al.          │
│  Court        430th Judicial District, Hidalgo County, TX  │
│                                                             │
│  Depositions  ● Arieana Bourbois — Mar 4, 2026 @ 10:00 AM  │
│               ● Ariella Bourbois — Mar 4, 2026 @ 2:00 PM   │
│                                                             │
│  Attorneys    Raul Garza (Goldman & Peterson) — Ordering   │
│               Aaron Ochoa (Dang & Zapata) — Opposing       │
│                                                             │
│  Keywords     12 terms added to transcription vocabulary   │
│                                                             │
│  [✓ Apply to Form]          [✗ Discard]                    │
└─────────────────────────────────────────────────────────────┘
```

`onExtractionComplete` is called when the user clicks **Apply to Form**.

Use Tailwind only. Use lucide-react for icons (`Upload`, `FileText`,
`Link`, `CheckCircle`, `XCircle`, `Loader2`). No external drag-drop
libraries — implement with native HTML5 drag-and-drop events.

---

## ═══ STEP 7 — WIRE INTO NEW DEPOSITION FORM ═══
**Commit:** `feat(jobs): integrate DocumentUploadPanel into new job creation form`

**File:** `app/(dashboard)/jobs/new/page.tsx`
(or wherever the new job / new deposition form currently lives)

Add `<DocumentUploadPanel>` to the top of the form, above the manual
input fields. When `onExtractionComplete` fires, pre-fill the form
fields with the extracted data:

- `cause_number` → cause number field
- `case_style` → case name / style field
- `deposition_sessions[0].deponent_name` → deponent name
- `deposition_sessions[0].deposition_date` → date picker
- `deposition_sessions[0].start_time` → time picker
- `deposition_sessions[0].is_remote` + `remote_platform` → location type
- `attorneys[0]` where `role === 'ordering'` → ordering attorney fields

Make all pre-filled fields editable — the document is a starting point,
not a lock. The user should be able to override any extracted value.

If the document contains multiple `deposition_sessions`, show a selection
step: "Which deposition would you like to create a job for?" with a
radio button per session.

---

## ═══ STEP 8 — TESTS ═══
**Commit:** `test(ingestion): add document ingestion unit and integration tests`

### Unit tests

Create: `tests/unit/ingestion/text-extractor.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { extractText } from '@/lib/ingestion/text-extractor'
import fs from 'fs'
import path from 'path'

describe('text-extractor', () => {
  it('extracts text from a plain TXT buffer', async () => {
    const buffer = Buffer.from('This is a test deposition notice.')
    const result = await extractText(buffer, 'text/plain', 'test.txt')
    expect(result.text).toContain('deposition notice')
    expect(result.extractionMethod).toBe('plain-text')
    expect(result.error).toBeUndefined()
  })

  it('returns error gracefully for empty buffer', async () => {
    const result = await extractText(Buffer.alloc(0), 'text/plain', 'empty.txt')
    expect(result.text).toBe('')
  })

  it('strips RTF control words from RTF content', async () => {
    const rtf = Buffer.from('{\\rtf1\\ansi Hello World\\par }')
    const result = await extractText(rtf, 'application/rtf', 'test.rtf')
    expect(result.text).toContain('Hello World')
    expect(result.text).not.toContain('\\rtf1')
  })
})
```

Create: `tests/unit/ingestion/ai-extractor.test.ts`

Test that:
- Valid JSON response is parsed correctly into `DepositionExtractionResult`
- Malformed JSON response returns a safe fallback object (no throw)
- Text truncation at 15,000 chars is applied before sending to API

Create: `tests/fixtures/bourbois-notice.txt`

Plain text version of the Bourbois deposition notice for testing without
calling the real API. Include:

```
CAUSE NO. C-3123-25-J

ARIEANA SKYE BOURBOIS, ARIELLA STARR BOURBOIS, AND CIERRA TOSCANO,
Plaintiffs,

v.

ETHAN HERNANDEZ AND JOSE HUMBERTO HERNANDEZ
Defendants.

IN THE DISTRICT COURT 430TH JUDICIAL DISTRICT HIDALGO COUNTY, TEXAS

NOTICE OF INTENTION TO TAKE ORAL DEPOSITION OF ARIEANA SKYE BOURBOIS

The oral deposition of ARIEANA SKYE BOURBOIS will be taken on March 4, 2026,
commencing at 10:00 a.m., via Zoom.

GOLDMAN & PETERSON, PLLC
10100 Reunion Place, Suite 800
San Antonio, Texas 78216
Tel: (210) 340-9800
Raul@LJGLaw.com

GREGORY J. PETERSON — State Bar No. 24057580
RAUL GARZA — State Bar No. 24116417
ATTORNEYS FOR DEFENDANTS

Copy to:
Aaron Ochoa
DANG & ZAPATA LAW FIRM, PLLC
1400 N. McColl Road, Suite 204
McAllen, Texas 78501
```

### Integration test

Create: `tests/integration/document-ingestion.test.ts`

Mock the Anthropic API call (do not make real API calls in tests).
Test the full pipeline: text extraction → AI response mock → DB write → result.

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ingestDocument } from '@/lib/ingestion'
import fs from 'fs'

const MOCK_EXTRACTION = {
  document_type: 'notice_of_deposition',
  confidence: 0.97,
  case_information: {
    cause_number: 'C-3123-25-J',
    case_style: 'Bourbois et al. v. Hernandez et al.',
    court_name: 'District Court',
    court_number: '430th Judicial District',
    county: 'Hidalgo',
    state: 'Texas',
  },
  parties: {
    plaintiffs: ['Arieana Skye Bourbois', 'Ariella Starr Bourbois', 'Cierra Toscano'],
    defendants: ['Ethan Hernandez', 'Jose Humberto Hernandez'],
    third_parties: [],
  },
  attorneys: [{
    name: 'Raul Garza',
    firm: 'Goldman & Peterson',
    role: 'ordering',
    represents: 'defendant',
    email: 'Raul@LJGLaw.com',
    phone: '(210) 340-9800',
    address: '10100 Reunion Place Suite 800',
    city: 'San Antonio', state: 'Texas', postal_code: '78216',
    fax: null, delivery_format: null, is_rush: false,
  }],
  deposition_sessions: [{
    deponent_name: 'Arieana Skye Bourbois',
    deposition_date: '2026-03-04',
    start_time: '10:00',
    location: 'Via Zoom',
    is_remote: true,
    remote_platform: 'zoom',
    is_videotaped: false,
    includes_duces_tecum: true,
  }],
  court_reporter: { firm: 'SA Legal Solutions', name: null, address: null, phone: '(210) 591-1791' },
  transcription_keywords: {
    names: ['Arieana Bourbois', 'Ariella Bourbois', 'Cierra Toscano', 'Ethan Hernandez', 'Jose Humberto Hernandez', 'Raul Garza', 'Aaron Ochoa'],
    firms: ['Goldman & Peterson', 'Dang & Zapata'],
    locations: ['Hidalgo County', 'San Antonio', 'McAllen'],
    legal_terms: [],
    all_keywords: ['Arieana Bourbois', 'Ariella Bourbois', 'Cierra Toscano', 'Ethan Hernandez', 'Jose Humberto Hernandez', 'Raul Garza', 'Aaron Ochoa', 'Goldman & Peterson', 'Dang & Zapata', 'Hidalgo County'],
  },
  ordered_by: 'Rose Soto-Oliveras',
  notes: null,
}

describe('document-ingestion pipeline', () => {
  it('processes a TXT document end-to-end with mocked AI', async () => {
    vi.mock('@/lib/ingestion/ai-extractor', () => ({
      extractDepositionData: vi.fn().mockResolvedValue(MOCK_EXTRACTION)
    }))
    const buffer = fs.readFileSync('tests/fixtures/bourbois-notice.txt')
    const result = await ingestDocument({
      buffer,
      mimeType: 'text/plain',
      originalFileName: 'bourbois-notice.txt',
      firmId: 'test-firm-id',
      uploadedBy: 'test-user-id',
    })
    expect(result.success).toBe(true)
    expect(result.sessionsFound).toBe(1)
    expect(result.keywordsAdded).toBeGreaterThan(5)
    expect(result.extraction?.case_information.cause_number).toBe('C-3123-25-J')
  })

  it('returns partial result when AI extraction confidence is low', async () => {
    vi.mock('@/lib/ingestion/ai-extractor', () => ({
      extractDepositionData: vi.fn().mockResolvedValue({ ...MOCK_EXTRACTION, confidence: 0.3 })
    }))
    const buffer = Buffer.from('incomplete document text')
    const result = await ingestDocument({
      buffer, mimeType: 'text/plain', originalFileName: 'incomplete.txt',
      firmId: 'test-firm-id', uploadedBy: 'test-user-id',
    })
    expect(result.parseStatus).toBe('partial')
  })

  it('handles complete extraction failure without throwing', async () => {
    vi.mock('@/lib/ingestion/ai-extractor', () => ({
      extractDepositionData: vi.fn().mockRejectedValue(new Error('API timeout'))
    }))
    const buffer = Buffer.from('test')
    const result = await ingestDocument({
      buffer, mimeType: 'text/plain', originalFileName: 'test.txt',
      firmId: 'test-firm-id', uploadedBy: 'test-user-id',
    })
    expect(result.success).toBe(false)
    expect(result.parseStatus).toBe('failed')
    expect(result.error).toContain('API timeout')
  })
})
```

---

## ═══ STEP 9 — FINAL VERIFICATION ═══

```bash
npx tsc --noEmit        # 0 errors required
npm run lint            # 0 errors required
npm run build           # Must pass
npx vitest run tests/unit/ingestion/
npx vitest run tests/integration/document-ingestion.test.ts
```

**Manual smoke test (using the Bourbois notice as test data):**

1. Open a new job creation form in the browser
2. Upload `03-04-26___10am___2pm_-_Goldman___Peterson.docx`
3. Confirm extraction completes within 10 seconds
4. Verify the preview panel shows:
   - Cause No. C-3123-25-J
   - Both deponents (Arieana @ 10am, Ariella @ 2pm)
   - Raul Garza — Goldman & Peterson (ordering)
   - Aaron Ochoa — Dang & Zapata (opposing)
5. Click **Apply to Form** — confirm all fields are pre-filled
6. Check Supabase `vocabulary_terms` table — confirm keywords are present
7. Check `case_parties` table — confirm 5 parties: 3 plaintiffs, 2 defendants

---

## COMPLETION REPORT

```
╔═══════════════════════════════════════════════════════════════════════╗
║       DEPO-PRO — PHASE 3A DOCUMENT INGESTION PIPELINE COMPLETE       ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Migration 018 applied:                  YES                         ║
║  lib/ingestion/text-extractor.ts:        CREATED                     ║
║  lib/ingestion/ai-extractor.ts:          CREATED                     ║
║  lib/ingestion/db-writer.ts:             CREATED                     ║
║  lib/ingestion/index.ts:                 CREATED                     ║
║  lib/ingestion/types.ts:                 CREATED                     ║
║  app/api/depositions/upload-document:    CREATED                     ║
║  components/intake/DocumentUploadPanel:  CREATED                     ║
║  New job form integration:               COMPLETE                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Supported formats: DOCX · PDF · TXT · RTF · Google Docs URL         ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Unit tests:        __ / __ passing                                  ║
║  Integration test:  __ / 3 passing                                   ║
║  Build gate:        PASSING                                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║  EXIT CRITERION                                                       ║
║  Bourbois notice uploads, extracts both sessions, keywords added:    ║
║    [ ] YES — Phase 3A COMPLETE                                       ║
║    [ ] NO  — document failure, stop here                             ║
╚═══════════════════════════════════════════════════════════════════════╝
```
