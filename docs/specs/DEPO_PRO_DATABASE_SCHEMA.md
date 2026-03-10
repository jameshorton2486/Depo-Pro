# Depo-Pro — Complete Database Schema & Architecture

**Version:** 2.0  
**Date:** March 2026  
**Database:** PostgreSQL 15 / Supabase  
**Status:** Canonical — supersedes all prior schema documents  
**Classification:** Internal Engineering Reference

---

## Contents

1. [Reconciliation: Proposed Schema vs. Existing Codebase](#1-reconciliation)
2. [Architecture Principles](#2-architecture-principles)
3. [Entity Relationship Overview](#3-entity-relationship-overview)
4. [Complete Table Definitions](#4-complete-table-definitions)
5. [Indexes — Performance Strategy](#5-indexes)
6. [Row-Level Security Policies](#6-row-level-security-policies)
7. [Functions & Triggers](#7-functions--triggers)
8. [Migration Plan](#8-migration-plan)
9. [TypeScript Interface Map](#9-typescript-interface-map)
10. [Naming Conventions & Decision Log](#10-naming-conventions--decision-log)

---

## 1. Reconciliation

The proposed schema (v1.0) introduced clean domain modeling but conflicted with the existing working codebase in several places. This document resolves all conflicts with zero breakage to existing API routes, RLS policies, or frontend components.

### Conflict Resolution Table

| Proposed Table | Existing Table | Decision | Rationale |
|---|---|---|---|
| `organizations` | `firms` | **Keep `firms`** | 14 API routes, 8 migrations, 40+ RLS policies reference `firms`. Renaming risks cascading breakage with no user-facing benefit. |
| `users` | `profiles` | **Keep `profiles`** | Supabase Auth requires `profiles` pattern; `auth.users` is the actual users table. |
| `depositions` | columns on `jobs` | **Add `depositions` table** | New table with `job_id` FK. Non-breaking — existing jobs continue working. |
| `participants` | not present | **Add `participants` table** | Clean addition — no conflicts. |
| `vocabulary_terms` | `custom_vocabularies` + `firm_vocabularies` | **Add `vocabulary_terms`, map to existing** | Existing tables power the Deepgram keyword builder. New table adds case-level vocabulary with richer type classification. |
| `speakers` | `speaker_assignments` (planned) | **Single `speaker_assignments` table** | Combines speaker identity + role + label in one table. The proposed `speakers` table was missing the label columns needed by the formatter. |
| `transcript_words` | `transcriptions.words` JSONB | **Add `transcript_words` rows (Hybrid)** | Raw JSONB is immutable AI output. `transcript_words` rows are mutable editor layer. Both coexist. |
| `transcript_paragraphs` | not present | **Add as specified** | Required by formatter engine. |
| `transcript_flags` | `flagged_words` | **Keep `flagged_words` + add `transcript_flags`** | `flagged_words` = AI confidence flags (PENDING/CORRECTED/CONFIRMED/SKIPPED). `transcript_flags` = legal/formatting flags ([VERIFY], [DATE CONFLICT], [SCOPIST:]). Different concepts. |
| `ai_suggestions` | not present | **Add as specified** | Required for AI proofreading sidebar. |
| `transcript_versions` | `transcript_integrity_chain` | **Keep `transcript_integrity_chain`** | SHA-256 linked hash chain already built, legally defensible, more robust than simple versions. |
| `transcript_pages` | not present (planned) | **Merge into `transcript_paragraphs`** | `page_number`, `line_number_start`, `line_number_end` added to `transcript_paragraphs`. One table is simpler. |
| `exhibits` | `job_exhibits` (partial) | **Add `exhibits` + keep job_exhibits** | New `exhibits` table has richer metadata. `job_exhibits` referenced in active API routes — keep both temporarily. |
| `exhibit_markers` | not present | **Add as specified** | Links exhibits to word positions in transcript. |
| `audit_logs` | `audit_log` | **Keep `audit_log`** | Existing table has append-only constraint, SHA-256 chain, and 23 action types already seeded. |

---

## 2. Architecture Principles

### Immutability Chain

```
transcriptions.deepgram_raw_json    → IMMUTABLE. Never touched after Deepgram webhook.
transcriptions.original_transcript  → IMMUTABLE. Protected by DB trigger.
transcript_integrity_chain          → APPEND-ONLY. Linked SHA-256 hash chain.
transcript_words                    → MUTABLE editor layer. Edits logged to transcript_edits.
transcript_paragraphs               → REBUILT on formatter run. Derived from transcript_words.
```

### Tenant Isolation

Every data table carries a `firm_id` column for Row-Level Security enforcement. No query can cross firm boundaries at the database layer.

### No Hard Deletes

Critical legal data uses soft deletes only:
- `transcript_words.is_deleted = TRUE` (word removed from display; retained in record)
- `jobs.status = 'ARCHIVED'` (not deleted)
- `flagged_words` and `transcript_flags` are never deleted — only resolved

---

## 3. Entity Relationship Overview

```
firms (existing)
 ├── profiles (existing — users)
 └── depositions (NEW)
      ├── participants (NEW)
      ├── documents (NEW — intake notices, exhibits)
      ├── vocabulary_terms (NEW — case dictionary → Deepgram keyterms)
      ├── exhibits (NEW)
      └── jobs (existing — add deposition_id FK)
           └── transcriptions (existing)
                ├── transcript_words (NEW — editable word layer)
                │    ├── transcript_flags (NEW — VERIFY/DATE CONFLICT/SCOPIST)
                │    ├── exhibit_markers (NEW — links exhibit to word position)
                │    └── ai_suggestions (NEW — proofreading suggestions)
                ├── transcript_paragraphs (NEW — formatter output)
                ├── speaker_assignments (NEW — replaces format_settings JSONB)
                ├── flagged_words (existing — AI confidence flags)
                ├── transcript_integrity_chain (existing — SHA-256 chain)
                └── transcription_edits (existing — edit history)
```

---

## 4. Complete Table Definitions

---

### 4.1 `firms` — Existing (No Changes)

```sql
-- No changes required. Keep as-is.
-- Existing columns: id, name, address, phone, email, settings, is_active, created_at, updated_at
-- This is the "organizations" concept from the proposed schema.
```

---

### 4.2 `profiles` — Existing (Minor Addition)

```sql
-- Add license fields for reporter certification
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS license_number    TEXT,
  ADD COLUMN IF NOT EXISTS license_state     CHAR(2),
  ADD COLUMN IF NOT EXISTS license_expires   DATE,
  ADD COLUMN IF NOT EXISTS certification_body TEXT;  -- 'JBCC', 'NCRA', etc.

-- Add VIDEOGRAPHER to role enum if not present
-- (check existing user_role enum in base_schema.sql first)
```

---

### 4.3 `depositions` — NEW

The core legal event. A deposition is a distinct legal proceeding — richer than a processing job.

```sql
CREATE TABLE depositions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- Case identification
  case_style               TEXT NOT NULL,       -- 'Houston v. Olivarez'
  cause_number             TEXT NOT NULL,       -- 'DC-25-07070'
  court_name               TEXT,               -- '191st Judicial District Court'
  county                   TEXT,               -- 'Dallas County'
  state_code               CHAR(2) NOT NULL DEFAULT 'TX',
  incident_date            DATE,               -- For date consistency checker

  -- Deponent
  deponent_name            TEXT NOT NULL,
  deponent_title           TEXT,               -- 'Dr.', 'Officer', etc.

  -- Scheduling
  deposition_date          DATE,
  start_time               TIME,
  end_time                 TIME,
  timezone                 TEXT DEFAULT 'America/Chicago',
  location                 TEXT,
  is_remote                BOOLEAN DEFAULT FALSE,
  platform                 TEXT,               -- 'Zoom', 'Teams', 'In-person'
  zoom_link                TEXT,

  -- Personnel
  assigned_reporter_id     UUID REFERENCES profiles(id),
  assigned_scopist_id      UUID REFERENCES profiles(id),
  assigned_videographer_id UUID REFERENCES profiles(id),

  -- Ordering counsel
  ordering_attorney        TEXT,
  ordering_firm            TEXT,
  ordering_email           TEXT,
  ordering_phone           TEXT,

  -- Intake
  intake_document_url      TEXT,
  deepgram_keywords        TEXT[],             -- Auto-populated from intake parser

  -- Jurisdiction / formatting
  jurisdiction_id          UUID,               -- REFERENCES jurisdiction_configs(id)
  volume_number            INTEGER DEFAULT 1,

  -- Status
  status                   TEXT NOT NULL DEFAULT 'scheduled',
  -- 'scheduled'|'in_progress'|'transcribing'|'in_review'|'certified'|'delivered'|'cancelled'

  -- Notes
  reporter_notes           TEXT,
  internal_notes           TEXT,

  -- Timestamps
  created_by               UUID REFERENCES profiles(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_depositions_firm       ON depositions(firm_id);
CREATE INDEX idx_depositions_status     ON depositions(status);
CREATE INDEX idx_depositions_reporter   ON depositions(assigned_reporter_id);
CREATE INDEX idx_depositions_date       ON depositions(deposition_date DESC);
CREATE INDEX idx_depositions_state      ON depositions(state_code);

-- Add deposition_id to existing jobs table (non-breaking — nullable)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposition_id UUID REFERENCES depositions(id);
CREATE INDEX idx_jobs_deposition ON jobs(deposition_id) WHERE deposition_id IS NOT NULL;
```

---

### 4.4 `participants` — NEW

All individuals involved in a deposition proceeding.

```sql
CREATE TYPE participant_role AS ENUM (
  'WITNESS',
  'EXAMINING_ATTORNEY',
  'CROSS_EXAMINING_ATTORNEY',
  'DEFENDING_ATTORNEY',
  'COURT_REPORTER',
  'VIDEOGRAPHER',
  'INTERPRETER',
  'PARALEGAL',
  'OBSERVER'
);

CREATE TABLE participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id   UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- Identity
  full_name       TEXT NOT NULL,
  title           TEXT,                -- 'Mr.', 'Ms.', 'Dr.', 'Officer'
  last_name_caps  TEXT,                -- 'MUNOZ' — for transcript labels

  -- Role
  role            participant_role NOT NULL,
  law_firm        TEXT,
  party           TEXT,               -- 'Plaintiff', 'Defendant', 'Third Party'

  -- Contact
  email           TEXT,
  phone           TEXT,
  address         TEXT,

  -- Transcript label (auto-derived but overrideable)
  -- e.g., 'MR. MUNOZ', 'THE WITNESS', 'THE REPORTER'
  transcript_label TEXT,

  -- Profile link (if participant is a Depo-Pro user)
  profile_id      UUID REFERENCES profiles(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_deposition ON participants(deposition_id);
CREATE INDEX idx_participants_firm       ON participants(firm_id);
CREATE INDEX idx_participants_role       ON participants(deposition_id, role);
```

---

### 4.5 `documents` — NEW

Uploaded files related to a deposition — notices, orders, rough drafts.

```sql
CREATE TYPE document_type AS ENUM (
  'DEPOSITION_NOTICE',
  'SUBPOENA',
  'COURT_ORDER',
  'SCHEDULING_SHEET',
  'ROUGH_DRAFT',
  'FINAL_TRANSCRIPT',
  'EXHIBIT_LIST',
  'PLEADING',
  'OTHER'
);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id   UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  document_type   document_type NOT NULL,

  -- AI parse results (from intake parser)
  parsed_data     JSONB,
  parse_status    TEXT DEFAULT 'pending',
  -- 'pending'|'processing'|'complete'|'failed'

  uploaded_by     UUID REFERENCES profiles(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_deposition ON documents(deposition_id);
CREATE INDEX idx_documents_type       ON documents(document_type);
```

---

### 4.6 `vocabulary_terms` — NEW

Case-specific vocabulary extracted from intake documents. Feeds Deepgram keyterm boost.

```sql
CREATE TYPE vocab_term_type AS ENUM (
  'PERSON',
  'COMPANY',
  'MEDICAL',
  'TECHNICAL',
  'LEGAL',
  'LOCATION',
  'PRODUCT',
  'ABBREVIATION',
  'CUSTOM'
);

CREATE TABLE vocabulary_terms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id   UUID REFERENCES depositions(id) ON DELETE CASCADE,
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  term            TEXT NOT NULL,
  term_type       vocab_term_type NOT NULL DEFAULT 'CUSTOM',
  boost           NUMERIC(3,1) DEFAULT 1.0 CHECK (boost >= 0.0 AND boost <= 5.0),
  pronunciation   TEXT,               -- Phonetic hint for Deepgram

  -- Source of this term
  source          TEXT,               -- 'intake_parser'|'manual'|'firm_library'
  confidence      NUMERIC(3,2),       -- AI extraction confidence
  added_by        UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A term can be deposition-specific or firm-wide (deposition_id NULL = firm-wide)
  CONSTRAINT chk_vocab_scope CHECK (
    deposition_id IS NOT NULL OR firm_id IS NOT NULL
  )
);

CREATE INDEX idx_vocab_deposition ON vocabulary_terms(deposition_id);
CREATE INDEX idx_vocab_firm       ON vocabulary_terms(firm_id);
CREATE INDEX idx_vocab_type       ON vocabulary_terms(term_type);
CREATE INDEX idx_vocab_term       ON vocabulary_terms(term);
```

> **Note:** `custom_vocabularies` and `firm_vocabularies` tables remain active and unchanged. `vocabulary_terms` is the new case-level addition. The Deepgram keyword builder will query all three sources when building keyterm arrays.

---

### 4.7 `exhibits` — NEW

Exhibit management with full metadata.

```sql
CREATE TABLE exhibits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id    UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- Exhibit identification
  exhibit_number   TEXT NOT NULL,        -- '1', '2', 'A', 'B'
  party            TEXT,                 -- 'Plaintiff', 'Defendant', 'Court'
  full_label       TEXT,                 -- 'Plaintiff\'s Exhibit No. 1'
  description      TEXT,                 -- 'Vehicle damage photo'

  -- Files
  file_url         TEXT,
  stamped_file_url TEXT,                 -- Bates-stamped version
  file_type        TEXT,                 -- 'PDF', 'IMAGE', 'VIDEO', 'OTHER'
  mime_type        TEXT,
  file_size_bytes  BIGINT,
  page_count       INTEGER,

  -- Bates stamping
  bates_prefix     TEXT,
  bates_start      INTEGER,
  bates_end        INTEGER,
  is_stamped       BOOLEAN DEFAULT FALSE,

  -- Transcript reference (set during pagination)
  transcript_page  INTEGER,              -- Page where exhibit was marked
  marked_at_time   NUMERIC,             -- Audio timestamp when marked

  uploaded_by      UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(deposition_id, exhibit_number)
);

CREATE INDEX idx_exhibits_deposition ON exhibits(deposition_id);
CREATE INDEX idx_exhibits_firm       ON exhibits(firm_id);
```

---

### 4.8 `jobs` — Existing (Minor Additions)

```sql
-- Already added: deposition_id FK
-- Add: volume tracking for multi-volume depositions
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS volume_number    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_volumes    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS format_settings  JSONB DEFAULT NULL;
  -- format_settings already added in migration 20260301120000
```

---

### 4.9 `transcriptions` — Existing (Minor Additions)

```sql
-- Already has: deepgram_raw_json, original_transcript, words (JSONB), speakers (JSONB)
-- words JSONB = immutable raw Deepgram output
-- transcript_words rows = mutable editor layer (new table below)

ALTER TABLE transcriptions
  ADD COLUMN IF NOT EXISTS words_hydrated  BOOLEAN DEFAULT FALSE,
  -- Set TRUE after transcript_words rows are populated from words JSONB
  ADD COLUMN IF NOT EXISTS formatter_run_at TIMESTAMPTZ,
  -- Set when transcript_paragraphs are generated
  ADD COLUMN IF NOT EXISTS jurisdiction_id  UUID;
  -- REFERENCES jurisdiction_configs(id)
```

---

### 4.10 `transcript_words` — NEW (Critical)

The mutable editing layer. Words are parsed from Deepgram JSON and stored as individual rows.

```sql
CREATE TABLE transcript_words (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- Word content
  word             TEXT NOT NULL,          -- Original Deepgram word
  punctuated_word  TEXT,                   -- Deepgram punctuated form
  display_word     TEXT,                   -- Current display form (after corrections)

  -- Timing (seconds from audio start)
  start_time       NUMERIC(10,3) NOT NULL,
  end_time         NUMERIC(10,3) NOT NULL,

  -- Confidence
  confidence       NUMERIC(4,3) NOT NULL
                   CHECK (confidence >= 0.0 AND confidence <= 1.0),

  -- Speaker
  speaker_index    INTEGER,                -- Deepgram speaker 0,1,2...

  -- Position (global word order in transcript)
  position_index   INTEGER NOT NULL,
  paragraph_id     UUID,                   -- Set after paragraph detection

  -- Edit state
  is_filler        BOOLEAN NOT NULL DEFAULT FALSE,
  -- Filler: uh, um, ah, you know, like, okay
  -- Hidden from display when is_filler=TRUE and clean_verbatim=TRUE
  -- NEVER deleted — verbatim mandate

  is_corrected     BOOLEAN NOT NULL DEFAULT FALSE,
  original_word    TEXT,                   -- Preserved original when corrected

  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Soft delete ONLY — data is never removed from DB
  -- Setting is_deleted=TRUE triggers quality gate QG-005

  -- Validation
  CONSTRAINT chk_tw_time_range CHECK (end_time >= start_time),
  CONSTRAINT chk_tw_correction CHECK (
    (is_corrected = FALSE) OR
    (is_corrected = TRUE AND original_word IS NOT NULL)
  )
);

-- Performance indexes
CREATE UNIQUE INDEX idx_tw_position
  ON transcript_words(transcription_id, position_index);

CREATE INDEX idx_tw_confidence
  ON transcript_words(transcription_id, confidence ASC)
  WHERE is_deleted = FALSE;

CREATE INDEX idx_tw_speaker
  ON transcript_words(transcription_id, speaker_index);

CREATE INDEX idx_tw_paragraph
  ON transcript_words(paragraph_id)
  WHERE paragraph_id IS NOT NULL;

CREATE INDEX idx_tw_filler
  ON transcript_words(transcription_id)
  WHERE is_filler = TRUE;

CREATE INDEX idx_tw_low_confidence
  ON transcript_words(transcription_id, confidence)
  WHERE confidence < 0.80 AND is_deleted = FALSE;

CREATE INDEX idx_tw_pending_review
  ON transcript_words(transcription_id, confidence, position_index)
  WHERE confidence < 0.80 AND is_corrected = FALSE AND is_deleted = FALSE;

-- Full-text search
CREATE INDEX idx_tw_word_search
  ON transcript_words USING gin(to_tsvector('english', word));
```

---

### 4.11 `speaker_assignments` — NEW

Maps Deepgram's generic Speaker 0/1/2 labels to real participant identities.

```sql
CREATE TABLE speaker_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- Speaker identity
  speaker_index    INTEGER NOT NULL,       -- Deepgram speaker 0, 1, 2...
  participant_id   UUID REFERENCES participants(id),
                                          -- Links to participants table
  speaker_name     TEXT NOT NULL,         -- 'Juan M. Munoz'

  -- Role
  role             TEXT NOT NULL,
  -- 'examining_attorney'|'cross_examining_attorney'|'witness'|
  -- 'reporter'|'videographer'|'interpreter'|'other'

  -- Transcript labels
  display_label    TEXT NOT NULL,         -- 'MR. MUNOZ' — colloquy label
  qa_label         CHAR(1),              -- 'Q' or 'A' — null if not Q/A

  -- Audio sample for UI identification
  sample_start_time NUMERIC(10,3),       -- Start of sample clip for speaker modal
  sample_end_time   NUMERIC(10,3),

  assigned_by      UUID REFERENCES profiles(id),
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(transcription_id, speaker_index)
);

CREATE INDEX idx_sa_transcription ON speaker_assignments(transcription_id);
CREATE INDEX idx_sa_participant   ON speaker_assignments(participant_id);
```

---

### 4.12 `transcript_paragraphs` — NEW

The formatter's output. One row per logical paragraph in the transcript.

```sql
CREATE TYPE paragraph_type AS ENUM (
  'COLLOQUY',            -- Zone 3: MR. MUNOZ:, THE REPORTER:, etc.
  'QUESTION',            -- Zone 1: Q.
  'ANSWER',              -- Zone 1: A.
  'PARENTHETICAL',       -- Zone 3: (Witness complies)
  'SECTION_HEADER',      -- Zone 3 bold: DIRECT EXAMINATION
  'EXAMINATION_BYLINE',  -- Left margin bold: BY MR. MUNOZ:
  'REENTRY_MARKER',      -- Zone 1: Q. (BY MR. MUNOZ) first Q after interruption
  'OFF_RECORD',          -- Zone 3: (Off the record at 2:12 p.m.)
  'ON_RECORD',           -- Zone 3: (Back on the record at 2:23 p.m.)
  'EXHIBIT_MARK',        -- Zone 3: (Plaintiff's Exhibit No. 1 marked...)
  'PRE_DEPOSITION',      -- Off-record material before videographer opens
  'CLOSING_ASTERISKS',   -- * * * * *
  'FURTHER_SAYETH',      -- FURTHER DEPONENT SAYETH NOT.
  'DEPO_CONCLUDED'       -- (Deposition of X concluded at Y p.m.)
);

CREATE TYPE deposition_section AS ENUM (
  'PRE_DEPOSITION',
  'OPENING',
  'OATH',
  'DIRECT',
  'CROSS',
  'REDIRECT',
  'RECROSS',
  'EXAMINATION_N',       -- Additional examinations
  'BREAK_OFF',
  'BREAK_ON',
  'CLOSING'
);

CREATE TABLE transcript_paragraphs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- Paragraph content
  paragraph_type   paragraph_type NOT NULL,
  text             TEXT NOT NULL,
  formatted_text   TEXT,                 -- Post-processed text (em dashes fixed, etc.)

  -- Word range
  start_word_idx   INTEGER,             -- position_index of first word
  end_word_idx     INTEGER,             -- position_index of last word

  -- Speaker
  speaker_index    INTEGER,
  speaker_label    TEXT,                -- Resolved label: 'MR. MUNOZ', 'THE REPORTER'
  qa_label         CHAR(1),            -- 'Q' or 'A' — null if not Q/A

  -- Section context
  deposition_section deposition_section,

  -- Examination context (for Q/A sections)
  examining_speaker_index  INTEGER,    -- Speaker who is asking Q.
  witness_speaker_index    INTEGER,    -- Speaker who is giving A.

  -- Formatter flags
  requires_reentry_marker  BOOLEAN DEFAULT FALSE,
  has_interruption         BOOLEAN DEFAULT FALSE,
  preceded_by_colloquy     BOOLEAN DEFAULT FALSE,

  -- Section manual override
  section_override         BOOLEAN DEFAULT FALSE,
  section_override_by      UUID REFERENCES profiles(id),
  section_override_at      TIMESTAMPTZ,

  -- Sequence
  paragraph_order  INTEGER NOT NULL,

  -- Pagination (set during paginator run)
  page_number          INTEGER,
  line_number_start    INTEGER,        -- 1–25 on its page
  line_number_end      INTEGER,
  line_count           INTEGER,        -- How many physical lines this paragraph occupies

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tp_order
  ON transcript_paragraphs(transcription_id, paragraph_order);

CREATE INDEX idx_tp_type
  ON transcript_paragraphs(transcription_id, paragraph_type);

CREATE INDEX idx_tp_section
  ON transcript_paragraphs(transcription_id, deposition_section);

CREATE INDEX idx_tp_page
  ON transcript_paragraphs(transcription_id, page_number);
```

---

### 4.13 `transcript_flags` — NEW

Legal and formatting flags — distinct from `flagged_words` (AI confidence flags).

```sql
CREATE TYPE transcript_flag_type AS ENUM (
  'VERIFY',              -- [VERIFY] — reporter must check this word/phrase
  'DATE_CONFLICT',       -- Date in testimony conflicts with case incident_date
  'SPEAKER_CONFLICT',    -- Speaker attribution uncertain
  'INCOMPLETE',          -- Sentence is incomplete/cut off
  'SCOPIST_NOTE',        -- [SCOPIST: ...] — editorial note to remove before export
  'VERBATIM_CONCERN',    -- Possible verbatim mandate violation
  'FORMATTING_ERROR',    -- Tab, spacing, label formatting error
  'QUALITY_GATE'         -- Raised by quality gate pre-export check
);

CREATE TYPE flag_severity AS ENUM (
  'INFO',
  'WARNING',
  'ERROR',               -- Blocks export until resolved
  'CRITICAL'
);

CREATE TABLE transcript_flags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- What is flagged
  word_id          UUID REFERENCES transcript_words(id),
  paragraph_id     UUID REFERENCES transcript_paragraphs(id),
  word_index       INTEGER,             -- position_index of flagged word

  -- Flag classification
  flag_type        transcript_flag_type NOT NULL,
  severity         flag_severity NOT NULL DEFAULT 'WARNING',
  message          TEXT NOT NULL,       -- Human-readable description
  auto_generated   BOOLEAN DEFAULT FALSE,

  -- Resolution
  is_resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by      UUID REFERENCES profiles(id),
  resolved_at      TIMESTAMPTZ,
  resolution_note  TEXT,

  -- Quality gate code (for QG-001 through QG-012)
  quality_gate_code TEXT,              -- 'QG-001', 'QG-003', etc.

  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tf_transcription  ON transcript_flags(transcription_id);
CREATE INDEX idx_tf_unresolved     ON transcript_flags(transcription_id, is_resolved)
  WHERE is_resolved = FALSE;
CREATE INDEX idx_tf_type           ON transcript_flags(transcription_id, flag_type);
CREATE INDEX idx_tf_severity       ON transcript_flags(transcription_id, severity)
  WHERE is_resolved = FALSE;
```

---

### 4.14 `exhibit_markers` — NEW

Links exhibits to their position in the transcript.

```sql
CREATE TABLE exhibit_markers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibit_id     UUID NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id        UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  word_id        UUID REFERENCES transcript_words(id),
  word_index     INTEGER NOT NULL,     -- position_index where exhibit was marked
  paragraph_id   UUID REFERENCES transcript_paragraphs(id),

  -- Set during pagination
  page_number    INTEGER,
  line_number    INTEGER,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_em_exhibit        ON exhibit_markers(exhibit_id);
CREATE INDEX idx_em_transcription  ON exhibit_markers(transcription_id);
```

---

### 4.15 `ai_suggestions` — NEW

Non-auto-applied AI proofreading suggestions. Displayed in the AI sidebar for reporter review.

```sql
CREATE TYPE suggestion_type AS ENUM (
  'WORD_CORRECTION',
  'SPEAKER_RELABEL',
  'PUNCTUATION',
  'FORMATTING',
  'LEGAL_TERM',
  'CONSISTENCY'           -- Same term spelled differently elsewhere
);

CREATE TABLE ai_suggestions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  word_id          UUID REFERENCES transcript_words(id),
  word_index       INTEGER NOT NULL,

  suggestion_type  suggestion_type NOT NULL,
  original_text    TEXT NOT NULL,
  suggested_text   TEXT NOT NULL,
  explanation      TEXT,               -- Shown to reporter: "Deepgram likely misheard..."
  confidence       NUMERIC(3,2),

  -- Rule source (which reference was consulted)
  rule_source      TEXT,               -- 'morsons'|'gregg'|'cmos'|'model'|'consistency'

  -- Status
  status           TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'|'accepted'|'rejected'|'ignored'

  reviewed_by      UUID REFERENCES profiles(id),
  reviewed_at      TIMESTAMPTZ,

  -- Style guide RAG context (Phase 4+)
  style_chunk_ids  UUID[],             -- IDs of style_reference_chunks used

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_transcription ON ai_suggestions(transcription_id);
CREATE INDEX idx_ai_pending       ON ai_suggestions(transcription_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_ai_word          ON ai_suggestions(word_id);
```

---

### 4.16 `jurisdiction_configs` — NEW

Multi-state formatting configuration. Each state has its own formatting rules.

```sql
CREATE TABLE jurisdiction_configs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code             CHAR(2) UNIQUE NOT NULL,
  state_name             TEXT NOT NULL,

  -- Typography
  font                   TEXT NOT NULL DEFAULT 'Courier New',
  font_size_pt           INTEGER NOT NULL DEFAULT 12,

  -- Page layout
  lines_per_page         INTEGER NOT NULL DEFAULT 25,
  left_margin_inches     NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  right_margin_inches    NUMERIC(4,3) NOT NULL DEFAULT 0.375,
  top_margin_inches      NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  bottom_margin_inches   NUMERIC(4,3) NOT NULL DEFAULT 1.0,

  -- Tab system (spaces from left margin, Courier New 12pt @ 10cpi)
  qa_signifier_spaces    INTEGER NOT NULL DEFAULT 5,    -- Zone 1: Q./A.
  qa_text_offset_spaces  INTEGER NOT NULL DEFAULT 10,   -- Zone 2: continuation
  colloquy_indent_spaces INTEGER NOT NULL DEFAULT 15,   -- Zone 3: everything else

  -- Line standards
  min_chars_per_line     INTEGER NOT NULL DEFAULT 56,
  max_chars_per_line     INTEGER NOT NULL DEFAULT 68,

  -- Requirements
  require_line_numbers   BOOLEAN NOT NULL DEFAULT TRUE,
  require_bookmarks      BOOLEAN NOT NULL DEFAULT FALSE,  -- CA appellate: true
  require_searchable_pdf BOOLEAN NOT NULL DEFAULT FALSE,  -- CA: true
  upper_case_speaker_ids BOOLEAN NOT NULL DEFAULT FALSE,  -- OH: true

  -- Retention
  notes_retention_years  INTEGER NOT NULL DEFAULT 3,

  -- Certification
  certification_body     TEXT,                           -- 'JBCC/UFM', 'NCRA', etc.
  certification_language TEXT,                           -- Full cert block verbatim text

  -- Notes on jurisdiction-specific quirks
  notes                  TEXT,

  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data for all 10 jurisdictions
INSERT INTO jurisdiction_configs
  (state_code, state_name, left_margin_inches, right_margin_inches,
   qa_signifier_spaces, qa_text_offset_spaces, colloquy_indent_spaces,
   min_chars_per_line, max_chars_per_line,
   require_bookmarks, require_searchable_pdf, upper_case_speaker_ids,
   notes_retention_years, certification_body)
VALUES
  -- Texas (primary)
  ('TX','Texas',1.0,0.375,5,10,15,56,63,false,false,false,5,'JBCC/UFM'),
  -- California
  ('CA','California',1.25,0.375,8,8,15,56,63,true,true,false,5,'CSR/CRC'),
  -- Florida
  ('FL','Florida',1.0,0.375,5,10,15,56,63,false,false,false,5,'AOC'),
  -- New York
  ('NY','New York',1.75,0.375,5,10,15,63,68,false,false,false,5,'Part 108'),
  -- Pennsylvania
  ('PA','Pennsylvania',1.75,0.375,5,10,15,63,68,false,false,false,5,'Rule 4013'),
  -- Georgia
  ('GA','Georgia',1.75,0.375,5,0,10,63,68,false,false,false,5,'BCR'),
  -- South Carolina
  ('SC','South Carolina',1.75,0.375,0,5,15,63,68,false,false,false,5,'Rule 607'),
  -- New Jersey
  ('NJ','New Jersey',1.0,0.375,7,7,15,52,56,false,false,false,5,'13:43-5.9'),
  -- Illinois
  ('IL','Illinois',1.0,0.375,5,10,15,56,63,false,false,false,5,'IACRA'),
  -- Ohio
  ('OH','Ohio',1.0,0.375,5,10,15,56,63,false,false,true,5,'ORC §2301')
ON CONFLICT (state_code) DO NOTHING;
```

---

### 4.17 `exports` — NEW

Tracks generated export files.

```sql
CREATE TYPE export_format AS ENUM (
  'QA_DOCX',          -- Primary certified Q/A format
  'FULLNAME_DOCX',    -- Full name colloquy format
  'CONDENSED_DOCX',   -- 4 pages per sheet
  'ASCII',            -- Case Catalyst / Eclipse import
  'PDF',              -- Searchable PDF with bookmarks
  'ETRANS'            -- E-Trans realtime delivery
);

CREATE TABLE exports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  format           export_format NOT NULL,
  file_url         TEXT,
  file_name        TEXT,
  file_size_bytes  BIGINT,

  -- Quality gate snapshot at time of export
  quality_gate_passed  BOOLEAN NOT NULL DEFAULT FALSE,
  quality_gate_report  JSONB,

  -- Jurisdiction applied
  jurisdiction_id  UUID REFERENCES jurisdiction_configs(id),
  state_code       CHAR(2),

  generated_by     UUID REFERENCES profiles(id),
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Delivery tracking
  delivered_to     TEXT,               -- Email or download
  delivered_at     TIMESTAMPTZ
);

CREATE INDEX idx_exports_transcription ON exports(transcription_id);
CREATE INDEX idx_exports_firm          ON exports(firm_id);
```

---

### Tables Retained Unchanged

The following existing tables are **fully retained with no schema changes**:

| Table | Purpose |
|---|---|
| `transcription_chunks` | Chunked audio processing |
| `flagged_words` | AI confidence-based word flags (PENDING/CORRECTED/CONFIRMED/SKIPPED) |
| `silent_segments` | INAUDIBLE/CROSSTALK/SILENCE notations |
| `transcription_edits` | Edit history (WORD_CORRECTION/SEGMENT_EDIT/etc.) |
| `transcript_integrity_chain` | SHA-256 linked hash chain — legal defensibility |
| `processing_errors` | Pipeline error tracking with retry logic |
| `audit_log` | Append-only security/action log |
| `transcript_shares` | Attorney read-only access sharing |
| `transcription_corrections` | ML training signal: correction patterns |
| `custom_vocabularies` | Job-level Deepgram keyword boost |
| `firm_vocabularies` | Firm-wide Deepgram keyword boost |
| `extracted_entities` | Knowledge graph entity extraction |
| `medical_records` | Medical document intake (Phase 10) |

---

## 5. Indexes — Performance Strategy

### Critical Performance Indexes

```sql
-- Word lookup by position (transcript scrolling, audio sync)
CREATE UNIQUE INDEX idx_tw_position
  ON transcript_words(transcription_id, position_index);

-- Confidence review queue (low-confidence word list)
CREATE INDEX idx_tw_low_confidence
  ON transcript_words(transcription_id, confidence, position_index)
  WHERE confidence < 0.80 AND is_deleted = FALSE;

-- Paragraph page lookup (export, navigation)
CREATE INDEX idx_tp_page_lookup
  ON transcript_paragraphs(transcription_id, page_number, line_number_start);

-- Unresolved flags (quality gate, review panel)
CREATE INDEX idx_tf_unresolved_critical
  ON transcript_flags(transcription_id, severity)
  WHERE is_resolved = FALSE AND severity IN ('ERROR', 'CRITICAL');

-- Exhibit page lookup (exhibit index generation)
CREATE INDEX idx_em_page
  ON exhibit_markers(transcription_id, page_number);

-- Pending AI suggestions (sidebar)
CREATE INDEX idx_ai_pending_by_position
  ON ai_suggestions(transcription_id, word_index)
  WHERE status = 'pending';
```

### Expected Data Volume

| Deposition | Words | transcript_words rows | transcript_paragraphs rows |
|---|---|---|---|
| 50 pages | ~20,000 | 20,000 | ~800 |
| 200 pages | ~80,000 | 80,000 | ~3,200 |
| 500 pages | ~200,000 | 200,000 | ~8,000 |

PostgreSQL handles 200,000 rows trivially. Even 10M rows (125 full depositions) is well within normal operating range with proper indexes.

---

## 6. Row-Level Security Policies

All new tables follow the same RLS pattern used throughout the codebase.

```sql
-- Pattern for all new tables with firm_id column:

ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- Firm members can see own firm data
CREATE POLICY "[table]_firm_select" ON [table_name]
  FOR SELECT USING (
    firm_id IN (
      SELECT firm_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Reporters and scopists can insert/update their own firm's data
CREATE POLICY "[table]_firm_insert" ON [table_name]
  FOR INSERT WITH CHECK (
    firm_id IN (
      SELECT firm_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can see all
CREATE POLICY "[table]_admin_all" ON [table_name]
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

### Special RLS: transcript_flags (Reporter/Scopist can insert; only creator can delete)

```sql
CREATE POLICY "flags_insert_own_firm" ON transcript_flags
  FOR INSERT WITH CHECK (
    firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- Flags cannot be hard-deleted by anyone — only resolved
CREATE POLICY "flags_no_delete" ON transcript_flags
  FOR DELETE USING (FALSE);  -- No deletions ever
```

### Special RLS: transcript_words (is_deleted only — no hard deletes)

```sql
-- Hard deletes blocked at DB layer
CREATE POLICY "words_no_delete" ON transcript_words
  FOR DELETE USING (FALSE);  -- Verbatim mandate: words must be soft-deleted only
```

---

## 7. Functions & Triggers

### 7.1 Auto-populate `display_word` on insert

```sql
CREATE OR REPLACE FUNCTION set_display_word()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_word IS NULL THEN
    NEW.display_word = COALESCE(NEW.punctuated_word, NEW.word);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tw_display_word
  BEFORE INSERT ON transcript_words
  FOR EACH ROW EXECUTE FUNCTION set_display_word();
```

### 7.2 Flag quality gate error when word is soft-deleted

```sql
CREATE OR REPLACE FUNCTION flag_deleted_word()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    INSERT INTO transcript_flags (
      transcription_id, firm_id, word_id, word_index,
      flag_type, severity, message, auto_generated, quality_gate_code
    ) VALUES (
      NEW.transcription_id, NEW.firm_id, NEW.id, NEW.position_index,
      'VERBATIM_CONCERN', 'ERROR',
      'Word marked as deleted. Verbatim mandate requires all spoken words remain in the record. Use is_filler to hide display instead.',
      TRUE, 'QG-005'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tw_deletion_flag
  AFTER UPDATE ON transcript_words
  FOR EACH ROW
  WHEN (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE)
  EXECUTE FUNCTION flag_deleted_word();
```

### 7.3 Auto-derive `display_label` from participant name

```sql
CREATE OR REPLACE FUNCTION derive_transcript_label()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transcript_label IS NULL THEN
    -- Build label from title + last name
    -- 'Dr. Dennis Gutzman' → 'DR. GUTZMAN'
    -- 'Juan Munoz' → 'MR. MUNOZ' (requires role context)
    -- Standard roles use fixed labels
    CASE NEW.role
      WHEN 'WITNESS' THEN NEW.transcript_label = 'THE WITNESS';
      WHEN 'COURT_REPORTER' THEN NEW.transcript_label = 'THE REPORTER';
      WHEN 'VIDEOGRAPHER' THEN NEW.transcript_label = 'THE VIDEOGRAPHER';
      WHEN 'INTERPRETER' THEN NEW.transcript_label = 'THE INTERPRETER';
      ELSE
        -- Attorney: derive from last name
        NEW.transcript_label = 'MR. ' ||
          UPPER(TRIM(SPLIT_PART(NEW.full_name, ' ', -1)));
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_participant_label
  BEFORE INSERT ON participants
  FOR EACH ROW EXECUTE FUNCTION derive_transcript_label();
```

### 7.4 Mark transcription as needing formatter re-run on word edit

```sql
CREATE OR REPLACE FUNCTION invalidate_paragraphs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE transcriptions
  SET formatter_run_at = NULL,   -- Null = needs formatter re-run
      updated_at = NOW()
  WHERE id = NEW.transcription_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tw_invalidate_formatter
  AFTER UPDATE ON transcript_words
  FOR EACH ROW
  WHEN (OLD.display_word IS DISTINCT FROM NEW.display_word
     OR OLD.speaker_index IS DISTINCT FROM NEW.speaker_index
     OR OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
  EXECUTE FUNCTION invalidate_paragraphs();
```

---

## 8. Migration Plan

### Phase A — Add New Tables (Non-Breaking)

All additions are additive — no existing tables modified, no existing columns removed.

```
Migration 1: 20260306_001_depositions.sql
  - CREATE TABLE depositions
  - ALTER TABLE jobs ADD COLUMN deposition_id

Migration 2: 20260306_002_participants.sql
  - CREATE TYPE participant_role
  - CREATE TABLE participants

Migration 3: 20260306_003_documents.sql
  - CREATE TYPE document_type
  - CREATE TABLE documents

Migration 4: 20260306_004_vocabulary_terms.sql
  - CREATE TYPE vocab_term_type
  - CREATE TABLE vocabulary_terms

Migration 5: 20260306_005_exhibits.sql
  - CREATE TABLE exhibits
  - CREATE TABLE exhibit_markers

Migration 6: 20260306_006_transcript_words.sql
  - CREATE TABLE transcript_words (with all indexes)
  - CREATE TABLE speaker_assignments
  - ALTER TABLE transcriptions ADD COLUMN words_hydrated
  - ALTER TABLE transcriptions ADD COLUMN formatter_run_at

Migration 7: 20260306_007_transcript_paragraphs.sql
  - CREATE TYPE paragraph_type
  - CREATE TYPE deposition_section
  - CREATE TABLE transcript_paragraphs

Migration 8: 20260306_008_transcript_flags.sql
  - CREATE TYPE transcript_flag_type
  - CREATE TYPE flag_severity
  - CREATE TABLE transcript_flags

Migration 9: 20260306_009_ai_suggestions.sql
  - CREATE TYPE suggestion_type
  - CREATE TABLE ai_suggestions

Migration 10: 20260306_010_jurisdiction_configs.sql
  - CREATE TABLE jurisdiction_configs
  - INSERT seed data (10 jurisdictions)

Migration 11: 20260306_011_exports.sql
  - CREATE TYPE export_format
  - CREATE TABLE exports

Migration 12: 20260306_012_profiles_license.sql
  - ALTER TABLE profiles ADD COLUMN license_number
  - ALTER TABLE profiles ADD COLUMN license_state
  - ALTER TABLE profiles ADD COLUMN license_expires
  - ALTER TABLE profiles ADD COLUMN certification_body
```

### Phase B — Data Hydration (Background Job)

After Phase A migrations are deployed:

```sql
-- Hydrate transcript_words from existing transcriptions.words JSONB
-- Run as a background job, not a migration (can take minutes for large DBs)

INSERT INTO transcript_words (
  transcription_id, firm_id,
  word, punctuated_word, display_word,
  start_time, end_time,
  confidence, speaker_index, position_index
)
SELECT
  t.id,
  j.firm_id,
  (w->>'word')::TEXT,
  (w->>'punctuated_word')::TEXT,
  COALESCE(w->>'punctuated_word', w->>'word'),
  (w->>'start')::NUMERIC,
  (w->>'end')::NUMERIC,
  COALESCE((w->>'confidence')::NUMERIC, 0.95),
  (w->>'speaker')::INTEGER,
  (ordinality - 1)::INTEGER
FROM transcriptions t
JOIN jobs j ON j.id = t.job_id
CROSS JOIN LATERAL jsonb_array_elements(t.words) WITH ORDINALITY AS w_ord(w, ordinality)
WHERE t.words IS NOT NULL
  AND jsonb_typeof(t.words) = 'array'
  AND t.words_hydrated = FALSE
ON CONFLICT ON CONSTRAINT idx_tw_position DO NOTHING;

-- Mark as hydrated
UPDATE transcriptions SET words_hydrated = TRUE
WHERE words IS NOT NULL AND words_hydrated = FALSE;
```

### Phase C — RLS Policies

Apply firm-isolation RLS policies to all new tables (pattern from Section 6).

### Phase D — Deprecation (Post-Validation, ~4 Weeks After Phase A)

```
- Deprecate jobs.format_settings JSONB (speaker mappings moved to speaker_assignments table)
- Deprecate transcriptions.speakers JSONB (speaker data moved to speaker_assignments)
- Mark lib/export.ts @deprecated
- Mark lib/services/export.ts @deprecated
```

---

## 9. TypeScript Interface Map

```typescript
// New interfaces to add to types/

// depositions table
interface Deposition {
  id: string;
  firm_id: string;
  case_style: string;
  cause_number: string;
  court_name?: string;
  county?: string;
  state_code: string;
  incident_date?: string;
  deponent_name: string;
  deposition_date?: string;
  start_time?: string;
  is_remote: boolean;
  assigned_reporter_id?: string;
  assigned_scopist_id?: string;
  assigned_videographer_id?: string;
  ordering_attorney?: string;
  ordering_firm?: string;
  deepgram_keywords?: string[];
  jurisdiction_id?: string;
  volume_number: number;
  status: DepositionStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

type DepositionStatus = 'scheduled' | 'in_progress' | 'transcribing' |
                        'in_review' | 'certified' | 'delivered' | 'cancelled';

// transcript_words table
interface TranscriptWord {
  id: string;
  transcription_id: string;
  firm_id: string;
  word: string;
  punctuated_word?: string;
  display_word: string;
  start_time: number;
  end_time: number;
  confidence: number;
  speaker_index?: number;
  position_index: number;
  paragraph_id?: string;
  is_filler: boolean;
  is_corrected: boolean;
  original_word?: string;
  is_deleted: boolean;
}

// speaker_assignments table
interface SpeakerAssignment {
  id: string;
  transcription_id: string;
  speaker_index: number;
  participant_id?: string;
  speaker_name: string;
  role: SpeakerRole;
  display_label: string;      // 'MR. MUNOZ' — colloquy
  qa_label?: 'Q' | 'A';
  sample_start_time?: number;
  sample_end_time?: number;
}

type SpeakerRole = 'examining_attorney' | 'cross_examining_attorney' |
                   'witness' | 'reporter' | 'videographer' |
                   'interpreter' | 'other';

// transcript_paragraphs table
interface TranscriptParagraph {
  id: string;
  transcription_id: string;
  paragraph_type: ParagraphType;
  text: string;
  formatted_text?: string;
  start_word_idx?: number;
  end_word_idx?: number;
  speaker_index?: number;
  speaker_label?: string;
  qa_label?: 'Q' | 'A';
  deposition_section?: DepositionSection;
  examining_speaker_index?: number;
  witness_speaker_index?: number;
  requires_reentry_marker: boolean;
  has_interruption: boolean;
  section_override: boolean;
  paragraph_order: number;
  page_number?: number;
  line_number_start?: number;
  line_number_end?: number;
  line_count?: number;
}

// transcript_flags table
interface TranscriptFlag {
  id: string;
  transcription_id: string;
  word_id?: string;
  paragraph_id?: string;
  word_index?: number;
  flag_type: TranscriptFlagType;
  severity: FlagSeverity;
  message: string;
  auto_generated: boolean;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_note?: string;
  quality_gate_code?: string;
  created_by?: string;
  created_at: string;
}

// exhibits table
interface Exhibit {
  id: string;
  deposition_id: string;
  firm_id: string;
  exhibit_number: string;
  party?: string;
  full_label: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  bates_prefix?: string;
  bates_start?: number;
  bates_end?: number;
  is_stamped: boolean;
  transcript_page?: number;
  marked_at_time?: number;
}
```

---

## 10. Naming Conventions & Decision Log

### Naming Conventions

| Pattern | Rule | Example |
|---|---|---|
| Table names | `snake_case`, plural | `transcript_words` |
| Column names | `snake_case` | `position_index` |
| Enum types | `snake_case` | `paragraph_type` |
| Enum values | `UPPER_SNAKE` | `'EXAMINING_ATTORNEY'` |
| Index names | `idx_[table_abbrev]_[column]` | `idx_tw_position` |
| FK columns | `[referenced_table_singular]_id` | `transcription_id` |
| Soft delete | `is_deleted BOOLEAN` | never `deleted_at` |
| Timestamps | `created_at`, `updated_at` — always `TIMESTAMPTZ` | — |

### Decision Log

| Decision | Rationale | Date |
|---|---|---|
| Keep `firms`, not `organizations` | Zero-breakage constraint; 14 routes reference `firms` | Mar 2026 |
| Keep `profiles`, not `users` | Supabase Auth pattern; `auth.users` is the real users table | Mar 2026 |
| Add `depositions` referencing `jobs` | Adds domain model without migration risk | Mar 2026 |
| Hybrid word storage | Raw JSON immutable + rows mutable; enables indexing and audio sync | Mar 2026 |
| `transcript_flags` separate from `flagged_words` | Different concepts: QG legal flags vs. AI confidence flags | Mar 2026 |
| `transcript_integrity_chain` over `transcript_versions` | SHA-256 chain already built; stronger legal defensibility | Mar 2026 |
| Merge `transcript_pages` into `transcript_paragraphs` | Fewer tables; page_number columns achieve same result | Mar 2026 |
| No hard deletes on transcript_words | Verbatim mandate: all spoken words are part of the legal record | Mar 2026 |
| Em dash fix during formatter rebuild | Token-driven formatter makes post-processing redundant | Mar 2026 |

---

*Depo-Pro Database Schema v2.0 · March 2026*  
*Canonical reference — supersedes proposed schema v1.0 and all roadmap schema sections*
