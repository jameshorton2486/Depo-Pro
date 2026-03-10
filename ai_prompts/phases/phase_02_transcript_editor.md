# DEPO-PRO — PHASE 2: INTERACTIVE TRANSCRIPT EDITOR
# Tool: Claude Code | Codex CLI | Cursor
# Session: claude code --no-resume  (always use this flag)
# Save to: ai_prompts/phases/phase_02_transcript_editor.md
#
# VERSION: 2.0 — Self-Bootstrapping
# This prompt never stops on missing files. If a spec file is
# absent, all required context is embedded inline in SECTION 0B.
#
# PREREQUISITE: Phase 1 must be complete.
# transcript_words, transcript_paragraphs, speaker_assignments,
# transcript_flags, and jurisdiction_configs tables must exist.
# The formatter pipeline must be producing paragraph rows.
#
# READ THIS ENTIRE PROMPT BEFORE EXECUTING ANY COMMAND.
# Complete tasks in order. One commit per section. No skipping.

═══════════════════════════════════════════════════════════════════════
SECTION 0 — BOOTSTRAP: VERIFY AND SCAFFOLD ENVIRONMENT
═══════════════════════════════════════════════════════════════════════

─────────────────────────────────────────────────────────────────────
TASK 0.1 — Check required directories exist
─────────────────────────────────────────────────────────────────────

Run:
  Test-Path docs\specs
  Test-Path ai_prompts\architecture
  Test-Path ai_logs
  Test-Path lib\editor
  Test-Path hooks
  Test-Path components\transcripts
  Test-Path components\editor
  Test-Path tests\unit\editor
  Test-Path tests\unit\components
  Test-Path tests\integration

For any that return False:
  New-Item -ItemType Directory -Path [path] -Force

─────────────────────────────────────────────────────────────────────
TASK 0.2 — Check Phase 1 exit criteria were met
─────────────────────────────────────────────────────────────────────

Verify these tables exist in Supabase before proceeding:
  transcript_words
  transcript_paragraphs
  speaker_assignments
  transcript_flags
  jurisdiction_configs

Check via:
  supabase db diff --schema public | Select-String "CREATE TABLE"

Also verify:
  lib/transcription/formatter/index.ts exists (Phase 1 formatter)
  lib/transcription/formatter/quality-gate.ts exists
  lib/transcription/buildKeywords.ts is NOT the stub (does not return [])

If any Phase 1 tables are missing — run Phase 1 migrations first.
Do not proceed until Phase 1 exit criteria are confirmed.

─────────────────────────────────────────────────────────────────────
TASK 0.3 — Baseline build check
─────────────────────────────────────────────────────────────────────

  npx tsc --noEmit 2>&1 | tail -5
  npm run build 2>&1 | tail -10

Document results in ai_logs/phase2_audit.md:
  - TypeScript error count before Phase 2 starts
  - Build status
  - Existing editor components found (AudioPlayer, FlaggedWordPanel, etc.)
  - Whether useEditorState.ts hook exists
  - Whether withRouteProtection() is present in lib/middleware/

No commit for Section 0.

═══════════════════════════════════════════════════════════════════════
SECTION 0B — EMBEDDED CORE ARCHITECTURE RULES
═══════════════════════════════════════════════════════════════════════

Use these rules throughout this entire session.
These are authoritative regardless of whether spec files exist.

PLATFORM:
  Depo-Pro — legal deposition transcription SaaS
  Next.js 15 (App Router) · TypeScript · Supabase (Postgres+RLS) · Vercel
  Deepgram Nova-3 · Anthropic Claude · docx npm package

AUTH (non-negotiable):
  - Supabase SSR only — NextAuth removed
  - Server client: createSupabaseServerClient() from lib/supabase/server.ts (FROZEN)
  - User profile table: profiles — NEVER 'users'
  - Key env var: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — NEVER anon key
  - Auth failures → /unauthorized?reason=missing_profile — NEVER /login
  - All new API routes use withRouteProtection() from
    lib/middleware/withRouteProtection.ts

DATABASE INTEGRITY (non-negotiable):
  - transcript_words.original_word: IMMUTABLE — never modify
  - transcriptions.deepgram_raw_json: IMMUTABLE — never modify
  - Corrections stored as OVERLAYS in transcription_edits
  - corrected_word column gets corrections — NEVER original_word
  - No hard DELETE on transcript_words rows
  - All queries must include firm_id scope

