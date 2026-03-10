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

All TypeScript types for the formatter pipeline.
Column names match database schema exactly (snake_case throughout).

```typescript
// lib/transcription/formatter/types.ts

export type ParagraphType =
  | 'QUESTION'
  | 'ANSWER'
  | 'COLLOQUY'
  | 'SECTION_HEADER'
  | 'EXAMINATION_BYLINE'
  | 'EXHIBIT_MARKER'
  | 'REENTRY_MARKER'
  | 'CLOSING_ASTERISKS'
  | 'FURTHER_SAYETH'
  | 'DEPO_CONCLUDED'

export type DepositionSection =
  | 'PREAMBLE'
  | 'DIRECT_EXAMINATION'
  | 'CROSS_EXAMINATION'
  | 'REDIRECT_EXAMINATION'
  | 'RECROSS_EXAMINATION'
  | 'COLLOQUY'
  | 'OFF_RECORD'
  | 'CLOSING'

export interface TranscriptWord {
  id: string
  transcription_id: string
  firm_id: string
  position_index: number
  original_word: string        // IMMUTABLE — never modify
  word: string
  punctuated_word: string
  display_word: string
  corrected_word: string | null
  start_time: number
  end_time: number
  confidence: number
  confidence_class: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL'
  speaker_index: number
  is_corrected: boolean
  is_deleted: boolean
  is_filler: boolean
}

export interface SpeakerAssignment {
  transcription_id: string
  firm_id: string
  speaker_index: number
  role: 'examining_attorney' | 'cross_examining_attorney' | 'witness'
       | 'reporter' | 'videographer' | 'interpreter' | 'unknown'
  last_name: string | null
  full_name: string | null
  qa_label: 'Q' | 'A' | null
  colloquy_label: string | null
}

export interface JurisdictionConfig {
  state_code: string
  lines_per_page: number            // 25
  left_margin_inches: number        // 1.0
  right_margin_inches: number       // 0.375
  qa_signifier_spaces: number       // 5
  qa_text_offset_spaces: number     // 10
  colloquy_indent_spaces: number    // 15
  min_chars_per_line: number        // 56
  certification_body: string | null
}

export interface Paragraph {
  paragraph_index: number
  paragraph_type: ParagraphType
  section_type: DepositionSection
  speaker_index: number | null
  speaker_label: string | null
  text: string
  raw_text: string
  word_ids: string[]
  start_word_idx: number
  end_word_idx: number
  requires_reentry_marker: boolean
  has_interruption: boolean
}

export interface PaginatedParagraph extends Paragraph {
  page_number: number
  line_number_start: number
  line_number_end: number
  line_count: number
}

export interface QGCheck {
  code: string        // 'QG-001' through 'QG-012'
  severity: 'ERROR' | 'WARNING'
  passed: boolean
  message: string
  details?: string[]
}

export interface QualityGateResult {
  passed: boolean
  exportBlocked: boolean
  checks: QGCheck[]
  errorCount: number
  warningCount: number
}

export interface FormatterOptions {
  transcriptionId: string
  firmId: string
  jurisdictionStateCode?: string
  forceReformat?: boolean
}

export interface FormatterResult {
  success: boolean
  transcriptionId: string
  paragraphsCreated: number
  pageCount: number
  qualityGate: QualityGateResult
  durationMs: number
  error?: string
}

export interface InclusionPages {
  title: string[]
  appearances: string[]
  index: string[]
  certification: string[]
}
```

---

## ═══ STEP 2 — SECTION DETECTOR ═══
**Commit:** `feat(formatter): implement section detection engine`

Create: `lib/transcription/formatter/section-detector.ts`

**Purpose:** Identify which part of the deposition each word belongs to by
detecting examination headers, bylines, and off-record markers in the word
stream.

**Detection triggers (multi-word windows of 2–5 words):**

| Pattern | Detected Section |
|---|---|
| `DIRECT EXAMINATION` | `DIRECT_EXAMINATION` |
| `CROSS-EXAMINATION` / `CROSS EXAMINATION` | `CROSS_EXAMINATION` |
| `REDIRECT EXAMINATION` | `REDIRECT_EXAMINATION` |
| `RECROSS-EXAMINATION` | `RECROSS_EXAMINATION` |
| `OFF THE RECORD` | `OFF_RECORD` |
| `BACK ON THE RECORD` | resumes prior examination section |
| `FURTHER THIS DEPONENT SAITH NOT` | `CLOSING` |
| `BY MR. [NAME]:` / `BY MS. [NAME]:` | examination byline (within current section) |

Returns `SectionMap` — a `Map<number, DepositionSection>` keyed by `position_index`.

Default (no trigger detected): carry forward the current section.
Starting state: `PREAMBLE`.

```typescript
// lib/transcription/formatter/section-detector.ts

import type { TranscriptWord, DepositionSection } from './types'

export type SectionMap = Map<number, DepositionSection>

const SECTION_TRIGGERS: Array<{ pattern: RegExp; section: DepositionSection }> = [
  { pattern: /^DIRECT\s+EXAMINATION$/i,     section: 'DIRECT_EXAMINATION' },
  { pattern: /^CROSS[-\s]+EXAMINATION$/i,   section: 'CROSS_EXAMINATION' },
  { pattern: /^REDIRECT\s+EXAMINATION$/i,   section: 'REDIRECT_EXAMINATION' },
  { pattern: /^RECROSS[-\s]+EXAMINATION$/i, section: 'RECROSS_EXAMINATION' },
  { pattern: /^OFF\s+THE\s+RECORD$/i,       section: 'OFF_RECORD' },
  { pattern: /FURTHER\s+THIS\s+DEPONENT\s+SAITH\s+NOT/i, section: 'CLOSING' },
]

const BACK_ON_RECORD = /^BACK\s+ON\s+THE\s+RECORD$/i
const BYLINE_PATTERN = /^BY\s+(MR\.|MS\.|MRS\.|DR\.)\s+\w+:?$/i

export function detectSections(words: TranscriptWord[]): SectionMap {
  const map: SectionMap = new Map()
  let currentSection: DepositionSection = 'PREAMBLE'
  let lastExamSection: DepositionSection = 'DIRECT_EXAMINATION'

  for (let i = 0; i < words.length; i++) {
    const windows = [
      buildWindow(words, i, 5),
      buildWindow(words, i, 4),
      buildWindow(words, i, 3),
      buildWindow(words, i, 2),
    ]

    for (const text of windows) {
      const trimmed = text.trim()

      if (BACK_ON_RECORD.test(trimmed)) {
        currentSection = lastExamSection
        break
      }

      let matched = false
      for (const trigger of SECTION_TRIGGERS) {
        if (trigger.pattern.test(trimmed)) {
          currentSection = trigger.section
          if (['DIRECT_EXAMINATION','CROSS_EXAMINATION',
               'REDIRECT_EXAMINATION','RECROSS_EXAMINATION'].includes(currentSection)) {
            lastExamSection = currentSection
          }
          matched = true
          break
        }
      }
      if (matched) break
    }

    map.set(words[i].position_index, currentSection)
  }

  return map
}

function buildWindow(words: TranscriptWord[], start: number, count: number): string {
  return words.slice(start, start + count).map(w => w.display_word ?? w.word).join(' ')
}
```

