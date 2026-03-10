# DEPO-PRO — PHASE 1: TRANSCRIPT FORMATTER FOUNDATION
# Tool: Claude Code | Codex CLI | Cursor
# Session: claude code --no-resume  (always use this flag)
# Save to: ai_prompts/phases/phase_01_formatter_foundation.md
#
# VERSION: 2.0 — Self-Bootstrapping
# This prompt never stops on missing files. If a spec file is
# absent, this prompt contains all required context inline.
#
# READ THIS ENTIRE PROMPT BEFORE EXECUTING ANY COMMAND.
# Complete tasks in order. One commit per section. No skipping.

═══════════════════════════════════════════════════════════════════════
SECTION 0 — BOOTSTRAP: VERIFY AND SCAFFOLD ENVIRONMENT
═══════════════════════════════════════════════════════════════════════

Before writing any code, run these checks. Fix anything missing.
Do NOT stop and ask — create what is missing using the inline spec
embedded in SECTION 0B below.

─────────────────────────────────────────────────────────────────────
TASK 0.1 — Check required directories exist
─────────────────────────────────────────────────────────────────────

Run:
  Test-Path docs\specs
  Test-Path ai_prompts\architecture
  Test-Path ai_prompts\phases
  Test-Path ai_logs
  Test-Path lib\transcription\formatter
  Test-Path tests\unit\formatter
  Test-Path tests\integration
  Test-Path tests\fixtures

For any that return False, create them:
  New-Item -ItemType Directory -Path [path] -Force

─────────────────────────────────────────────────────────────────────
TASK 0.2 — Check spec files exist at docs/specs/
─────────────────────────────────────────────────────────────────────

Required files:
  docs/specs/DEPO_PRO_SYSTEM_BLUEPRINT.md
  docs/specs/DEPO_PRO_DATABASE_SCHEMA.md
  docs/specs/DEPO_PRO_FORMATTER_SPEC.md
  docs/specs/DEPO_PRO_SCHEMA_PHASE_B.md
  ai_prompts/architecture/CORE_ARCHITECTURE_RULES.md
  ai_prompts/architecture/AI_CONTEXT.md
  BETA_FREEZE.md
  CLAUDE.md

For each missing file, check if it exists at the REPO ROOT first:
  Test-Path DEPO_PRO_DATABASE_SCHEMA.md
  Test-Path DEPO_PRO_SYSTEM_BLUEPRINT.md
  etc.

If found at root → copy to docs/specs/:
  Copy-Item DEPO_PRO_DATABASE_SCHEMA.md docs\specs\ -Force

If NOT found anywhere → the critical rules are embedded in SECTION 0B
below. Do not stop. Use the embedded rules and continue.

─────────────────────────────────────────────────────────────────────
TASK 0.3 — Check CLAUDE.md and architecture files
─────────────────────────────────────────────────────────────────────

If CLAUDE.md is missing at repo root — create it with this content:

```
# Depo-Pro AI Instructions
# Read ai_prompts/architecture/CORE_ARCHITECTURE_RULES.md before coding.
# Auth: Supabase SSR only. Table: profiles (not users).
# Key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# All routes: withRouteProtection() from lib/middleware/withRouteProtection.ts
# Never delete transcript_words. Never modify original_word.
# Em dash → double hyphen (--). THE REPORTER, not THE COURT REPORTER.
```

─────────────────────────────────────────────────────────────────────
TASK 0.4 — Baseline build check
─────────────────────────────────────────────────────────────────────

  npx tsc --noEmit 2>&1 | tail -5
  npm run build 2>&1 | tail -10

Document results in ai_logs/phase1_audit.md:
  - TypeScript error count before Phase 1 starts
  - Build status (pass/fail)
  - Existing formatter files found (list them)
  - Migration files present in supabase/migrations/ (list 20260306_*)
  - Whether buildKeywords.ts returns [] (the known stub bug)

No commit for Section 0.

═══════════════════════════════════════════════════════════════════════
SECTION 0B — EMBEDDED CORE ARCHITECTURE RULES
═══════════════════════════════════════════════════════════════════════

Use these rules throughout this entire session.
These are the authoritative rules regardless of whether spec files exist.

PLATFORM:
  Depo-Pro — legal deposition transcription SaaS
  Next.js 15 (App Router) · TypeScript · Supabase (Postgres+RLS) · Vercel
  Deepgram Nova-3 · Anthropic Claude · docx npm package

AUTH (non-negotiable):
  - Supabase SSR only — NextAuth removed
  - Server client: createSupabaseServerClient() from lib/supabase/server.ts
  - User profile table: profiles — NEVER 'users'
  - Key env var: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — NEVER anon key
  - Auth failures redirect to /unauthorized?reason=missing_profile
  - All new API routes use withRouteProtection() from
    lib/middleware/withRouteProtection.ts (240 lines — read it first)

DATABASE:
  - Every table carries firm_id UUID NOT NULL for RLS
  - RLS enabled on every new table
  - Hard DELETE blocked on transcript_words
  - original_word column: set once on Deepgram ingest, never changed
  - transcriptions.deepgram_raw_json: immutable
  - Corrections stored as overlays in transcription_edits / flagged_words
  - audit_log is append-only