FROZEN FILES:
  lib/supabase/server.ts
  lib/supabase/client.ts
  lib/auth/session.ts
  middleware.ts
  supabase/migrations/** (append-only)

JOB STATE MACHINE:
  PENDING → UPLOADING → PROCESSING → TRANSCRIBED → IN_REVIEW
  → SCOPIST_COMPLETE → REPORTER_REVIEW → COMPLETED → EXPORTED
  Invalid transitions → 422.

FORMATTER RULES (Texas UFM):
  - Em dash (— \u2014) → -- (double hyphen) — ALWAYS
  - THE COURT REPORTER → THE REPORTER — ALWAYS
  - Font: Courier New 12pt, 25 lines/page, line numbers 1–25

MIAH BARDOT RULE:
  "Miyamardeau" or "Mia Bardeau" = misrecognition of Miah Bardot (B-A-R-D-O-T)
  CSR #12129, SA Legal Solutions
  → Flag CRITICAL, surface to scopist, NEVER auto-correct

CONFIDENCE THRESHOLDS:
  HIGH ≥ 0.90 | MEDIUM 0.80–0.89 | LOW 0.70–0.79 | CRITICAL < 0.70

AI ASSISTS, HUMANS DECIDE:
  - AI flags and suggests — scopist explicitly confirms every change
  - No auto-correction of testimony under any circumstances
  - Confidence scores are advisory only

COMMIT DISCIPLINE:
  One commit per section. Run before every commit:
    npx tsc --noEmit && npm run lint && npm run build
  All three must pass. Fix failures — never add @ts-ignore.


═══════════════════════════════════════════════════════════════════════
SECTION 1 — PHASE B DATABASE MIGRATIONS
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(db): apply Phase B migrations for transcript editor"

─────────────────────────────────────────────────────────────────────
TASK 1.1 — Check which Phase B migrations are needed
─────────────────────────────────────────────────────────────────────

Check if these columns/tables already exist before creating them.
Never run a migration twice. ON CONFLICT / IF NOT EXISTS everywhere.

Phase B minimum required migrations (in this order):

1. pg_trgm extension + trigram index on transcript_words
2. audio_nav index on transcript_words
3. confidence_class generated column (if not from Phase 1)
4. reporter_preferences table
5. proofreading_assignments table
6. transcript_access_log table
7. ai_rules table (with system rule seeds)
8. export_certifications table
9. Timestamp precision fix on transcript_words

─────────────────────────────────────────────────────────────────────
TASK 1.2 — Create and run Phase B migration file
─────────────────────────────────────────────────────────────────────

Create: supabase/migrations/20260311_016_phase_b_editor.sql

```sql
-- Phase B: Transcript Editor Support
-- Run after Phase A migrations (20260306_001 through 20260306_013)

-- 1. Trigram extension for fuzzy word search (Bardot/Miyamardeau detection)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tw_word_trgm
  ON transcript_words USING gin(word gin_trgm_ops);

-- 2. Audio navigation index (click-to-seek near-instant lookup)
CREATE INDEX IF NOT EXISTS idx_tw_audio_nav
  ON transcript_words(transcription_id, start_time, end_time)
  WHERE is_deleted = FALSE;

-- 3. Confidence class generated column (if not already added in Phase 1)
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

-- 4. Timestamp precision for long depositions (8+ hours)
ALTER TABLE transcript_words
  ALTER COLUMN start_time TYPE NUMERIC(12,3),
  ALTER COLUMN end_time   TYPE NUMERIC(12,3);

-- 5. reporter_preferences — persists playback speed, UI state
CREATE TABLE IF NOT EXISTS reporter_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  playback_speed  NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  rewind_seconds  INTEGER NOT NULL DEFAULT 3,
  auto_scroll     BOOLEAN NOT NULL DEFAULT TRUE,
  theme           TEXT NOT NULL DEFAULT 'light',
  keyboard_shortcuts JSONB DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);
ALTER TABLE reporter_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reporter_prefs_own" ON reporter_preferences
  FOR ALL USING (profile_id = auth.uid());

-- 6. proofreading_assignments — scopist assigned to transcription
CREATE TABLE IF NOT EXISTS proofreading_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  scopist_id       UUID NOT NULL REFERENCES profiles(id),
  assigned_by      UUID NOT NULL REFERENCES profiles(id),
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at           TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'ASSIGNED',
  -- ASSIGNED | IN_PROGRESS | COMPLETED | REASSIGNED
  notes            TEXT,
  UNIQUE(transcription_id, scopist_id)
);
ALTER TABLE proofreading_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_firm_isolation" ON proofreading_assignments
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
  );

-- 7. transcript_access_log — who viewed a transcript and when
CREATE TABLE IF NOT EXISTS transcript_access_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  accessed_by      UUID NOT NULL REFERENCES profiles(id),
  access_type      TEXT NOT NULL,
  -- 'REVIEW_OPEN' | 'EXPORT_DOWNLOAD' | 'SHARE_VIEW' | 'ATTORNEY_VIEW'
  ip_address       TEXT,
  user_agent       TEXT,
  accessed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE transcript_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_log_firm" ON transcript_access_log
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
  );
CREATE INDEX IF NOT EXISTS idx_tal_transcription
  ON transcript_access_log(transcription_id, accessed_at DESC);

-- 8. ai_rules — system formatting rules + firm-level overrides
CREATE TABLE IF NOT EXISTS ai_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name       TEXT NOT NULL UNIQUE,
  rule_type       TEXT NOT NULL,
  -- PUNCTUATION | SPEAKER | VERBATIM | FORMATTING | CAPITALIZATION
  severity        TEXT NOT NULL DEFAULT 'WARNING',
  -- ERROR | WARNING | SUGGESTION
  description     TEXT NOT NULL,
  match_pattern   TEXT,
  match_context   TEXT NOT NULL DEFAULT 'word',
  -- word | paragraph | document
  rule_source     TEXT NOT NULL DEFAULT 'texas_ufm',
  rule_citation   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_rule  BOOLEAN NOT NULL DEFAULT FALSE,
  -- system_rules cannot be disabled by firms
  times_fired     INTEGER NOT NULL DEFAULT 0,
  times_accepted  INTEGER NOT NULL DEFAULT 0,
  times_rejected  INTEGER NOT NULL DEFAULT 0,
  firm_id         UUID REFERENCES firms(id),
  -- NULL = global rule; set = firm-specific override
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ai_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_rules_firm" ON ai_rules
  FOR ALL USING (
    firm_id IS NULL OR
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
  );

-- Seed critical system rules
INSERT INTO ai_rules (rule_name, rule_type, severity, description, match_pattern, match_context, rule_source, rule_citation, is_active, is_system_rule)
VALUES
  ('EM_DASH_PROHIBITION', 'PUNCTUATION', 'WARNING',
   'Em dash (—) is not permitted. Replace with double hyphen (--).',
   E'\\u2014|\u2014', 'word', 'texas_ufm', 'UFM Punctuation Section', TRUE, TRUE),
  ('COURT_REPORTER_LABEL', 'SPEAKER', 'WARNING',
   '"THE COURT REPORTER" is non-standard. Use "THE REPORTER".',
   'THE COURT REPORTER', 'paragraph', 'texas_ufm', 'UFM Speaker Label Section', TRUE, TRUE),
  ('VERBATIM_DELETION', 'VERBATIM', 'ERROR',
   'Words cannot be deleted from the transcript. Verbatim mandate.',
   NULL, 'word', 'texas_ufm', 'UFM Verbatim Mandate', TRUE, TRUE),
  ('TIME_FORMAT_LOWERCASE', 'FORMATTING', 'WARNING',
   'Time must be "2:12 p.m." not "2:12 PM".',
   E'\\d{1,2}:\\d{2}\\s*[AP]M', 'word', 'texas_ufm', 'UFM Time Format', TRUE, TRUE),
  ('UH_HUH_VERBATIM', 'VERBATIM', 'SUGGESTION',
   '"Uh-huh" and "uh-uh" must not be changed to "Yes" or "No".',
   'uh-huh|uh-uh', 'word', 'texas_ufm', 'UFM Verbatim Mandate', TRUE, TRUE)
ON CONFLICT (rule_name) DO NOTHING;

-- 9. export_certifications — append-only log of every certification event
CREATE TABLE IF NOT EXISTS export_certifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE RESTRICT,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  certified_by     UUID NOT NULL REFERENCES profiles(id),
  export_format    TEXT NOT NULL,  -- 'DOCX' | 'PDF' | 'ASCII'
  quality_gate_results JSONB NOT NULL,
  warning_overrides    JSONB DEFAULT '[]',
  -- [{ code: 'QG-009', reason: 'Approved by reporter' }]
  file_hash        TEXT,           -- SHA-256 of exported file
  export_url       TEXT,
  certified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE export_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_firm_isolation" ON export_certifications
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
  );
```

Run: supabase db push

Verify tables created:
  supabase db diff --schema public | Select-String "reporter_preferences|proofreading_assignments|transcript_access_log|ai_rules|export_certifications"

─────────────────────────────────────────────────────────────────────
TASK 1.3 — Review progress SQL function
─────────────────────────────────────────────────────────────────────

Create as a Supabase migration (append to same file or new file):

```sql
-- get_review_progress() — single query, used by /api/transcriptions/[id]/review-progress
CREATE OR REPLACE FUNCTION get_review_progress(p_transcription_id UUID)
RETURNS TABLE(
  total_flagged   BIGINT,
  reviewed        BIGINT,
  pending         BIGINT,
  corrected       BIGINT,
  confirmed       BIGINT,
  skipped         BIGINT,
  pct_complete    NUMERIC
) AS $$
  SELECT
    COUNT(*) AS total_flagged,
    COUNT(*) FILTER (WHERE status != 'PENDING') AS reviewed,
    COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
    COUNT(*) FILTER (WHERE status = 'CORRECTED') AS corrected,
    COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
    COUNT(*) FILTER (WHERE status = 'SKIPPED') AS skipped,
    CASE WHEN COUNT(*) = 0 THEN 100
         ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status != 'PENDING') / COUNT(*), 1)
    END AS pct_complete
  FROM flagged_words
  WHERE transcription_id = p_transcription_id
$$ LANGUAGE sql STABLE;
```


═══════════════════════════════════════════════════════════════════════
SECTION 2 — EDITOR TYPES AND STATE HOOK
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(editor): add editor types and useEditorState hook"

─────────────────────────────────────────────────────────────────────
TASK 2.1 — Create lib/editor/types.ts
─────────────────────────────────────────────────────────────────────

```typescript
// lib/editor/types.ts
// All types for the transcript editor system.
// Column names match DB exactly (snake_case).

export type CorrectionStatus = 'PENDING' | 'CORRECTED' | 'CONFIRMED' | 'SKIPPED'
export type ConfidenceClass = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL'

export interface EditorWord {
  id: string
  transcription_id: string
  firm_id: string
  position_index: number
  original_word: string       // immutable — never modify
  word: string
  punctuated_word: string
  display_word: string
  corrected_word: string | null
  start_time: number
  end_time: number
  confidence: number
  confidence_class: ConfidenceClass
  speaker_index: number
  is_corrected: boolean
  is_deleted: boolean         // always false — verbatim mandate
  is_filler: boolean
  page_number: number | null
  line_number: number | null
}

export interface FlaggedWord {
  id: string
  transcription_id: string
  firm_id: string
  word_id: string
  original_word: string       // immutable — for display only
  corrected_word: string | null
  status: CorrectionStatus
  confidence: number
  confidence_class: ConfidenceClass
  start_time: number
  end_time: number
  speaker_index: number
  alternatives: string[]      // Deepgram alternative suggestions
  context_before: string      // ~3 words before
  context_after: string       // ~3 words after
  updated_at: string          // ISO datetime — used for optimistic locking
}

export interface TranscriptFlag {
  id: string
  transcription_id: string
  firm_id: string
  word_id: string | null
  paragraph_id: string | null
  flag_type: 'VERIFY' | 'DATE_CONFLICT' | 'SPEAKER_CONFLICT'
    | 'INCOMPLETE' | 'SCOPIST_NOTE' | 'VERBATIM_CONCERN'
    | 'FORMATTING_ERROR' | 'QUALITY_GATE'
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  message: string
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null
  quality_gate_code: string | null
  created_at: string
}

export interface CorrectionRecord {
  wordId: string
  previousWord: string
  correctedWord: string
  status: CorrectionStatus
  timestamp: string
}

export interface ReviewProgress {
  total_flagged: number
  reviewed: number
  pending: number
  corrected: number
  confirmed: number
  skipped: number
  pct_complete: number
}

export interface ConsistencyWarning {
  canonical: string           // most common spelling
  variants: string[]          // other spellings found
  occurrences: number[]       // count per variant
  wordIds: string[][]         // word IDs per variant
}

export interface AISuggestion {
  id: string
  transcription_id: string
  word_id: string | null
  paragraph_id: string | null
  suggestion_type: 'PROPER_NOUN_CORRECTION' | 'SPEAKER_LABEL_FIX'
    | 'DATE_FORMAT_FIX' | 'EM_DASH_REPLACEMENT' | 'STYLE_RULE_VIOLATION'
  original_text: string
  suggested_text: string
  confidence: number
  rule_code: string | null
  status: 'PENDING' | 'APPLIED' | 'REJECTED'
  created_at: string
}

export interface EditorState {
  transcriptionId: string
  firmId: string
  isLocked: boolean           // true when current user holds the job lock
  isReadOnly: boolean         // true when another user holds the lock
  currentAudioTime: number
  activeWordId: string | null
  editingWordId: string | null
  corrections: CorrectionRecord[]
  progress: ReviewProgress | null
  isSubmitting: boolean
}
```

─────────────────────────────────────────────────────────────────────
TASK 2.2 — Create hooks/useEditorState.ts
─────────────────────────────────────────────────────────────────────

```typescript
// hooks/useEditorState.ts
// Central state hook for the review page.
// Manages audio time, active word, editing state, and correction history.

import { useState, useRef, useCallback, useEffect } from 'react'
import type { EditorState, CorrectionRecord, ReviewProgress } from '@/lib/editor/types'

interface UseEditorStateProps {
  transcriptionId: string
  firmId: string
  isLocked: boolean
  isReadOnly: boolean
}

export function useEditorState({
  transcriptionId,
  firmId,
  isLocked,
  isReadOnly,
}: UseEditorStateProps) {
  const audioPlayerRef = useRef<{ seekTo: (time: number) => void } | null>(null)

  const [state, setState] = useState<EditorState>({
    transcriptionId,
    firmId,
    isLocked,
    isReadOnly,
    currentAudioTime: 0,
    activeWordId: null,
    editingWordId: null,
    corrections: [],
    progress: null,
    isSubmitting: false,
  })

  // Called by AudioPlayer on every timeupdate event
  const handleTimeUpdate = useCallback((time: number) => {
    setState(prev => ({ ...prev, currentAudioTime: time }))
  }, [])

  // Called by TranscriptPanel or FlaggedWordPanel to seek audio
  const handleSeekToTime = useCallback((time: number) => {
    audioPlayerRef.current?.seekTo(time)
    setState(prev => ({ ...prev, currentAudioTime: time }))
  }, [])

  // Called after a correction is saved to the API
  const handleCorrectionSaved = useCallback((record: CorrectionRecord) => {
    setState(prev => ({
      ...prev,
      corrections: [...prev.corrections, record],
      editingWordId: null,
    }))
  }, [])

  const handleProgressUpdate = useCallback((progress: ReviewProgress) => {
    setState(prev => ({ ...prev, progress }))
  }, [])

  const setActiveWordId = useCallback((wordId: string | null) => {
    setState(prev => ({ ...prev, activeWordId: wordId }))
  }, [])

  const setEditingWordId = useCallback((wordId: string | null) => {
    setState(prev => ({ ...prev, editingWordId: wordId }))
  }, [])

  // Lock keepalive — ping every 5 minutes while page is open
  useEffect(() => {
    if (!isLocked || isReadOnly) return
    const interval = setInterval(async () => {
      await fetch(`/api/jobs/${transcriptionId}/lock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [transcriptionId, isLocked, isReadOnly])

  return {
    state,
    audioPlayerRef,
    handleTimeUpdate,
    handleSeekToTime,
    handleCorrectionSaved,
    handleProgressUpdate,
    setActiveWordId,
    setEditingWordId,
  }
}
```

─────────────────────────────────────────────────────────────────────
TASK 2.3 — Create lib/editor/access-logger.ts
─────────────────────────────────────────────────────────────────────

```typescript
// lib/editor/access-logger.ts
// Fire-and-forget access logging on review page open.
// Non-blocking — never throws on the calling code.

import { createAdminClient } from '@/lib/supabase/admin'

export async function logTranscriptAccess(
  transcriptionId: string,
  firmId: string,
  userId: string,
  accessType: 'REVIEW_OPEN' | 'EXPORT_DOWNLOAD' | 'SHARE_VIEW' | 'ATTORNEY_VIEW',
  request?: Request
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('transcript_access_log').insert({
      transcription_id: transcriptionId,
      firm_id: firmId,
      accessed_by: userId,
      access_type: accessType,
      ip_address: request?.headers.get('x-forwarded-for') ?? null,
      user_agent: request?.headers.get('user-agent') ?? null,
    })
  } catch {
    // Non-blocking — never propagate logging errors
  }
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 3 — AUDIO PLAYER COMPONENT
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(editor): implement AudioPlayer component with seek and speed control"

File: components/transcripts/AudioPlayer.tsx

Check first: does this file already exist?
  Test-Path components\transcripts\AudioPlayer.tsx

If it exists — read it first, then enhance it to match this spec.
Do not rewrite from scratch if 70%+ of the spec is already there.

Required features:
  - HTML5 Audio element (not wavesurfer — no new dependencies)
  - Expose seekTo(time) via useImperativeHandle ref
  - Play/Pause (Space key)
  - Seek bar (click or drag)
  - Time display: "1:24 / 48:32"
  - Skip ±5 seconds (← → arrow keys)
  - Skip ±15 seconds (Shift+← Shift+→)
  - Playback speed: 0.5× 0.75× 1× 1.25× 1.5× 2× (persisted)
  - Volume control + mute
  - F7 = rewind 3s (foot pedal compatible)
  - F9 = forward 3s (foot pedal compatible)
  - Loading state while buffering
  - Multi-session: uses global_start_offset + word.start_time

```typescript
// components/transcripts/AudioPlayer.tsx
'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback } from 'react'

interface AudioPlayerProps {
  audioUrl: string
  onTimeUpdate: (currentTime: number) => void
  globalStartOffset?: number  // for multi-session audio
  onReady?: () => void
}

export interface AudioPlayerHandle {
  seekTo: (time: number) => void
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  ({ audioUrl, onTimeUpdate, globalStartOffset = 0, onReady }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [speed, setSpeed] = useState(() => {
      if (typeof window !== 'undefined') {
        return parseFloat(localStorage.getItem('dp_playback_speed') ?? '1')
      }
      return 1
    })
    const [volume, setVolume] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isMuted, setIsMuted] = useState(false)

    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        if (!audioRef.current) return
        const adjustedTime = time - globalStartOffset
        if (adjustedTime >= 0 && adjustedTime <= audioRef.current.duration) {
          audioRef.current.currentTime = adjustedTime
          setCurrentTime(time)
        }
      },
    }))

    // Keyboard shortcuts
    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        const audio = audioRef.current
        if (!audio) return
        // Don't trigger if user is typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT') return

        switch (e.code) {
          case 'Space':
            e.preventDefault()
            isPlaying ? audio.pause() : audio.play()
            break
          case 'ArrowLeft':
            e.preventDefault()
            audio.currentTime = Math.max(0, audio.currentTime - (e.shiftKey ? 15 : 5))
            break
          case 'ArrowRight':
            e.preventDefault()
            audio.currentTime = Math.min(audio.duration, audio.currentTime + (e.shiftKey ? 15 : 5))
            break
          case 'F7':
            e.preventDefault()
            audio.currentTime = Math.max(0, audio.currentTime - 3)
            break
          case 'F9':
            e.preventDefault()
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 3)
            break
        }
      }
      window.addEventListener('keydown', handleKey)
      return () => window.removeEventListener('keydown', handleKey)
    }, [isPlaying])

    // Persist speed preference
    const handleSpeedChange = useCallback((newSpeed: number) => {
      setSpeed(newSpeed)
      if (audioRef.current) audioRef.current.playbackRate = newSpeed
      localStorage.setItem('dp_playback_speed', String(newSpeed))
      // Fire-and-forget persist to reporter_preferences
      fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playback_speed: newSpeed }),
      }).catch(() => {})
    }, [])

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60)
      const s = Math.floor(secs % 60)
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
      <div className="w-full bg-gray-900 text-white px-4 py-2 flex items-center gap-4 rounded-lg">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            const t = (audioRef.current?.currentTime ?? 0) + globalStartOffset
            setCurrentTime(t)
            onTimeUpdate(t)
          }}
          onLoadedMetadata={() => {
            setDuration(audioRef.current?.duration ?? 0)
            setIsLoading(false)
            if (audioRef.current) audioRef.current.playbackRate = speed
            onReady?.()
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
        />

        {/* Play/Pause */}
        <button
          onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
          className="text-white hover:text-indigo-400 transition-colors w-8 h-8 flex items-center justify-center"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </button>

        {/* Seek bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs tabular-nums w-20 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime - globalStartOffset}
            onChange={e => {
              const t = parseFloat(e.target.value)
              if (audioRef.current) audioRef.current.currentTime = t
            }}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-xs tabular-nums w-20">
            {formatTime(duration)}
          </span>
        </div>

        {/* Speed selector */}
        <select
          value={speed}
          onChange={e => handleSpeedChange(parseFloat(e.target.value))}
          className="bg-gray-800 text-white text-xs rounded px-1 py-0.5"
          aria-label="Playback speed"
        >
          {SPEED_OPTIONS.map(s => (
            <option key={s} value={s}>{s}×</option>
          ))}
        </select>

        {/* Volume */}
        <button
          onClick={() => {
            setIsMuted(!isMuted)
            if (audioRef.current) audioRef.current.muted = !isMuted
          }}
          className="text-xs"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    )
  }
)