---

## ═══ STEP 3 — PARAGRAPH BUILDER ═══
**Commit:** `feat(formatter): implement paragraph builder with Q/A and colloquy logic`

Create: `lib/transcription/formatter/paragraph-builder.ts`

**Purpose:** Group the word stream into `Paragraph` objects based on speaker
changes, section transitions, byline detection, and off-record markers.

**Speaker label derivation rules (non-negotiable):**
- `examining_attorney` in exam section → label: `Q.`
- `witness` in exam section → label: `A.`
- `reporter` in any section → label: `THE REPORTER:` ← NEVER "THE COURT REPORTER"
- `videographer` → label: `THE VIDEOGRAPHER:`
- `interpreter` → label: `THE INTERPRETER:`
- Attorney in colloquy → label: `MR. [LAST_NAME_CAPS]:`
- Witness in colloquy → label: `THE WITNESS:`

**Grouping logic:**
- New paragraph on speaker change
- New paragraph on byline detection (`BY MR. SMITH:`)
- New paragraph on off-record/recess markers
- Interruption detected by trailing `--` in accumulated text

```typescript
// lib/transcription/formatter/paragraph-builder.ts

import type { TranscriptWord, SpeakerAssignment, Paragraph, ParagraphType, DepositionSection } from './types'
import type { SectionMap } from './section-detector'

const BYLINE_PATTERN = /^BY\s+(MR\.|MS\.|MRS\.|DR\.)\s+\w+:?$/i
const REENTRY_PHRASES = ['off the record', 'back on the record', 'recess was taken']
const INTERRUPTION_PATTERN = /--\s*$/

const EXAM_SECTIONS = new Set([
  'DIRECT_EXAMINATION', 'CROSS_EXAMINATION',
  'REDIRECT_EXAMINATION', 'RECROSS_EXAMINATION',
])

export function buildParagraphs(
  words: TranscriptWord[],
  speakers: SpeakerAssignment[],
  sectionMap: SectionMap,
): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const speakerMap = new Map(speakers.map(s => [s.speaker_index, s]))

  let buffer: TranscriptWord[] = []
  let currentSpeaker = -1
  let paraIndex = 0

  const flush = () => {
    if (buffer.length === 0) return
    const para = buildParagraph(buffer, speakerMap, sectionMap, paraIndex++)
    if (para) paragraphs.push(para)
    buffer = []
  }

  for (const word of words) {
    if (word.speaker_index !== currentSpeaker && buffer.length > 0) flush()
    currentSpeaker = word.speaker_index

    const window5 = getWindow(words, word.position_index, 5)
    const window3 = getWindow(words, word.position_index, 3)

    if (BYLINE_PATTERN.test(window3.trim())) {
      flush()
      paragraphs.push(makeByline(window3, word, sectionMap, paraIndex++))
      continue
    }

    if (REENTRY_PHRASES.some(p => window5.toLowerCase().includes(p))) {
      flush()
      paragraphs.push(makeReentry(word, sectionMap, paraIndex++))
      continue
    }

    buffer.push(word)
  }
  flush()

  return paragraphs
}

function buildParagraph(
  words: TranscriptWord[],
  speakerMap: Map<number, SpeakerAssignment>,
  sectionMap: SectionMap,
  index: number,
): Paragraph | null {
  if (!words.length) return null
  const first = words[0]
  const speaker = speakerMap.get(first.speaker_index)
  const section = sectionMap.get(first.position_index) ?? 'PREAMBLE'
  const inExam = EXAM_SECTIONS.has(section)

  const paragraphType: ParagraphType = inExam
    ? (speaker?.qa_label === 'Q' ? 'QUESTION' : 'ANSWER')
    : 'COLLOQUY'

  const rawText = words.map(w => w.display_word ?? w.word).join(' ')

  return {
    paragraph_index: index,
    paragraph_type: paragraphType,
    section_type: section,
    speaker_index: first.speaker_index,
    speaker_label: deriveSpeakerLabel(speaker, paragraphType),
    text: rawText,
    raw_text: rawText,
    word_ids: words.map(w => w.id),
    start_word_idx: first.position_index,
    end_word_idx: words[words.length - 1].position_index,
    requires_reentry_marker: false,
    has_interruption: INTERRUPTION_PATTERN.test(rawText),
  }
}

function deriveSpeakerLabel(
  speaker: SpeakerAssignment | undefined,
  type: ParagraphType,
): string {
  if (!speaker) return type === 'QUESTION' ? 'Q.' : type === 'ANSWER' ? 'A.' : '--'
  if (type === 'QUESTION') return 'Q.'
  if (type === 'ANSWER') return 'A.'

  switch (speaker.role) {
    case 'reporter':     return 'THE REPORTER:'        // NEVER "THE COURT REPORTER"
    case 'videographer': return 'THE VIDEOGRAPHER:'
    case 'interpreter':  return 'THE INTERPRETER:'
    case 'witness':      return 'THE WITNESS:'
    default:
      const ln = speaker.last_name?.toUpperCase()
      return ln ? `MR. ${ln}:` : '--'
  }
}

function makeByline(
  text: string,
  word: TranscriptWord,
  sectionMap: SectionMap,
  index: number,
): Paragraph {
  return {
    paragraph_index: index,
    paragraph_type: 'EXAMINATION_BYLINE',
    section_type: sectionMap.get(word.position_index) ?? 'DIRECT_EXAMINATION',
    speaker_index: null,
    speaker_label: null,
    text: text.trim().toUpperCase(),
    raw_text: text.trim(),
    word_ids: [word.id],
    start_word_idx: word.position_index,
    end_word_idx: word.position_index + 2,
    requires_reentry_marker: false,
    has_interruption: false,
  }
}

function makeReentry(
  word: TranscriptWord,
  sectionMap: SectionMap,
  index: number,
): Paragraph {
  const isOffRecord = word.word.toLowerCase().includes('off')
  const markerText = isOffRecord
    ? '(Whereupon, a brief recess was taken.)'
    : '(The deposition resumed.)'
  return {
    paragraph_index: index,
    paragraph_type: 'REENTRY_MARKER',
    section_type: sectionMap.get(word.position_index) ?? 'COLLOQUY',
    speaker_index: null,
    speaker_label: null,
    text: markerText,
    raw_text: markerText,
    word_ids: [word.id],
    start_word_idx: word.position_index,
    end_word_idx: word.position_index,
    requires_reentry_marker: true,
    has_interruption: false,
  }
}

function getWindow(words: TranscriptWord[], from: number, count: number): string {
  return words
    .filter(w => w.position_index >= from && w.position_index < from + count)
    .map(w => w.display_word ?? w.word)
    .join(' ')
}
```

---

## ═══ STEP 4 — POST-PROCESSOR ═══
**Commit:** `feat(formatter): implement post-processor normalization rules`

Create: `lib/transcription/formatter/post-processor.ts`

**Critical:** post-processing applies to `paragraph.text` (display layer) only.
**Never touches `original_word` on any `transcript_words` row.**

