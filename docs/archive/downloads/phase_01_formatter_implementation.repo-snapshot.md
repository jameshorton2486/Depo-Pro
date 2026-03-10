# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — PHASE 1: TRANSCRIPT FORMATTER PIPELINE
# Autonomous Implementation Prompt for Codex CLI / Claude Code
#
# Save to:  ai_prompts/phases/phase_01_formatter_implementation.md
# Session:  claude code --no-resume
# Version:  3.0 — Production Grade · Self-Contained · No External Dependencies
#
# READ THIS ENTIRE FILE BEFORE EXECUTING ANY COMMAND.
# Implement all steps in exact order. One commit per step. No skipping.
# ═══════════════════════════════════════════════════════════════════════════════

---

## MISSION

You are implementing the **Phase 1 Transcript Formatter Pipeline** inside the
Depo-Pro repository.

This pipeline is the **core engine of the entire platform**. It converts raw
Deepgram speech-to-text output into a legally formatted, certifiable deposition
transcript in DOCX format.

Without this pipeline:
- Transcripts cannot be exported
- Court reporters cannot deliver certified transcripts to law firms
- The scopist review editor has no formatted source to work against
- AI-assisted correction has no structured output to improve
- Legal formatting compliance cannot be enforced

**Phase 1 is the prerequisite for every other feature in this system.**

---

## PLATFORM CONTEXT

You are building **Depo-Pro**, a multi-tenant legal deposition transcription SaaS.

**Stack:**
- Next.js 15 (App Router) · TypeScript · Tailwind CSS
- Supabase (PostgreSQL + Row-Level Security + Storage)
- Deepgram Nova-3 (speech recognition)
- Anthropic Claude API (AI correction)
- `docx` npm package (DOCX generation)
- Vercel (deployment — auto-deploys on git push)

**Auth:**
- Supabase SSR only — `createSupabaseServerClient()` from `lib/supabase/server.ts`
- User profile table: `profiles` — NEVER `users`
- Env key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — NEVER `ANON_KEY`
- Auth failures → `/unauthorized?reason=missing_profile` — NEVER `/login`
- All new API routes use `withRouteProtection()` from `lib/middleware/withRouteProtection.ts`

**Multi-tenancy:**
- Every data table carries `firm_id UUID NOT NULL` for Row-Level Security
- Every query must scope by `firm_id` from the authenticated user's profile
- RLS must be enabled on every new table

---

## FROZEN FILES — DO NOT MODIFY

```
lib/supabase/server.ts
lib/supabase/client.ts
lib/auth/session.ts
middleware.ts
supabase/migrations/**  ← existing files only; new files may be added
```

---

## NON-NEGOTIABLE FORMATTING RULES (Texas UFM / JBCC)

These rules govern every transcript this system produces.
Violating them produces a legally defective transcript.

| Rule | Detail |
|---|---|
| **Em dash prohibition** | `—` `\u2014` `\u2013` → `--` (double hyphen) — ALWAYS, no exceptions |
| **Reporter label** | `THE COURT REPORTER` → `THE REPORTER` — ALWAYS |
| **Font** | Courier New 12pt — no substitutions |
| **Page size** | 8.5" × 11" (US Letter) |
| **Lines per page** | Exactly 25 — never more |
| **Line numbers** | 1–25, reset each page, right-aligned in left margin |
| **Left margin** | 1.0 inch |
| **Right margin** | 0.375 inch |
| **Tab 1** (Q./A. label position) | 5 spaces from left margin |
| **Tab 2** (Q./A. text start) | 10 spaces from left margin |
| **Tab 3** (colloquy text) | 15 spaces from left margin |
| **Time format** | `2:12 p.m.` — NEVER `2:12 PM` or `2:12pm` |
| **Closing line** | `FURTHER THIS DEPONENT SAITH NOT.` |
| **Off-record re-entry** | `(Whereupon, a brief recess was taken.)` / `(The deposition resumed.)` |
| **Interruption marker** | `--` (double hyphen) — NEVER em dash |

---

## VERBATIM MANDATE

Legal transcripts are immutable records.

- **`transcript_words.original_word`** — set once on Deepgram ingest, never modified
- **`transcriptions.deepgram_raw_json`** — set once on ingest, never modified
- Hard DELETE is blocked at DB layer on `transcript_words`
- Corrections are overlays stored in `transcription_edits` / `flagged_words`
- `corrected_word` column receives corrections — NEVER `original_word`