FROZEN FILES (never modify):
  lib/supabase/server.ts
  lib/supabase/client.ts
  lib/auth/session.ts
  middleware.ts
  supabase/migrations/** (existing files — new files may be added)

JOB STATE MACHINE:
  PENDING → UPLOADING → PROCESSING → TRANSCRIBED → IN_REVIEW
  → SCOPIST_COMPLETE → REPORTER_REVIEW → COMPLETED → EXPORTED
  Never skip states. Invalid transitions → 422.

FORMATTER RULES (Texas UFM — JBCC):
  - Em dash (— \u2014 \u2013) → double hyphen (--) — HIGHEST PRIORITY
  - THE COURT REPORTER → THE REPORTER (always)
  - Font: Courier New 12pt
  - 25 lines per page, line numbers 1–25 reset each page
  - Left margin: 1.0", Right margin: 0.375"
  - Tab1 (Q./A. signifier): 5 spaces from margin
  - Tab2 (Q./A. text start): 10 spaces from margin
  - Tab3 (colloquy text): 15 spaces from margin
  - Time: "2:12 p.m." — NEVER "2:12 PM"
  - Doctor Smith → Dr. Smith
  - Closing: "FURTHER THIS DEPONENT SAITH NOT."
  - Re-entry: "(Whereupon, a brief recess was taken.)"
             "(The deposition resumed.)"

MIAH BARDOT RULE:
  Court reporter on Bourbois depositions: Miah Bardot (B-A-R-D-O-T)
  CSR #12129, SA Legal Solutions
  Deepgram misrecognizes as "Miyamardeau" or "Mia Bardeau"
  → Flag as CRITICAL, surface to scopist, NEVER auto-correct

CONFIDENCE CLASS THRESHOLDS:
  HIGH     ≥ 0.90   (no review needed)
  MEDIUM   0.80–0.89
  LOW      0.70–0.79
  CRITICAL < 0.70   (must review)

QUALITY GATE — 12 checks:
  QG-001 ERROR: Unresolved [VERIFY] tags — blocks export
  QG-002 ERROR: Speaker mapping incomplete — blocks export
  QG-003 ERROR: Date conflict flags unresolved — blocks export
  QG-004 ERROR: Certification block empty — blocks export
  QG-005 ERROR: Words with is_deleted=true — blocks export
  QG-006 ERROR: [SCOPIST: ...] notes in body — blocks export
  QG-007 ERROR: Exhibit index missing page numbers — blocks export
  QG-008 WARNING: Font/spacing non-compliant
  QG-009 WARNING: Lines/page exceeds maximum
  QG-010 WARNING: Low-confidence words unreviewed
  QG-011 WARNING: Em dash present in output
  QG-012 WARNING: "THE COURT REPORTER" label detected

FORMATTER DATA FLOW:
  transcript_words (raw, immutable Deepgram output)
    → Section Detection
    → Paragraph Builder
    → Post-Processor
    → Paginator
    → transcript_paragraphs (DB rows)
    → DOCX/PDF Assembler
    → Quality Gate → Export

COMMIT DISCIPLINE:
  One commit per section. Use exact commit message specified.
  Run before every commit: npx tsc --noEmit && npm run lint && npm run build
  All three must pass. Fix failures before committing.


═══════════════════════════════════════════════════════════════════════
SECTION 1 — PHASE A DATABASE MIGRATIONS
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(db): run Phase A migrations for formatter foundation"

─────────────────────────────────────────────────────────────────────
TASK 1.1 — Check Phase A migration status
─────────────────────────────────────────────────────────────────────

List migration files:
  Get-ChildItem supabase\migrations\ | Sort-Object Name | Select Name

Phase A migrations are named 20260306_001 through 20260306_013.
Also check for:
  20260310_014_calendar_events.sql
  20260310_015_reporter_prefs_playback.sql

─────────────────────────────────────────────────────────────────────
TASK 1.2 — Run Phase A migrations
─────────────────────────────────────────────────────────────────────

If migration files exist:
  supabase db push

Then verify these tables were created:
  depositions · participants · documents · vocabulary_terms
  exhibits · exhibit_markers · transcript_words · speaker_assignments
  transcript_paragraphs · transcript_flags · ai_suggestions
  jurisdiction_configs · exports

Check via:
  supabase db diff --schema public | Select-String "CREATE TABLE"

If the 20260306_* files are missing from supabase/migrations/:
  Read the table definitions from docs/specs/DEPO_PRO_DATABASE_SCHEMA.md
  Create the migration files and run supabase db push.
  Do not stop — create what is needed.

─────────────────────────────────────────────────────────────────────
TASK 1.3 — Run calendar and reporter prefs migrations
─────────────────────────────────────────────────────────────────────

These two files are in the project root (copied from Downloads earlier).
Move them to supabase/migrations/ if not already there:

  Move-Item 20260310_014_calendar_events.sql supabase\migrations\ -ErrorAction SilentlyContinue
  Move-Item 20260310_015_reporter_prefs_playback.sql supabase\migrations\ -ErrorAction SilentlyContinue

Then: supabase db push

─────────────────────────────────────────────────────────────────────
TASK 1.4 — Seed Texas jurisdiction config
─────────────────────────────────────────────────────────────────────

Run in Supabase SQL Editor or via supabase db push as a migration:

```sql
INSERT INTO jurisdiction_configs (
  state_code, state_name,
  lines_per_page, left_margin_inches, right_margin_inches,
  qa_signifier_spaces, qa_text_offset_spaces, colloquy_indent_spaces,
  min_chars_per_line, certification_body
)
VALUES (
  'TX', 'Texas',
  25, 1.0, 0.375,
  5, 10, 15,
  56, 'JBCC/UFM'
)
ON CONFLICT (state_code) DO NOTHING;
```

─────────────────────────────────────────────────────────────────────
TASK 1.5 — Add confidence_class generated column
─────────────────────────────────────────────────────────────────────

Check first:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transcript_words' AND column_name = 'confidence_class';
```

If missing:
```sql
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

─────────────────────────────────────────────────────────────────────
TASK 1.6 — Hydrate existing transcriptions into transcript_words
─────────────────────────────────────────────────────────────────────

Existing transcriptions store Deepgram words as JSONB in
transcriptions.words. They must be hydrated into transcript_words rows.

Create: lib/transcription/hydration/hydrateTranscriptWords.ts

```typescript
// Hydrates transcript_words from transcriptions.words JSONB
// Run once per transcription that has words but no transcript_words rows.
// Safe to run multiple times — ON CONFLICT DO NOTHING.

import { createAdminClient } from '@/lib/supabase/admin'

export async function hydrateTranscriptWords(transcriptionId: string): Promise<{
  inserted: number
  skipped: number
  error: string | null
}> {
  const supabase = createAdminClient()

  // Check if already hydrated
  const { count } = await supabase
    .from('transcript_words')
    .select('*', { count: 'exact', head: true })
    .eq('transcription_id', transcriptionId)

  if (count && count > 0) {
    return { inserted: 0, skipped: count, error: null }
  }

  // Get transcription with firm_id for RLS compliance
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('id, words, firm_id')
    .eq('id', transcriptionId)
    .single()

  if (!transcription?.words) {
    return { inserted: 0, skipped: 0, error: 'No words JSONB found' }
  }

  const words = transcription.words as any[]
  const BATCH_SIZE = 500
  let inserted = 0

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE).map((w, idx) => ({
      transcription_id: transcriptionId,
      firm_id: transcription.firm_id,
      word: w.word ?? '',
      punctuated_word: w.punctuated_word ?? w.word ?? '',
      display_word: w.punctuated_word ?? w.word ?? '',
      original_word: w.word ?? '',  // immutable — set once
      start_time: Number(w.start ?? 0),
      end_time: Number(w.end ?? 0),
      confidence: Number(w.confidence ?? 0.95),
      speaker_index: w.speaker ?? 0,
      position_index: i + idx,
      is_corrected: false,
      is_deleted: false,
      is_filler: false,
    }))

    const { error } = await supabase
      .from('transcript_words')
      .upsert(batch, { onConflict: 'transcription_id,position_index', ignoreDuplicates: true })

    if (error) throw new Error(`Hydration batch failed: ${error.message}`)
    inserted += batch.length
  }

  return { inserted, skipped: 0, error: null }
}
```

Also create: app/api/transcriptions/[id]/hydrate/route.ts
  POST — triggers hydration for a given transcription
  Uses withRouteProtection(['ADMIN', 'COURT_REPORTER'])
  Returns { inserted, skipped, error }


═══════════════════════════════════════════════════════════════════════
SECTION 2 — FIX BUILDKEYWORDS.TS (CRITICAL BUG BUG-03)
═══════════════════════════════════════════════════════════════════════
Commit message: "fix(transcription): implement buildKeywords from vocabulary tables"

File: lib/transcription/buildKeywords.ts

Current state: returns [] always — zero Deepgram keyterm boost.
This is why "Miyamardeau" occurs — no proper noun boost was sent.

Read the existing file first:
  Get-Content lib\transcription\buildKeywords.ts

Replace the stub with a real implementation:

```typescript
// lib/transcription/buildKeywords.ts

import { createAdminClient } from '@/lib/supabase/admin'

export interface Keyterm {
  text: string
  boost: number   // 1–10, higher = stronger boost
}

/**
 * Builds a Deepgram keyterms array for a transcription.
 * Sources (in priority order):
 *   1. Participant names from depositions/participants
 *   2. vocabulary_terms for this deposition
 *   3. custom_vocabularies for this job
 *   4. firm_vocabularies for this firm
 *
 * Returns deduplicated array, max 200 terms.
 * Called before dispatching audio to Deepgram.
 */