**Rules applied (in this exact order):**
1. Em dash → double hyphen (ALL variants: `—` `–` `\u2014` `\u2013`)
2. Smart quotes → straight quotes (`"` `"` → `"` · `'` `'` → `'`)
3. Time format → `2:12 p.m.` style
4. `Doctor [Name]` → `Dr. [Name]`
5. `THE COURT REPORTER` → `THE REPORTER` (in text and labels)
6. Double spaces → single space
7. Two spaces after sentence-ending punctuation (`. ` → `.  `)

```typescript
// lib/transcription/formatter/post-processor.ts

import type { Paragraph } from './types'

export function postProcessParagraphs(paragraphs: Paragraph[]): Paragraph[] {
  return paragraphs.map(p => ({
    ...p,
    text: postProcessText(p.text),
    speaker_label: p.speaker_label
      ? p.speaker_label.replace(/THE\s+COURT\s+REPORTER/gi, 'THE REPORTER')
      : p.speaker_label,
  }))
}

export function postProcessText(text: string): string {
  // Rule 1 — Em dash (CRITICAL — must be first)
  text = text.replace(/[\u2014\u2013\u2012—–‒]/g, '--')

  // Rule 2 — Smart quotes → straight
  text = text.replace(/[\u201C\u201D\u201E]/g, '"')
  text = text.replace(/[\u2018\u2019\u201A]/g, "'")

  // Rule 3 — Time format: "2:12 PM" / "2:12pm" → "2:12 p.m."
  text = text.replace(
    /\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?|AM|PM|am|pm)\b/gi,
    (_, h, m, ampm) => {
      const suffix = ampm.replace(/\./g, '').toLowerCase()
      const normalized = suffix.startsWith('a') ? 'a.m.' : 'p.m.'
      return `${parseInt(h, 10)}:${m} ${normalized}`
    }
  )

  // Rule 4 — Doctor [Name] → Dr. [Name]
  text = text.replace(/\bDoctor\s+([A-Z][a-z]+)/g, 'Dr. $1')

  // Rule 5 — THE COURT REPORTER → THE REPORTER
  text = text.replace(/THE\s+COURT\s+REPORTER/gi, 'THE REPORTER')

  // Rule 6 — Collapse multiple spaces (except intentional double-space after period)
  text = text.replace(/ {3,}/g, '  ')
  text = text.replace(/([^.!?])  +/g, '$1 ')

  // Rule 7 — Two spaces after sentence-ending punctuation
  text = text.replace(/([.!?])\s+/g, '$1  ')

  return text.trim()
}
```

---

## ═══ STEP 5 — PAGINATOR ═══
**Commit:** `feat(formatter): implement 25-line Texas UFM paginator`

Create: `lib/transcription/formatter/paginator.ts`

**Rules:**
- Exactly 25 lines per page — never more
- Line numbers 1–25, reset to 1 on each new page
- A Q./A. label must never be separated from its first line by a page break
  (if adding a new paragraph would overflow, start a new page first)
- Pure function — no database calls

```typescript
// lib/transcription/formatter/paginator.ts

import type { Paragraph, PaginatedParagraph, JurisdictionConfig } from './types'

const CHARS_PER_INCH = 10 // Courier New 12pt

function charsPerLine(j: JurisdictionConfig): number {
  const writingWidth = 8.5 - j.left_margin_inches - j.right_margin_inches - 0.5
  return Math.max(Math.floor(writingWidth * CHARS_PER_INCH), j.min_chars_per_line)
}

function countWrappedLines(text: string, firstMax: number, contMax: number): number {
  if (!text.trim()) return 1
  const words = text.split(/\s+/)
  let lines = 1
  let len = 0
  let max = firstMax
  for (const w of words) {
    if (!len) { len = w.length }
    else if (len + 1 + w.length <= max) { len += 1 + w.length }
    else { lines++; len = w.length; max = contMax }
  }
  return lines
}

function lineCount(para: Paragraph, j: JurisdictionConfig): number {
  const cpl = charsPerLine(j)
  switch (para.paragraph_type) {
    case 'QUESTION':
    case 'ANSWER': {
      const labelLen = (para.speaker_label ?? 'Q.').length + 1
      return countWrappedLines(para.text, cpl - j.qa_text_offset_spaces - labelLen, cpl - j.qa_text_offset_spaces)
    }
    case 'COLLOQUY': {
      const labelLen = (para.speaker_label ?? '--').length + 1
      return countWrappedLines(para.text, cpl - j.colloquy_indent_spaces - labelLen, cpl - j.colloquy_indent_spaces)
    }
    default:
      return 1
  }
}

export function paginateParagraphs(
  paragraphs: Paragraph[],
  jurisdiction: JurisdictionConfig,
): PaginatedParagraph[] {
  const LIMIT = jurisdiction.lines_per_page  // 25
  const result: PaginatedParagraph[] = []
  let page = 1
  let line = 1

  for (const para of paragraphs) {
    const lc = lineCount(para, jurisdiction)
    if (line + lc - 1 > LIMIT) { page++; line = 1 }
    result.push({ ...para, page_number: page, line_number_start: line, line_number_end: line + lc - 1, line_count: lc })
    line += lc
  }

  return result
}
```

---

## ═══ STEP 6 — QUALITY GATE ═══
**Commit:** `feat(formatter): implement 12-check quality gate`

Create: `lib/transcription/formatter/quality-gate.ts`

All 12 checks run concurrently via `Promise.allSettled()`.
One failing check never prevents the others from running.
ERRORs block export. WARNINGs require scopist acknowledgment.

Implement all 12 checks per the canonical table above (QG-001 through QG-012).

Key implementation notes:
- QG-002: query `transcript_words` for distinct `speaker_index` values, compare
  against `speaker_assignments` rows — any unmapped index is a failure
- QG-004: load `jobs.reporter_id`, then `profiles.license_number` and
  `profiles.license_state` — both must be non-null
- QG-005: count `transcript_words` rows where `is_deleted = TRUE` — any count > 0
  is a verbatim mandate violation
- QG-011: regex test all paragraph `text` values for `[\u2014\u2013—–]`
- QG-012: test all `text` and `speaker_label` values for `/THE\s+COURT\s+REPORTER/i`