---

## KNOWN MISRECOGNITION: MIAH BARDOT

Court reporter on Bourbois depositions: **Miah Bardot** (B-A-R-D-O-T)
CSR #12129, SA Legal Solutions

Deepgram misrecognizes her name as:
- `"Miyamardeau"` ← most common
- `"Mia Bardeau"`

**Response:** Flag as CRITICAL confidence, surface to scopist for manual review.
**Never auto-correct. Never modify `original_word`.**

---

## JOB STATE MACHINE

Jobs follow a strict one-way state machine:

```
PENDING → UPLOADING → PROCESSING → TRANSCRIBED → IN_REVIEW
       → SCOPIST_COMPLETE → REPORTER_REVIEW → COMPLETED → EXPORTED
```

Invalid transitions return HTTP 422.

---

## PIPELINE ARCHITECTURE

```
Deepgram JSON output  (stored in transcriptions.deepgram_raw_json — IMMUTABLE)
        │
        ▼
transcript_words rows  (hydrated from Deepgram JSON — one row per word)
        │
        ▼
  ┌─────────────────┐
  │ Section Detector │  Identifies QUESTION / ANSWER / COLLOQUY / EXAMINATION etc.
  └────────┬────────┘
           │
           ▼
  ┌──────────────────┐
  │ Paragraph Builder │  Groups words into paragraphs by speaker + section
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │  Post Processor  │  Normalizes em dashes, labels, time format, smart quotes
  └────────┬────────┘
           │
           ▼
  ┌────────────────────────┐
  │ transcript_paragraphs  │  ← Rows persisted to DB at this stage
  └────────┬───────────────┘
           │
           ▼
  ┌──────────────┐
  │   Paginator   │  Applies 25-line/page Texas UFM layout
  └────────┬─────┘
           │
           ▼
  ┌──────────────┐
  │ Quality Gate  │  12 checks — ERRORs block export, WARNINGs require acknowledgment
  └────────┬─────┘
           │
           ▼
  ┌────────────────────────┐
  │ Inclusion Page Generator│  Title · Appearances · Index · Certification pages
  └────────┬───────────────┘
           │
           ▼
  ┌───────────────┐
  │ DOCX Assembler │  Courier New · Margins · Line numbers · Headers · Footers
  └────────┬──────┘
           │
           ▼
  POST /api/transcriptions/[id]/format  →  DOCX download
```

---

## CORE DATA MODELS

### `transcript_words` (source — immutable after ingest)

```typescript
interface TranscriptWord {
  id: string
  transcription_id: string
  firm_id: string
  position_index: number      // ordering key
  original_word: string       // ← IMMUTABLE — set once from Deepgram
  word: string
  punctuated_word: string
  display_word: string        // corrected_word ?? punctuated_word
  corrected_word: string | null
  start_time: number          // seconds from audio start
  end_time: number
  confidence: number          // 0.0–1.0
  confidence_class: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL'  // generated column
  speaker_index: number       // Deepgram diarization index
  is_corrected: boolean
  is_deleted: boolean         // always false — verbatim mandate
  is_filler: boolean
}
```

### `transcript_paragraphs` (output — generated by formatter)

```typescript
interface TranscriptParagraph {
  id: string
  transcription_id: string
  firm_id: string
  paragraph_index: number
  paragraph_type: ParagraphType
  section_type: DepositionSection
  speaker_index: number | null
  speaker_label: string | null   // 'Q.' | 'A.' | 'MR. SMITH:' | 'THE REPORTER:'
  text: string                   // post-processed display text
  raw_text: string               // pre-processing (audit)
  word_ids: string[]
  start_word_idx: number
  end_word_idx: number
  page_number: number
  line_number_start: number
  line_number_end: number
  line_count: number
  has_interruption: boolean
}
```

### Speaker label mapping (auto-derived from `speaker_assignments.role`)

| Role | Examination label | Colloquy label |
|---|---|---|
| `examining_attorney` | `Q.` | `MR. [LAST NAME]:` |
| `cross_examining_attorney` | `Q.` | `MR. [LAST NAME]:` |
| `witness` | `A.` | `THE WITNESS:` |
| `reporter` | — | `THE REPORTER:` ← NEVER "THE COURT REPORTER" |
| `videographer` | — | `THE VIDEOGRAPHER:` |
| `interpreter` | — | `THE INTERPRETER:` |