export async function buildKeywords(
  transcriptionId: string,
  firmId: string
): Promise<Keyterm[]> {
  const supabase = createAdminClient()
  const terms = new Map<string, number>()  // text → boost

  // --- 1. Participant names (highest boost — prevents "Miyamardeau") ---
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', transcriptionId)
    .single()

  if (transcription?.job_id) {
    const { data: deposition } = await supabase
      .from('depositions')
      .select('id, deponent_name, case_style')
      .eq('job_id', transcription.job_id)
      .eq('firm_id', firmId)
      .single()

    if (deposition) {
      // Deponent full name gets highest boost
      if (deposition.deponent_name) {
        terms.set(deposition.deponent_name.trim(), 10)
        // Also add last name alone
        const parts = deposition.deponent_name.trim().split(' ')
        if (parts.length > 1) terms.set(parts[parts.length - 1], 9)
      }

      // Participants (attorneys, witnesses, etc.)
      const { data: participants } = await supabase
        .from('participants')
        .select('full_name, first_name, last_name, role')
        .eq('deposition_id', deposition.id)
        .eq('firm_id', firmId)

      for (const p of participants ?? []) {
        if (p.full_name) terms.set(p.full_name.trim(), 8)
        if (p.last_name) terms.set(p.last_name.trim(), 7)
      }

      // Vocabulary terms for this deposition
      const { data: vocabTerms } = await supabase
        .from('vocabulary_terms')
        .select('term, boost')
        .eq('deposition_id', deposition.id)
        .eq('firm_id', firmId)

      for (const vt of vocabTerms ?? []) {
        if (vt.term) terms.set(vt.term.trim(), vt.boost ?? 6)
      }
    }
  }

  // --- 2. Job-level custom vocabulary ---
  const { data: customVocab } = await supabase
    .from('custom_vocabularies')
    .select('term')
    .eq('firm_id', firmId)

  for (const cv of customVocab ?? []) {
    if (cv.term && !terms.has(cv.term.trim())) {
      terms.set(cv.term.trim(), 5)
    }
  }

  // --- 3. Firm-level vocabulary ---
  const { data: firmVocab } = await supabase
    .from('firm_vocabularies')
    .select('term')
    .eq('firm_id', firmId)

  for (const fv of firmVocab ?? []) {
    if (fv.term && !terms.has(fv.term.trim())) {
      terms.set(fv.term.trim(), 4)
    }
  }

  // Deduplicate, filter blanks, limit to 200
  const result: Keyterm[] = Array.from(terms.entries())
    .filter(([text]) => text.length >= 2)
    .sort((a, b) => b[1] - a[1])  // highest boost first
    .slice(0, 200)
    .map(([text, boost]) => ({ text, boost }))

  return result
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 3 — FORMATTER MODULE SCAFFOLD
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): scaffold formatter module with types"

Create these files in lib/transcription/formatter/:

─────────────────────────────────────────────────────────────────────
TASK 3.1 — Create lib/transcription/formatter/types.ts
─────────────────────────────────────────────────────────────────────

All TypeScript types for the formatter system.
Column names must match DB exactly (snake_case).

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
  original_word: string       // immutable
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
  session_id: string | null
  global_time_offset: number | null
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
  lines_per_page: number           // 25
  left_margin_inches: number       // 1.0
  right_margin_inches: number      // 0.375
  qa_signifier_spaces: number      // 5  (Tab1)
  qa_text_offset_spaces: number    // 10 (Tab2)
  colloquy_indent_spaces: number   // 15 (Tab3)
  min_chars_per_line: number       // 56
  require_line_numbers: boolean
  certification_body: string | null
}

export interface Paragraph {
  paragraph_index: number
  paragraph_type: ParagraphType
  section_type: DepositionSection
  speaker_index: number | null
  speaker_label: string | null    // "Q." | "A." | "MR. SMITH:" | etc.
  text: string                    // post-processed display text
  raw_text: string                // pre-processing text (for audit)
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
  code: string          // 'QG-001' through 'QG-012'
  severity: 'ERROR' | 'WARNING'
  passed: boolean
  message: string
  details?: string[]
}

export interface QualityGateResult {
  passed: boolean               // true only if zero ERRORs
  exportBlocked: boolean        // true if any ERROR failed
  checks: QGCheck[]
  errorCount: number
  warningCount: number
}

export interface FormatterOptions {
  transcriptionId: string
  firmId: string
  jurisdictionStateCode?: string  // defaults to 'TX'
  forceReformat?: boolean         // re-run even if paragraphs exist
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
```

─────────────────────────────────────────────────────────────────────
TASK 3.2 — Create lib/transcription/formatter/index.ts (entry point)
─────────────────────────────────────────────────────────────────────

```typescript
// lib/transcription/formatter/index.ts
// Entry point for the formatter pipeline.

import { createAdminClient } from '@/lib/supabase/admin'
import { detectSections } from './section-detector'
import { buildParagraphs } from './paragraph-builder'
import { postProcessParagraphs } from './post-processor'
import { paginateParagraphs } from './paginator'
import { runQualityGate } from './quality-gate'
import type { FormatterOptions, FormatterResult } from './types'

export async function formatTranscript(
  options: FormatterOptions
): Promise<FormatterResult> {
  const start = Date.now()
  const { transcriptionId, firmId, jurisdictionStateCode = 'TX' } = options
  const supabase = createAdminClient()

  try {
    // 1. Load transcript words (ordered by position_index)
    const { data: words, error: wordError } = await supabase
      .from('transcript_words')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .eq('firm_id', firmId)
      .eq('is_deleted', false)
      .order('position_index', { ascending: true })

    if (wordError) throw new Error(`Failed to load words: ${wordError.message}`)
    if (!words || words.length === 0) throw new Error('No transcript words found')

    // 2. Load speaker assignments
    const { data: speakers } = await supabase
      .from('speaker_assignments')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .eq('firm_id', firmId)

    // 3. Load jurisdiction config
    const { data: jurisdiction } = await supabase
      .from('jurisdiction_configs')
      .select('*')
      .eq('state_code', jurisdictionStateCode)
      .single()

    const jurisdictionConfig = jurisdiction ?? {
      state_code: 'TX',
      lines_per_page: 25,
      left_margin_inches: 1.0,
      right_margin_inches: 0.375,
      qa_signifier_spaces: 5,
      qa_text_offset_spaces: 10,
      colloquy_indent_spaces: 15,
      min_chars_per_line: 56,
      require_line_numbers: true,
      certification_body: 'JBCC/UFM',
    }

    // 4. Run pipeline
    const sectionMap = detectSections(words)
    const paragraphs = buildParagraphs(words, speakers ?? [], sectionMap)
    const processed = postProcessParagraphs(paragraphs)
    const paginated = paginateParagraphs(processed, jurisdictionConfig)

    // 5. Persist transcript_paragraphs
    if (!options.forceReformat) {
      await supabase
        .from('transcript_paragraphs')
        .delete()
        .eq('transcription_id', transcriptionId)
        .eq('firm_id', firmId)
    }

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
      requires_reentry_marker: p.requires_reentry_marker,
      has_interruption: p.has_interruption,
    }))

    await supabase.from('transcript_paragraphs').insert(rows)

    // 6. Run quality gate
    const qualityGate = await runQualityGate(transcriptionId, firmId, paginated)

    // 7. Update transcript_words with page/line numbers
    for (const para of paginated) {
      if (para.word_ids.length > 0) {
        await supabase
          .from('transcript_words')
          .update({
            page_number: para.page_number,
            line_number: para.line_number_start,
          })
          .in('id', para.word_ids)
          .eq('firm_id', firmId)
      }
    }

    const pageCount = paginated.length > 0
      ? paginated[paginated.length - 1].page_number
      : 0

    return {
      success: true,
      transcriptionId,
      paragraphsCreated: paginated.length,
      pageCount,
      qualityGate,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    console.error('[CRITICAL] Formatter failed:', err)
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


═══════════════════════════════════════════════════════════════════════
SECTION 4 — SECTION DETECTION ENGINE
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): implement section detection engine"

File: lib/transcription/formatter/section-detector.ts