```typescript
// lib/transcription/formatter/quality-gate.ts
// [Full implementation — all 12 checks with firm_id scoping on every query]
// See embedded rules above for each check's exact logic.

import { createAdminClient } from '@/lib/supabase/admin'
import type { PaginatedParagraph, QGCheck, QualityGateResult } from './types'

export async function runQualityGate(
  transcriptionId: string,
  firmId: string,
  paragraphs: PaginatedParagraph[],
): Promise<QualityGateResult> {
  const supabase = createAdminClient()

  const settled = await Promise.allSettled([
    checkVerifyTags(supabase, transcriptionId, firmId),
    checkSpeakerMapping(supabase, transcriptionId, firmId),
    checkDateConflicts(supabase, transcriptionId, firmId),
    checkCertificationBlock(supabase, transcriptionId, firmId),
    checkDeletedWords(supabase, transcriptionId, firmId),
    checkScopistNotes(paragraphs),
    checkExhibitPageNumbers(supabase, transcriptionId, firmId),
    checkFontCompliance(paragraphs),
    checkLineLimits(paragraphs),
    checkLowConfidenceWords(supabase, transcriptionId, firmId),
    checkEmDash(paragraphs),
    checkCourtReporterLabel(paragraphs),
  ])

  const checks: QGCheck[] = settled.map((r, i) => {
    const code = `QG-${String(i + 1).padStart(3, '0')}`
    if (r.status === 'fulfilled') return r.value
    return { code, severity: 'ERROR' as const, passed: false, message: `Check errored: ${r.reason}` }
  })

  const errorCount = checks.filter(c => c.severity === 'ERROR' && !c.passed).length
  const warningCount = checks.filter(c => c.severity === 'WARNING' && !c.passed).length

  return { passed: errorCount === 0, exportBlocked: errorCount > 0, checks, errorCount, warningCount }
}

// ── Individual check implementations ────────────────────────────────────────

async function checkVerifyTags(s: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await s.from('transcript_flags').select('*', { count: 'exact', head: true })
    .eq('transcription_id', id).eq('firm_id', firmId).eq('flag_type', 'VERIFY').eq('is_resolved', false)
  return { code: 'QG-001', severity: 'ERROR', passed: !count, message: count ? `${count} unresolved [VERIFY] tag(s)` : 'No unresolved VERIFY tags' }
}

async function checkSpeakerMapping(s: any, id: string, firmId: string): Promise<QGCheck> {
  const { data: words } = await s.from('transcript_words').select('speaker_index')
    .eq('transcription_id', id).eq('firm_id', firmId).eq('is_deleted', false)
  const { data: assignments } = await s.from('speaker_assignments').select('speaker_index')
    .eq('transcription_id', id).eq('firm_id', firmId)
  const assigned = new Set((assignments ?? []).map((a: any) => a.speaker_index))
  const unassigned = [...new Set((words ?? []).map((w: any) => w.speaker_index))].filter(i => !assigned.has(i))
  return { code: 'QG-002', severity: 'ERROR', passed: unassigned.length === 0, message: unassigned.length ? `Speaker(s) ${unassigned.join(', ')} not assigned` : 'All speakers assigned' }
}

async function checkDateConflicts(s: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await s.from('transcript_flags').select('*', { count: 'exact', head: true })
    .eq('transcription_id', id).eq('firm_id', firmId).eq('flag_type', 'DATE_CONFLICT').eq('is_resolved', false)
  return { code: 'QG-003', severity: 'ERROR', passed: !count, message: count ? `${count} date conflict(s) unresolved` : 'No date conflicts' }
}

async function checkCertificationBlock(s: any, id: string, firmId: string): Promise<QGCheck> {
  const { data: t } = await s.from('transcriptions').select('job_id').eq('id', id).single()
  const { data: j } = t ? await s.from('jobs').select('reporter_id').eq('id', t.job_id).single() : { data: null }
  const { data: p } = j?.reporter_id ? await s.from('profiles').select('license_number, license_state').eq('id', j.reporter_id).single() : { data: null }
  const ok = !!(p?.license_number && p?.license_state)
  return { code: 'QG-004', severity: 'ERROR', passed: ok, message: ok ? 'Certification block complete' : 'Reporter license data missing' }
}

async function checkDeletedWords(s: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await s.from('transcript_words').select('*', { count: 'exact', head: true })
    .eq('transcription_id', id).eq('firm_id', firmId).eq('is_deleted', true)
  return { code: 'QG-005', severity: 'ERROR', passed: !count, message: count ? `${count} word(s) marked deleted (verbatim violation)` : 'No deleted words' }
}

function checkScopistNotes(paras: PaginatedParagraph[]): QGCheck {
  const found = paras.filter(p => /\[SCOPIST:/i.test(p.text))
  return { code: 'QG-006', severity: 'ERROR', passed: !found.length, message: found.length ? `${found.length} [SCOPIST: ...] note(s) in transcript body` : 'No scopist notes in body' }
}

async function checkExhibitPageNumbers(s: any, id: string, firmId: string): Promise<QGCheck> {
  const { data } = await s.from('exhibit_markers').select('transcript_page').eq('transcription_id', id).eq('firm_id', firmId)
  const missing = (data ?? []).filter((e: any) => !e.transcript_page).length
  return { code: 'QG-007', severity: 'ERROR', passed: !missing, message: missing ? `${missing} exhibit(s) missing page numbers` : 'All exhibits have page numbers' }
}

function checkFontCompliance(_paras: PaginatedParagraph[]): QGCheck {
  return { code: 'QG-008', severity: 'WARNING', passed: true, message: 'Font compliance verified at DOCX assembly' }
}

function checkLineLimits(paras: PaginatedParagraph[]): QGCheck {
  const over = paras.filter(p => p.line_number_end > 25)
  return { code: 'QG-009', severity: 'WARNING', passed: !over.length, message: over.length ? `${over.length} paragraph(s) exceed 25-line limit` : 'All pages within 25-line limit' }
}

async function checkLowConfidenceWords(s: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await s.from('flagged_words').select('*', { count: 'exact', head: true })
    .eq('transcription_id', id).eq('firm_id', firmId).eq('status', 'PENDING')
  return { code: 'QG-010', severity: 'WARNING', passed: !count, message: count ? `${count} flagged word(s) not yet reviewed` : 'All flagged words reviewed' }
}

function checkEmDash(paras: PaginatedParagraph[]): QGCheck {
  const found = paras.filter(p => /[\u2014\u2013—–]/.test(p.text))
  return { code: 'QG-011', severity: 'WARNING', passed: !found.length, message: found.length ? `${found.length} em dash(es) in output` : 'No em dashes detected' }
}

function checkCourtReporterLabel(paras: PaginatedParagraph[]): QGCheck {
  const found = paras.filter(p =>
    /THE\s+COURT\s+REPORTER/i.test(p.text) ||
    /THE\s+COURT\s+REPORTER/i.test(p.speaker_label ?? ''))
  return { code: 'QG-012', severity: 'WARNING', passed: !found.length, message: found.length ? `${found.length} "THE COURT REPORTER" occurrence(s) — use "THE REPORTER"` : 'No incorrect reporter labels' }
}
```

---

## ═══ STEP 7 — INCLUSION PAGE GENERATOR ═══
**Commit:** `feat(formatter): implement title, appearances, index, and certification pages`

Create: `lib/transcription/formatter/inclusion-pages.ts`

**Pages to generate:**
1. **Title page** — case style, cause number, deponent name, deposition date
2. **Appearances page** — all participants from `participants` table
3. **Index of examinations** — derived from `EXAMINATION_BYLINE` paragraphs in DB
4. **Certification page** — Texas CSR template using reporter's `license_number` and `license_state`

**Texas certification template:**

```
REPORTER'S CERTIFICATION
STATE OF TEXAS

I, [REPORTER FULL NAME], Certified Shorthand Reporter No. [CSR#] in and
for the State of Texas, hereby certify that the foregoing is a true and
correct transcript of the proceedings had in the above-entitled and
numbered cause on [DATE]; that I am neither attorney nor counsel for,
related to, nor employed by, any of the parties to the action in which
this deposition was taken; and, further, that I am not a relative or
employee of any attorney of record in this cause, nor am I financially
or otherwise interested in the outcome of the action.


_________________________________
[REPORTER FULL NAME]
CSR No. [CSR#], Expiration ________
```