### Confidence class thresholds

| Class | Threshold | Action |
|---|---|---|
| `HIGH` | ≥ 0.90 | No review needed |
| `MEDIUM` | 0.80–0.89 | Quick listen recommended |
| `LOW` | 0.70–0.79 | Review required |
| `CRITICAL` | < 0.70 | Must correct before export |

---

## QUALITY GATE — 12 CHECKS (CANONICAL)

| Code | Severity | Blocks Export | Description |
|---|---|---|---|
| QG-001 | ERROR | YES | Unresolved `[VERIFY]` tags remain in transcript |
| QG-002 | ERROR | YES | Speaker mapping incomplete — unmapped `speaker_index` |
| QG-003 | ERROR | YES | Date conflict flags unresolved |
| QG-004 | ERROR | YES | Certification block empty — reporter license data missing |
| QG-005 | ERROR | YES | Words with `is_deleted = TRUE` (verbatim mandate violation) |
| QG-006 | ERROR | YES | `[SCOPIST: ...]` editorial notes remain in transcript body |
| QG-007 | ERROR | YES | Exhibit index entries with `transcript_page = NULL` |
| QG-008 | WARNING | No | Font or spacing non-compliant with jurisdiction |
| QG-009 | WARNING | No | Lines-per-page exceeds jurisdiction maximum (25) |
| QG-010 | WARNING | No | Low-confidence flagged words not yet reviewed |
| QG-011 | WARNING | No | Em dash character (`—`) present in formatted output |
| QG-012 | WARNING | No | `THE COURT REPORTER` label detected (use `THE REPORTER`) |

ERRORs must be resolved before export. WARNINGs may be overridden with a logged reason.

---

## PRE-FLIGHT CHECKS (run before any code)

```bash
# 1. Baseline build — document result in ai_logs/phase1_audit.md
npx tsc --noEmit 2>&1 | tail -5
npm run build 2>&1 | tail -10

# 2. Confirm required directories exist — create any that are missing
Test-Path lib/transcription/formatter   # create if missing
Test-Path tests/unit/formatter          # create if missing
Test-Path tests/integration             # create if missing
Test-Path tests/fixtures                # create if missing
Test-Path ai_logs                       # create if missing

# 3. Confirm formatter types file does not already exist (avoid overwriting)
Test-Path lib/transcription/formatter/types.ts

# 4. Confirm transcript_words table exists in DB
# If missing — the Phase A migrations must be run before proceeding (TASK 0A below)
```

### TASK 0A — Phase A Database Migrations (prerequisite)

If `transcript_words`, `transcript_paragraphs`, `speaker_assignments`, or
`jurisdiction_configs` tables are missing from the database, run the Phase A
migrations first:

```bash
supabase db push
```

Verify:
```bash
supabase db diff --schema public | grep "CREATE TABLE"
```

Required tables before proceeding:
`depositions` · `participants` · `vocabulary_terms` · `transcript_words`
`speaker_assignments` · `transcript_paragraphs` · `transcript_flags`
`ai_suggestions` · `jurisdiction_configs` · `exports`

If migration files are absent, check the repo root and copy to
`supabase/migrations/` — do not stop, do not wait.

### TASK 0B — confidence_class generated column

```sql
-- Run via Supabase SQL Editor if column does not exist
ALTER TABLE transcript_words
  ADD COLUMN IF NOT EXISTS confidence_class TEXT GENERATED ALWAYS AS (
    CASE
      WHEN confidence >= 0.90 THEN 'HIGH'
      WHEN confidence >= 0.80 THEN 'MEDIUM'
      WHEN confidence >= 0.70 THEN 'LOW'
      ELSE 'CRITICAL'
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_tw_confidence_class
  ON transcript_words(transcription_id, confidence_class)
  WHERE is_deleted = FALSE;
```

### TASK 0C — Seed Texas jurisdiction config

```sql
INSERT INTO jurisdiction_configs (
  state_code, state_name, lines_per_page,
  left_margin_inches, right_margin_inches,
  qa_signifier_spaces, qa_text_offset_spaces, colloquy_indent_spaces,
  min_chars_per_line, certification_body
) VALUES (
  'TX', 'Texas', 25, 1.0, 0.375, 5, 10, 15, 56, 'JBCC/UFM'
) ON CONFLICT (state_code) DO NOTHING;
```

