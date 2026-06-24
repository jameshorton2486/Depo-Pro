> **STATUS: GEOMETRY SUPERSEDED BY DP-011 (2026-06-22).** Margin, continuation
> (Zone-2 = 1.0″), and 2-space-after-Q rules are superseded — use DP-011.
> DB-schema proposals (jurisdiction_configs, transcript_paragraphs,
> speaker_assignments) are POST-FREEZE and out of scope for beta.
> **Classification:** HISTORICAL / reference-only architecture specification.
> It is retained for provenance and legacy design context, not as active authority.

# Depo-Pro Transcript Formatter — Complete Build Specification

**Version:** 1.0  
**Date:** March 2026  
**Status:** Pre-Development — Approved for Implementation  
**Authority:** Texas Uniform Format Manual (UFM/JBCC) · Morson's English Guide · Formatting Guide v1.0  
**Classification:** Internal Engineering Specification

---

## Table of Contents

1. [Executive Summary & Why This Comes First](#1-executive-summary)
2. [Current State Audit — What Is Broken and Why](#2-current-state-audit)
3. [Architectural Decisions](#3-architectural-decisions)
4. [Database Schema Changes](#4-database-schema-changes)
5. [The Formatter Algorithm — Complete Specification](#5-the-formatter-algorithm)
6. [Section Detection Engine](#6-section-detection-engine)
7. [Paragraph Builder Rules](#7-paragraph-builder-rules)
8. [Inclusion Page Generation](#8-inclusion-page-generation)
9. [25-Lines-Per-Page Pagination](#9-25-lines-per-page-pagination)
10. [Post-Processing Rules](#10-post-processing-rules)
11. [Quality Gate Validator](#11-quality-gate-validator)
12. [Export Pipeline Integration](#12-export-pipeline-integration)
13. [File-by-File Implementation Plan](#13-file-by-file-implementation-plan)
14. [Testing Requirements](#14-testing-requirements)
15. [Dependency Chain & Build Order](#15-dependency-chain--build-order)

---

## 1. Executive Summary

### Why the Formatter Must Be Built First

The entire Depo-Pro platform depends on one thing: producing a certified legal transcript that a court reporter can attach their license number to and deliver to a law firm. Everything else — the editor UI, the intake parser, the speaker assignment modal, the quality gate — is downstream of the formatter. If the formatter is wrong, every transcript produced is legally defective, and no reporter will certify it.

**Current state:** The existing formatter (`src/lib/transcription/legal-formatter.ts`) has five critical bugs, is missing eleven required formatting rules, and has no concept of what "section" of the deposition it is formatting. It cannot produce a certifiable transcript in its current state.

### The Engineering Dependency Chain

```
Deepgram JSON output
        ↓
transcript_words rows (Hybrid architecture)
        ↓
transcript_paragraphs (Section detection + paragraph builder)
        ↓
Formatter engine (Tab stops, line numbers, spacing)
        ↓
Inclusion pages (Title, Appearances, Index, Certificate)
        ↓
25-lines/page pagination + DOCX assembly
        ↓
Pre-certification quality gate
        ↓
Export (DOCX, PDF, ASCII, E-Trans)
        ↓
Reporter certifies and delivers
```

**If the formatter is broken, everything above this line collapses.**

---

## 2. Current State Audit — What Is Broken and Why

### 2.1 Critical Bugs (Blocking Certified Output)

#### BUG-01 — Em Dash Insertion Violates Texas UFM ⛔
**File:** `src/lib/transcription/post-process.ts` → `insertEmDashes()`  
**What it does:** Inserts em dash characters (—) for repeated words and interruptions.  
**Why it's wrong:** Texas UFM mandates **double hyphens (--)** everywhere. Em dashes are a certification violation. The Olivarez deposition case study documented 28 em dash errors in a single transcript. The quality gate, once built, will flag every single transcript produced so far.  
**Fix:** Replace all em dash insertions with double hyphen (--). Do not change the detection logic — only the output character.

```typescript
// CURRENT (WRONG)
return `${firstWord} — ${rest}`;

// CORRECT
return `${firstWord} -- ${rest}`;
```

#### BUG-02 — No Section Detection; ExaminationSection Requires Manual Line Numbers ⛔
**File:** `src/types/transcript-format.ts` → `ExaminationSection`  
**What it does:** The `ExaminationSection` interface requires explicit `startLine` and `endLine` integers to determine Q/A formatting.  
**Why it's wrong:** These line numbers do not come from anywhere in the pipeline. The default `examinationSections: []` means no transcript gets Q/A formatting without manual configuration first. In practice, every transcript processes as pure colloquy.  
**Fix:** Replace with section detection engine (see Section 6).

#### BUG-03 — buildKeywords.ts Is a Stub — Zero Keyterm Boosting ⛔
**File:** `lib/transcription/buildKeywords.ts`  
**What it does:** Returns an empty array.  
**Why it's wrong:** Every job is transcribed by Deepgram with zero keyterm boosts, giving up 15–40% proper noun accuracy. This is the primary cause of transcription errors like "Oferis" instead of "Olivarez."  
**Fix:** Wire to `custom_vocabularies` + `firm_vocabularies` tables (both exist). Phase 4 adds Claude API extraction from intake documents.

#### BUG-04 — No 25-Lines-Per-Page Enforcement ⛔
**File:** `src/lib/transcription/legal-formatter.ts`  
**What it does:** Generates an infinite stream of paragraphs with no page break logic.  
**Why it's wrong:** Certified transcripts require exactly 25 numbered lines per page. Line numbers are the primary citation reference in legal proceedings ("see page 47, line 12"). Without pagination, exports are legally defective.  
**Fix:** See Section 9 — complete pagination specification.

#### BUG-05 — "THE COURT REPORTER" Label Accepted Without Warning ⛔
**File:** `src/lib/transcription/legal-formatter.ts` → `getSpeakerLabel()`  
**What it does:** Passes through any speaker label, including "THE COURT REPORTER."  
**Why it's wrong:** Texas UFM specifies "THE REPORTER" as the standardized label. "THE COURT REPORTER" is a documented formatting error (Olivarez Case Study, Error #3).  
**Fix:** Add normalization map in speaker label resolution.

### 2.2 Missing Features (Required for Certified Output)

| # | Feature | Current State | Priority |
|---|---|---|---|
| M-01 | Section detection engine | Not built | CRITICAL |
| M-02 | DIRECT EXAMINATION / BY MR. ___: headers | Not built | CRITICAL |
| M-03 | (BY MR. ___) re-entry rule | Not built | CRITICAL |
| M-04 | BY MR. ___: sub-header after breaks | Not built | CRITICAL |
| M-05 | Title page generation | Not built | CRITICAL |
| M-06 | Appearances page generation | Not built | CRITICAL |
| M-07 | Index of Examination | Not built | CRITICAL |
| M-08 | Index of Exhibits | Not built | HIGH |
| M-09 | Certificate page | Not built | CRITICAL |
| M-10 | Verbatim deletion detection | Not built | HIGH |
| M-11 | Time format normalization (2:12 p.m.) | Not built | HIGH |
| M-12 | Closing language (FURTHER DEPONENT...) | Not built | HIGH |
| M-13 | Pass-the-witness Q. formatting | Not built | MEDIUM |
| M-14 | Quotation marks on read material | Not built | MEDIUM |
| M-15 | Scopist note removal before export | Not built | HIGH |

### 2.3 Parallel/Duplicate Systems (Need Consolidation)

There are currently **two separate export services** and **two separate DOCX generation paths** in the codebase:

- `lib/export.ts` — Legacy service, basic DOCX/PDF/TXT, no Q/A awareness
- `lib/services/export.ts` → `exportLegalDocx()` — Legal-aware service
- `src/lib/transcription/legal-formatter.ts` — Newest implementation, most correct
- `app/api/jobs/[id]/export/route.ts` — Job-level export route
- `app/api/transcripts/[id]/export/route.ts` — Transcript-level export route

**Decision:** Consolidate on `src/lib/transcription/legal-formatter.ts` as the single source of truth. Deprecate `lib/export.ts` and `lib/services/export.ts`. Both export routes will call the same underlying engine.

---

## 3. Architectural Decisions

These decisions were locked during the planning session. They are not open for re-debate during development.

### Decision A — Hybrid Word Storage

**Raw Deepgram JSON is immutable.** Words are parsed and stored as individual rows in a new `transcript_words` table for editing, searching, confidence highlighting, and audio sync. The original JSON in `transcriptions.deepgram_raw_json` is never modified.

```
transcriptions.deepgram_raw_json  →  IMMUTABLE. Never touched.
transcript_words rows             →  Mutable. This is what the editor reads.
transcript_paragraphs rows        →  Derived from words. Rebuilt on formatter run.
```

### Decision B — Preserve `jobs` and `firms`; Add `depositions`

Do not rename or migrate existing tables. Add a new `depositions` table with `job_id` foreign key. The hierarchy becomes:

```
firms (existing)
  └── depositions (new)
        └── jobs (existing, add deposition_id FK)
              └── transcriptions (existing)
                    ├── transcript_words (new)
                    └── transcript_paragraphs (new)
```

### Decision C — Build Order

```
Phase 1: Formatter engine (this document)
Phase 2: Transcript editor UI + audio sync
Phase 3: Speaker assignment system
Phase 4: Intake parser + keyword generation
Phase 5: Quality gate
```

### Decision D — Fix Em Dash During Formatter Rebuild

`insertEmDashes()` will be renamed `insertDoubleHyphens()` and the output will change from `—` to `--`. All other logic remains identical.

---

## 4. Database Schema Changes

### 4.1 New Tables Required for Formatter

#### `depositions` — New table

```sql
CREATE TABLE depositions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  
  -- Case identification
  case_style            TEXT NOT NULL,          -- 'Houston v. Olivarez'
  cause_number          TEXT NOT NULL,          -- 'DC-25-07070'
  court_name            TEXT,                   -- '191st Judicial District Court'
  county                TEXT,                   -- 'Dallas County'
  state_code            CHAR(2) NOT NULL DEFAULT 'TX',
  incident_date         DATE,                   -- Used by date consistency checker
  
  -- Deponent
  deponent_name         TEXT NOT NULL,
  deponent_role         TEXT DEFAULT 'witness',
  
  -- Scheduling
  deposition_date       DATE,
  start_time            TIME,
  end_time              TIME,
  location              TEXT,
  is_remote             BOOLEAN DEFAULT FALSE,
  zoom_link             TEXT,
  
  -- Personnel
  assigned_reporter_id  UUID REFERENCES profiles(id),
  assigned_scopist_id   UUID REFERENCES profiles(id),
  assigned_videographer_id UUID REFERENCES profiles(id),
  
  -- Counsel
  ordering_attorney     TEXT,
  ordering_firm         TEXT,
  ordering_email        TEXT,
  ordering_phone        TEXT,
  copy_attorneys        JSONB DEFAULT '[]',     -- [{name, firm, email, phone}]
  
  -- Intake
  intake_document_url   TEXT,
  deepgram_keywords     TEXT[],                 -- Auto-generated from intake parser
  
  -- Status
  status                TEXT DEFAULT 'scheduled',
  -- 'scheduled'|'in_progress'|'transcribing'|'in_review'|'certified'|'delivered'
  
  -- Jurisdiction
  jurisdiction_id       UUID,                   -- References jurisdiction_configs (Phase 5)
  
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_depositions_firm ON depositions(firm_id);
CREATE INDEX idx_depositions_status ON depositions(status);
CREATE INDEX idx_depositions_reporter ON depositions(assigned_reporter_id);
CREATE INDEX idx_depositions_date ON depositions(deposition_date);

-- Add deposition_id to jobs (non-breaking — nullable FK)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposition_id UUID REFERENCES depositions(id);
CREATE INDEX idx_jobs_deposition ON jobs(deposition_id) WHERE deposition_id IS NOT NULL;
```

#### `transcript_words` — New table

```sql
CREATE TABLE transcript_words (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  
  -- Word data
  word             TEXT NOT NULL,
  punctuated_word  TEXT,
  
  -- Timing
  start_time       NUMERIC(10,3) NOT NULL,   -- seconds from audio start
  end_time         NUMERIC(10,3) NOT NULL,
  
  -- Confidence
  confidence       NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Speaker
  speaker_index    INTEGER,                  -- Deepgram speaker 0,1,2...
  
  -- Position
  position_index   INTEGER NOT NULL,         -- Global word order in transcript
  paragraph_id     UUID,                     -- Set after paragraph detection
  
  -- Edit state
  is_filler        BOOLEAN DEFAULT FALSE,    -- uh, um, ah, you know, like
  is_corrected     BOOLEAN DEFAULT FALSE,
  original_word    TEXT,                     -- Set when corrected
  is_deleted       BOOLEAN DEFAULT FALSE,    -- Soft delete — never hard delete
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_word_time_range CHECK (end_time >= start_time)
);

-- Critical performance indexes
CREATE UNIQUE INDEX idx_tw_position ON transcript_words(transcription_id, position_index);
CREATE INDEX idx_tw_confidence ON transcript_words(transcription_id, confidence ASC);
CREATE INDEX idx_tw_speaker ON transcript_words(transcription_id, speaker_index);
CREATE INDEX idx_tw_paragraph ON transcript_words(paragraph_id) WHERE paragraph_id IS NOT NULL;
CREATE INDEX idx_tw_filler ON transcript_words(transcription_id, is_filler) WHERE is_filler = TRUE;
CREATE INDEX idx_tw_pending_review ON transcript_words(transcription_id, confidence)
  WHERE confidence < 0.80 AND is_deleted = FALSE;
```

#### `transcript_paragraphs` — New table

```sql
CREATE TYPE paragraph_type AS ENUM (
  'COLLOQUY',           -- Zone 3 speaker lines (MR. MUNOZ:, THE REPORTER:, etc.)
  'QUESTION',           -- Zone 1 Q. line
  'ANSWER',             -- Zone 1 A. line
  'PARENTHETICAL',      -- Zone 3 (non-verbal notation)
  'SECTION_HEADER',     -- DIRECT EXAMINATION (bold, Zone 3)
  'EXAMINATION_BYLINE', -- BY MR. ___: (bold, left margin)
  'REENTRY_MARKER',     -- Q. (BY MR. ___) first Q after interruption
  'OFF_RECORD',         -- (Off the record at X p.m.)
  'ON_RECORD',          -- (Back on the record at X p.m.)
  'EXHIBIT_MARK',       -- (Plaintiff's Exhibit No. X marked...)
  'PRE_DEPOSITION',     -- Pre-deposition off-record material
  'CLOSING_ASTERISKS',  -- * * * * *
  'FURTHER_SAYETH',     -- FURTHER DEPONENT SAYETH NOT.
  'DEPO_CONCLUDED'      -- (Deposition of X concluded at Y p.m.)
);

CREATE TABLE transcript_paragraphs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  
  -- Paragraph content
  paragraph_type   paragraph_type NOT NULL,
  text             TEXT NOT NULL,              -- Assembled text (may differ from raw)
  
  -- Word range
  start_word_idx   INTEGER,                   -- position_index of first word
  end_word_idx     INTEGER,                   -- position_index of last word
  
  -- Speaker
  speaker_index    INTEGER,
  speaker_label    TEXT,                      -- Resolved label: 'MR. MUNOZ', 'THE REPORTER'
  qa_label         CHAR(1),                   -- 'Q' or 'A' — null if not Q/A
  
  -- Section context
  deposition_section TEXT,
  -- 'pre_deposition'|'opening'|'oath'|'direct'|'cross'|'redirect'|'recross'|'closing'
  
  -- Sequence
  paragraph_order  INTEGER NOT NULL,          -- Global paragraph order
  page_number      INTEGER,                   -- Set during pagination
  line_number_start INTEGER,                 -- Line 1-25 on its page
  line_number_end   INTEGER,
  
  -- Flags
  requires_reentry_marker BOOLEAN DEFAULT FALSE,
  has_interruption        BOOLEAN DEFAULT FALSE,
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tp_order ON transcript_paragraphs(transcription_id, paragraph_order);
CREATE INDEX idx_tp_type ON transcript_paragraphs(transcription_id, paragraph_type);
CREATE INDEX idx_tp_section ON transcript_paragraphs(transcription_id, deposition_section);
CREATE INDEX idx_tp_page ON transcript_paragraphs(transcription_id, page_number);
```

#### `speaker_assignments` — New table (replaces format_settings.speakerMappings JSONB)

```sql
CREATE TABLE speaker_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  
  speaker_index    INTEGER NOT NULL,          -- Deepgram speaker 0,1,2...
  speaker_name     TEXT NOT NULL,             -- 'Juan M. Munoz'
  
  role             TEXT NOT NULL,
  -- 'examining_attorney'|'cross_examining_attorney'|'witness'|
  -- 'reporter'|'videographer'|'interpreter'|'other'
  
  display_label    TEXT NOT NULL,             -- 'MR. MUNOZ' (colloquy)
  qa_label         CHAR(1),                   -- 'Q' or 'A' (examination)
  
  assigned_by      UUID REFERENCES profiles(id),
  assigned_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(transcription_id, speaker_index)
);
```

#### `jurisdiction_configs` — New table

```sql
CREATE TABLE jurisdiction_configs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code               CHAR(2) UNIQUE NOT NULL,
  state_name               TEXT NOT NULL,
  
  -- Typography
  font                     TEXT DEFAULT 'Courier New',
  font_size_pt             INTEGER DEFAULT 12,
  
  -- Layout
  lines_per_page           INTEGER DEFAULT 25,
  left_margin_inches       NUMERIC(4,3) DEFAULT 1.75,
  right_margin_inches      NUMERIC(4,3) DEFAULT 0.375,
  
  -- Tab system (spaces from left margin)
  qa_signifier_spaces      INTEGER DEFAULT 5,     -- Tab 1
  qa_text_offset_spaces    INTEGER DEFAULT 10,    -- Tab 2
  colloquy_indent_spaces   INTEGER DEFAULT 15,    -- Tab 3
  
  -- Standards
  min_chars_per_line       INTEGER DEFAULT 56,
  require_line_numbers     BOOLEAN DEFAULT TRUE,
  require_bookmarks        BOOLEAN DEFAULT FALSE,  -- CA: true
  require_searchable_pdf   BOOLEAN DEFAULT FALSE,  -- TX appellate: true
  upper_case_speaker_ids   BOOLEAN DEFAULT FALSE,  -- OH: true
  notes_retention_years    INTEGER DEFAULT 3,
  
  -- Certification
  certification_body       TEXT,
  certification_language   TEXT,                  -- Full cert block text
  
  notes                    TEXT,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Texas as default
INSERT INTO jurisdiction_configs (state_code, state_name, left_margin_inches, right_margin_inches,
  qa_signifier_spaces, qa_text_offset_spaces, colloquy_indent_spaces, min_chars_per_line,
  certification_body)
VALUES ('TX', 'Texas', 1.0, 0.375, 5, 10, 15, 56, 'JBCC/UFM')
ON CONFLICT (state_code) DO NOTHING;
```

### 4.2 Migration: Hydrate transcript_words from Existing JSONB

A one-time migration job must parse `transcriptions.words` JSONB and insert rows into `transcript_words` for all existing transcriptions.

```sql
-- Migration script: hydrate transcript_words from JSONB
INSERT INTO transcript_words (
  transcription_id, word, punctuated_word, start_time, end_time,
  confidence, speaker_index, position_index
)
SELECT
  t.id,
  (word_obj->>'word')::TEXT,
  (word_obj->>'punctuated_word')::TEXT,
  (word_obj->>'start')::NUMERIC,
  (word_obj->>'end')::NUMERIC,
  COALESCE((word_obj->>'confidence')::NUMERIC, 0.95),
  (word_obj->>'speaker')::INTEGER,
  (ordinality - 1)::INTEGER
FROM transcriptions t,
     jsonb_array_elements(t.words) WITH ORDINALITY AS w(word_obj, ordinality)
WHERE t.words IS NOT NULL
  AND jsonb_typeof(t.words) = 'array'
ON CONFLICT DO NOTHING;
```

---

## 5. The Formatter Algorithm — Complete Specification

### 5.1 Entry Point

```typescript
// src/lib/transcription/formatter/index.ts

export async function formatTranscript(
  transcriptionId: string,
  options: FormatterOptions = {}
): Promise<FormatterResult> {
  // 1. Load words
  const words = await loadTranscriptWords(transcriptionId);
  
  // 2. Load speaker assignments
  const speakers = await loadSpeakerAssignments(transcriptionId);
  
  // 3. Load jurisdiction config (default TX if not set)
  const jurisdiction = await loadJurisdictionConfig(transcriptionId);
  
  // 4. Run section detector
  const sections = detectSections(words, speakers);
  
  // 5. Build paragraph stream
  const paragraphs = buildParagraphs(words, speakers, sections, jurisdiction);
  
  // 6. Run post-processor on paragraph text
  const processed = postProcessParagraphs(paragraphs, options);
  
  // 7. Paginate (25 lines/page with line numbers)
  const paginated = paginateParagraphs(processed, jurisdiction);
  
  // 8. Persist paragraphs
  await saveParagraphs(transcriptionId, paginated);
  
  return { paragraphs: paginated, pageCount: paginated.at(-1)?.page_number ?? 1 };
}
```

### 5.2 Data Flow

```
transcript_words (raw, immutable after Deepgram ingest)
        ↓
Section Detection
  → classifies each word/segment into deposition sections
  → produces: SectionMap { wordIndex → section_type }
        ↓
Paragraph Builder
  → groups words into paragraphs
  → assigns paragraph_type (QUESTION, ANSWER, COLLOQUY, etc.)
  → resolves speaker labels
  → inserts section headers, bylines, re-entry markers
  → inserts closing language
        ↓
Post-Processor
  → double-hyphen normalization (never em dash)
  → time format normalization (2:12 p.m.)
  → speaker label normalization (THE REPORTER, not THE COURT REPORTER)
  → Doctor → Dr. title fix
        ↓
Paginator
  → assigns page_number and line_number_start/end to each paragraph
  → handles multi-line wrap within paragraphs
  → enforces exactly 25 lines per page
        ↓
transcript_paragraphs rows (written to DB)
        ↓
DOCX/PDF Assembler
  → reads transcript_paragraphs
  → generates inclusion pages from deposition metadata
  → produces final export buffer
```

---

## 6. Section Detection Engine

This is the most complex component in the formatter. It determines which section of the deposition each paragraph belongs to, which controls whether speakers get Q./A. labels or full colloquy labels.

### 6.1 Section Types

```
PRE_DEPOSITION     Before videographer opens record
OPENING            Videographer's statement + reporter case ID + counsel appearances
OATH               Reporter administers oath to witness
DIRECT             First examination by plaintiff's counsel
CROSS              Defense counsel examination
REDIRECT           Plaintiff's counsel follow-up
RECROSS            Defense counsel follow-up
EXAMINATION_N      Additional examinations beyond recross
BREAK_OFF          Off the record
BREAK_ON           Back on the record
CLOSING            Videographer closes record + deposition concluded
```

### 6.2 Detection Algorithm

The section detector uses a **priority-ordered signal matching** approach — not ML, not heuristics, but explicit pattern detection against known transcript signals.

```typescript
// src/lib/transcription/formatter/section-detector.ts

interface SectionBoundary {
  startWordIndex: number;
  endWordIndex: number;         // -1 means "until next boundary"
  sectionType: SectionType;
  examiningSpeaker?: number;    // speaker_index of the Q attorney
  witnessSpeaker?: number;      // speaker_index of the A witness
}

function detectSections(
  words: TranscriptWord[],
  speakers: SpeakerAssignment[]
): SectionBoundary[] {
  const boundaries: SectionBoundary[] = [];
  const text = buildSearchableText(words);   // position-indexed text

  // Step 1: Find videographer's on-record opening
  // Signal: "we are on the record" or "on the record" near time/date mention
  const onRecordIdx = findSignal(text, ON_RECORD_PATTERNS);
  
  // Step 2: Find oath administration
  // Signal: "raise your right hand" or "do you solemnly swear"
  const oathIdx = findSignal(text, OATH_PATTERNS);
  
  // Step 3: Find examination headers
  // Signal: "DIRECT EXAMINATION" or "CROSS-EXAMINATION" in text
  // Also: "BY MR. ___:" at start of line after examination header
  const examHeaders = findAllSignals(text, EXAMINATION_HEADER_PATTERNS);
  
  // Step 4: Find off-record breaks
  // Signal: "off the record" with time
  const breakSignals = findAllSignals(text, OFF_RECORD_PATTERNS);
  
  // Step 5: Find closing
  // Signal: "we are off the record" + "deposition...concluded"
  const closingIdx = findSignal(text, CLOSING_PATTERNS);
  
  // Step 6: Assign Q/A speaker mapping per examination section
  // The examining attorney = the speaker_index that asks the first Q.
  // Determined by: speaker right after each BY MR. ___: byline
  
  // Build boundaries from signals
  boundaries.push(
    { startWordIndex: 0, endWordIndex: onRecordIdx - 1, sectionType: 'PRE_DEPOSITION' },
    { startWordIndex: onRecordIdx, endWordIndex: oathIdx - 1, sectionType: 'OPENING' },
    { startWordIndex: oathIdx, endWordIndex: examHeaders[0]?.idx - 1, sectionType: 'OATH' },
    // ... examination sections from examHeaders
    // ... break sections from breakSignals
    // ... closing from closingIdx
  );
  
  return boundaries;
}
```

### 6.3 Pattern Definitions

```typescript
// Signal patterns — match against lowercased assembled text

const ON_RECORD_PATTERNS = [
  /we are on the record/i,
  /on the record\. today'?s date is/i,
  /this is the beginning of the deposition/i,
];

const OATH_PATTERNS = [
  /raise your right hand/i,
  /do you solemnly swear/i,
  /swear (or affirm)/i,
];

const EXAMINATION_HEADER_PATTERNS = [
  /\bDIRECT EXAMINATION\b/,
  /\bCROSS[\s-]EXAMINATION\b/,
  /\bREDIRECT EXAMINATION\b/,
  /\bRECROSS[\s-]EXAMINATION\b/,
  /\bEXAMINATION BY THE COURT\b/,
];

const BY_MR_PATTERNS = [
  /^BY (MR|MS|MRS)\.?\s+([A-Z]+)\s*:/m,
];

const OFF_RECORD_PATTERNS = [
  /off the record(?: at \d{1,2}:\d{2})/i,
  /we('re| are) off the record/i,
];

const ON_RECORD_RETURN_PATTERNS = [
  /back on the record(?: at \d{1,2}:\d{2})/i,
  /we('re| are) back on the record/i,
];

const CLOSING_PATTERNS = [
  /deposition of .+ concluded/i,
  /further deponent sayeth not/i,
];
```

### 6.4 Manual Override

When section detection produces incorrect results (edge cases, unusual proceedings), the reporter can manually mark section boundaries in the editor. Manual overrides are stored in `transcript_paragraphs.deposition_section` and respected by subsequent formatter runs.

```typescript
// Section override stored on paragraph
interface SectionOverride {
  paragraphId: string;
  sectionType: SectionType;
  overriddenBy: string;     // user id
  overriddenAt: string;     // timestamp
}
```

---

## 7. Paragraph Builder Rules

### 7.1 Zone Assignment

Every paragraph falls into exactly one of three zones. Zone determines tab stop position.

```
Zone 1 = 1 tab = 0.5"  →  Q. and A. ONLY
Zone 2 = 2 tabs = 1.0" →  Carry-over/continuation of Q. or A. wrapping to next line
Zone 3 = 3 tabs = 1.5" →  EVERYTHING ELSE
```

**Rule: If the paragraph begins with Q. or A. → Zone 1. All other paragraphs → Zone 3. Zone 2 is never the starting zone — it only applies to wrapped continuation lines.**

### 7.2 Paragraph Type Assignment Logic

```typescript
function assignParagraphType(
  segment: SpeakerSegment,
  section: SectionType,
  prevParagraph: Paragraph | null,
  speakers: SpeakerAssignment[],
  sectionBoundaries: SectionBoundary[]
): ParagraphType {
  
  const speaker = getSpeakerAssignment(segment.speakerIndex, speakers);
  const boundary = getSectionBoundary(segment.wordIndex, sectionBoundaries);
  
  // Parenthetical detection — text starts with ( and ends with )
  if (isParenthetical(segment.text)) {
    if (isOffRecordParenthetical(segment.text)) return 'OFF_RECORD';
    if (isOnRecordParenthetical(segment.text)) return 'ON_RECORD';
    if (isExhibitMark(segment.text)) return 'EXHIBIT_MARK';
    return 'PARENTHETICAL';
  }
  
  // Section headers
  if (isSectionHeader(segment.text)) return 'SECTION_HEADER';
  if (isByMrLine(segment.text)) return 'EXAMINATION_BYLINE';
  
  // In examination sections — Q/A formatting
  if (isExaminationSection(boundary.sectionType)) {
    const examiner = boundary.examiningSpeaker;
    const witness = boundary.witnessSpeaker;
    
    if (speaker?.speaker_index === examiner) {
      // Check if this Q needs a re-entry marker
      if (requiresReentryMarker(prevParagraph, boundary)) {
        return 'REENTRY_MARKER';  // Q. (BY MR. ___)
      }
      return 'QUESTION';
    }
    if (speaker?.speaker_index === witness) return 'ANSWER';
    // Any other speaker in examination section = colloquy interruption
    return 'COLLOQUY';
  }
  
  // All other sections = colloquy
  return 'COLLOQUY';
}
```

### 7.3 Q/A Label Rules

```typescript
// Q. format
`\tQ.  ${text}`     // 1 tab, Q period, 2 spaces, text

// A. format  
`\tA.  ${text}`     // 1 tab, A period, 2 spaces, text

// Q. with re-entry marker
`\tQ.  (BY MR. ${LAST_NAME_CAPS})  ${text}`   // 1 tab, Q period, 2 spaces, re-entry, 2 spaces, text

// Wrap continuation (Zone 2)
`\t\t${continuationText}`   // 2 tabs, continuation text

// IMPORTANT: Q. and A. ALWAYS followed by exactly two spaces.
// Never one space. Never a tab. Two spaces.
```

### 7.4 Colloquy Label Rules

```typescript
// Standard colloquy
`\t\t\tMR. MUNOZ:  ${text}`     // 3 tabs, label, colon, 2 spaces, text

// CRITICAL: After every colon in a speaker label — two spaces, never a tab.
// Pattern: [3 tabs][LABEL]:[2 spaces][text]

// Special standardized labels — EXACT TEXT REQUIRED
const STANDARDIZED_LABELS = {
  reporter:     'THE REPORTER',       // NOT "THE COURT REPORTER"
  witness:      'THE WITNESS',
  videographer: 'THE VIDEOGRAPHER',
  interpreter:  'THE INTERPRETER',
};

// Attorney labels format: MR./MS. + LAST NAME (all caps) + colon
// MR. MUNOZ:
// MS. DAVIDSON:
// MR. MALONEY:
```

### 7.5 Section Header Rules

```typescript
// DIRECT EXAMINATION (bold, all caps, Zone 3)
const sectionHeader: Paragraph = {
  text: sectionType.toUpperCase().replace('-', '-'),  // DIRECT EXAMINATION
  zone: 3,
  bold: true,
  type: 'SECTION_HEADER',
};

// BY MR. ___: (bold, NO tab — left margin)
const bylineHeader: Paragraph = {
  text: `BY ${speakerMrTitle}. ${speakerLastNameCaps}:`,
  zone: 0,   // LEFT MARGIN — no tab indent
  bold: true,
  type: 'EXAMINATION_BYLINE',
};

// Byline appears:
// 1. Immediately after DIRECT/CROSS/REDIRECT/RECROSS header
// 2. After every (Back on the record...) parenthetical
// 3. When a new attorney takes over examination
// NEVER after an objection (that uses inline re-entry marker instead)
```

### 7.6 Re-Entry Marker Rules

The (BY MR. ___) re-entry rule is one of the most commonly missed formatting rules in AI-assisted transcription.

```typescript
function requiresReentryMarker(
  prevParagraph: Paragraph | null,
  currentParagraph: Paragraph,
): boolean {
  if (!prevParagraph) return false;
  
  // Required: when previous paragraph in examination section was COLLOQUY
  // (meaning opposing counsel interrupted)
  if (prevParagraph.type === 'COLLOQUY' && 
      prevParagraph.deposition_section === currentParagraph.deposition_section) {
    return true;
  }
  
  // NOT required after: off-record breaks (BY MR. ___: byline handles that)
  // NOT required after: section header (BY MR. ___: byline handles that)
  // NOT required after: answer (clean continuation of examination)
  
  return false;
}

// Re-entry format:
// Q.  (BY MR. MUNOZ)  And would you agree...
//
// Rules:
// - Always inline with Q. — same line as the question
// - Attorney last name in ALL CAPS
// - No italic, no bold, no brackets
// - Only on the FIRST Q. after the interruption
// - Subsequent uninterrupted Q.s use plain Q.
```

### 7.7 Parenthetical Rules

```typescript
function formatParenthetical(text: string): string {
  // Rule 1: Always ( ) — never [ ]
  text = text.replace(/\[/g, '(').replace(/\]/g, ')');
  
  // Rule 2: Sentence case — first word capitalized, rest lowercase
  // Exception: proper nouns and abbreviations retain their case
  text = toSentenceCase(text);
  
  // Rule 3: Double hyphen for separators — NEVER em dash
  text = text.replace(/—/g, '--');
  
  // Rule 4: No bold, no asterisks, no asterisk-wrapping
  // These are output rendering rules — enforced in DOCX assembler
  
  // Rule 5: Time format inside parentheticals
  text = normalizeTimeFormat(text);
  // "2:12 PM" → "2:12 p.m."
  // "14:12" → "2:12 p.m."
  // "2:12pm" → "2:12 p.m."
  
  return `(${text.replace(/^\(|\)$/g, '')})`;
}

// Standard parenthetical library — Texas UFM format
const STANDARD_PARENTHETICALS = {
  nod:           '(Moving head up and down)',
  headShake:     '(Moving head side to side)',
  indicating:    '(Indicating)',
  complies:      '(Witness complies)',
  laughing:      '(Laughing)',
  pausing:       '(Pausing)',
  inaudible:     '(inaudible)',           // lowercase — this is the UFM standard
  offRecord:     (time: string) => `(Off the record at ${time}.)`,
  onRecord:      (time: string) => `(Back on the record at ${time}.)`,
  exhibitMark:   (n: string, desc?: string) =>
    desc ? `(Plaintiff's Exhibit No. ${n} marked and displayed on screen -- ${desc}.)`
         : `(Plaintiff's Exhibit No. ${n} marked and displayed on screen.)`,
  depoConcludes: (name: string, time: string) =>
    `(Deposition of ${name} concluded at ${time}.)`,
};
```

### 7.8 Closing Language

```typescript
// After the last Q/A and videographer's closing statement:

// 1. Deposition concluded parenthetical
'(Deposition of {DEPONENT_NAME} concluded at {TIME}.)'

// 2. Asterisk divider (centered on page)
'* * * * *'

// 3. Further deponent sayeth not (all caps, centered or Zone 3)
'FURTHER DEPONENT SAYETH NOT.'

// These must be inserted AUTOMATICALLY by the formatter when the
// section detector identifies the CLOSING section.
// They are NOT typed by the reporter.
```

---

## 8. Inclusion Page Generation

Inclusion pages are generated automatically at export time from the `depositions` and `jobs` tables. The reporter **never types these manually** — they are populated entirely from case record data captured during intake.

### 8.1 Title Page

```
[Case Style — centered]
[Cause Number — centered]
[Court and Judicial District — centered]

ORAL AND VIDEOTAPED DEPOSITION OF
[DEPONENT NAME IN ALL CAPS]
VOLUME [N] OF [TOTAL]

[Date spelled out: March 5, 2026]
[Start time: 1:04 p.m.]
[Recording method: Machine Shorthand via Remote Zoom]

[Reporter firm name, address]
```

**Required fields from database:**
- `depositions.case_style`
- `depositions.cause_number`
- `depositions.court_name`
- `depositions.deponent_name`
- `depositions.deposition_date`
- `depositions.start_time`
- `depositions.is_remote` → affects recording method text
- `jobs.volume_number` (default 1)

### 8.2 Appearances Page

```
APPEARANCES:

FOR THE PLAINTIFF:
   [ATTORNEY NAME]
   [FIRM NAME]
   [ADDRESS]
   [PHONE]
   [EMAIL]

FOR THE DEFENDANT:
   [ATTORNEY NAME]
   [FIRM NAME]
   [ADDRESS]

ALSO PRESENT:
   [REPORTER NAME], CSR No. [LICENSE], [LOCATION]
   [VIDEOGRAPHER NAME], [FIRM]
```

**Required fields from database:**
- `depositions.ordering_attorney` + `depositions.ordering_firm` (plaintiff counsel)
- `depositions.copy_attorneys` JSONB array (defense and additional counsel)
- `depositions.assigned_reporter_id` → JOIN `profiles` for name + license
- `depositions.assigned_videographer_id` → JOIN `profiles` for name
- `depositions.is_remote` → "via Zoom" notation if true

### 8.3 Index of Examination

```
INDEX OF EXAMINATION

Witness: [DEPONENT NAME]

EXAMINATION BY            PAGE
[MR. MUNOZ]
Direct Examination         [XX]
[MR. MALONEY]
Cross-Examination          [XX]
```

**Source:** Derived from `transcript_paragraphs` where `paragraph_type = 'SECTION_HEADER'` — page numbers come from `transcript_paragraphs.page_number` after pagination.

### 8.4 Index of Exhibits

```
INDEX OF EXHIBITS

EXHIBIT   DESCRIPTION                     PAGE MARKED
No. 1     Vehicle damage photo            [XX]
No. 2     Plaintiff vehicle photo         [XX]
No. 3     Aerial map                      [XX]
```

**Source:** `transcript_paragraphs` where `paragraph_type = 'EXHIBIT_MARK'` — description parsed from parenthetical text, page from `page_number`.

**Quality Gate:** If any exhibit has `page_number = NULL`, export is blocked. This is a documented Olivarez error (Error #6 — exhibit index with blank page column).

### 8.5 Certificate Page

```
CERTIFICATE OF COURT REPORTER

STATE OF TEXAS
COUNTY OF BEXAR

I, [REPORTER FULL NAME], Certified Shorthand Reporter in and for
the State of Texas, do hereby certify that the foregoing deposition
of [DEPONENT NAME IN ALL CAPS] is a true and correct record of the
testimony given by said witness; that I am neither a relative nor
employee of any attorney or party to this action; and that I have
no financial or other interest in the outcome of this action.

Witness my hand this ______ day of ____________, 20___.

____________________________________
[REPORTER FULL NAME], CSR
Texas License No. [LICENSE NUMBER]
Expiration: ______________
```

**Required fields:**
- `profiles.full_name` (reporter)
- `profiles.license_number`
- `depositions.deponent_name`
- `jurisdiction_configs.certification_language` (full body text, jurisdiction-specific)

**Certification block cannot be pre-filled with a date/signature — only the reporter can complete this at certification.**

---

## 9. 25-Lines-Per-Page Pagination

### 9.1 The Problem

`legal-formatter.ts` currently generates paragraphs as an infinite stream with no page breaks. The DOCX assembler must produce pages with exactly 25 numbered lines. Line numbers are the primary citation mechanism in legal proceedings.

### 9.2 Line Counting Rules

```typescript
function countLinesForParagraph(
  paragraph: Paragraph,
  jurisdiction: JurisdictionConfig
): number {
  const charsPerLine = jurisdiction.min_chars_per_line;  // 56 for TX
  
  switch (paragraph.type) {
    case 'QUESTION':
    case 'ANSWER':
    case 'REENTRY_MARKER': {
      // Q./A. first line: text starts after label at Tab 1
      // Available chars on first line = charsPerLine - tab1Offset - 2 (spaces)
      const firstLineChars = charsPerLine - 5 - 2;  // ~49 chars
      // Continuation lines start at Tab 2 = full width minus tab2 offset
      const contLineChars = charsPerLine - 10;       // ~46 chars
      return countWrappedLines(paragraph.text, firstLineChars, contLineChars);
    }
    
    case 'COLLOQUY':
    case 'PARENTHETICAL':
    case 'EXHIBIT_MARK':
    case 'OFF_RECORD':
    case 'ON_RECORD': {
      // Zone 3: text starts after 3-tab + label + colon + 2 spaces
      const labelLen = (paragraph.speaker_label ?? '').length + 3; // label + ': '
      const firstLineChars = charsPerLine - 15 - labelLen;
      const contLineChars = charsPerLine - 15;
      return countWrappedLines(paragraph.text, firstLineChars, contLineChars);
    }
    
    case 'SECTION_HEADER':
    case 'EXAMINATION_BYLINE':
      return 1;  // Always single line
    
    case 'CLOSING_ASTERISKS':
    case 'FURTHER_SAYETH':
    case 'DEPO_CONCLUDED':
      return 1;
    
    default:
      return 1;
  }
}
```

### 9.3 Page Break Algorithm

```typescript
function paginateParagraphs(
  paragraphs: Paragraph[],
  jurisdiction: JurisdictionConfig
): PaginatedParagraph[] {
  const LINES_PER_PAGE = jurisdiction.lines_per_page;  // 25
  
  const result: PaginatedParagraph[] = [];
  let currentPage = 1;
  let currentLine = 1;

  for (const para of paragraphs) {
    const lineCount = countLinesForParagraph(para, jurisdiction);
    
    // Check if paragraph fits on current page
    if (currentLine + lineCount - 1 > LINES_PER_PAGE) {
      // Move to next page
      currentPage++;
      currentLine = 1;
    }
    
    result.push({
      ...para,
      page_number: currentPage,
      line_number_start: currentLine,
      line_number_end: currentLine + lineCount - 1,
    });
    
    currentLine += lineCount;
  }
  
  return result;
}
```

### 9.4 Line Number Rendering in DOCX

```typescript
// Line numbers appear in the LEFT MARGIN — outside the text area
// Format: right-aligned number, 2 digits minimum
//
// Standard: line numbers on EVERY line (not every 5)
// Courier New 12pt — numbers align to left edge of writing block

function renderLineNumber(lineNum: number): string {
  return lineNum.toString().padStart(2, ' ');
}

// DOCX paragraph structure with line number:
// [LINE_NUM]\t[CONTENT]
// The tab stop for line numbers is at 0 (left edge of writing block)
// Content starts after Tab 1 (Q/A) or Tab 3 (colloquy)
```

### 9.5 Page Header and Footer

```typescript
// Each page:
// Header: Case name (right-aligned)
// Footer: Page number (centered)
//
// Format:
// Header: Houston v. Olivarez (right)
// Body: 25 lines with line numbers
// Footer: - 47 - (centered)
```

---

## 10. Post-Processing Rules

### 10.1 Complete Post-Processor

```typescript
// src/lib/transcription/formatter/post-processor.ts

export function postProcessText(
  text: string,
  options: PostProcessOptions = {}
): string {
  // Rule 1: Em dash → double hyphen (CRITICAL FIX)
  text = replaceEmDashWithDoubleHyphen(text);
  
  // Rule 2: Time format normalization
  text = normalizeTimeFormat(text);
  
  // Rule 3: Speaker label normalization
  // (Applied to label strings, not paragraph text)
  
  // Rule 4: Doctor → Dr. title fix
  if (options.fixDoctorTitle !== false) {
    text = fixDoctorTitle(text);
  }
  
  // Rule 5: Sentence spacing (2 spaces after . ! ?)
  text = normalizeSentenceSpacing(text, 2);
  
  // Rule 6: Diarization error merge
  // (Applied at segment level before paragraph building)
  
  return text;
}

// Rule 1 — Em dash to double hyphen
function replaceEmDashWithDoubleHyphen(text: string): string {
  return text.replace(/—/g, '--').replace(/\u2014/g, '--');
}

// Rule 2 — Time format
function normalizeTimeFormat(text: string): string {
  // 2:12 PM → 2:12 p.m.
  // 2:12pm → 2:12 p.m.
  // 14:12 → 2:12 p.m. (24-hour to 12-hour)
  // 2:12 P.M. → 2:12 p.m.
  return text
    .replace(/(\d{1,2}:\d{2})\s*([AaPp])\.?[Mm]\.?/g, (_, time, ap) => {
      const [h, m] = time.split(':').map(Number);
      const ampm = ap.toLowerCase() === 'a' ? 'a.m.' : 'p.m.';
      // Convert 24-hour if needed
      if (h >= 13) {
        return `${h - 12}:${m.toString().padStart(2, '0')} p.m.`;
      }
      return `${time} ${ampm}`;
    });
}

// Rule 3 — Speaker label normalization map
const SPEAKER_LABEL_NORMALIZATIONS: Record<string, string> = {
  'THE COURT REPORTER':     'THE REPORTER',
  'COURT REPORTER':         'THE REPORTER',
  'THE COURT VIDEOGRAPHER': 'THE VIDEOGRAPHER',
  'THE STENOGRAPHER':       'THE REPORTER',
};

function normalizeSpeakerLabel(label: string): string {
  return SPEAKER_LABEL_NORMALIZATIONS[label.toUpperCase()] ?? label;
}
```

### 10.2 Verbatim Mandate Enforcement

The formatter must NEVER delete, clean, or alter testimony content:

```typescript
// What MUST be transcribed verbatim:
// - Profanity and expletives ("Holy shit.")
// - Grammatical errors ("I seen it", "we was there")
// - Filler words (uh, um, ah) — stored, may be hidden in display
// - False starts and self-corrections
// - "Uh-huh" and "uh-uh" (do NOT convert to Yes/No)

// The quality gate will flag any transcript_word where:
// - is_deleted = TRUE  (words cannot be hard-deleted, only soft-deleted)
// - The original_word differs from corrected_word in ways that
//   suggest content alteration rather than transcription correction

// Quality gate check:
async function checkVerbatimIntegrity(transcriptionId: string): Promise<QGCheck> {
  const deletedWords = await supabase
    .from('transcript_words')
    .select('id, word, original_word')
    .eq('transcription_id', transcriptionId)
    .eq('is_deleted', true);
  
  if (deletedWords.data?.length > 0) {
    return {
      passed: false,
      severity: 'error',
      message: `${deletedWords.data.length} word(s) marked as deleted. Verbatim mandate requires all words to remain in the record. Use is_filler or hide display instead of deletion.`,
    };
  }
  return { passed: true };
}
```

---

## 11. Quality Gate Validator

The quality gate runs before every export. Error-level checks block export entirely. Warning-level checks require explicit reporter acknowledgment.

### 11.1 All Quality Gate Checks

```typescript
// src/lib/transcription/formatter/quality-gate.ts

export async function runQualityGate(
  transcriptionId: string,
  exportFormat: ExportFormat
): Promise<QualityGateResult> {
  const checks = await Promise.all([
    
    // ERROR checks — block export
    checkUnresolvedVerifyTags(transcriptionId),
    checkSpeakerMappingComplete(transcriptionId),
    checkDateConflicts(transcriptionId),
    checkCertificationBlock(transcriptionId),
    checkVerbatimIntegrity(transcriptionId),
    checkScopistNotesRemoved(transcriptionId),
    checkExhibitPageNumbers(transcriptionId),
    
    // WARNING checks — require acknowledgment
    checkFontSpacingCompliance(transcriptionId, exportFormat),
    checkLinesPerPageCompliance(transcriptionId, exportFormat),
    checkLowConfidenceWordsReviewed(transcriptionId),
    checkEmDashPresence(transcriptionId),
    checkCourtReporterLabel(transcriptionId),
    
  ]);
  
  const errors = checks.filter(c => !c.passed && c.severity === 'error');
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning');
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    canExportWithAcknowledgment: errors.length === 0 && warnings.length > 0,
  };
}
```

### 11.2 Quality Gate Check Definitions

| Check | Severity | Blocks Export | Resolution |
|---|---|---|---|
| Unresolved [VERIFY] tags | ERROR | YES | Resolve all flags |
| Speaker mapping incomplete | ERROR | YES | Complete speaker assignment modal |
| Date conflict flags unresolved | ERROR | YES | Resolve DATE_CONFLICT flags |
| Certification block empty | ERROR | YES | Reporter completes certification data |
| Words marked is_deleted=true | ERROR | YES | Restore words or justify deletion |
| Scopist notes [SCOPIST: ...] in body | ERROR | YES | Remove all editorial notes |
| Exhibit index missing page numbers | ERROR | YES | All exhibits need page references |
| Font/spacing non-compliant | WARNING | NO | Acknowledge to proceed |
| Lines/page exceeds jurisdiction max | WARNING | NO | Acknowledge to proceed |
| Low-confidence words not reviewed | WARNING | NO | Acknowledge to proceed |
| Em dash characters present (—) | WARNING | NO | Review and replace with -- |
| "THE COURT REPORTER" label found | WARNING | NO | Normalize to "THE REPORTER" |

---

## 12. Export Pipeline Integration

### 12.1 Unified Export Service

All export routes must call a single export service. No parallel implementations.

```typescript
// src/lib/transcription/formatter/export-service.ts

export async function exportTranscript(
  transcriptionId: string,
  format: ExportFormat,
  options: ExportOptions
): Promise<ExportResult> {
  
  // 1. Run quality gate
  const qgResult = await runQualityGate(transcriptionId, format);
  if (!qgResult.passed) {
    throw new QualityGateError(qgResult.errors);
  }
  
  // 2. Load paginated paragraphs from DB
  const paragraphs = await loadPaginatedParagraphs(transcriptionId);
  
  // 3. Load deposition metadata for inclusion pages
  const deposition = await loadDepositionForTranscription(transcriptionId);
  
  // 4. Generate inclusion pages
  const inclusions = await generateInclusionPages(deposition, paragraphs);
  
  // 5. Assemble in format
  switch (format) {
    case 'qa_docx':
      return assembleDocx(inclusions, paragraphs, 'qa', options);
    case 'fullname_docx':
      return assembleDocx(inclusions, paragraphs, 'fullname', options);
    case 'condensed_docx':
      return assembleCondensedDocx(inclusions, paragraphs, options);
    case 'ascii':
      return assembleAscii(inclusions, paragraphs, options);
    case 'pdf':
      return assemblePdf(inclusions, paragraphs, options);
    case 'etrans':
      return assembleEtrans(paragraphs, options);
  }
}
```

### 12.2 Deprecation Plan for Old Export Services

After new formatter is deployed:

1. `lib/export.ts` → mark `@deprecated`, redirect to new service
2. `lib/services/export.ts` → mark `@deprecated`, redirect to new service
3. Both routes (`/api/jobs/[id]/export` and `/api/transcripts/[id]/export`) → call new unified service
4. After 2 weeks of stable operation → delete deprecated files

---

## 13. File-by-File Implementation Plan

### Files to CREATE (new)

```
src/lib/transcription/formatter/
  index.ts               — Entry point: formatTranscript()
  section-detector.ts    — Section detection engine
  paragraph-builder.ts   — Paragraph assembly with all type rules
  post-processor.ts      — Em dash fix, time format, label normalization
  paginator.ts           — 25-lines/page with line numbers
  inclusion-pages.ts     — Title, appearances, index, certificate generators
  quality-gate.ts        — All 12 quality gate checks
  export-service.ts      — Unified export entry point
  docx-assembler.ts      — DOCX-specific rendering (Tab stops, fonts, spacing)
  ascii-assembler.ts     — ASCII/TXT export for Case Catalyst
  
supabase/migrations/
  20260306_depositions.sql          — depositions table + jobs.deposition_id FK
  20260306_transcript_words.sql     — transcript_words table + indexes
  20260306_transcript_paragraphs.sql — transcript_paragraphs table + paragraph_type enum
  20260306_speaker_assignments.sql  — speaker_assignments table
  20260306_jurisdiction_configs.sql — jurisdiction_configs + TX seed
  20260306_hydrate_words.sql        — One-time JSONB → rows migration
```

### Files to MODIFY (existing)

```
src/lib/transcription/post-process.ts
  - Rename insertEmDashes() → insertDoubleHyphens()
  - Replace all '—' output with '--'
  
src/lib/transcription/legal-formatter.ts
  - Mark entire file @deprecated
  - Add: 'Use src/lib/transcription/formatter/index.ts instead'
  - Do NOT delete until new formatter is validated
  
src/lib/transcription/buildKeywords.ts
  - Implement buildKeywordsForJob() using custom_vocabularies + firm_vocabularies
  - Phase 4: add intake-parser extraction
  
app/api/jobs/[id]/export/route.ts
  - Wire to new export-service.ts
  - Remove direct lib/export.ts + lib/services/export.ts imports
  
app/api/transcripts/[id]/export/route.ts
  - Same as above
  
lib/export.ts
  - Add @deprecated JSDoc
  - Keep functioning until new service is stable (2-week runway)
  
lib/services/export.ts
  - Same as above
```

---

## 14. Testing Requirements

### 14.1 Unit Tests Required

```typescript
// tests/unit/formatter/

section-detector.test.ts
  - Detects PRE_DEPOSITION before videographer opening
  - Correctly identifies DIRECT EXAMINATION start
  - Detects off-record/on-record pairs
  - Handles transcripts with no pre-deposition material
  - Handles multi-examination (direct + cross + redirect)

paragraph-builder.test.ts
  - Q./A. gets Zone 1 in examination sections
  - All non-Q/A gets Zone 3
  - Re-entry marker on first Q. after colloquy interruption
  - No re-entry marker on subsequent Qs without interruption
  - BY MR. ___: byline appears after DIRECT EXAMINATION header
  - BY MR. ___: byline appears after back-on-record
  - FURTHER DEPONENT SAYETH NOT inserted in CLOSING section
  - "THE COURT REPORTER" normalized to "THE REPORTER"

post-processor.test.ts
  - Em dash (—) replaced with (--)
  - Unicode em dash (\u2014) replaced with (--)
  - "2:12 PM" → "2:12 p.m."
  - "14:12" → "2:12 p.m."
  - "2:12pm" → "2:12 p.m."
  - Doctor + name → Dr. + name
  - Sentence spacing: 2 spaces after . ! ?

paginator.test.ts
  - Exactly 25 lines per page
  - Multi-line Q/A wraps counted correctly
  - Line numbers 1–25 on every page
  - Page break does not split mid-word

quality-gate.test.ts
  - Unresolved VERIFY tags → ERROR
  - Unmapped speakers → ERROR
  - is_deleted = true words → ERROR
  - Scopist notes in body → ERROR
  - Blank exhibit page numbers → ERROR
  - Em dash in text → WARNING
  - "THE COURT REPORTER" label → WARNING
```

### 14.2 Integration Test: Olivarez Deposition

The Olivarez deposition (Houston v. Olivarez, DC-25-07070) is the canonical test case. The formatter output must match the corrected transcript from the Formatting Guide case study.

**Required assertions:**
- All 28 em dashes corrected to double hyphens
- Speaker labels normalized throughout
- Q/A formatting in examination section
- (BY MR. MUNOZ) re-entry markers in correct positions
- Off-record/on-record pairs formatted correctly
- All 6 exhibits in exhibit index with page numbers
- Certificate page generated with reporter data
- Output passes quality gate with zero errors

---

## 15. Dependency Chain & Build Order

```
Week 1
  ├── Database migrations (depositions, transcript_words, transcript_paragraphs,
  │    speaker_assignments, jurisdiction_configs)
  ├── Hydration migration (JSONB words → transcript_words rows)
  └── Fix BUG-03: buildKeywords.ts stub → real implementation

Week 2
  ├── Section detection engine (section-detector.ts)
  ├── Post-processor overhaul (em dash, time format, label normalization)
  └── Paragraph builder — core Q/A, colloquy, section headers

Week 3
  ├── Paragraph builder — re-entry markers, BY MR. ___: bylines, parentheticals
  ├── Closing language (FURTHER DEPONENT, concluded parenthetical)
  └── Paginator (25 lines/page, line numbers)

Week 4
  ├── Inclusion page generators (title, appearances, examination index, exhibits, cert)
  ├── DOCX assembler (tab stops, fonts, spacing — replace legal-formatter.ts)
  └── Quality gate (all 12 checks)

Week 5
  ├── Export service consolidation (deprecate lib/export.ts + lib/services/export.ts)
  ├── Olivarez integration test
  └── Bourbois integration test

Week 6
  └── Reporter acceptance testing with real depositions
```

### The Non-Negotiable Rule

**The formatter is not "done" until a licensed Texas CSR can attach their license number to a transcript produced by this system and deliver it to a law firm for use in litigation.** Every spec in this document exists in service of that single requirement.

---

## Appendix A — Tab Stop Reference

| Tabs | Inches | Characters | Used For |
|---|---|---|---|
| 1 tab | 0.5" | Position 6 | Q. and A. labels only |
| 2 tabs | 1.0" | Position 11 | Q/A continuation wrap lines |
| 3 tabs | 1.5" | Position 16 | Everything else (speaker labels, parentheticals, headers) |
| 0 tabs | 0.0" | Left margin | BY MR. ___: examination bylines only |

## Appendix B — Speaker Label Quick Reference

| Speaker | In Examination | In Colloquy/Oath |
|---|---|---|
| Examining attorney | Q. | MR. [LAST NAME]: |
| Witness / Deponent | A. | THE WITNESS: |
| Cross-examining attorney | Q. | MR. [LAST NAME]: |
| Court reporter | — not in Q/A — | THE REPORTER: *(not "THE COURT REPORTER")* |
| Videographer | — not in Q/A — | THE VIDEOGRAPHER: |
| Interpreter | — not in Q/A — | THE INTERPRETER: |

## Appendix C — Quality Gate Error Codes

| Code | Severity | Description |
|---|---|---|
| QG-001 | ERROR | Unresolved [VERIFY] tags |
| QG-002 | ERROR | Speaker mapping incomplete |
| QG-003 | ERROR | Date conflict flags unresolved |
| QG-004 | ERROR | Certification block empty |
| QG-005 | ERROR | Words marked is_deleted=true |
| QG-006 | ERROR | Scopist notes remaining in body |
| QG-007 | ERROR | Exhibit index missing page numbers |
| QG-008 | WARNING | Font/spacing non-compliant |
| QG-009 | WARNING | Lines/page exceeds maximum |
| QG-010 | WARNING | Low-confidence words unreviewed |
| QG-011 | WARNING | Em dash (—) characters present |
| QG-012 | WARNING | "THE COURT REPORTER" label detected |

---

*Depo-Pro Transcript Formatter Specification v1.0 · March 2026 · Internal Engineering Document*  
*Authority: Texas Uniform Format Manual (UFM/JBCC) · Morson's English Guide · Formatting Guide v1.0*  