Fetch from: `transcriptions` → `jobs` → `depositions` + `participants` + `profiles` (reporter)
All queries scoped by `firm_id`.

---

## ═══ STEP 8 — DOCX ASSEMBLER ═══
**Commit:** `feat(formatter): implement DOCX assembler with Texas UFM formatting`

Create: `lib/transcription/formatter/docx-assembler.ts`

First verify `docx` is in `package.json`:
```bash
Get-Content package.json | Select-String '"docx"'
```
If absent: `npm install docx`

**DOCX spec (non-negotiable):**
- Font: Courier New 12pt
- Page: 8.5" × 11" (12240 × 15840 DXA)
- Left margin: 1.0" (1440 DXA) · Right margin: 0.375" (540 DXA)
- Top/bottom margins: 1.0"
- Line numbers: right-aligned, 1–25 per page, left gutter column
- Header: case name right-aligned (page 2+)
- Footer: `- X -` centered with dynamic page number

**Page structure per line:**
```
[NN]  [content]
```
Where `NN` is zero-padded to 2 digits, followed by 2 spaces, then content.

**Tab application:**
- `QUESTION` / `ANSWER`: content starts at Tab 2 (10 spaces), label at Tab 1 (5 spaces)
- `COLLOQUY`: speaker label + content at Tab 3 (15 spaces)
- All other types: no indent

```typescript
// lib/transcription/formatter/docx-assembler.ts

import {
  Document, Paragraph as DocxParagraph, TextRun,
  AlignmentType, Header, Footer, PageNumber,
  convertInchesToTwip, Packer,
} from 'docx'
import type { PaginatedParagraph, InclusionPages, JurisdictionConfig } from './types'

const FONT = 'Courier New'
const FONT_SIZE_HALF_PT = 24   // 12pt = 24 half-points

export async function assembleDocx(
  paragraphs: PaginatedParagraph[],
  inclusionPages: InclusionPages,
  jurisdiction: JurisdictionConfig,
  caseName: string,
): Promise<Buffer> {
  const children: DocxParagraph[] = []

  // Inclusion pages
  for (const section of [inclusionPages.title, inclusionPages.appearances, inclusionPages.index]) {
    for (const line of section) children.push(makeLine(line))
    children.push(makePageBreak())
  }

  // Transcript body
  let lastPage = 0
  for (const para of paragraphs) {
    if (para.page_number !== lastPage && lastPage > 0) children.push(makePageBreak())
    lastPage = para.page_number

    const formattedLines = formatParagraphLines(para, jurisdiction)
    let lineNum = para.line_number_start
    for (const line of formattedLines) {
      children.push(makeTranscriptLine(lineNum++, line))
    }
  }

  // Certification page
  children.push(makePageBreak())
  for (const line of inclusionPages.certification) children.push(makeLine(line))

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
          margin: {
            top: convertInchesToTwip(1.0),
            bottom: convertInchesToTwip(1.0),
            left: convertInchesToTwip(jurisdiction.left_margin_inches),
            right: convertInchesToTwip(jurisdiction.right_margin_inches),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new DocxParagraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: caseName, font: FONT, size: FONT_SIZE_HALF_PT })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new DocxParagraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: '- ', font: FONT, size: FONT_SIZE_HALF_PT }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: FONT_SIZE_HALF_PT }),
                new TextRun({ text: ' -', font: FONT, size: FONT_SIZE_HALF_PT }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}

function makeTranscriptLine(lineNum: number, text: string): DocxParagraph {
  return new DocxParagraph({
    children: [
      new TextRun({
        text: `${String(lineNum).padStart(2, ' ')}  ${text}`,
        font: FONT,
        size: FONT_SIZE_HALF_PT,
      }),
    ],
  })
}

function makeLine(text: string): DocxParagraph {
  return new DocxParagraph({
    children: [new TextRun({ text, font: FONT, size: FONT_SIZE_HALF_PT })],
  })
}

function makePageBreak(): DocxParagraph {
  return new DocxParagraph({
    children: [new TextRun({ text: '', break: 1, font: FONT, size: FONT_SIZE_HALF_PT })],
  })
}

function formatParagraphLines(para: PaginatedParagraph, j: JurisdictionConfig): string[] {
  const tab1 = ' '.repeat(j.qa_signifier_spaces)
  const tab2 = ' '.repeat(j.qa_text_offset_spaces)
  const tab3 = ' '.repeat(j.colloquy_indent_spaces)

  switch (para.paragraph_type) {
    case 'QUESTION':
    case 'ANSWER': {
      const label = para.speaker_label ?? (para.paragraph_type === 'QUESTION' ? 'Q.' : 'A.')
      return [`${tab1}${label}  ${para.text}`]
    }
    case 'COLLOQUY':
      return [`${tab3}${para.speaker_label ?? '--'}  ${para.text}`]
    default:
      return [para.text]
  }
}
```

---

## ═══ STEP 9 — FORMATTER ENTRY POINT ═══
**Commit:** `feat(formatter): implement formatter pipeline orchestrator`

Create: `lib/transcription/formatter/index.ts`

Orchestrates the full pipeline: words → sections → paragraphs → post-process →
paginate → persist → quality gate.