AudioPlayer.displayName = 'AudioPlayer'
export default AudioPlayer
```


═══════════════════════════════════════════════════════════════════════
SECTION 4 — TRANSCRIPT PANEL COMPONENT
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(editor): implement TranscriptPanel with word-level sync"

File: components/transcripts/TranscriptPanel.tsx

Check first: does this file already exist?
  Test-Path components\transcripts\TranscriptPanel.tsx

If it exists — read it first, then enhance.

Required features:
  - Render transcript_paragraphs (from DB, not raw words)
  - Paragraph-level virtualization (not word-level)
  - Binary search (O(log n)) to find active word at currentAudioTime
  - Confidence CSS classes: conf-high / conf-medium / conf-low / conf-critical
  - Active word: blue highlight + auto-scroll
  - Corrected word: green underline + tooltip showing original_word
  - [VERIFY] tag: right-click context menu → insert flag
  - Inline edit: double-click word → <input> → Enter=save, Escape=cancel
  - data-word-id and data-start-time attributes on every word span
  - Speaker labels rendered per spec (Q. / A. / THE REPORTER: etc.)

CONFIDENCE CSS CLASSES (add to globals.css or tailwind layer):
```css
.conf-critical { background-color: #FFCDD2; }   /* red tint */
.conf-low      { background-color: #FFE0B2; }   /* orange tint */
.conf-medium   { background-color: #FFF9C4; }   /* yellow tint */
.conf-high     { background-color: transparent; }

/* Dark mode variants */
.dark .conf-critical { background-color: rgba(211, 47, 47, 0.35); }
.dark .conf-low      { background-color: rgba(230, 81, 0, 0.35); }
.dark .conf-medium   { background-color: rgba(249, 168, 37, 0.25); }
```

```typescript
// components/transcripts/TranscriptPanel.tsx
'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { EditorWord, TranscriptFlag } from '@/lib/editor/types'

interface TranscriptParagraph {
  id: string
  paragraph_index: number
  paragraph_type: string
  section_type: string
  speaker_label: string | null
  text: string
  word_ids: string[]
  start_word_idx: number
  end_word_idx: number
  page_number: number
  line_number_start: number
}

interface TranscriptPanelProps {
  paragraphs: TranscriptParagraph[]
  words: EditorWord[]
  flags: TranscriptFlag[]
  currentAudioTime: number
  onWordClick: (word: EditorWord) => void
  onWordDoubleClick: (word: EditorWord) => void
  onInsertFlag: (wordId: string, flagType: string) => void
  editingWordId: string | null
  onSaveEdit: (wordId: string, newText: string) => Promise<void>
  onCancelEdit: () => void
}

// Binary search: find the word whose time range contains currentTime
// Returns null if no word matches
function findActiveWordId(
  words: EditorWord[],
  currentTime: number
): string | null {
  if (words.length === 0) return null
  let lo = 0, hi = words.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const w = words[mid]
    if (w.end_time < currentTime) {
      lo = mid + 1
    } else if (w.start_time > currentTime) {
      hi = mid - 1
    } else {
      return w.id  // currentTime is within this word's range
    }
  }
  // Nearest word (lo is the first word starting after currentTime)
  if (lo < words.length) return words[lo].id
  return words[words.length - 1].id
}

export default function TranscriptPanel({
  paragraphs, words, flags, currentAudioTime,
  onWordClick, onWordDoubleClick, onInsertFlag,
  editingWordId, onSaveEdit, onCancelEdit,
}: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; wordId: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const wordMap = new Map(words.map(w => [w.id, w]))
  const flagMap = new Map(flags.map(f => [f.word_id, f]))
  const activeWordId = findActiveWordId(words, currentAudioTime)

  // Auto-scroll active word into view
  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeWordId])

  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 0.90) return 'conf-high'
    if (confidence >= 0.80) return 'conf-medium'
    if (confidence >= 0.70) return 'conf-low'
    return 'conf-critical'
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, wordId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, wordId })
  }, [])

  const handleEditKeyDown = useCallback(async (e: React.KeyboardEvent, wordId: string) => {
    if (e.key === 'Enter') {
      await onSaveEdit(wordId, editValue)
    } else if (e.key === 'Escape') {
      onCancelEdit()
    }
  }, [editValue, onSaveEdit, onCancelEdit])

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-8 py-4 font-mono text-sm leading-relaxed"
      onClick={() => setContextMenu(null)}
    >
      {/* Page/line number header */}
      {paragraphs.map(para => (
        <div key={para.id} className="mb-2" data-paragraph-index={para.paragraph_index}>
          {/* Page break indicator */}
          {para.line_number_start === 1 && para.page_number > 1 && (
            <div className="text-xs text-gray-400 border-t border-dashed border-gray-300 mb-2 pt-1 text-center">
              — Page {para.page_number} —
            </div>
          )}

          <div className="flex gap-2">
            {/* Line number */}
            <span className="text-gray-400 select-none w-6 text-right text-xs leading-6">
              {para.line_number_start}
            </span>

            {/* Paragraph content */}
            <div className="flex-1">
              {para.speaker_label && (
                <span className="font-bold mr-2">{para.speaker_label}</span>
              )}

              {/* Render words individually for word-level sync */}
              {para.word_ids.map(wordId => {
                const word = wordMap.get(wordId)
                if (!word) return null

                const isActive = wordId === activeWordId
                const hasFlag = flagMap.has(wordId)
                const confClass = getConfidenceClass(word.confidence)

                if (editingWordId === wordId) {
                  return (
                    <input
                      key={wordId}
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => handleEditKeyDown(e, wordId)}
                      onBlur={() => { if (editValue.trim()) onSaveEdit(wordId, editValue) }}
                      className="inline-block w-24 border-b-2 border-indigo-500 bg-transparent outline-none text-sm"
                    />
                  )
                }

                return (
                  <span
                    key={wordId}
                    ref={isActive ? activeWordRef : null}
                    data-word-id={wordId}
                    data-start-time={word.start_time}
                    className={[
                      'cursor-pointer rounded px-0.5 mx-0.5 transition-colors',
                      confClass,
                      isActive ? 'ring-2 ring-blue-400 bg-blue-100' : '',
                      hasFlag ? 'border-b-2 border-dashed border-orange-400' : '',
                      word.is_corrected ? 'underline decoration-green-500 decoration-wavy' : '',
                    ].filter(Boolean).join(' ')}
                    title={word.is_corrected ? `Original: "${word.original_word}"` : `Confidence: ${Math.round(word.confidence * 100)}%`}
                    onClick={() => onWordClick(word)}
                    onDoubleClick={() => {
                      setEditValue(word.corrected_word ?? word.display_word)
                      onWordDoubleClick(word)
                    }}
                    onContextMenu={e => handleContextMenu(e, wordId)}
                  >
                    {word.corrected_word ?? word.display_word}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-1 hover:bg-gray-100"
            onClick={() => { onInsertFlag(contextMenu.wordId, 'VERIFY'); setContextMenu(null) }}
          >
            Insert [VERIFY] tag
          </button>
          <button
            className="w-full text-left px-4 py-1 hover:bg-gray-100"
            onClick={() => { onInsertFlag(contextMenu.wordId, 'SCOPIST_NOTE'); setContextMenu(null) }}
          >
            Insert [SCOPIST: ...] note
          </button>
          <button
            className="w-full text-left px-4 py-1 hover:bg-gray-100"
            onClick={() => { onInsertFlag(contextMenu.wordId, 'DATE_CONFLICT'); setContextMenu(null) }}
          >
            Flag date conflict
          </button>
        </div>
      )}
    </div>
  )
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 5 — FLAGGED WORD PANEL COMPONENT
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(editor): implement FlaggedWordPanel with keyboard navigation"

File: components/transcripts/FlaggedWordPanel.tsx

Check first: does this file already exist?
  Test-Path components\transcripts\FlaggedWordPanel.tsx

If it exists — read it first, then enhance.

Required features:
  - List of flagged_words sorted by confidence ASC (lowest first)
  - Confidence badge color: CRITICAL=red LOW=orange MEDIUM=yellow HIGH=green
  - Context display: "...word_before [FLAGGED] word_after..."
  - ▶ Play button: seeks audio to start_time - 2 seconds
  - Suggestion chips from Deepgram alternatives (click to populate input)
  - Inline text input for correction
  - Three action buttons: Correct | Confirm (keep original) | Skip
  - Progress bar: "X of Y reviewed (Z%)"
  - Filter tabs: All | Pending | Corrected | Confirmed | Skipped
  - Auto-scroll to word nearest to currentAudioTime (binary search)
  - isReadOnly prop: disables all buttons when true

KEYBOARD SHORTCUTS (must work when FlaggedWordPanel has focus):
  ↓ / ↑     navigate between cards
  Tab       jump to next PENDING word
  Shift+Tab jump to previous PENDING word
  Space     play audio from this word's start_time - 2s
  Enter     confirm correction (Correct if text entered, Confirm if empty)
  Escape    skip this word
  Ctrl+Z    undo last correction

```typescript
// components/transcripts/FlaggedWordPanel.tsx
'use client'

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import type { FlaggedWord, ReviewProgress, CorrectionStatus } from '@/lib/editor/types'

interface FlaggedWordPanelProps {
  flaggedWords: FlaggedWord[]
  currentAudioTime: number
  progress: ReviewProgress | null
  onSeekAudio: (time: number) => void
  onCorrection: (wordId: string, correctedWord: string | null, status: CorrectionStatus) => Promise<void>
  isReadOnly: boolean
}

type FilterType = 'ALL' | CorrectionStatus

const CONFIDENCE_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300',
  LOW:      'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border border-yellow-300',
  HIGH:     'bg-green-100 text-green-800 border border-green-300',
}

// Binary search: find word closest to currentTime by start_time
function findNearestWordIndex(words: FlaggedWord[], currentTime: number): number {
  if (words.length === 0) return 0
  let lo = 0, hi = words.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (words[mid].start_time < currentTime) lo = mid + 1
    else hi = mid
  }
  return lo
}

export default function FlaggedWordPanel({
  flaggedWords,
  currentAudioTime,
  progress,
  onSeekAudio,
  onCorrection,
  isReadOnly,
}: FlaggedWordPanelProps) {
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [activeIndex, setActiveIndex] = useState(0)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [lastCorrection, setLastCorrection] = useState<{ wordId: string; prev: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const headingId = useId()

  const filtered = flaggedWords.filter(w =>
    filter === 'ALL' || w.status === filter
  )

  // Auto-scroll to word nearest to audio time
  useEffect(() => {
    const pending = flaggedWords.filter(w => w.status === 'PENDING')
    if (pending.length === 0) return
    const nearestIdx = findNearestWordIndex(pending, currentAudioTime)
    const globalIdx = filtered.findIndex(w => w.id === pending[nearestIdx]?.id)
    if (globalIdx >= 0 && globalIdx !== activeIndex) {
      setActiveIndex(globalIdx)
    }
  }, [currentAudioTime])

  // Scroll active card into view
  useEffect(() => {
    cardRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = async (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return
      const word = filtered[activeIndex]
      if (!word) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex(i => Math.max(i - 1, 0))
          break
        case 'Tab':
          e.preventDefault()
          // Jump to next PENDING
          const nextPending = filtered.findIndex(
            (w, i) => i > activeIndex + (e.shiftKey ? 0 : 0) && w.status === 'PENDING'
          )
          if (nextPending >= 0) setActiveIndex(nextPending)
          break
        case ' ':
          e.preventDefault()
          onSeekAudio(Math.max(0, word.start_time - 2))
          break
        case 'Enter':
          if (!isReadOnly) {
            e.preventDefault()
            await handleSave(word, editValues[word.id] ?? null)
          }
          break
        case 'Escape':
          if (!isReadOnly) {
            e.preventDefault()
            await handleAction(word.id, null, 'SKIPPED')
          }
          break
        case 'z':
          if (e.ctrlKey && lastCorrection) {
            e.preventDefault()
            // Undo last correction — re-open as PENDING
            await onCorrection(lastCorrection.wordId, lastCorrection.prev, 'PENDING')
            setLastCorrection(null)
          }
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeIndex, filtered, editValues, isReadOnly, lastCorrection, onSeekAudio])

  const handleSave = async (word: FlaggedWord, value: string | null) => {
    const trimmed = value?.trim()
    if (trimmed) {
      await handleAction(word.id, trimmed, 'CORRECTED')
    } else {
      await handleAction(word.id, null, 'CONFIRMED')
    }
  }

  const handleAction = async (
    wordId: string,
    correctedWord: string | null,
    status: CorrectionStatus
  ) => {
    setSaving(wordId)
    try {
      const word = flaggedWords.find(w => w.id === wordId)
      if (word) setLastCorrection({ wordId, prev: word.corrected_word ?? '' })
      await onCorrection(wordId, correctedWord, status)
      // Move to next PENDING word
      const nextIdx = filtered.findIndex((w, i) => i > activeIndex && w.status === 'PENDING')
      if (nextIdx >= 0) setActiveIndex(nextIdx)
    } finally {
      setSaving(null)
    }
  }

  const pct = progress?.pct_complete ?? 0

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col"
      tabIndex={0}
      aria-labelledby={headingId}
      role="region"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 shrink-0">
        <h2 id={headingId} className="font-semibold text-sm text-gray-700 mb-2">
          Flagged Words
          {progress && (
            <span className="ml-2 text-gray-500 font-normal">
              {progress.reviewed}/{progress.total_flagged} reviewed
            </span>
          )}
        </h2>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 text-xs">
          {(['ALL', 'PENDING', 'CORRECTED', 'CONFIRMED', 'SKIPPED'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Word cards */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-gray-400 text-sm">
            {filter === 'PENDING' ? 'All words reviewed!' : 'No words in this category.'}
          </div>
        )}

        {filtered.map((word, idx) => (
          <div
            key={word.id}
            ref={el => { cardRefs.current[idx] = el }}
            onClick={() => setActiveIndex(idx)}
            className={[
              'border-b px-4 py-3 cursor-pointer transition-colors',
              idx === activeIndex ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50',
              word.status !== 'PENDING' ? 'opacity-70' : '',
            ].join(' ')}
          >
            {/* Top row: word + confidence badge */}
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-semibold text-gray-900">
                {word.corrected_word ?? word.original_word}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${CONFIDENCE_BADGE[word.confidence_class]}`}>
                {word.confidence_class} {Math.round(word.confidence * 100)}%
              </span>
            </div>

            {/* Context */}
            <div className="text-xs text-gray-500 mb-2 font-mono">
              ...{word.context_before}{' '}
              <span className="bg-yellow-200 font-bold px-0.5 rounded">
                {word.original_word}
              </span>
              {' '}{word.context_after}...
            </div>

            {/* Play button */}
            <button
              onClick={e => { e.stopPropagation(); onSeekAudio(Math.max(0, word.start_time - 2)) }}
              className="text-xs text-indigo-600 hover:text-indigo-800 mb-2"
              aria-label="Play audio from this word"
            >
              ▶ Play ({Math.floor(word.start_time / 60)}:{String(Math.floor(word.start_time % 60)).padStart(2, '0')})
            </button>

            {/* Suggestion chips */}
            {word.alternatives.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {word.alternatives.slice(0, 4).map(alt => (
                  <button
                    key={alt}
                    onClick={e => {
                      e.stopPropagation()
                      setEditValues(prev => ({ ...prev, [word.id]: alt }))
                    }}
                    disabled={isReadOnly}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded border disabled:opacity-40"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}

            {/* Correction input + action buttons */}
            {!isReadOnly && word.status === 'PENDING' && (
              <div className="flex gap-2 mt-1">
                <input
                  value={editValues[word.id] ?? ''}
                  onChange={e => setEditValues(prev => ({ ...prev, [word.id]: e.target.value }))}
                  onClick={e => e.stopPropagation()}
                  placeholder="Type correction..."
                  className="flex-1 text-xs border rounded px-2 py-1 focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
                />
                <button
                  onClick={async e => { e.stopPropagation(); await handleSave(word, editValues[word.id] ?? null) }}
                  disabled={saving === word.id}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {editValues[word.id] ? 'Correct' : 'Confirm'}
                </button>
                <button
                  onClick={async e => { e.stopPropagation(); await handleAction(word.id, null, 'SKIPPED') }}
                  disabled={saving === word.id}
                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            )}

            {/* Status badge for non-PENDING */}
            {word.status !== 'PENDING' && (
              <span className={`text-xs ${
                word.status === 'CORRECTED' ? 'text-green-700' :
                word.status === 'CONFIRMED' ? 'text-blue-700' : 'text-gray-500'
              }`}>
                {word.status === 'CORRECTED' && `✓ Changed to: "${word.corrected_word}"`}
                {word.status === 'CONFIRMED' && '✓ Confirmed as-is'}
                {word.status === 'SKIPPED' && '— Skipped'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 6 — CORRECTION API (OPTIMISTIC LOCKING)
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(api): implement correction API with optimistic locking"

─────────────────────────────────────────────────────────────────────
TASK 6.1 — PATCH flagged-words/[wordId]
─────────────────────────────────────────────────────────────────────

File: app/api/transcriptions/[id]/flagged-words/[wordId]/route.ts

Check if this file already exists. If it does, read it first.
The existing file may already handle CORRECTED/CONFIRMED/SKIPPED.
The critical addition is OPTIMISTIC LOCKING.

Required behavior:
  1. Client sends { correctedWord, status, clientUpdatedAt }
  2. Server loads flagged_words row, checks updated_at
  3. If server updated_at > clientUpdatedAt → return 409 with serverUpdatedAt
  4. Writes corrected_word to transcript_words (NEVER original_word)
  5. Creates transcription_edits record
  6. Appends to transcript_integrity_chain
  7. Logs WORD_CORRECTED audit event
  8. Returns updated flagged_words row

```typescript
// app/api/transcriptions/[id]/flagged-words/[wordId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

interface PatchBody {
  correctedWord: string | null
  status: 'CORRECTED' | 'CONFIRMED' | 'SKIPPED'
  clientUpdatedAt: string  // ISO datetime from client
}

async function handler(
  request: NextRequest,
  { params }: { params: { id: string; wordId: string } }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, role, full_name')
    .eq('id', user.id)
    .single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const body: PatchBody = await request.json()
  const { correctedWord, status, clientUpdatedAt } = body

  if (!status || !['CORRECTED', 'CONFIRMED', 'SKIPPED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (status === 'CORRECTED' && !correctedWord?.trim()) {
    return NextResponse.json({ error: 'correctedWord is required when status is CORRECTED' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Load flagged_words row — scoped to firm
  const { data: flaggedWord } = await admin
    .from('flagged_words')
    .select('*, transcript_words!inner(id, original_word, firm_id)')
    .eq('id', params.wordId)
    .eq('transcription_id', params.id)
    .eq('firm_id', profile.firm_id)
    .single()

  if (!flaggedWord) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 })
  }

  // OPTIMISTIC LOCKING — check for concurrent edit
  if (clientUpdatedAt) {
    const serverTime = new Date(flaggedWord.updated_at).getTime()
    const clientTime = new Date(clientUpdatedAt).getTime()
    if (serverTime > clientTime) {
      return NextResponse.json({
        error: 'CONFLICT',
        message: 'This word was modified by another user. Please reload.',
        serverUpdatedAt: flaggedWord.updated_at,
      }, { status: 409 })
    }
  }

  // Update flagged_words
  const { data: updatedWord, error: updateError } = await admin
    .from('flagged_words')
    .update({
      status,
      corrected_word: status === 'CORRECTED' ? correctedWord : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.wordId)
    .eq('firm_id', profile.firm_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update', details: updateError.message }, { status: 500 })
  }

  // Write corrected_word to transcript_words overlay (NEVER original_word)
  if (status === 'CORRECTED' && correctedWord) {
    await admin
      .from('transcript_words')
      .update({
        corrected_word: correctedWord,
        display_word: correctedWord,
        is_corrected: true,
      })
      .eq('id', flaggedWord.word_id)
      .eq('firm_id', profile.firm_id)
  }

  // Create transcription_edits record
  await admin.from('transcription_edits').insert({
    transcription_id: params.id,
    firm_id: profile.firm_id,
    word_id: flaggedWord.word_id,
    editor_id: user.id,
    previous_word: flaggedWord.transcript_words?.original_word,
    new_word: correctedWord,
    edit_type: status,
    edit_source: 'FLAGGED_WORD_PANEL',
  })

  // Append to integrity chain
  const chainPayload = JSON.stringify({
    transcription_id: params.id,
    word_id: flaggedWord.word_id,
    action: status,
    corrected_word: correctedWord,
    editor_id: user.id,
    timestamp: new Date().toISOString(),
  })
  const hash = crypto.createHash('sha256').update(chainPayload).digest('hex')
  await admin.from('transcript_integrity_chain').insert({
    transcription_id: params.id,
    firm_id: profile.firm_id,
    action_type: 'WORD_CORRECTED',
    action_data: JSON.parse(chainPayload),
    hash,
    created_by: user.id,
  })

  // Audit log
  await admin.from('audit_log').insert({
    firm_id: profile.firm_id,
    user_id: user.id,
    action: 'WORD_CORRECTED',
    resource_type: 'flagged_word',
    resource_id: params.wordId,
    metadata: { status, correctedWord, transcriptionId: params.id },
  })

  return NextResponse.json({ success: true, word: updatedWord })
}

export const PATCH = withRouteProtection(handler, {
  roles: ['SCOPIST', 'COURT_REPORTER', 'ADMIN'],
  requireFirmId: true,
  auditAction: 'WORD_CORRECTION_ATTEMPT',
})
```

─────────────────────────────────────────────────────────────────────
TASK 6.2 — GET review-progress
─────────────────────────────────────────────────────────────────────

File: app/api/transcriptions/[id]/review-progress/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_review_progress', {
    p_transcription_id: params.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? {
    total_flagged: 0, reviewed: 0, pending: 0,
    corrected: 0, confirmed: 0, skipped: 0, pct_complete: 100
  })
}

export const GET = withRouteProtection(handler, {
  roles: ['SCOPIST', 'COURT_REPORTER', 'ADMIN', 'ATTORNEY'],
})
```

─────────────────────────────────────────────────────────────────────
TASK 6.3 — POST transcript flags
─────────────────────────────────────────────────────────────────────

File: app/api/transcriptions/[id]/flags/route.ts

POST — creates a VERIFY, DATE_CONFLICT, or SCOPIST_NOTE flag.
Body: { wordId?, paragraphId?, flagType, message }

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const body = await request.json()
  const { wordId, paragraphId, flagType, message } = body

  const VALID_FLAG_TYPES = [
    'VERIFY', 'DATE_CONFLICT', 'SPEAKER_CONFLICT',
    'INCOMPLETE', 'SCOPIST_NOTE', 'VERBATIM_CONCERN', 'FORMATTING_ERROR'
  ]
  if (!VALID_FLAG_TYPES.includes(flagType)) {
    return NextResponse.json({ error: 'Invalid flag_type' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('transcript_flags')
    .insert({
      transcription_id: params.id,
      firm_id: profile.firm_id,
      word_id: wordId ?? null,
      paragraph_id: paragraphId ?? null,
      flag_type: flagType,
      severity: flagType === 'VERIFY' ? 'ERROR' : 'WARNING',
      message: message ?? `[${flagType}]`,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, flag: data }, { status: 201 })
}

export const POST = withRouteProtection(handler, {
  roles: ['SCOPIST', 'COURT_REPORTER', 'ADMIN'],
  requireFirmId: true,
})
```

─────────────────────────────────────────────────────────────────────
TASK 6.4 — POST review-complete (job status transition)
─────────────────────────────────────────────────────────────────────

File: app/api/jobs/[id]/review-complete/route.ts

Transitions job: IN_REVIEW → SCOPIST_COMPLETE
Returns 422 if job is not currently IN_REVIEW.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const admin = createAdminClient()
  const { data: job } = await admin
    .from('jobs')
    .select('id, status, firm_id')
    .eq('id', params.id)
    .eq('firm_id', profile.firm_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  if (job.status !== 'IN_REVIEW') {
    return NextResponse.json({
      error: 'INVALID_TRANSITION',
      message: `Job is ${job.status} — can only submit review from IN_REVIEW state`,
      currentStatus: job.status,
    }, { status: 422 })
  }

  // Check for unresolved VERIFY flags (warn, don't block)
  const { count: openFlags } = await admin
    .from('transcript_flags')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', profile.firm_id)
    .eq('is_resolved', false)
    .in('flag_type', ['VERIFY', 'DATE_CONFLICT'])

  const { data: updatedJob, error } = await admin
    .from('jobs')
    .update({
      status: 'SCOPIST_COMPLETE',
      review_completed_at: new Date().toISOString(),
      review_completed_by: user.id,
    })
    .eq('id', params.id)
    .eq('firm_id', profile.firm_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    firm_id: profile.firm_id,
    user_id: user.id,
    action: 'JOB_REVIEW_SUBMITTED',
    resource_type: 'job',
    resource_id: params.id,
    metadata: { previousStatus: 'IN_REVIEW', newStatus: 'SCOPIST_COMPLETE' },
  })

  return NextResponse.json({
    success: true,
    job: updatedJob,
    warnings: (openFlags ?? 0) > 0
      ? [`${openFlags} unresolved flag(s) remain — reporter should review before export`]
      : [],
  })
}

export const POST = withRouteProtection(handler, {
  roles: ['SCOPIST', 'ADMIN'],
  requireFirmId: true,
  auditAction: 'REVIEW_COMPLETE_ATTEMPT',
})
```


═══════════════════════════════════════════════════════════════════════
SECTION 7 — CONSISTENCY ENGINE
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(editor): implement consistency engine for proper noun variants"

File: lib/editor/consistency-engine.ts

The consistency engine catches "Olivarez" vs "Olivares", "Bardot" vs
"Bardeau" vs "Miyamardeau". Uses pg_trgm similarity search.

```typescript
// lib/editor/consistency-engine.ts

import { createAdminClient } from '@/lib/supabase/admin'
import type { ConsistencyWarning } from './types'

// Minimum similarity threshold for variant detection
const SIMILARITY_THRESHOLD = 0.5

/**
 * Scans a transcription for proper noun spelling variants.
 * Uses pg_trgm similarity to find words that are likely the same
 * but spelled differently (Deepgram misrecognitions).
 *
 * Special case: "Miyamardeau" / "Mia Bardeau" → likely "Miah Bardot"
 * These will always trigger a CRITICAL flag.
 */
export async function detectInconsistencies(
  transcriptionId: string,
  firmId: string
): Promise<ConsistencyWarning[]> {
  const supabase = createAdminClient()

  // Get all capitalized words (likely proper nouns)
  const { data: words } = await supabase
    .from('transcript_words')
    .select('id, word, confidence')
    .eq('transcription_id', transcriptionId)
    .eq('firm_id', firmId)
    .eq('is_deleted', false)
    .ilike('word', '[A-Z]%')  // starts with capital

  if (!words || words.length === 0) return []

  // Group by normalized form
  const groups = new Map<string, { canonical: string; variants: Map<string, string[]> }>()

  for (const word of words) {
    const normalized = word.word.toLowerCase().replace(/[^a-z]/g, '')
    if (normalized.length < 3) continue

    // Find similar words using trigram similarity
    const { data: similar } = await supabase.rpc('find_similar_words', {
      p_transcription_id: transcriptionId,
      p_word: word.word,
      p_threshold: SIMILARITY_THRESHOLD,
    }).catch(() => ({ data: null }))

    if (!similar || similar.length <= 1) continue

    // Cluster variants
    const variantMap = new Map<string, string[]>()
    for (const s of similar) {
      const existing = variantMap.get(s.word) ?? []
      existing.push(s.id)
      variantMap.set(s.word, existing)
    }

    if (variantMap.size > 1) {
      // Most common spelling = canonical
      const canonical = [...variantMap.entries()]
        .sort((a, b) => b[1].length - a[1].length)[0][0]

      groups.set(canonical, { canonical, variants: variantMap })
    }
  }

  return Array.from(groups.values()).map(g => ({
    canonical: g.canonical,
    variants: Array.from(g.variants.keys()).filter(v => v !== g.canonical),
    occurrences: Array.from(g.variants.values()).map(ids => ids.length),
    wordIds: Array.from(g.variants.values()),
  }))
}

/**
 * Apply a canonical spelling to all variant occurrences.
 * Creates transcription_edits entries for each change.
 * This is a SCOPIST-APPROVED bulk action — not auto-correction.
 */
export async function applyConsistencyFix(
  transcriptionId: string,
  firmId: string,
  canonicalWord: string,
  variantWordIds: string[],
  approvedBy: string
): Promise<{ updated: number }> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('transcript_words')
    .update({
      corrected_word: canonicalWord,
      display_word: canonicalWord,
      is_corrected: true,
    })
    .in('id', variantWordIds)
    .eq('firm_id', firmId)
    .select()

  if (error) throw new Error(`Consistency fix failed: ${error.message}`)

  // Log each edit
  const edits = (data ?? []).map(w => ({
    transcription_id: transcriptionId,
    firm_id: firmId,
    word_id: w.id,
    editor_id: approvedBy,
    previous_word: w.original_word,
    new_word: canonicalWord,
    edit_type: 'CONSISTENCY_FIX',
    edit_source: 'CONSISTENCY_ENGINE',
  }))

  if (edits.length > 0) {
    await supabase.from('transcription_edits').insert(edits)
  }

  return { updated: data?.length ?? 0 }
}
```

Create a Supabase function for trigram similarity search:

```sql
-- Add to a new migration file: supabase/migrations/20260311_017_similarity_fn.sql
CREATE OR REPLACE FUNCTION find_similar_words(
  p_transcription_id UUID,
  p_word TEXT,
  p_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE(id UUID, word TEXT, similarity FLOAT) AS $$
  SELECT id, word, similarity(word, p_word) AS similarity
  FROM transcript_words
  WHERE transcription_id = p_transcription_id
    AND is_deleted = FALSE
    AND similarity(word, p_word) >= p_threshold
    AND word <> p_word
  ORDER BY similarity DESC
  LIMIT 50;
$$ LANGUAGE sql STABLE;
```

Also create API routes:
  GET  /api/transcriptions/[id]/consistency
  POST /api/transcriptions/[id]/consistency/apply

Both use withRouteProtection(['SCOPIST', 'COURT_REPORTER', 'ADMIN']).
GET has 5-minute cache header.


═══════════════════════════════════════════════════════════════════════
SECTION 8 — DATE DETECTOR
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(editor): implement date conflict detector"

File: lib/editor/date-detector.ts

Auto-detects conflicting dates in transcript vs case incident_date.
Creates DATE_CONFLICT transcript_flags automatically.
Runs after formatter completes (fire-and-forget).

```typescript
// lib/editor/date-detector.ts

import { createAdminClient } from '@/lib/supabase/admin'

// Date patterns found in legal depositions
const DATE_PATTERNS = [
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,     // MM/DD/YYYY
  /\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/g,        // MM-DD-YYYY
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
]

export async function detectDateConflicts(
  transcriptionId: string,
  firmId: string
): Promise<{ flagsCreated: number }> {
  const supabase = createAdminClient()

  // Get case incident_date from depositions table
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', transcriptionId)
    .single()

  const { data: deposition } = await supabase
    .from('depositions')
    .select('incident_date')
    .eq('job_id', transcription?.job_id)
    .eq('firm_id', firmId)
    .single()

  if (!deposition?.incident_date) return { flagsCreated: 0 }

  const incidentDate = new Date(deposition.incident_date)

  // Get all transcript text
  const { data: paragraphs } = await supabase
    .from('transcript_paragraphs')
    .select('id, text, start_word_idx')
    .eq('transcription_id', transcriptionId)
    .eq('firm_id', firmId)

  let flagsCreated = 0

  for (const para of paragraphs ?? []) {
    for (const pattern of DATE_PATTERNS) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(para.text)) !== null) {
        try {
          const found = new Date(match[0])
          if (isNaN(found.getTime())) continue

          // Flag if date differs from incident_date by more than 1 day
          const diffDays = Math.abs((found.getTime() - incidentDate.getTime()) / 86400000)
          if (diffDays > 1) {
            const { count } = await supabase
              .from('transcript_flags')
              .select('*', { count: 'exact', head: true })
              .eq('transcription_id', transcriptionId)
              .eq('paragraph_id', para.id)
              .eq('flag_type', 'DATE_CONFLICT')
              .eq('is_resolved', false)

            if (!count || count === 0) {
              await supabase.from('transcript_flags').insert({
                transcription_id: transcriptionId,
                firm_id: firmId,
                paragraph_id: para.id,
                flag_type: 'DATE_CONFLICT',
                severity: 'ERROR',
                message: `Date "${match[0]}" may conflict with incident date ${deposition.incident_date}`,
                auto_generated: true,
              })
              flagsCreated++
            }
          }
        } catch {
          // Unparseable date string — skip
        }
      }
    }
  }

  return { flagsCreated }
}
```


═══════════════════════════════════════════════════════════════════════
SECTION 9 — REVIEW PAGE
═══════════════════════════════════════════════════════════════════════
Commit message: "feat(editor): implement three-panel review page"

File: app/(dashboard)/jobs/[id]/review/page.tsx

Check if this file already exists. Read it first — it may have
significant existing functionality. Enhance to match this spec.

LAYOUT (three panels + full-width player):
  ┌─────────────────────────────────────────────────────────────┐
  │ TOP BAR: Job name · Deponent · Status badge · Export button │
  ├─────────────────────────────────────────────────────────────┤
  │ AudioPlayer (full width, fixed height ~70px)                │
  ├───────────────────────────┬─────────────────────────────────┤
  │ TranscriptPanel (50%)     │ FlaggedWordPanel (50%)          │
  │ paragraphs from DB        │ sorted by confidence ASC        │
  │ word-level sync           │ action buttons                  │
  ├───────────────────────────┴─────────────────────────────────┤
  │ BOTTOM BAR: Progress bar · Submit Review · Save & Exit      │
  └─────────────────────────────────────────────────────────────┘

DATA LOADING (parallel fetch on page load):
  Promise.all([
    GET /api/jobs/[id]                            (job + transcription)
    GET /api/transcriptions/[transcriptionId]/flagged-words?status=ALL
    GET /api/transcriptions/[transcriptionId]/words (first 2000)
    GET /api/transcriptions/[transcriptionId]/flags
    GET /api/transcriptions/[transcriptionId]/review-progress
    POST /api/jobs/[id]/lock                      (attempt to acquire)
  ])

PAGE-LEVEL BEHAVIORS:
  - Lock acquired → isLocked=true, show "Editing" badge
  - Lock failed → isReadOnly=true, show "Read-only — locked by [Name]" banner
  - Lock keepalive: PATCH /api/jobs/[id]/lock every 5 minutes
  - Release lock on navigate away (useEffect cleanup + beforeunload)
  - Logging: POST /api/transcriptions/[id]/access with access_type=REVIEW_OPEN

ERROR BOUNDARIES:
  Create app/(dashboard)/jobs/[id]/review/error.tsx
  Create app/(dashboard)/jobs/[id]/review/loading.tsx
  Both are required — the review page must never show a raw error.

SUBMIT REVIEW BUTTON:
  - Disabled until progress.pct_complete === 100 OR scopist clicks "Submit anyway"
  - Pre-submit check: show warning if open VERIFY flags exist
  - On confirm: POST /api/jobs/[id]/review-complete
  - On success: redirect to /jobs/[id] (job detail page)

EXPORT DROPDOWN:
  - shadcn DropdownMenu with three options: DOCX | PDF | ASCII
  - DOCX: GET /api/transcriptions/[id]/export?format=docx
  - Disabled until job.status is COMPLETED or REPORTER_REVIEW
  - Show QG error count in tooltip if quality gate has errors

```typescript
// app/(dashboard)/jobs/[id]/review/page.tsx
// Review page — server component for data fetching, client for interactivity

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReviewPageClient from './ReviewPageClient'
import { logTranscriptAccess } from '@/lib/editor/access-logger'
import { headers } from 'next/headers'

interface PageProps {
  params: { id: string }
}

export default async function ReviewPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/unauthorized?reason=missing_profile')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    redirect('/unauthorized?reason=missing_profile')
  }

  // Verify role can access review page
  if (!['SCOPIST', 'COURT_REPORTER', 'ADMIN'].includes(profile.role)) {
    redirect('/unauthorized?reason=insufficient_role')
  }

  // Fetch job + transcription
  const { data: job } = await supabase
    .from('jobs')
    .select('*, transcriptions(id, status)')
    .eq('id', params.id)
    .eq('firm_id', profile.firm_id)
    .single()

  if (!job) {
    redirect('/jobs')
  }

  const transcriptionId = job.transcriptions?.[0]?.id

  if (!transcriptionId) {
    redirect(`/jobs/${params.id}`)
  }

  // Log access (non-blocking)
  logTranscriptAccess(
    transcriptionId,
    profile.firm_id,
    user.id,
    'REVIEW_OPEN'
  ).catch(() => {})

  return (
    <ReviewPageClient
      jobId={params.id}
      transcriptionId={transcriptionId}
      jobName={job.case_name ?? 'Untitled Job'}
      deponentName={job.deponent_name ?? ''}
      jobStatus={job.status}
      firmId={profile.firm_id}
      userId={user.id}
      userRole={profile.role}
      userDisplayName={profile.full_name ?? ''}
    />
  )
}
```

Create: app/(dashboard)/jobs/[id]/review/ReviewPageClient.tsx
  This is the client component that manages all state.
  It imports: useEditorState, AudioPlayer, TranscriptPanel, FlaggedWordPanel
  It implements the full three-panel layout described above.
  It handles all API calls and state updates.

Create: app/(dashboard)/jobs/[id]/review/error.tsx
```typescript
'use client'
export default function ReviewError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Review page error</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={reset} className="bg-indigo-600 text-white px-4 py-2 rounded">
          Try again
        </button>
      </div>
    </div>
  )
}
```

Create: app/(dashboard)/jobs/[id]/review/loading.tsx
```typescript
export default function ReviewLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading transcript review...</p>
      </div>
    </div>
  )
}
```

Also create: app/error.tsx and app/(dashboard)/jobs/error.tsx
  (Same pattern as above — catch-all error boundaries)


═══════════════════════════════════════════════════════════════════════
SECTION 10 — TESTS
═══════════════════════════════════════════════════════════════════════
Commit message: "test(editor): add editor unit and integration tests"

─────────────────────────────────────────────────────────────────────
TASK 10.1 — Unit tests
─────────────────────────────────────────────────────────────────────

tests/unit/editor/binary-search.test.ts:
  - findActiveWordId: returns correct word when time is within range
  - findActiveWordId: returns nearest word when time is between words
  - findActiveWordId: returns first word when time < all start_times
  - findActiveWordId: returns last word when time > all end_times
  - findActiveWordId: handles empty array → null
  - findActiveWordId: O(log n) — assert on 10,000 word array, < 1ms

tests/unit/editor/consistency-engine.test.ts:
  - detectInconsistencies: returns empty array when no proper nouns
  - detectInconsistencies: detects "Olivarez"/"Olivares" as variants
  - detectInconsistencies: detects "Bardot"/"Bardeau"/"Miyamardeau" cluster
  - applyConsistencyFix: updates corrected_word on variant IDs
  - applyConsistencyFix: does not modify original_word (immutability check)

tests/unit/editor/date-detector.test.ts:
  - detectDateConflicts: flags MM/DD/YYYY that differs from incident_date
  - detectDateConflicts: does NOT flag dates matching incident_date
  - detectDateConflicts: handles month-name format ("August 19, 2023")
  - detectDateConflicts: skips unparseable strings without throwing

tests/unit/components/FlaggedWordPanel.test.tsx:
  - renders all pending words
  - confidence badge colors: CRITICAL=red, LOW=orange, MEDIUM=yellow, HIGH=green
  - clicking ▶ Play button calls onSeekAudio with start_time - 2
  - typing in correction input and pressing Enter calls onCorrection
  - pressing Enter with no correction calls onCorrection with status=CONFIRMED
  - progress bar reflects pct_complete from progress prop
  - isReadOnly=true disables all Correct/Confirm/Skip buttons
  - ↓ key moves activeIndex to next card
  - Tab key skips to next PENDING card

─────────────────────────────────────────────────────────────────────
TASK 10.2 — Integration test: correction persistence
─────────────────────────────────────────────────────────────────────

File: tests/integration/editor-corrections.test.ts

This is the EXIT CRITERION for Phase 2.

Test suite:
  1. PATCH /flagged-words/[wordId] with valid correction
     → 200, returns updated word
     → transcript_words.corrected_word updated
     → transcript_words.original_word unchanged (CRITICAL)
     → transcription_edits record created
  2. PATCH with stale clientUpdatedAt
     → 409, returns serverUpdatedAt
  3. PATCH from different firm's user
     → 403 Forbidden
  4. GET /review-progress
     → returns correct counts after correction
     → pct_complete increases correctly
  5. POST /review-complete from IN_REVIEW status
     → 200, job.status = SCOPIST_COMPLETE
  6. POST /review-complete from PENDING status (wrong state)
     → 422, error=INVALID_TRANSITION
  7. Reload simulation: after correction, re-fetch flagged word
     → corrected_word persists in DB response

Run: npx vitest run tests/integration/editor-corrections.test.ts

EXIT CRITERION: ALL 7 tests pass, especially test #1 (original_word
unchanged) and test #7 (correction persists after reload).


═══════════════════════════════════════════════════════════════════════
SECTION 11 — FINAL VERIFICATION GATE
═══════════════════════════════════════════════════════════════════════
No commit. Verification only.

Run:
  npx tsc --noEmit          → 0 errors
  npm run lint              → 0 errors
  npm run build             → passes
  npx vitest run            → all tests pass

Manual smoke test in browser (EXIT CRITERION):

  Step 1. Open a job in IN_REVIEW status
  Step 2. Navigate to /jobs/[id]/review
  Step 3. AudioPlayer loads and plays
  Step 4. TranscriptPanel shows paragraphs from DB
  Step 5. FlaggedWordPanel shows flagged words with confidence badges
  Step 6. Click a word in TranscriptPanel → audio seeks to that time
  Step 7. Click ▶ Play in FlaggedWordPanel → audio seeks to word time - 2s
  Step 8. Type a correction in FlaggedWordPanel, click Correct
  Step 9. Correction saves (no error, badge turns green)
  *** Step 10. Reload the page — CORRECTION MUST STILL BE PRESENT ***
  Step 11. Progress bar has advanced
  Step 12. Click Submit Review → job transitions to SCOPIST_COMPLETE
  Step 13. Redirected to job detail page

Step 10 is the absolute exit criterion. If the correction does not
persist across a page reload, Phase 2 is NOT complete.

Document results in ai_logs/phase2_audit.md.

Output completion report:

  ╔═══════════════════════════════════════════════════════════════════╗
  ║         DEPO-PRO PHASE 2 — TRANSCRIPT EDITOR COMPLETE            ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ Phase B migrations applied:               YES / PARTIAL          ║
  ║ get_review_progress() SQL function:       YES                    ║
  ║ pg_trgm + similarity function:            YES                    ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ useEditorState hook:                      IMPLEMENTED            ║
  ║ AudioPlayer (seekTo + keyboard):          IMPLEMENTED            ║
  ║ TranscriptPanel (binary search sync):     IMPLEMENTED            ║
  ║ FlaggedWordPanel (keyboard nav):          IMPLEMENTED            ║
  ║ Correction API (optimistic locking):      IMPLEMENTED            ║
  ║ review-progress API:                      IMPLEMENTED            ║
  ║ transcript-flags API:                     IMPLEMENTED            ║
  ║ review-complete API (state machine):      IMPLEMENTED            ║
  ║ Consistency engine:                       IMPLEMENTED            ║
  ║ Date conflict detector:                   IMPLEMENTED            ║
  ║ Review page (3-panel):                    IMPLEMENTED            ║
  ║ Error boundaries (error.tsx + loading):   IMPLEMENTED            ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ Unit tests passing:                       X/X                    ║
  ║ Integration tests passing:                X/X                    ║
  ║ TypeScript:                               0 errors               ║
  ║ Build:                                    PASSING                ║
  ╠═══════════════════════════════════════════════════════════════════╣
  ║ EXIT CRITERION:                                                   ║
  ║ Correction persists after page reload?                           ║
  ║   [ ] YES — Phase 2 complete, proceed to Phase 3                 ║
  ║   [ ] NO  — document failure in REVIEW_NEEDED.md                 ║
  ╚═══════════════════════════════════════════════════════════════════╝

Save this prompt to: ai_prompts/phases/phase_02_transcript_editor.md