No commit for pre-flight. Document results in `ai_logs/phase1_audit.md`.

---

## IMPLEMENTATION ORDER

Execute all steps in the order below.
**One commit per step. Never batch steps into a single commit.**

Commit template: `git commit -m "[commit message from step header]"`

Before every commit:
```bash
npx tsc --noEmit && npm run lint && npm run build
```
All three must pass. Fix TypeScript errors before committing. No `@ts-ignore`.

---

## ═══ STEP 1 — FORMATTER TYPES ═══
**Commit:** `feat(formatter): define formatter TypeScript types`

Create: `lib/transcription/formatter/types.ts`

```typescript
export type ParagraphType =
  | 'QUESTION' | 'ANSWER' | 'COLLOQUY' | 'SECTION_HEADER' | 'EXAMINATION_BYLINE'
  | 'EXHIBIT_MARKER' | 'REENTRY_MARKER' | 'CLOSING_ASTERISKS' | 'FURTHER_SAYETH' | 'DEPO_CONCLUDED'

export type DepositionSection =
  | 'PREAMBLE' | 'DIRECT_EXAMINATION' | 'CROSS_EXAMINATION' | 'REDIRECT_EXAMINATION'
  | 'RECROSS_EXAMINATION' | 'COLLOQUY' | 'OFF_RECORD' | 'CLOSING'

export interface TranscriptWord {
  id: string; transcription_id: string; firm_id: string; position_index: number
  original_word: string; word: string; punctuated_word: string; display_word: string
  corrected_word: string | null; start_time: number; end_time: number; confidence: number
  confidence_class: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL'; speaker_index: number
  is_corrected: boolean; is_deleted: boolean; is_filler: boolean
}

export interface SpeakerAssignment {
  transcription_id: string; firm_id: string; speaker_index: number
  role: 'examining_attorney' | 'cross_examining_attorney' | 'witness' | 'reporter' | 'videographer' | 'interpreter' | 'unknown'
  last_name: string | null; full_name: string | null; qa_label: 'Q' | 'A' | null; colloquy_label: string | null
}

export interface JurisdictionConfig {
  state_code: string; lines_per_page: number; left_margin_inches: number; right_margin_inches: number
  qa_signifier_spaces: number; qa_text_offset_spaces: number; colloquy_indent_spaces: number
  min_chars_per_line: number; certification_body: string | null
}

export interface Paragraph {
  paragraph_index: number; paragraph_type: ParagraphType; section_type: DepositionSection
  speaker_index: number | null; speaker_label: string | null; text: string; raw_text: string
  word_ids: string[]; start_word_idx: number; end_word_idx: number
  requires_reentry_marker: boolean; has_interruption: boolean
}

export interface PaginatedParagraph extends Paragraph {
  page_number: number; line_number_start: number; line_number_end: number; line_count: number
}

export interface QGCheck { code: string; severity: 'ERROR' | 'WARNING'; passed: boolean; message: string; details?: string[] }
export interface QualityGateResult { passed: boolean; exportBlocked: boolean; checks: QGCheck[]; errorCount: number; warningCount: number }
export interface FormatterOptions { transcriptionId: string; firmId: string; jurisdictionStateCode?: string; forceReformat?: boolean }
export interface FormatterResult { success: boolean; transcriptionId: string; paragraphsCreated: number; pageCount: number; qualityGate: QualityGateResult; durationMs: number; error?: string }
export interface InclusionPages { title: string[]; appearances: string[]; index: string[]; certification: string[] }
```

---

## ═══ STEP 2 — SECTION DETECTOR ═══
**Commit:** `feat(formatter): implement section detection engine`

Create: `lib/transcription/formatter/section-detector.ts`

Detect DIRECT_EXAMINATION, CROSS_EXAMINATION, REDIRECT_EXAMINATION,
RECROSS_EXAMINATION, OFF_RECORD, BACK ON THE RECORD, CLOSING.
Returns SectionMap keyed by position_index.

---

## ═══ STEP 3 — PARAGRAPH BUILDER ═══
**Commit:** `feat(formatter): implement paragraph builder with Q/A and colloquy logic`

Create: `lib/transcription/formatter/paragraph-builder.ts`