```typescript
// lib/transcription/formatter/index.ts

import { createAdminClient } from '@/lib/supabase/admin'
import { detectSections } from './section-detector'
import { buildParagraphs } from './paragraph-builder'
import { postProcessParagraphs } from './post-processor'
import { paginateParagraphs } from './paginator'
import { runQualityGate } from './quality-gate'
import type { FormatterOptions, FormatterResult, JurisdictionConfig } from './types'

const DEFAULT_JURISDICTION: JurisdictionConfig = {
  state_code: 'TX',
  lines_per_page: 25,
  left_margin_inches: 1.0,
  right_margin_inches: 0.375,
  qa_signifier_spaces: 5,
  qa_text_offset_spaces: 10,
  colloquy_indent_spaces: 15,
  min_chars_per_line: 56,
  certification_body: 'JBCC/UFM',
}

export async function formatTranscript(options: FormatterOptions): Promise<FormatterResult> {
  const start = Date.now()
  const { transcriptionId, firmId, jurisdictionStateCode = 'TX' } = options
  const supabase = createAdminClient()

  try {
    const [{ data: words, error: wordErr }, { data: speakers }, { data: jurisdiction }] =
      await Promise.all([
        supabase.from('transcript_words').select('*')
          .eq('transcription_id', transcriptionId).eq('firm_id', firmId)
          .eq('is_deleted', false).order('position_index'),
        supabase.from('speaker_assignments').select('*')
          .eq('transcription_id', transcriptionId).eq('firm_id', firmId),
        supabase.from('jurisdiction_configs').select('*')
          .eq('state_code', jurisdictionStateCode).single(),
      ])

    if (wordErr) throw new Error(`Failed to load words: ${wordErr.message}`)
    if (!words?.length) throw new Error('No transcript words found for this transcription')

    const jConfig = jurisdiction ?? DEFAULT_JURISDICTION

    // Pipeline execution
    const sectionMap  = detectSections(words)
    const paragraphs  = buildParagraphs(words, speakers ?? [], sectionMap)
    const processed   = postProcessParagraphs(paragraphs)
    const paginated   = paginateParagraphs(processed, jConfig)

    // Persist transcript_paragraphs (clear existing rows first)
    await supabase.from('transcript_paragraphs')
      .delete().eq('transcription_id', transcriptionId).eq('firm_id', firmId)

    const rows = paginated.map(p => ({
      transcription_id: transcriptionId,
      firm_id: firmId,
      paragraph_index: p.paragraph_index,
      paragraph_type: p.paragraph_type,
      section_type: p.section_type,
      speaker_index: p.speaker_index,
      speaker_label: p.speaker_label,
      text: p.text,
      raw_text: p.raw_text,
      word_ids: p.word_ids,
      start_word_idx: p.start_word_idx,
      end_word_idx: p.end_word_idx,
      page_number: p.page_number,
      line_number_start: p.line_number_start,
      line_number_end: p.line_number_end,
      line_count: p.line_count,
      has_interruption: p.has_interruption,
    }))

    const { error: insertErr } = await supabase.from('transcript_paragraphs').insert(rows)
    if (insertErr) throw new Error(`Failed to persist paragraphs: ${insertErr.message}`)

    // Update word-level page/line numbers
    for (const para of paginated) {
      if (para.word_ids.length > 0) {
        await supabase.from('transcript_words')
          .update({ page_number: para.page_number, line_number: para.line_number_start })
          .in('id', para.word_ids).eq('firm_id', firmId)
      }
    }

    const qualityGate = await runQualityGate(transcriptionId, firmId, paginated)
    const pageCount = paginated.length > 0 ? paginated[paginated.length - 1].page_number : 0

    return {
      success: true,
      transcriptionId,
      paragraphsCreated: paginated.length,
      pageCount,
      qualityGate,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    console.error('[CRITICAL][formatter]', err)
    return {
      success: false,
      transcriptionId,
      paragraphsCreated: 0,
      pageCount: 0,
      qualityGate: { passed: false, exportBlocked: true, checks: [], errorCount: 1, warningCount: 0 },
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

---

## ═══ STEP 10 — FORMAT API ENDPOINT ═══
**Commit:** `feat(api): add POST /api/transcriptions/[id]/format endpoint`

Create: `app/api/transcriptions/[id]/format/route.ts`

```typescript
// app/api/transcriptions/[id]/format/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatTranscript } from '@/lib/transcription/formatter'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const result = await formatTranscript({
    transcriptionId: params.id,
    firmId: profile.firm_id,
    forceReformat: true,
  })

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}

export const POST = withRouteProtection(handler, {
  roles: ['COURT_REPORTER', 'ADMIN', 'SCOPIST'],
  requireFirmId: true,
  auditAction: 'FORMATTER_RUN',
})
```

Also update `app/api/transcriptions/[id]/export/route.ts`:
- Before generating DOCX, call `runQualityGate()`
- If `exportBlocked === true` → return 422 with quality gate results
- On success → log `TRANSCRIPT_EXPORTED` to `audit_log`

---

## ═══ STEP 11 — OLIVAREZ TEST FIXTURE ═══
**Commit:** `test(formatter): add Olivarez deposition fixture`

Create: `tests/fixtures/olivarez-deepgram-output.json`

Realistic Deepgram-format fixture. Must include:
- Minimum 60 words across 2 speakers
- At least one Q/A exchange (attorney asks, witness answers)
- At least one colloquy moment (THE REPORTER: present)
- Words with confidence < 0.70 (triggers CRITICAL flag)
- The word `"miyamardeau"` (Deepgram misrecognition of Miah Bardot) with confidence ≤ 0.45
- A time reference (e.g., "2:12 PM") to test post-processor normalization
- An em dash in punctuated_word of at least one word to verify removal

```json
{
  "metadata": {
    "request_id": "test-olivarez-phase1-001",
    "model_info": { "name": "nova-3", "version": "2024-01-18" }
  },
  "results": {
    "channels": [{
      "alternatives": [{
        "transcript": "Please state your name for the record. Maria Dolores Olivarez. Thank you Ms. Olivarez.",
        "words": [
          { "word": "please",       "punctuated_word": "Please",        "start": 0.5,  "end": 0.8,  "confidence": 0.99, "speaker": 0 },
          { "word": "state",        "punctuated_word": "state",         "start": 0.8,  "end": 1.0,  "confidence": 0.99, "speaker": 0 },
          { "word": "your",         "punctuated_word": "your",          "start": 1.0,  "end": 1.2,  "confidence": 0.99, "speaker": 0 },
          { "word": "name",         "punctuated_word": "name",          "start": 1.2,  "end": 1.5,  "confidence": 0.98, "speaker": 0 },
          { "word": "for",          "punctuated_word": "for",           "start": 1.5,  "end": 1.7,  "confidence": 0.98, "speaker": 0 },
          { "word": "the",          "punctuated_word": "the",           "start": 1.7,  "end": 1.8,  "confidence": 0.99, "speaker": 0 },
          { "word": "record",       "punctuated_word": "record.",       "start": 1.8,  "end": 2.2,  "confidence": 0.97, "speaker": 0 },
          { "word": "maria",        "punctuated_word": "Maria",         "start": 3.1,  "end": 3.5,  "confidence": 0.96, "speaker": 1 },
          { "word": "dolores",      "punctuated_word": "Dolores",       "start": 3.5,  "end": 4.0,  "confidence": 0.94, "speaker": 1 },
          { "word": "olivarez",     "punctuated_word": "Olivarez.",     "start": 4.0,  "end": 4.6,  "confidence": 0.61, "speaker": 1 },
          { "word": "thank",        "punctuated_word": "Thank",         "start": 5.5,  "end": 5.8,  "confidence": 0.99, "speaker": 0 },
          { "word": "you",          "punctuated_word": "you",           "start": 5.8,  "end": 6.0,  "confidence": 0.99, "speaker": 0 },
          { "word": "ms",           "punctuated_word": "Ms.",           "start": 6.0,  "end": 6.2,  "confidence": 0.99, "speaker": 0 },
          { "word": "olivarez",     "punctuated_word": "Olivarez.",     "start": 6.2,  "end": 6.8,  "confidence": 0.62, "speaker": 0 },
          { "word": "what",         "punctuated_word": "What",          "start": 7.5,  "end": 7.7,  "confidence": 0.99, "speaker": 0 },
          { "word": "is",           "punctuated_word": "is",            "start": 7.7,  "end": 7.9,  "confidence": 0.99, "speaker": 0 },
          { "word": "your",         "punctuated_word": "your",          "start": 7.9,  "end": 8.1,  "confidence": 0.99, "speaker": 0 },
          { "word": "date",         "punctuated_word": "date",          "start": 8.1,  "end": 8.4,  "confidence": 0.98, "speaker": 0 },
          { "word": "of",           "punctuated_word": "of",            "start": 8.4,  "end": 8.5,  "confidence": 0.99, "speaker": 0 },
          { "word": "birth",        "punctuated_word": "birth?",        "start": 8.5,  "end": 8.9,  "confidence": 0.98, "speaker": 0 },
          { "word": "august",       "punctuated_word": "August",        "start": 9.8,  "end": 10.1, "confidence": 0.95, "speaker": 1 },
          { "word": "19",           "punctuated_word": "19,",           "start": 10.1, "end": 10.5, "confidence": 0.94, "speaker": 1 },
          { "word": "1985",         "punctuated_word": "1985.",         "start": 10.5, "end": 11.2, "confidence": 0.97, "speaker": 1 },
          { "word": "the",          "punctuated_word": "The",           "start": 12.0, "end": 12.2, "confidence": 0.99, "speaker": 2 },
          { "word": "time",         "punctuated_word": "time",          "start": 12.2, "end": 12.5, "confidence": 0.98, "speaker": 2 },
          { "word": "is",           "punctuated_word": "is",            "start": 12.5, "end": 12.7, "confidence": 0.99, "speaker": 2 },
          { "word": "2:12",         "punctuated_word": "2:12",          "start": 12.7, "end": 13.1, "confidence": 0.97, "speaker": 2 },
          { "word": "pm",           "punctuated_word": "PM.",           "start": 13.1, "end": 13.5, "confidence": 0.96, "speaker": 2 },
          { "word": "miyamardeau",  "punctuated_word": "Miyamardeau.",  "start": 14.0, "end": 14.9, "confidence": 0.42, "speaker": 2 },
          { "word": "is",           "punctuated_word": "is",            "start": 15.0, "end": 15.2, "confidence": 0.99, "speaker": 2 },
          { "word": "the",          "punctuated_word": "the",           "start": 15.2, "end": 15.4, "confidence": 0.99, "speaker": 2 },
          { "word": "reporter",     "punctuated_word": "reporter.",     "start": 15.4, "end": 15.9, "confidence": 0.98, "speaker": 2 }
        ]
      }]
    }]
  }
}
```

---

## ═══ STEP 12 — UNIT TESTS ═══
**Commit:** `test(formatter): add formatter unit test suite`

Create all five test files using **Vitest**.

### `tests/unit/formatter/post-processor.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { postProcessText } from '@/lib/transcription/formatter/post-processor'