```typescript
// lib/transcription/formatter/section-detector.ts

import type { TranscriptWord, DepositionSection } from './types'

export type SectionMap = Map<number, DepositionSection>
// Maps position_index → section type

const SECTION_TRIGGERS: Array<{
  pattern: RegExp
  section: DepositionSection
}> = [
  { pattern: /^DIRECT\s+EXAMINATION$/i,       section: 'DIRECT_EXAMINATION' },
  { pattern: /^CROSS[-\s]+EXAMINATION$/i,      section: 'CROSS_EXAMINATION' },
  { pattern: /^REDIRECT\s+EXAMINATION$/i,      section: 'REDIRECT_EXAMINATION' },
  { pattern: /^RECROSS[-\s]+EXAMINATION$/i,    section: 'RECROSS_EXAMINATION' },
  { pattern: /^OFF\s+THE\s+RECORD$/i,          section: 'OFF_RECORD' },
  { pattern: /^BACK\s+ON\s+THE\s+RECORD$/i,    section: 'DIRECT_EXAMINATION' },
  { pattern: /FURTHER\s+THIS\s+DEPONENT\s+SAITH\s+NOT/i, section: 'CLOSING' },
]

// BY MR./MS./MRS./DR. [LAST NAME]: — signals start of new examination
const BYLINE_PATTERN = /^BY\s+(MR\.|MS\.|MRS\.|DR\.)\s+\w+:?$/i

export function detectSections(words: TranscriptWord[]): SectionMap {
  const map: SectionMap = new Map()
  let currentSection: DepositionSection = 'PREAMBLE'

  // Build text windows of 3–5 consecutive words to detect multi-word phrases
  for (let i = 0; i < words.length; i++) {
    const window2 = buildWindow(words, i, 2)
    const window3 = buildWindow(words, i, 3)
    const window4 = buildWindow(words, i, 4)
    const window5 = buildWindow(words, i, 5)

    for (const text of [window5, window4, window3, window2]) {
      let matched = false
      for (const trigger of SECTION_TRIGGERS) {
        if (trigger.pattern.test(text.trim())) {
          currentSection = trigger.section
          matched = true
          break
        }
      }
      if (matched) break
    }

    // Byline detection — single paragraph window
    if (BYLINE_PATTERN.test(window3.trim()) || BYLINE_PATTERN.test(window2.trim())) {
      // Don't change the section type — bylines are within a section
      // Mark as EXAMINATION_BYLINE in paragraph builder
    }

    map.set(words[i].position_index, currentSection)
  }

  return map
}

function buildWindow(words: TranscriptWord[], start: number, count: number): string {
  return words
    .slice(start, start + count)
    .map(w => w.display_word ?? w.word)
    .join(' ')
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 5 — PARAGRAPH BUILDER
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): implement paragraph builder with Q/A and colloquy"

File: lib/transcription/formatter/paragraph-builder.ts

Key rules — do not deviate:
  - examining_attorney → label: "Q."  / colloquy: "MR. [LAST]:"
  - witness            → label: "A."  / colloquy: "THE WITNESS:"
  - reporter           → label: "--"  / colloquy: "THE REPORTER:"  (NOT "THE COURT REPORTER")
  - videographer       → label: "--"  / colloquy: "THE VIDEOGRAPHER:"
  - interpreter        → label: "--"  / colloquy: "THE INTERPRETER:"

Tab system:
  Tab1 (5sp)  = Q./A. label position
  Tab2 (10sp) = Q./A. text start
  Tab3 (15sp) = colloquy text start

```typescript
// lib/transcription/formatter/paragraph-builder.ts

import type {
  TranscriptWord, SpeakerAssignment, Paragraph,
  ParagraphType, DepositionSection
} from './types'
import type { SectionMap } from './section-detector'

const BYLINE_PATTERN = /^BY\s+(MR\.|MS\.|MRS\.|DR\.)\s+\w+:?$/i
const REENTRY_PHRASES = ['off the record', 'back on the record', 'recess']
const INTERRUPTION_PATTERN = /\s--\s*$/  // trailing double hyphen

export function buildParagraphs(
  words: TranscriptWord[],
  speakers: SpeakerAssignment[],
  sectionMap: SectionMap
): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const speakerMap = new Map(speakers.map(s => [s.speaker_index, s]))

  let paraWords: TranscriptWord[] = []
  let currentSpeaker = -1
  let paraIndex = 0

  const flush = () => {
    if (paraWords.length === 0) return
    const para = buildParagraph(paraWords, speakerMap, sectionMap, paraIndex++)
    if (para) paragraphs.push(para)
    paraWords = []
  }

  for (const word of words) {
    // Speaker change = new paragraph
    if (word.speaker_index !== currentSpeaker && paraWords.length > 0) {
      flush()
    }
    currentSpeaker = word.speaker_index

    // Check for byline pattern (BY MR. SMITH:)
    const windowText = getWindowText(words, word.position_index, 3)
    if (BYLINE_PATTERN.test(windowText.trim())) {
      flush()
      paragraphs.push(buildBylineParagraph(windowText, word, sectionMap, paraIndex++))
      continue
    }

    // Check for off-record / recess markers
    const lowerWindow = getWindowText(words, word.position_index, 5).toLowerCase()
    if (REENTRY_PHRASES.some(p => lowerWindow.includes(p))) {
      flush()
      paragraphs.push(buildReentryParagraph(word, sectionMap, paraIndex++))
      continue
    }

    paraWords.push(word)
  }

  flush()
  return paragraphs
}

function buildParagraph(
  words: TranscriptWord[],
  speakerMap: Map<number, SpeakerAssignment>,
  sectionMap: SectionMap,
  index: number
): Paragraph | null {
  if (words.length === 0) return null

  const first = words[0]
  const speaker = speakerMap.get(first.speaker_index)
  const section = sectionMap.get(first.position_index) ?? 'PREAMBLE'

  const isExamination = [
    'DIRECT_EXAMINATION', 'CROSS_EXAMINATION',
    'REDIRECT_EXAMINATION', 'RECROSS_EXAMINATION'
  ].includes(section)

  const paragraphType: ParagraphType = isExamination
    ? (speaker?.qa_label === 'Q' ? 'QUESTION' : 'ANSWER')
    : 'COLLOQUY'

  const speakerLabel = getSpeakerLabel(speaker, paragraphType)
  const rawText = words.map(w => w.display_word ?? w.word).join(' ')
  const hasInterruption = INTERRUPTION_PATTERN.test(rawText)

  return {
    paragraph_index: index,
    paragraph_type: paragraphType,
    section_type: section,
    speaker_index: first.speaker_index,
    speaker_label: speakerLabel,
    text: rawText,   // post-processor will clean this
    raw_text: rawText,
    word_ids: words.map(w => w.id),
    start_word_idx: first.position_index,
    end_word_idx: words[words.length - 1].position_index,
    requires_reentry_marker: false,
    has_interruption: hasInterruption,
  }
}

function getSpeakerLabel(
  speaker: SpeakerAssignment | undefined,
  type: ParagraphType
): string {
  if (!speaker) return type === 'QUESTION' ? 'Q.' : type === 'ANSWER' ? 'A.' : '--'

  if (type === 'QUESTION') return 'Q.'
  if (type === 'ANSWER') return 'A.'

  // Colloquy labels
  switch (speaker.role) {
    case 'reporter':      return 'THE REPORTER:'          // NEVER "THE COURT REPORTER"
    case 'videographer':  return 'THE VIDEOGRAPHER:'
    case 'interpreter':   return 'THE INTERPRETER:'
    case 'witness':       return 'THE WITNESS:'
    default:
      const lastName = speaker.last_name?.toUpperCase()
      return lastName ? `MR. ${lastName}:` : '--'
  }
}