Group words into Paragraphs by speaker change, section, byline, reentry markers.
Speaker labels: Q./A. in exam, THE REPORTER (never THE COURT REPORTER), MR. [LAST]:.

---

## ═══ STEP 4 — POST-PROCESSOR ═══
**Commit:** `feat(formatter): implement post-processor normalization rules`

Create: `lib/transcription/formatter/post-processor.ts`

**Critical:** post-processing applies to `paragraph.text` only. Never touches `original_word`.

```typescript
import type { Paragraph } from './types'

export function postProcessParagraphs(paragraphs: Paragraph[]): Paragraph[] {
  return paragraphs.map(p => ({
    ...p,
    text: postProcessText(p.text),
    speaker_label: p.speaker_label?.replace(/THE\s+COURT\s+REPORTER/gi, 'THE REPORTER') ?? p.speaker_label,
  }))
}

export function postProcessText(text: string): string {
  text = text.replace(/[\u2014\u2013\u2012—–‒]/g, '--')
  text = text.replace(/[\u201C\u201D\u201E]/g, '"').replace(/[\u2018\u2019\u201A]/g, "'")
  text = text.replace(/\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?|AM|PM|am|pm)\b/gi,
    (_, h, m, ampm) => `${parseInt(h,10)}:${m} ${ampm.toLowerCase().startsWith('a')?'a.m.':'p.m.'}`)
  text = text.replace(/\bDoctor\s+([A-Z][a-z]+)/g, 'Dr. $1')
  text = text.replace(/THE\s+COURT\s+REPORTER/gi, 'THE REPORTER')
  text = text.replace(/ {3,}/g, '  ').replace(/([^.!?])  +/g, '$1 ')
  text = text.replace(/([.!?])\s+/g, '$1  ')
  return text.trim()
}
```

---

## ═══ STEP 5 — PAGINATOR ═══
**Commit:** `feat(formatter): implement 25-line Texas UFM paginator`

Create: `lib/transcription/formatter/paginator.ts`

25 lines per page, line numbers 1–25, Q/A label never separated from first line. Pure function.

---

## ═══ STEP 6 — QUALITY GATE ═══
**Commit:** `feat(formatter): implement 12-check quality gate`

Create: `lib/transcription/formatter/quality-gate.ts`

All 12 checks (QG-001 through QG-012). Run via Promise.allSettled. ERRORs block export.

---

## ═══ STEP 7 — INCLUSION PAGE GENERATOR ═══
**Commit:** `feat(formatter): implement title, appearances, index, and certification pages`

Create: `lib/transcription/formatter/inclusion-pages.ts`

Title, appearances, index, Texas CSR certification template. Fetch from transcriptions → jobs → depositions + participants + profiles.

---

## ═══ STEP 8 — DOCX ASSEMBLER ═══
**Commit:** `feat(formatter): implement DOCX assembler with Texas UFM formatting`

Create: `lib/transcription/formatter/docx-assembler.ts`

Courier New 12pt, 8.5×11, margins, line numbers 1–25, headers/footers. Use `docx` package.

---

## ═══ STEP 9 — FORMATTER ENTRY POINT ═══
**Commit:** `feat(formatter): implement formatter pipeline orchestrator`

Create: `lib/transcription/formatter/index.ts`

Orchestrate: words → sections → paragraphs → post-process → paginate → persist → quality gate.

---

## ═══ STEP 10 — FORMAT API ENDPOINT ═══
**Commit:** `feat(api): add POST /api/transcriptions/[id]/format endpoint`

Create: `app/api/transcriptions/[id]/format/route.ts`

Use withRouteProtection. Call formatTranscript. Update export route with quality gate check.

---

## ═══ STEP 11 — OLIVAREZ TEST FIXTURE ═══
**Commit:** `test(formatter): add Olivarez deposition fixture`

Create: `tests/fixtures/olivarez-deepgram-output.json`

Required: Deepgram format with `results.channels[0].alternatives[0].words`. Must include:
- 60+ words, 2+ speakers (speaker: 0, 1, 2)
- Q/A exchange (attorney asks, witness answers)
- Word "miyamardeau" with confidence ≤ 0.45 (Miah Bardot misrecognition)
- Time "2:12 PM" or "PM." for post-processor test
- At least one word with em dash in punctuated_word

---

## ═══ STEP 12 — UNIT TESTS ═══
**Commit:** `test(formatter): add formatter unit test suite`