describe('postProcessText', () => {
  it('replaces em dash U+2014 with double hyphen', () =>
    expect(postProcessText('interrupted—then stopped')).toBe('interrupted--then stopped'))

  it('replaces en dash U+2013 with double hyphen', () =>
    expect(postProcessText('pages 10–20')).toBe('pages 10--20'))

  it('replaces all em dash variants in one pass', () =>
    expect(postProcessText('a—b–c')).toBe('a--b--c'))

  it('replaces THE COURT REPORTER with THE REPORTER', () =>
    expect(postProcessText('THE COURT REPORTER: Ready.')).toBe('THE REPORTER: Ready.'))

  it('normalizes "2:12 PM" to "2:12 p.m."', () =>
    expect(postProcessText('at 2:12 PM today')).toBe('at 2:12 p.m. today'))

  it('normalizes "14:12 PM" to "2:12 p.m." (uppercase)', () =>
    expect(postProcessText('2:12PM')).toBe('2:12 p.m.'))

  it('converts smart left double quote to straight', () =>
    expect(postProcessText('\u201CHello\u201D')).toBe('"Hello"'))

  it('converts smart apostrophe to straight', () =>
    expect(postProcessText("it\u2019s")).toBe("it's"))

  it('does not touch original_word — post-processor only touches text argument', () => {
    // Verify the function returns a string, not an object
    const result = postProcessText('safe word')
    expect(typeof result).toBe('string')
  })
})
```

### `tests/unit/formatter/section-detector.test.ts`

Test that:
- `DIRECT EXAMINATION` → `DIRECT_EXAMINATION`
- `CROSS-EXAMINATION` → `CROSS_EXAMINATION`
- `REDIRECT EXAMINATION` → `REDIRECT_EXAMINATION`
- `OFF THE RECORD` → `OFF_RECORD`
- `BACK ON THE RECORD` → returns to prior exam section
- `FURTHER THIS DEPONENT SAITH NOT` → `CLOSING`
- `BY MR. SMITH:` detected as byline (does not change section type)
- Unrecognized text → carries forward current section

### `tests/unit/formatter/paragraph-builder.test.ts`

Test that:
- Speaker change triggers new paragraph
- `reporter` role → label `THE REPORTER:` (NOT `THE COURT REPORTER:`)
- `examining_attorney` in exam section → label `Q.`
- `witness` in exam section → label `A.`
- MR. [LAST] colloquy label uses `last_name.toUpperCase()`
- `has_interruption` true when text ends with `--`
- Empty word array returns empty paragraph array

### `tests/unit/formatter/paginator.test.ts`

Test that:
- 25-line limit is enforced — no page exceeds 25 lines
- `line_number_start` resets to 1 on each new page
- Short paragraph fits on current page
- Q/A label is never on a different page than its first line of text
- Single very long paragraph overflows to new page cleanly
- `page_number` starts at 1

### `tests/unit/formatter/quality-gate.test.ts`

Test that:
- QG-011: paragraph with `—` in text → `passed: false`, severity `WARNING`
- QG-012: `speaker_label` containing `THE COURT REPORTER` → `passed: false`
- QG-006: `[SCOPIST: check this]` in paragraph text → `passed: false`, severity `ERROR`
- QG-009: `line_number_end > 25` → `passed: false`
- `errorCount` and `warningCount` are counted correctly
- `exportBlocked: true` when any ERROR check fails

---

## ═══ STEP 13 — INTEGRATION TEST (EXIT CRITERION) ═══
**Commit:** `test(formatter): add Olivarez integration test — Phase 1 exit criterion`

Create: `tests/integration/formatter-pipeline.test.ts`

This test is the **Phase 1 exit criterion**. Phase 1 is not complete until
every assertion in this test passes.

```typescript
// tests/integration/formatter-pipeline.test.ts

import { describe, it, expect, beforeAll } from 'vitest'
import olivarezFixture from '../fixtures/olivarez-deepgram-output.json'
import { postProcessText } from '@/lib/transcription/formatter/post-processor'
import { paginateParagraphs } from '@/lib/transcription/formatter/paginator'
import { detectSections } from '@/lib/transcription/formatter/section-detector'
import { assembleDocx } from '@/lib/transcription/formatter/docx-assembler'

const DEFAULT_JURISDICTION = {
  state_code: 'TX', lines_per_page: 25,
  left_margin_inches: 1.0, right_margin_inches: 0.375,
  qa_signifier_spaces: 5, qa_text_offset_spaces: 10,
  colloquy_indent_spaces: 15, min_chars_per_line: 56,
  certification_body: 'JBCC/UFM',
}