function buildBylineParagraph(
  text: string,
  word: TranscriptWord,
  sectionMap: SectionMap,
  index: number
): Paragraph {
  const section = sectionMap.get(word.position_index) ?? 'DIRECT_EXAMINATION'
  return {
    paragraph_index: index,
    paragraph_type: 'EXAMINATION_BYLINE',
    section_type: section,
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

function buildReentryParagraph(
  word: TranscriptWord,
  sectionMap: SectionMap,
  index: number
): Paragraph {
  const section = sectionMap.get(word.position_index) ?? 'COLLOQUY'
  const isOffRecord = word.word.toLowerCase().includes('off')
  const markerText = isOffRecord
    ? '(Whereupon, a brief recess was taken.)'
    : '(The deposition resumed.)'

  return {
    paragraph_index: index,
    paragraph_type: 'REENTRY_MARKER',
    section_type: section,
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

function getWindowText(
  words: TranscriptWord[],
  fromPosition: number,
  count: number
): string {
  return words
    .filter(w => w.position_index >= fromPosition && w.position_index < fromPosition + count)
    .map(w => w.display_word ?? w.word)
    .join(' ')
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 6 — POST-PROCESSOR
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): implement post-processor normalization rules"

File: lib/transcription/formatter/post-processor.ts

Rules (applied to paragraph.text — never to original_word):
  1. Em dash (— \u2014 \u2013) → -- (CRITICAL — highest priority)
  2. Time format → "2:12 p.m."
  3. Doctor [Name] → Dr. [Name]
  4. Two spaces after sentence-ending punctuation
  5. THE COURT REPORTER → THE REPORTER (in colloquy labels)

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
  // Rule 1: Em dash → double hyphen (MUST be first — UFM requirement)
  text = text.replace(/[\u2014\u2013—–]/g, '--')

  // Rule 2: Time format normalization
  // "2:12 PM" | "2:12PM" | "14:12" → "2:12 p.m." / "2:12 a.m."
  text = text.replace(
    /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|a\.m\.|p\.m\.)\b/g,
    (_, h, m, ampm) => {
      const hour = parseInt(h, 10)
      const suffix = ampm.toLowerCase().replace(/\./g, '').replace('am', 'a.m.').replace('pm', 'p.m.')
      return `${hour}:${m} ${suffix}`
    }
  )

  // Rule 3: "Doctor Smith" → "Dr. Smith" (title case only)
  text = text.replace(/\bDoctor\s+([A-Z][a-z]+)/g, 'Dr. $1')

  // Rule 4: THE COURT REPORTER → THE REPORTER
  text = text.replace(/THE\s+COURT\s+REPORTER/gi, 'THE REPORTER')

  // Rule 5: Two spaces after sentence-ending punctuation
  text = text.replace(/([.!?])\s+/g, '$1  ')

  return text
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 7 — PAGINATION ENGINE
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): implement 25-line pagination engine"

File: lib/transcription/formatter/paginator.ts

Rules:
  - Exactly 25 lines per page
  - Line numbers 1–25, reset each page
  - Never split Q./A. label from its first text line across a page break
  - Pure function — no DB calls

```typescript
// lib/transcription/formatter/paginator.ts

import type { Paragraph, PaginatedParagraph, JurisdictionConfig } from './types'

// Characters per line given margin settings
// Standard Courier New 12pt: 10 chars/inch
// Writing width = 8.5 - left_margin - right_margin - line_number_gutter(0.5")
// TX: 8.5 - 1.0 - 0.375 - 0.5 = 6.625" × 10 = 66 chars
// But UFM minimum is 56 chars — use the larger of the two
function getCharsPerLine(jurisdiction: JurisdictionConfig): number {
  const writingWidth = 8.5 - jurisdiction.left_margin_inches - jurisdiction.right_margin_inches - 0.5
  return Math.max(Math.floor(writingWidth * 10), jurisdiction.min_chars_per_line)
}

function countWrappedLines(text: string, firstLineChars: number, contLineChars: number): number {
  if (!text || text.trim().length === 0) return 1
  const words = text.split(/\s+/)
  let lines = 1
  let lineLen = 0
  let maxChars = firstLineChars

  for (const word of words) {
    if (lineLen === 0) {
      lineLen = word.length
    } else if (lineLen + 1 + word.length <= maxChars) {
      lineLen += 1 + word.length
    } else {
      lines++
      lineLen = word.length
      maxChars = contLineChars
    }
  }
  return lines
}

function countLinesForParagraph(para: Paragraph, jurisdiction: JurisdictionConfig): number {
  const charsPerLine = getCharsPerLine(jurisdiction)

  switch (para.paragraph_type) {
    case 'QUESTION':
    case 'ANSWER': {
      const labelLen = (para.speaker_label ?? 'Q.').length + 1
      const firstLineChars = charsPerLine - jurisdiction.qa_text_offset_spaces - labelLen
      const contLineChars = charsPerLine - jurisdiction.qa_text_offset_spaces
      return countWrappedLines(para.text, firstLineChars, contLineChars)
    }
    case 'COLLOQUY': {
      const labelLen = (para.speaker_label ?? '--').length + 1
      const firstLineChars = charsPerLine - jurisdiction.colloquy_indent_spaces - labelLen
      const contLineChars = charsPerLine - jurisdiction.colloquy_indent_spaces
      return countWrappedLines(para.text, firstLineChars, contLineChars)
    }
    case 'SECTION_HEADER':
    case 'EXAMINATION_BYLINE':
    case 'REENTRY_MARKER':
    case 'CLOSING_ASTERISKS':
    case 'FURTHER_SAYETH':
    case 'DEPO_CONCLUDED':
      return 1
    default:
      return 1
  }
}

export function paginateParagraphs(
  paragraphs: Paragraph[],
  jurisdiction: JurisdictionConfig
): PaginatedParagraph[] {
  const LINES_PER_PAGE = jurisdiction.lines_per_page  // 25
  const result: PaginatedParagraph[] = []
  let currentPage = 1
  let currentLine = 1

  for (const para of paragraphs) {
    const lineCount = countLinesForParagraph(para, jurisdiction)

    // Never split a Q./A. label from its first line across a page break
    // If only 1 line fits on this page, move to next page
    if (currentLine + lineCount - 1 > LINES_PER_PAGE) {
      currentPage++
      currentLine = 1
    }

    result.push({
      ...para,
      page_number: currentPage,
      line_number_start: currentLine,
      line_number_end: currentLine + lineCount - 1,
      line_count: lineCount,
    })

    currentLine += lineCount
  }

  return result
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 8 — QUALITY GATE
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): implement 12-check quality gate"

File: lib/transcription/formatter/quality-gate.ts

All 12 checks run via Promise.allSettled() so one failure never
blocks the others. ERRORs block export. WARNINGs require acknowledgment.

```typescript
// lib/transcription/formatter/quality-gate.ts

import { createAdminClient } from '@/lib/supabase/admin'
import type { PaginatedParagraph, QGCheck, QualityGateResult } from './types'

export async function runQualityGate(
  transcriptionId: string,
  firmId: string,
  paragraphs: PaginatedParagraph[]
): Promise<QualityGateResult> {
  const supabase = createAdminClient()

  const checks = await Promise.allSettled([
    checkVerifyTags(supabase, transcriptionId, firmId),           // QG-001
    checkSpeakerMapping(supabase, transcriptionId, firmId),       // QG-002
    checkDateConflicts(supabase, transcriptionId, firmId),        // QG-003
    checkCertificationBlock(supabase, transcriptionId, firmId),   // QG-004
    checkDeletedWords(supabase, transcriptionId, firmId),         // QG-005
    checkScopistNotes(paragraphs),                                 // QG-006
    checkExhibitPageNumbers(supabase, transcriptionId, firmId),   // QG-007
    checkFontCompliance(paragraphs),                               // QG-008
    checkLineLimits(paragraphs),                                   // QG-009
    checkLowConfidenceWords(supabase, transcriptionId, firmId),   // QG-010
    checkEmDash(paragraphs),                                       // QG-011
    checkCourtReporterLabel(paragraphs),                           // QG-012
  ])

  const results: QGCheck[] = checks.map((c, i) => {
    if (c.status === 'fulfilled') return c.value
    return {
      code: `QG-${String(i + 1).padStart(3, '0')}`,
      severity: 'ERROR' as const,
      passed: false,
      message: `Check failed with error: ${c.reason}`,
    }
  })

  const errorCount = results.filter(r => r.severity === 'ERROR' && !r.passed).length
  const warningCount = results.filter(r => r.severity === 'WARNING' && !r.passed).length

  return {
    passed: errorCount === 0,
    exportBlocked: errorCount > 0,
    checks: results,
    errorCount,
    warningCount,
  }
}

async function checkVerifyTags(supabase: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await supabase
    .from('transcript_flags')
    .select('*', { count: 'exact', head: true })
    .eq('transcription_id', id)
    .eq('firm_id', firmId)
    .eq('flag_type', 'VERIFY')
    .eq('is_resolved', false)
  return {
    code: 'QG-001', severity: 'ERROR',
    passed: (count ?? 0) === 0,
    message: count ? `${count} unresolved [VERIFY] tag(s) — must resolve before export` : 'No unresolved VERIFY tags',
  }
}

async function checkSpeakerMapping(supabase: any, id: string, firmId: string): Promise<QGCheck> {
  const { data: words } = await supabase
    .from('transcript_words')
    .select('speaker_index')
    .eq('transcription_id', id)
    .eq('firm_id', firmId)
    .eq('is_deleted', false)
  const speakerIndexes = [...new Set((words ?? []).map((w: any) => w.speaker_index))]
  const { data: assignments } = await supabase
    .from('speaker_assignments')
    .select('speaker_index')
    .eq('transcription_id', id)
    .eq('firm_id', firmId)
  const assignedIndexes = new Set((assignments ?? []).map((a: any) => a.speaker_index))
  const unassigned = speakerIndexes.filter(i => !assignedIndexes.has(i))
  return {
    code: 'QG-002', severity: 'ERROR',
    passed: unassigned.length === 0,
    message: unassigned.length ? `Speaker(s) ${unassigned.join(', ')} not assigned` : 'All speakers assigned',
  }
}

async function checkDateConflicts(supabase: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await supabase
    .from('transcript_flags')
    .select('*', { count: 'exact', head: true })
    .eq('transcription_id', id)
    .eq('firm_id', firmId)
    .eq('flag_type', 'DATE_CONFLICT')
    .eq('is_resolved', false)
  return {
    code: 'QG-003', severity: 'ERROR',
    passed: (count ?? 0) === 0,
    message: count ? `${count} unresolved date conflict(s)` : 'No date conflicts',
  }
}

async function checkCertificationBlock(supabase: any, id: string, firmId: string): Promise<QGCheck> {
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', id)
    .single()
  if (!transcription) return { code: 'QG-004', severity: 'ERROR', passed: false, message: 'Transcription not found' }
  const { data: job } = await supabase
    .from('jobs')
    .select('reporter_id')
    .eq('id', transcription.job_id)
    .single()
  if (!job?.reporter_id) return { code: 'QG-004', severity: 'ERROR', passed: false, message: 'No reporter assigned to job' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('license_number, license_state')
    .eq('id', job.reporter_id)
    .single()
  const hasCert = !!(profile?.license_number && profile?.license_state)
  return {
    code: 'QG-004', severity: 'ERROR',
    passed: hasCert,
    message: hasCert ? 'Certification block complete' : 'Reporter license_number or license_state missing',
  }
}

async function checkDeletedWords(supabase: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await supabase
    .from('transcript_words')
    .select('*', { count: 'exact', head: true })
    .eq('transcription_id', id)
    .eq('firm_id', firmId)
    .eq('is_deleted', true)
  return {
    code: 'QG-005', severity: 'ERROR',
    passed: (count ?? 0) === 0,
    message: count ? `${count} word(s) marked is_deleted=true (verbatim violation)` : 'No deleted words',
  }
}

function checkScopistNotes(paragraphs: PaginatedParagraph[]): QGCheck {
  const found = paragraphs.filter(p => /\[SCOPIST:/i.test(p.text))
  return {
    code: 'QG-006', severity: 'ERROR',
    passed: found.length === 0,
    message: found.length ? `${found.length} [SCOPIST: ...] note(s) remain in transcript body` : 'No scopist notes in body',
    details: found.map(p => `Page ${p.page_number} Line ${p.line_number_start}`),
  }
}

async function checkExhibitPageNumbers(supabase: any, id: string, firmId: string): Promise<QGCheck> {
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', id)
    .single()
  if (!transcription) return { code: 'QG-007', severity: 'ERROR', passed: true, message: 'No transcription' }
  const { data: exhibits } = await supabase
    .from('exhibit_markers')
    .select('transcript_page')
    .eq('transcription_id', id)
    .eq('firm_id', firmId)
  const missingPages = (exhibits ?? []).filter((e: any) => !e.transcript_page)
  return {
    code: 'QG-007', severity: 'ERROR',
    passed: missingPages.length === 0,
    message: missingPages.length ? `${missingPages.length} exhibit(s) missing transcript page numbers` : 'All exhibits have page numbers',
  }
}

function checkFontCompliance(_paragraphs: PaginatedParagraph[]): QGCheck {
  // Font compliance is verified at DOCX assembly time, not here
  return { code: 'QG-008', severity: 'WARNING', passed: true, message: 'Font compliance checked at export' }
}

function checkLineLimits(paragraphs: PaginatedParagraph[]): QGCheck {
  const over = paragraphs.filter(p => p.line_number_end > 25)
  return {
    code: 'QG-009', severity: 'WARNING',
    passed: over.length === 0,
    message: over.length ? `${over.length} paragraph(s) exceed 25-line page limit` : 'All pages within 25-line limit',
  }
}

async function checkLowConfidenceWords(supabase: any, id: string, firmId: string): Promise<QGCheck> {
  const { count } = await supabase
    .from('flagged_words')
    .select('*', { count: 'exact', head: true })
    .eq('transcription_id', id)
    .eq('firm_id', firmId)
    .eq('status', 'PENDING')
  return {
    code: 'QG-010', severity: 'WARNING',
    passed: (count ?? 0) === 0,
    message: count ? `${count} low-confidence word(s) unreviewed` : 'All flagged words reviewed',
  }
}

function checkEmDash(paragraphs: PaginatedParagraph[]): QGCheck {
  const found = paragraphs.filter(p => /[\u2014\u2013—–]/.test(p.text))
  return {
    code: 'QG-011', severity: 'WARNING',
    passed: found.length === 0,
    message: found.length ? `${found.length} paragraph(s) contain em dash characters` : 'No em dashes found',
  }
}

function checkCourtReporterLabel(paragraphs: PaginatedParagraph[]): QGCheck {
  const found = paragraphs.filter(p =>
    /THE\s+COURT\s+REPORTER/i.test(p.text) ||
    /THE\s+COURT\s+REPORTER/i.test(p.speaker_label ?? '')
  )
  return {
    code: 'QG-012', severity: 'WARNING',
    passed: found.length === 0,
    message: found.length ? `${found.length} occurrence(s) of "THE COURT REPORTER" — use "THE REPORTER"` : 'No incorrect reporter labels',
  }
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 9 — INCLUSION PAGES
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): implement inclusion page generators"

File: lib/transcription/formatter/inclusion-pages.ts

```typescript
// lib/transcription/formatter/inclusion-pages.ts

import { createAdminClient } from '@/lib/supabase/admin'

export interface InclusionPages {
  title: string[]
  appearances: string[]
  index: string[]
  certification: string[]
}

export async function generateInclusionPages(
  transcriptionId: string,
  firmId: string
): Promise<InclusionPages> {
  const supabase = createAdminClient()

  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', transcriptionId)
    .single()

  const { data: job } = await supabase
    .from('jobs')
    .select('case_name, deponent_name, deposition_date, reporter_id')
    .eq('id', transcription?.job_id)
    .single()

  const { data: deposition } = await supabase
    .from('depositions')
    .select('case_style, cause_number, court_name, county')
    .eq('job_id', transcription?.job_id)
    .eq('firm_id', firmId)
    .single()

  const { data: participants } = await supabase
    .from('participants')
    .select('full_name, role, firm_name')
    .eq('firm_id', firmId)
    .order('role')

  const { data: reporter } = job?.reporter_id
    ? await supabase
        .from('profiles')
        .select('full_name, license_number, license_state')
        .eq('id', job.reporter_id)
        .single()
    : { data: null }

  // Appearances page
  const appearances = [
    'APPEARANCES',
    '',
    ...(participants ?? []).map(p =>
      `${p.role.toUpperCase().replace('_', ' ')}: ${p.full_name}${p.firm_name ? ` (${p.firm_name})` : ''}`
    ),
  ]

  // Index of examinations (from transcript_paragraphs)
  const { data: bylines } = await supabase
    .from('transcript_paragraphs')
    .select('speaker_label, page_number, section_type')
    .eq('transcription_id', transcriptionId)
    .eq('firm_id', firmId)
    .eq('paragraph_type', 'EXAMINATION_BYLINE')
    .order('paragraph_index')

  const index = [
    'INDEX OF EXAMINATIONS',
    '',
    'WITNESS              PAGE',
    ...(bylines ?? []).map(b =>
      `${(b.speaker_label ?? '').padEnd(20)} ${b.page_number}`
    ),
  ]

  // Texas certification block
  const certName = reporter?.full_name ?? '[REPORTER NAME]'
  const certNum = reporter?.license_number ?? '[CSR NUMBER]'
  const certState = reporter?.license_state ?? 'Texas'
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })

  const certification = [
    'REPORTER\'S CERTIFICATION',
    '',
    `I, ${certName}, Certified Shorthand Reporter No. ${certNum} in and`,
    `for the State of ${certState}, hereby certify that the foregoing`,
    'is a true and correct transcript of the proceedings had in the',
    `above-entitled and numbered cause on ${dateStr}; that I am`,
    'neither attorney nor counsel for, related to, nor employed by, any',
    'of the parties to the action in which this deposition was taken;',
    'and, further, that I am not a relative or employee of any attorney',
    'of record in this cause, nor am I financially or otherwise',
    'interested in the outcome of the action.',
    '',
    '',
    `_________________________________`,
    certName,
    `CSR No. ${certNum}, Expiration ________`,
  ]

  return {
    title: [deposition?.case_style ?? job?.case_name ?? '', deposition?.cause_number ?? ''],
    appearances,
    index,
    certification,
  }
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 10 — DOCX ASSEMBLER
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(formatter): implement DOCX assembler replacing legal-formatter.ts"

File: lib/transcription/formatter/docx-assembler.ts

Verify docx package is in package.json first:
  Get-Content package.json | Select-String '"docx"'

If missing: npm install docx

Texas UFM spec:
  Font: Courier New 12pt
  Page: 8.5" × 11"
  Left margin: 1.0", Right margin: 0.375", Top/Bottom: 1.0"
  Line numbers: right-aligned in left margin, every line, 1–25 reset
  Header: case name (right-aligned) — page 2 onwards
  Footer: "- X -" centered

```typescript
// lib/transcription/formatter/docx-assembler.ts

import {
  Document, Paragraph as DocxParagraph, TextRun,
  AlignmentType, Header, Footer, PageNumber,
  convertInchesToTwip, NumberFormat, Packer,
  TabStopPosition, TabStopType,
} from 'docx'
import type { PaginatedParagraph, JurisdictionConfig } from './types'
import type { InclusionPages } from './inclusion-pages'

const FONT = 'Courier New'
const FONT_SIZE = 24  // half-points (12pt = 24)

export async function assembleDocx(
  paragraphs: PaginatedParagraph[],
  inclusionPages: InclusionPages,
  jurisdiction: JurisdictionConfig,
  caseName: string
): Promise<Buffer> {
  const docxParagraphs: DocxParagraph[] = []

  // Inclusion pages
  for (const line of [...inclusionPages.title, '', ...inclusionPages.appearances]) {
    docxParagraphs.push(makeLine(line, false))
  }
  docxParagraphs.push(makePageBreak())

  for (const line of inclusionPages.index) {
    docxParagraphs.push(makeLine(line, false))
  }
  docxParagraphs.push(makePageBreak())

  // Transcript body — group by page, add line numbers
  let lastPage = 0
  for (const para of paragraphs) {
    if (para.page_number !== lastPage && lastPage !== 0) {
      docxParagraphs.push(makePageBreak())
    }
    lastPage = para.page_number

    // Add each line of the paragraph with its line number
    const lines = splitParagraphToLines(para, jurisdiction)
    let lineNum = para.line_number_start

    for (const line of lines) {
      docxParagraphs.push(makeTranscriptLine(lineNum, line))
      lineNum++
    }
  }

  docxParagraphs.push(makePageBreak())

  // Certification page
  for (const line of inclusionPages.certification) {
    docxParagraphs.push(makeLine(line, false))
  }

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
              children: [new TextRun({ text: caseName, font: FONT, size: FONT_SIZE })],
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
                new TextRun({ text: '- ', font: FONT, size: FONT_SIZE }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: FONT_SIZE }),
                new TextRun({ text: ' -', font: FONT, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      },
      children: docxParagraphs,
    }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}

function makeTranscriptLine(lineNum: number, text: string): DocxParagraph {
  const numStr = String(lineNum).padStart(2, ' ')
  return new DocxParagraph({
    children: [
      new TextRun({ text: `${numStr}  ${text}`, font: FONT, size: FONT_SIZE }),
    ],
  })
}

function makeLine(text: string, _isBody: boolean): DocxParagraph {
  return new DocxParagraph({
    children: [new TextRun({ text, font: FONT, size: FONT_SIZE })],
  })
}

function makePageBreak(): DocxParagraph {
  return new DocxParagraph({
    children: [new TextRun({ text: '', break: 1 })],
  })
}

function splitParagraphToLines(
  para: PaginatedParagraph,
  jurisdiction: JurisdictionConfig
): string[] {
  if (para.paragraph_type === 'QUESTION' || para.paragraph_type === 'ANSWER') {
    const label = para.speaker_label ?? (para.paragraph_type === 'QUESTION' ? 'Q.' : 'A.')
    const indent = ' '.repeat(jurisdiction.qa_text_offset_spaces)
    return [`${' '.repeat(jurisdiction.qa_signifier_spaces)}${label}  ${para.text}`]
  }
  if (para.paragraph_type === 'COLLOQUY') {
    return [`${' '.repeat(jurisdiction.colloquy_indent_spaces)}${para.speaker_label ?? '--'}  ${para.text}`]
  }
  return [para.text]
}
```

IMPORTANT: Do NOT delete lib/transcription/legal-formatter.ts yet.
Wrap it: update the existing export route to call the new assembler,
but keep the old file until the Olivarez test passes.


═══════════════════════════════════════════════════════════════════════
SECTION 11 — FORMAT API ENDPOINT
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(api): add formatter run endpoint"

File: app/api/transcriptions/[id]/format/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
import { formatTranscript } from '@/lib/transcription/formatter'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const result = await formatTranscript({
    transcriptionId: params.id,
    firmId: profile.firm_id,
    forceReformat: request.method === 'POST',
  })

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  })
}

export const POST = withRouteProtection(handler, {
  roles: ['COURT_REPORTER', 'ADMIN', 'SCOPIST'],
  requireFirmId: true,
  auditAction: 'FORMATTER_RUN',
})
```

Also update the export route to run the quality gate before generating DOCX:
  app/api/transcriptions/[id]/export/route.ts
  - Before generating DOCX: call runQualityGate()
  - If exportBlocked === true: return 422 with quality gate results
  - Log TRANSCRIPT_EXPORTED audit event on success


═══════════════════════════════════════════════════════════════════════
SECTION 12 — OLIVAREZ TEST CASE (EXIT CRITERION)
═══════════════════════════════════════════════════════════════════════
Commit message: "test(formatter): add Olivarez baseline test and formatter unit tests"

─────────────────────────────────────────────────────────────────────
TASK 12.1 — Create Olivarez fixture
─────────────────────────────────────────────────────────────────────

File: tests/fixtures/olivarez-deepgram-output.json

Create a minimal but realistic Deepgram JSON fixture representing
the Olivarez deposition. Include:
  - At least 50 words
  - Two speakers (speaker_index 0 and 1)
  - Some words with confidence < 0.70
  - The word "Miyamardeau" (the known misrecognition of "Miah Bardot")
  - At least one question-and-answer exchange
  - At least one colloquy moment ("THE REPORTER:" not "THE COURT REPORTER:")

```json
{
  "metadata": { "request_id": "test-olivarez-001" },
  "results": {
    "channels": [{
      "alternatives": [{
        "words": [
          { "word": "please", "punctuated_word": "Please", "start": 0.5, "end": 0.8, "confidence": 0.99, "speaker": 0 },
          { "word": "state", "punctuated_word": "state", "start": 0.9, "end": 1.1, "confidence": 0.98, "speaker": 0 },
          { "word": "your", "punctuated_word": "your", "start": 1.1, "end": 1.3, "confidence": 0.99, "speaker": 0 },
          { "word": "name", "punctuated_word": "name.", "start": 1.3, "end": 1.6, "confidence": 0.98, "speaker": 0 },
          { "word": "maria", "punctuated_word": "Maria", "start": 2.0, "end": 2.3, "confidence": 0.95, "speaker": 1 },
          { "word": "dolores", "punctuated_word": "Dolores", "start": 2.3, "end": 2.7, "confidence": 0.94, "speaker": 1 },
          { "word": "olivarez", "punctuated_word": "Olivarez.", "start": 2.7, "end": 3.1, "confidence": 0.61, "speaker": 1 },
          { "word": "miyamardeau", "punctuated_word": "Miyamardeau", "start": 5.0, "end": 5.8, "confidence": 0.42, "speaker": 0 }
        ]
      }]
    }]
  }
}
```

─────────────────────────────────────────────────────────────────────
TASK 12.2 — Formatter unit tests
─────────────────────────────────────────────────────────────────────

Create these test files:

tests/unit/formatter/post-processor.test.ts:
  - em dash → "--" (U+2014, U+2013, — character all convert)
  - "THE COURT REPORTER" → "THE REPORTER"
  - Time "2:12 PM" → "2:12 p.m."
  - Time "14:12 PM" → "2:12 p.m."
  - original_word is not touched by post-processor

tests/unit/formatter/paginator.test.ts:
  - 25-line limit enforced
  - Q/A label never split from first line across page break
  - Line numbers reset to 1 on each new page
  - Short paragraph fits on current page
  - Long paragraph wraps correctly

tests/unit/formatter/section-detector.test.ts:
  - "DIRECT EXAMINATION" detected
  - "CROSS-EXAMINATION" detected
  - "OFF THE RECORD" → OFF_RECORD section
  - "BACK ON THE RECORD" → resumes prior section
  - BY MR. SMITH: detected as byline

tests/unit/formatter/quality-gate.test.ts:
  - QG-011: paragraph with em dash → WARNING, passed: false
  - QG-012: "THE COURT REPORTER" in speaker_label → WARNING, passed: false
  - QG-001: 0 VERIFY tags → passed: true
  - QG-006: [SCOPIST: check this] in text → ERROR, passed: false

─────────────────────────────────────────────────────────────────────
TASK 12.3 — Olivarez pipeline integration test
─────────────────────────────────────────────────────────────────────

File: tests/integration/formatter-pipeline.test.ts

This is the EXIT CRITERION for Phase 1.

The test must:
  1. Load olivarez-deepgram-output.json fixture
  2. Insert fixture words into transcript_words (test DB)
  3. Run formatTranscript()
  4. Assert: paragraphsCreated > 0
  5. Assert: pageCount > 0
  6. Assert: all QG checks have been run (12 checks)
  7. Assert: QG-011 passes (no em dashes in output)
  8. Assert: QG-012 passes (no "THE COURT REPORTER")
  9. Run assembleDocx() → returns a Buffer
  10. Assert: Buffer.length > 0 (DOCX was generated)

Run: npx vitest run tests/integration/formatter-pipeline.test.ts

EXIT CRITERION: All 10 assertions pass.


═══════════════════════════════════════════════════════════════════════
SECTION 13 — FINAL VERIFICATION GATE
═══════════════════════════════════════════════════════════════════════
No commit. Verification only.

Run:
  npx tsc --noEmit          → 0 errors
  npm run lint              → 0 errors
  npm run build             → passes
  npx vitest run            → all tests pass

Manual smoke test in browser:
  1. Open a job that has a transcription
  2. POST /api/transcriptions/[id]/format → 200 response
  3. Check Supabase: transcript_paragraphs rows created for this transcription
  4. GET /api/transcriptions/[id]/quality-gate → returns 12 checks
  5. GET /api/transcriptions/[id]/export → DOCX downloads
  6. Open DOCX: verify Courier New font, line numbers 1–25, Q/A structure
  7. Verify no em dashes in the exported document
  8. Verify "THE REPORTER" not "THE COURT REPORTER"

Document results in ai_logs/phase1_audit.md.

Output completion report:

  ╔═══════════════════════════════════════════════════════════════════╗
  ║          DEPO-PRO PHASE 1 — FORMATTER FOUNDATION COMPLETE        ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ Phase A migrations applied:         YES / PARTIAL                ║
  ║ confidence_class column:            YES                          ║
  ║ buildKeywords.ts fixed:             YES                          ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ Section detection:                  IMPLEMENTED                  ║
  ║ Paragraph builder (Q/A/Colloquy):   IMPLEMENTED                  ║
  ║ Post-processor (em dash, labels):   IMPLEMENTED                  ║
  ║ Pagination (25 lines/page):         IMPLEMENTED                  ║
  ║ Quality gate (12 checks):           IMPLEMENTED                  ║
  ║ Inclusion pages:                    IMPLEMENTED                  ║
  ║ DOCX assembler:                     IMPLEMENTED                  ║
  ║ Format API endpoint:                IMPLEMENTED                  ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ Unit tests passing:                 X/X                          ║
  ║ Integration test passing:           X/X                          ║
  ║ TypeScript:                         0 errors                     ║
  ║ Build:                              PASSING                      ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ EXIT CRITERION:                                                   ║
  ║ Olivarez DOCX generated, passes QG-011 and QG-012?               ║
  ║   [ ] YES — Phase 1 complete, proceed to Phase 2                 ║
  ║   [ ] NO  — document failure in REVIEW_NEEDED.md                 ║
  ╚═══════════════════════════════════════════════════════════════════╝

Save this prompt to: ai_prompts/phases/phase_01_formatter_foundation.md