Create `tests/unit/formatter/post-processor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { postProcessText } from '@/lib/transcription/formatter/post-processor'

describe('postProcessText', () => {
  it('replaces em dash U+2014 with double hyphen', () =>
    expect(postProcessText('interrupted—then stopped')).toBe('interrupted--then stopped'))
  it('replaces en dash U+2013 with double hyphen', () =>
    expect(postProcessText('pages 10–20')).toBe('pages 10--20'))
  it('replaces THE COURT REPORTER with THE REPORTER', () =>
    expect(postProcessText('THE COURT REPORTER: Ready.')).toBe('THE REPORTER: Ready.'))
  it('normalizes "2:12 PM" to "2:12 p.m."', () =>
    expect(postProcessText('at 2:12 PM today')).toBe('at 2:12 p.m. today'))
  it('converts smart quotes to straight', () =>
    expect(postProcessText('\u201CHello\u201D')).toBe('"Hello"'))
})
```

Create section-detector, paragraph-builder, paginator, quality-gate tests per canonical rules.

---

## ═══ STEP 13 — INTEGRATION TEST (EXIT CRITERION) ═══
**Commit:** `test(formatter): add Olivarez integration test — Phase 1 exit criterion`

Create: `tests/integration/formatter-pipeline.test.ts`

**Phase 1 exit criterion.** Assertions required:
- Fixture loads, contains words, contains "miyamardeau" with confidence < 0.50
- postProcessText removes all em dashes, normalizes THE COURT REPORTER and 2:12 p.m.
- Paginator keeps line_number_end ≤ 25, page_number starts at 1
- Section detector identifies DIRECT EXAMINATION
- assembleDocx returns non-empty Buffer > 1000 bytes

Run: `npx vitest run tests/integration/formatter-pipeline.test.ts`

---

## ═══ STEP 14 — FINAL VERIFICATION GATE ═══
**No commit — verification only.**

```bash
npx tsc --noEmit && npm run lint && npm run build && npx vitest run
```

Manual smoke test: format endpoint → transcript_paragraphs rows → DOCX download → Courier New, no em dashes, THE REPORTER.

---

## COMPLETION REPORT

When all steps are done, output this report exactly:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║            DEPO-PRO — PHASE 1 FORMATTER PIPELINE COMPLETE                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Pre-flight                                                               ║
║    Phase A migrations applied:            YES / PARTIAL / N/A            ║
║    confidence_class generated column:     YES                            ║
║    Texas jurisdiction seeded:             YES                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Formatter Modules                                                        ║
║    lib/transcription/formatter/types.ts:             CREATED             ║
║    lib/transcription/formatter/section-detector.ts:  CREATED             ║
║    lib/transcription/formatter/paragraph-builder.ts: CREATED             ║
║    lib/transcription/formatter/post-processor.ts:    CREATED             ║
║    lib/transcription/formatter/paginator.ts:         CREATED             ║
║    lib/transcription/formatter/quality-gate.ts:      CREATED             ║
║    lib/transcription/formatter/inclusion-pages.ts:   CREATED             ║
║    lib/transcription/formatter/docx-assembler.ts:    CREATED             ║
║    lib/transcription/formatter/index.ts:             CREATED             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  API & Infrastructure                                                     ║
║    app/api/transcriptions/[id]/format/route.ts:      CREATED             ║
║    export route updated with quality gate check:     YES                 ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Tests                                                                    ║
║    Unit — post-processor:       __ / __ passing                          ║
║    Unit — section-detector:     __ / __ passing                          ║
║    Unit — paragraph-builder:    __ / __ passing                          ║
║    Unit — paginator:            __ / __ passing                          ║
║    Unit — quality-gate:         __ / __ passing                          ║
║    Integration — Olivarez:      __ / __ passing                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Build Gate                                                               ║
║    TypeScript:  0 errors                                                  ║
║    Lint:        0 errors                                                  ║
║    Build:       PASSING                                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  EXIT CRITERION                                                           ║
║    Olivarez DOCX generated and passes all assertions?                     ║
║      [ ] YES — Phase 1 COMPLETE. Do not begin Phase 2 in this session.   ║
║      [ ] NO  — document failure in REVIEW_NEEDED.md, stop here.          ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

**Do not begin Phase 2 work in this session.**

Phase 2 (Transcript Editor) begins in a separate session after the Phase 1 exit criterion is confirmed.