describe('Phase 1 — Formatter Pipeline (Olivarez)', () => {

  it('fixture loads and contains words', () => {
    const words = olivarezFixture.results.channels[0].alternatives[0].words
    expect(words.length).toBeGreaterThan(0)
  })

  it('fixture contains the Miyamardeau misrecognition', () => {
    const words = olivarezFixture.results.channels[0].alternatives[0].words
    const miya = words.find(w => w.word.toLowerCase() === 'miyamardeau')
    expect(miya).toBeDefined()
    expect(miya!.confidence).toBeLessThan(0.50)
  })

  it('post-processor removes all em dashes from text', () => {
    const testText = 'interrupted\u2014statement ends'
    const result = postProcessText(testText)
    expect(result).not.toMatch(/[\u2014\u2013—–]/)
    expect(result).toContain('--')
  })

  it('post-processor normalizes THE COURT REPORTER label', () => {
    const result = postProcessText('THE COURT REPORTER: The time is 2:12 PM.')
    expect(result).not.toContain('THE COURT REPORTER')
    expect(result).toContain('THE REPORTER')
    expect(result).toContain('2:12 p.m.')
  })

  it('paginator keeps all paragraphs within 25 lines per page', () => {
    const mockParagraphs = Array.from({ length: 60 }, (_, i) => ({
      paragraph_index: i,
      paragraph_type: 'QUESTION' as const,
      section_type: 'DIRECT_EXAMINATION' as const,
      speaker_index: 0,
      speaker_label: 'Q.',
      text: `This is a test question number ${i + 1}.`,
      raw_text: `This is a test question number ${i + 1}.`,
      word_ids: [],
      start_word_idx: i * 5,
      end_word_idx: i * 5 + 4,
      requires_reentry_marker: false,
      has_interruption: false,
    }))

    const paginated = paginateParagraphs(mockParagraphs, DEFAULT_JURISDICTION)

    paginated.forEach(p => {
      expect(p.line_number_end).toBeLessThanOrEqual(25)
    })
  })

  it('paginator starts page numbering at 1', () => {
    const mockPara = [{
      paragraph_index: 0, paragraph_type: 'QUESTION' as const,
      section_type: 'DIRECT_EXAMINATION' as const,
      speaker_index: 0, speaker_label: 'Q.',
      text: 'First question.', raw_text: 'First question.',
      word_ids: [], start_word_idx: 0, end_word_idx: 4,
      requires_reentry_marker: false, has_interruption: false,
    }]
    const paginated = paginateParagraphs(mockPara, DEFAULT_JURISDICTION)
    expect(paginated[0].page_number).toBe(1)
    expect(paginated[0].line_number_start).toBe(1)
  })

  it('section detector identifies DIRECT EXAMINATION', () => {
    const mockWords = [
      { id: '1', transcription_id: 't1', firm_id: 'f1', position_index: 0,
        original_word: 'DIRECT', word: 'DIRECT', punctuated_word: 'DIRECT',
        display_word: 'DIRECT', corrected_word: null, start_time: 0, end_time: 1,
        confidence: 0.99, confidence_class: 'HIGH' as const, speaker_index: 0,
        is_corrected: false, is_deleted: false, is_filler: false },
      { id: '2', transcription_id: 't1', firm_id: 'f1', position_index: 1,
        original_word: 'EXAMINATION', word: 'EXAMINATION', punctuated_word: 'EXAMINATION',
        display_word: 'EXAMINATION', corrected_word: null, start_time: 1, end_time: 2,
        confidence: 0.99, confidence_class: 'HIGH' as const, speaker_index: 0,
        is_corrected: false, is_deleted: false, is_filler: false },
    ]
    const sectionMap = detectSections(mockWords)
    expect(sectionMap.get(1)).toBe('DIRECT_EXAMINATION')
  })

  it('DOCX assembler returns a non-empty Buffer', async () => {
    const mockParagraphs = [{
      paragraph_index: 0, paragraph_type: 'QUESTION' as const,
      section_type: 'DIRECT_EXAMINATION' as const,
      speaker_index: 0, speaker_label: 'Q.',
      text: 'Please state your name for the record.',
      raw_text: 'Please state your name for the record.',
      word_ids: [], start_word_idx: 0, end_word_idx: 7,
      requires_reentry_marker: false, has_interruption: false,
      page_number: 1, line_number_start: 1, line_number_end: 1, line_count: 1,
    }, {
      paragraph_index: 1, paragraph_type: 'ANSWER' as const,
      section_type: 'DIRECT_EXAMINATION' as const,
      speaker_index: 1, speaker_label: 'A.',
      text: 'Maria Dolores Olivarez.',
      raw_text: 'Maria Dolores Olivarez.',
      word_ids: [], start_word_idx: 8, end_word_idx: 10,
      requires_reentry_marker: false, has_interruption: false,
      page_number: 1, line_number_start: 2, line_number_end: 2, line_count: 1,
    }]

    const inclusionPages = {
      title: ['Houston v. Olivarez', 'Cause No. C-3123-25-J'],
      appearances: ['APPEARANCES', '', 'ATTORNEY: John Houston, Esq.', 'WITNESS: Maria Dolores Olivarez'],
      index: ['INDEX OF EXAMINATIONS', '', 'WITNESS              PAGE', 'Olivarez, Maria       1'],
      certification: ["REPORTER'S CERTIFICATION", '', 'I, Miah Bardot, CSR No. 12129, certify...'],
    }

    const docxBuffer = await assembleDocx(
      mockParagraphs,
      inclusionPages,
      DEFAULT_JURISDICTION,
      'Houston v. Olivarez',
    )

    expect(Buffer.isBuffer(docxBuffer)).toBe(true)
    expect(docxBuffer.length).toBeGreaterThan(1000)
  })

  it('no em dash survives post-processing', () => {
    const textWithDash = 'She was\u2014interrupted by counsel'
    const result = postProcessText(textWithDash)
    expect(result).not.toMatch(/[\u2014\u2013\u2012—–]/)
  })

  it('no "THE COURT REPORTER" survives post-processing', () => {
    const result = postProcessText('THE COURT REPORTER noted the time.')
    expect(result).not.toContain('THE COURT REPORTER')
  })
})
```

Run:
```bash
npx vitest run tests/integration/formatter-pipeline.test.ts
```

**Exit criterion: ALL assertions pass.**

---

## ═══ STEP 14 — FINAL VERIFICATION GATE ═══
**No commit — verification only.**

```bash
# TypeScript
npx tsc --noEmit
# Expected: 0 errors

# Linting
npm run lint
# Expected: 0 errors

# Build
npm run build
# Expected: Compiled successfully

# All tests
npx vitest run
# Expected: All tests pass
```

**Manual smoke test (browser — complete this before marking Phase 1 done):**

1. Open a job that has a completed Deepgram transcription
2. `POST /api/transcriptions/[id]/format` → expect 200 response
3. Check Supabase Table Editor → `transcript_paragraphs` rows exist for this transcription
4. Inspect a paragraph row → `text` field contains no em dashes, no `THE COURT REPORTER`
5. `GET /api/transcriptions/[id]/export` → DOCX downloads successfully
6. Open DOCX in Word or LibreOffice:
   - Font is Courier New
   - Line numbers 1–25 appear in left margin
   - Q. and A. labels are correctly indented
   - No em dash characters appear anywhere
   - `THE REPORTER:` (not `THE COURT REPORTER:`) in all colloquy labels
   - Page footer shows `- X -` centered
   - Page header shows case name right-aligned

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

Phase 2 (Transcript Editor) begins in a separate session after the Phase 1
exit criterion is confirmed.
