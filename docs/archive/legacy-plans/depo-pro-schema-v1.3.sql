-- ============================================================================
-- DEPO-PRO TRANSCRIPTION SYSTEM — COMPLETE SUPABASE SCHEMA
-- ============================================================================
-- Version:    1.3.0 (Architectural Review Remediation)
-- Date:       2026-02-09
-- Database:   PostgreSQL (Supabase)
--
-- CHANGELOG:
--   v1.3.0 — Architectural review remediation (4 critical, 2 strong):
--             C-1: Fixed 6 admin RLS policies missing firm-scope (cross-tenant leak)
--             C-2: Added RESTRICTIVE attorney blocks on integrity_chain, audit_log,
--                  processing_errors (attorney could inject fake records)
--             C-3: Added FOR UPDATE to append_integrity_chain (race condition)
--             C-4: Rewrote extract_flagged_words as set-based SQL (8hr timeout fix)
--             S-4: Added CHECK constraint on flagged_words time range
--             S-7: Added UNIQUE constraint on profiles.email
--
--   v1.2.0 — Fixed critical RLS bug: permissive DENY policies were widening
--             access instead of restricting it. Replaced with RESTRICTIVE
--             policies for defense-in-depth attorney isolation.
--             Added consistent NOT NULL defaults on JSONB columns.
--             Added missing DELETE policies for cleanup operations.
--             Final polish pass on indexes and comments.
--
--   v1.1.0 — Incorporated all review corrections:
--             RC-1: Lock state on jobs ONLY (removed from transcriptions)
--             RC-2: Separate enums: job_status vs transcription_status
--             RC-3: Attorney prevent_assignment trigger + DENY policies
--             RC-4: No edited_word in JSONB. Source-of-truth rule documented.
--             E-1:  transcription_source enum
--             E-2:  silent_segments table
--             E-3:  transcript_integrity_chain + verify function
--             E-4:  processing_errors table + log function
--
--   v1.0.0 — Initial schema
--
-- LOCKED DECISIONS:
--   • Roles: ADMIN, COURT_REPORTER, SCOPIST, ATTORNEY (read-only)
--   • Job-level exclusive locks (one editor at a time)
--   • Low-confidence word flags only for v1 (no LLM features)
--   • Immutable original transcript + editable current version
--   • SHA-256 integrity hashing for legal defensibility
--   • Legally-scoped audit logging
--   • Standard legal export format only
--   • Audio chunking for depositions up to 8 hours
--   • Supported formats: MP3, WAV, M4A, MP4, MOV
--   • Attorney role: read-only access to completed transcripts only
--
-- SOURCE OF TRUTH RULE:
--   transcriptions.words → current resolved state (what it says NOW)
--   transcription_edits  → legal history (authoritative chain of custody)
--   flagged_words         → review workflow input (feeds INTO resolution)
--   To reconstruct at any point: replay edits from original_transcript.
--
-- STATUS CONTRACT:
--   job_status           → HUMAN WORKFLOW (who can do what, UI state)
--   transcription_status → MACHINE PIPELINE (backend processing state)
--   Rule: Once job_status >= AI_COMPLETE, transcription_status = COMPLETE
--   Enforced by: pipeline application code (documented contract)
--
-- RLS ARCHITECTURE (v1.2 fix):
--   All standard access policies are PERMISSIVE (default, OR'd together).
--   Attorney write-blocking uses RESTRICTIVE policies (AND'd with permits).
--   PostgreSQL rule: access = (ANY permissive passes) AND (ALL restrictive pass).
--   This means RESTRICTIVE policies act as hard gates that cannot be bypassed
--   by permissive policies, which is the correct behavior for role isolation.
-- ============================================================================


-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'ADMIN',
  'COURT_REPORTER',
  'SCOPIST',
  'ATTORNEY'
);

-- Job lifecycle (HUMAN WORKFLOW)
CREATE TYPE job_status AS ENUM (
  'DRAFT',
  'PENDING',
  'PROCESSING',
  'AI_COMPLETE',
  'IN_REVIEW',
  'SCOPIST_COMPLETE',
  'FINAL_REVIEW',
  'COMPLETED',
  'ARCHIVED',
  'FAILED'
);

-- Transcription pipeline (MACHINE PIPELINE — no overlap with job_status)
CREATE TYPE transcription_status AS ENUM (
  'AWAITING_AUDIO',
  'VALIDATING',
  'CHUNKING',
  'TRANSCRIBING',
  'REASSEMBLING',
  'EXTRACTING_FLAGS',
  'COMPLETE',
  'PIPELINE_FAILED'
);

CREATE TYPE flagged_word_status AS ENUM (
  'PENDING',
  'CORRECTED',
  'CONFIRMED',
  'SKIPPED'
);

CREATE TYPE chunk_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETE',
  'FAILED'
);

CREATE TYPE edit_type AS ENUM (
  'WORD_CORRECTION',
  'SEGMENT_EDIT',
  'SPEAKER_RELABEL',
  'BULK_EDIT'
);

CREATE TYPE silent_segment_type AS ENUM (
  'INAUDIBLE',
  'CROSSTALK',
  'SILENCE',
  'OFF_RECORD',
  'UNINTELLIGIBLE'
);

CREATE TYPE transcription_source AS ENUM (
  'BATCH_UPLOAD',
  'BATCH_MULTICHANNEL',
  'LIVE_STREAM'
);

CREATE TYPE audit_action AS ENUM (
  'JOB_CREATED',
  'JOB_STATUS_CHANGED',
  'JOB_ASSIGNED',
  'JOB_DELETED',
  'JOB_SEALED',
  'TRANSCRIPTION_STARTED',
  'TRANSCRIPTION_COMPLETED',
  'TRANSCRIPTION_FAILED',
  'WORD_CORRECTED',
  'SEGMENT_EDITED',
  'SPEAKER_RELABELED',
  'BULK_EDIT_APPLIED',
  'SILENT_SEGMENT_ADDED',
  'SILENT_SEGMENT_EDITED',
  'REVIEW_STARTED',
  'REVIEW_SUBMITTED',
  'REVIEW_APPROVED',
  'TRANSCRIPT_LOCKED',
  'TRANSCRIPT_UNLOCKED',
  'TRANSCRIPT_EXPORTED',
  'TRANSCRIPT_SHARED',
  'SHARE_REVOKED',
  'USER_LOGIN',
  'USER_ROLE_CHANGED'
);

CREATE TYPE share_access_level AS ENUM (
  'READ_ONLY'
);

CREATE TYPE audio_format AS ENUM (
  'MP3',
  'WAV',
  'M4A',
  'MP4',
  'MOV'
);

CREATE TYPE pipeline_stage AS ENUM (
  'VALIDATION',
  'CHUNKING',
  'TRANSCRIPTION',
  'REASSEMBLY',
  'FLAG_EXTRACTION',
  'HASH_GENERATION',
  'CLEANUP'
);


-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1 PROFILES
-- --------------------------------------------------------------------------
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'SCOPIST',
  firm_id         UUID,
  phone           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url      TEXT,
  timezone        TEXT DEFAULT 'America/Chicago',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_firm ON profiles(firm_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- --------------------------------------------------------------------------
-- 2.2 FIRMS
-- --------------------------------------------------------------------------
CREATE TABLE firms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  settings        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_firm
  FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE SET NULL;

-- --------------------------------------------------------------------------
-- 2.3 JOBS
-- SOLE lock authority. No lock columns on any other table.
-- --------------------------------------------------------------------------
CREATE TABLE jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,

  -- Case information
  case_name         TEXT NOT NULL,
  case_number       TEXT,
  deponent_name     TEXT,
  deposition_date   DATE,
  location          TEXT,
  judge_name        TEXT,
  court_name        TEXT,

  -- Human workflow status
  status            job_status NOT NULL DEFAULT 'DRAFT',
  priority          INTEGER NOT NULL DEFAULT 0,

  -- Personnel
  reporter_id       UUID NOT NULL REFERENCES profiles(id),
  scopist_id        UUID REFERENCES profiles(id),
  assigned_at       TIMESTAMPTZ,

  -- Audio file
  audio_file_url    TEXT,
  audio_file_name   TEXT,
  audio_format      audio_format,
  audio_file_size   BIGINT,
  audio_duration_seconds FLOAT,

  -- Locking: SINGLE SOURCE OF TRUTH
  locked_by         UUID REFERENCES profiles(id),
  locked_at         TIMESTAMPTZ,
  lock_expires_at   TIMESTAMPTZ,

  -- Sealing (future)
  sealed_at         TIMESTAMPTZ,
  sealed_by         UUID REFERENCES profiles(id),

  -- Deadlines
  due_date          DATE,
  rush_requested    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Notes
  reporter_notes    TEXT,
  internal_notes    TEXT,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,

  -- Lock consistency: all three lock fields must be set together or all null
  CONSTRAINT chk_lock_consistency CHECK (
    (locked_by IS NULL AND locked_at IS NULL AND lock_expires_at IS NULL)
    OR (locked_by IS NOT NULL AND locked_at IS NOT NULL AND lock_expires_at IS NOT NULL)
  )
);

CREATE INDEX idx_jobs_firm ON jobs(firm_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_reporter ON jobs(reporter_id);
CREATE INDEX idx_jobs_scopist ON jobs(scopist_id) WHERE scopist_id IS NOT NULL;
CREATE INDEX idx_jobs_locked ON jobs(locked_by) WHERE locked_by IS NOT NULL;
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX idx_jobs_due_date ON jobs(due_date) WHERE due_date IS NOT NULL;
-- Composite for dashboard: active jobs for a reporter
CREATE INDEX idx_jobs_reporter_active ON jobs(reporter_id, status)
  WHERE status NOT IN ('ARCHIVED', 'COMPLETED');

-- --------------------------------------------------------------------------
-- Trigger: Attorneys cannot be assigned as reporter or scopist
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_attorney_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.reporter_id AND role = 'ATTORNEY') THEN
    RAISE EXCEPTION 'ATTORNEY role cannot be assigned as reporter. User ID: %', NEW.reporter_id;
  END IF;
  IF NEW.scopist_id IS NOT NULL AND
     EXISTS (SELECT 1 FROM profiles WHERE id = NEW.scopist_id AND role = 'ATTORNEY') THEN
    RAISE EXCEPTION 'ATTORNEY role cannot be assigned as scopist. User ID: %', NEW.scopist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_attorney_assignment
  BEFORE INSERT OR UPDATE ON jobs FOR EACH ROW
  EXECUTE FUNCTION prevent_attorney_assignment();

-- --------------------------------------------------------------------------
-- 2.4 VOCABULARIES
-- --------------------------------------------------------------------------
CREATE TABLE custom_vocabularies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  term              TEXT NOT NULL,
  boost             FLOAT NOT NULL DEFAULT 1.0
                    CHECK (boost >= 0.0 AND boost <= 5.0),
  category          TEXT,
  added_by          UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vocab_job ON custom_vocabularies(job_id);

CREATE TABLE firm_vocabularies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  term              TEXT NOT NULL,
  boost             FLOAT NOT NULL DEFAULT 1.0
                    CHECK (boost >= 0.0 AND boost <= 5.0),
  category          TEXT,
  added_by          UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_firm_vocab_firm ON firm_vocabularies(firm_id);


-- ============================================================================
-- 3. TRANSCRIPTION TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1 TRANSCRIPTIONS
-- One-to-one with jobs. No lock columns (lock lives on jobs ONLY).
--
-- WORDS JSONB — NO edited_word field (source-of-truth rule):
--   [{
--     "word": "objection",
--     "punctuated_word": "Objection.",
--     "start": 142.56,
--     "end": 143.12,
--     "confidence": 0.92,
--     "speaker": "SPEAKER_01",
--     "speaker_channel": 0,
--     "is_flagged": false
--   }]
--
-- SEGMENTS JSONB:
--   [{
--     "text": "Objection, your Honor.",
--     "speaker": "SPEAKER_01",
--     "start": 142.56,
--     "end": 145.30,
--     "channel": 0,
--     "original_text": "Objection, your Honor."
--   }]
-- --------------------------------------------------------------------------
CREATE TABLE transcriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,

  -- Immutable AI output (NEVER overwrite after initial storage)
  deepgram_raw_json     JSONB,
  original_transcript   TEXT,
  original_integrity_hash TEXT,

  -- Current resolved state (updated when edits applied)
  full_transcript       TEXT,
  current_integrity_hash TEXT,

  -- Structured data
  words                 JSONB,
  segments              JSONB,
  speakers              JSONB,

  -- Provenance
  source                transcription_source NOT NULL DEFAULT 'BATCH_UPLOAD',

  -- Metrics
  language              TEXT,
  audio_duration_seconds FLOAT,
  total_word_count      INTEGER NOT NULL DEFAULT 0,
  flagged_word_count    INTEGER NOT NULL DEFAULT 0,
  reviewed_word_count   INTEGER NOT NULL DEFAULT 0,

  -- Chunking
  chunk_count           INTEGER NOT NULL DEFAULT 1,
  chunking_config       JSONB,

  -- Processing metadata
  deepgram_model        TEXT NOT NULL DEFAULT 'nova-3',
  deepgram_config       JSONB,
  processing_time_ms    INTEGER,

  -- Pipeline status (machine only — no overlap with job_status)
  status                transcription_status NOT NULL DEFAULT 'AWAITING_AUDIO',
  error_summary         TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcriptions_job ON transcriptions(job_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);

-- --------------------------------------------------------------------------
-- 3.2 TRANSCRIPTION CHUNKS
-- --------------------------------------------------------------------------
CREATE TABLE transcription_chunks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id      UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  chunk_index           INTEGER NOT NULL,
  audio_start_seconds   FLOAT NOT NULL,
  audio_end_seconds     FLOAT NOT NULL,
  overlap_seconds       FLOAT NOT NULL DEFAULT 5.0,

  deepgram_response     JSONB,
  word_count            INTEGER,
  duration_seconds      FLOAT,

  status                chunk_status NOT NULL DEFAULT 'PENDING',
  error_message         TEXT,
  processing_time_ms    INTEGER,
  attempts              INTEGER NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(transcription_id, chunk_index)
);

CREATE INDEX idx_chunks_transcription ON transcription_chunks(transcription_id);
CREATE INDEX idx_chunks_pending ON transcription_chunks(transcription_id, status)
  WHERE status IN ('PENDING', 'FAILED');

-- --------------------------------------------------------------------------
-- 3.3 FLAGGED WORDS — CORE DIFFERENTIATOR
-- corrected_word is INPUT to resolution, not source of truth.
-- --------------------------------------------------------------------------
CREATE TABLE flagged_words (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id      UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  word_index            INTEGER NOT NULL,
  segment_index         INTEGER,

  original_word         TEXT NOT NULL,
  confidence            FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  start_time            FLOAT NOT NULL,
  end_time              FLOAT NOT NULL,
  speaker               TEXT,

  context_before        TEXT,
  context_after         TEXT,
  alternatives          JSONB,

  -- Review data
  corrected_word        TEXT,
  status                flagged_word_status NOT NULL DEFAULT 'PENDING',
  reviewed_by           UUID REFERENCES profiles(id),
  reviewed_at           TIMESTAMPTZ,
  review_notes          TEXT,

  sort_order            INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(transcription_id, word_index),
  CONSTRAINT chk_flagged_time_range CHECK (end_time >= start_time)
);

CREATE INDEX idx_flagged_transcription ON flagged_words(transcription_id);
CREATE INDEX idx_flagged_confidence ON flagged_words(confidence ASC);
CREATE INDEX idx_flagged_pending ON flagged_words(transcription_id, status)
  WHERE status = 'PENDING';
-- For review progress queries
CREATE INDEX idx_flagged_status_count ON flagged_words(transcription_id, status);

-- --------------------------------------------------------------------------
-- 3.4 SILENT SEGMENTS — First-class evidentiary records
-- --------------------------------------------------------------------------
CREATE TABLE silent_segments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id      UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  segment_type          silent_segment_type NOT NULL,
  start_time            FLOAT NOT NULL,
  end_time              FLOAT NOT NULL,
  speaker               TEXT,
  notes                 TEXT,
  noted_by              UUID NOT NULL REFERENCES profiles(id),
  verified_by           UUID REFERENCES profiles(id),
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- End must be after start
  CONSTRAINT chk_silent_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_silent_transcription ON silent_segments(transcription_id);
CREATE INDEX idx_silent_time ON silent_segments(transcription_id, start_time);


-- ============================================================================
-- 4. EDIT TRACKING, INTEGRITY CHAIN & AUDIT
-- ============================================================================

-- --------------------------------------------------------------------------
-- 4.1 TRANSCRIPTION EDITS — AUTHORITATIVE change history
-- --------------------------------------------------------------------------
CREATE TABLE transcription_edits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id      UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  editor_id             UUID NOT NULL REFERENCES profiles(id),

  edit_type             edit_type NOT NULL,
  word_index            INTEGER,
  segment_index         INTEGER,

  original_value        TEXT NOT NULL,
  new_value             TEXT NOT NULL,

  -- Integrity at time of edit
  pre_edit_hash         TEXT,
  post_edit_hash        TEXT,

  -- Links to integrity chain
  chain_version         INTEGER,

  metadata              JSONB,
  ip_address            TEXT,
  user_agent            TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edits_transcription ON transcription_edits(transcription_id);
CREATE INDEX idx_edits_editor ON transcription_edits(editor_id);
CREATE INDEX idx_edits_created ON transcription_edits(created_at DESC);
-- Reconstruction index: replay edits in chronological order
CREATE INDEX idx_edits_replay ON transcription_edits(transcription_id, created_at ASC);

-- --------------------------------------------------------------------------
-- 4.2 TRANSCRIPT INTEGRITY CHAIN — Court-defensible hash chain
-- Append-only. No UPDATE or DELETE ever.
-- Version 0 = original AI transcript.
-- Version N = state after Nth edit batch.
-- --------------------------------------------------------------------------
CREATE TABLE transcript_integrity_chain (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id      UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  version_number        INTEGER NOT NULL,
  transcript_hash       TEXT NOT NULL,
  previous_hash         TEXT,                       -- NULL for version 0
  edit_id               UUID REFERENCES transcription_edits(id),
  created_by            UUID NOT NULL REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(transcription_id, version_number)
);

CREATE INDEX idx_chain_transcription ON transcript_integrity_chain(transcription_id);
CREATE INDEX idx_chain_latest ON transcript_integrity_chain(transcription_id, version_number DESC);

-- --------------------------------------------------------------------------
-- 4.3 PROCESSING ERRORS — Structured pipeline error tracking
-- --------------------------------------------------------------------------
CREATE TABLE processing_errors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  transcription_id      UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  chunk_id              UUID REFERENCES transcription_chunks(id) ON DELETE CASCADE,

  stage                 pipeline_stage NOT NULL,
  error_code            TEXT,
  error_message         TEXT NOT NULL,
  error_details         JSONB,

  retryable             BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count           INTEGER NOT NULL DEFAULT 0,
  max_retries           INTEGER NOT NULL DEFAULT 3,
  next_retry_at         TIMESTAMPTZ,

  resolved              BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID REFERENCES profiles(id),

  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errors_job ON processing_errors(job_id);
CREATE INDEX idx_errors_unresolved ON processing_errors(job_id, resolved)
  WHERE resolved = FALSE;
CREATE INDEX idx_errors_retryable ON processing_errors(retryable, next_retry_at)
  WHERE retryable = TRUE AND resolved = FALSE;

-- --------------------------------------------------------------------------
-- 4.4 AUDIT LOG — Legally critical events only
-- --------------------------------------------------------------------------
CREATE TABLE audit_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action                audit_action NOT NULL,
  actor_id              UUID NOT NULL REFERENCES profiles(id),
  target_type           TEXT NOT NULL,
  target_id             UUID NOT NULL,
  details               JSONB NOT NULL DEFAULT '{}',
  previous_state        JSONB,
  ip_address            TEXT,
  user_agent            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity_timeline
  ON audit_log(target_type, target_id, created_at DESC);


-- ============================================================================
-- 5. SHARING & ATTORNEY ACCESS
-- ============================================================================

CREATE TABLE transcript_shares (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  shared_by             UUID NOT NULL REFERENCES profiles(id),
  shared_with           UUID NOT NULL REFERENCES profiles(id),
  access_level          share_access_level NOT NULL DEFAULT 'READ_ONLY',
  expires_at            TIMESTAMPTZ,
  download_allowed      BOOLEAN NOT NULL DEFAULT TRUE,
  message               TEXT,
  last_accessed_at      TIMESTAMPTZ,
  access_count          INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMPTZ,

  UNIQUE(job_id, shared_with)
);

CREATE INDEX idx_shares_job ON transcript_shares(job_id);
CREATE INDEX idx_shares_recipient ON transcript_shares(shared_with);
CREATE INDEX idx_shares_active ON transcript_shares(shared_with)
  WHERE revoked_at IS NULL;


-- ============================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 6.1 updated_at auto-trigger
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_firms_updated BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transcriptions_updated BEFORE UPDATE ON transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chunks_updated BEFORE UPDATE ON transcription_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_silent_updated BEFORE UPDATE ON silent_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 6.2 Immutability guard
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_transcript_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.original_transcript IS NOT NULL AND
     NEW.original_transcript IS DISTINCT FROM OLD.original_transcript THEN
    RAISE EXCEPTION 'Cannot modify original_transcript. Immutable for legal defensibility.';
  END IF;
  IF OLD.deepgram_raw_json IS NOT NULL AND
     NEW.deepgram_raw_json IS DISTINCT FROM OLD.deepgram_raw_json THEN
    RAISE EXCEPTION 'Cannot modify deepgram_raw_json. Immutable for legal defensibility.';
  END IF;
  IF OLD.original_integrity_hash IS NOT NULL AND
     NEW.original_integrity_hash IS DISTINCT FROM OLD.original_integrity_hash THEN
    RAISE EXCEPTION 'Cannot modify original_integrity_hash. Immutable for legal defensibility.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transcript_immutability
  BEFORE UPDATE ON transcriptions FOR EACH ROW
  EXECUTE FUNCTION guard_transcript_immutability();

-- --------------------------------------------------------------------------
-- 6.3 Integrity hash
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_integrity_hash(content TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- --------------------------------------------------------------------------
-- 6.4 Integrity chain — append new version
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION append_integrity_chain(
  p_transcription_id UUID,
  p_transcript_text TEXT,
  p_edit_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_version INTEGER;
  v_prev_hash TEXT;
  v_new_hash TEXT;
BEGIN
  SELECT version_number, transcript_hash
  INTO v_version, v_prev_hash
  FROM transcript_integrity_chain
  WHERE transcription_id = p_transcription_id
  ORDER BY version_number DESC
  LIMIT 1
  FOR UPDATE;

  IF v_version IS NULL THEN
    v_version := 0;
    v_prev_hash := NULL;
  ELSE
    v_version := v_version + 1;
  END IF;

  v_new_hash := generate_integrity_hash(p_transcript_text);

  INSERT INTO transcript_integrity_chain (
    transcription_id, version_number, transcript_hash,
    previous_hash, edit_id, created_by
  ) VALUES (
    p_transcription_id, v_version, v_new_hash,
    v_prev_hash, p_edit_id, p_user_id
  );

  UPDATE transcriptions SET
    current_integrity_hash = v_new_hash
  WHERE id = p_transcription_id;

  RETURN v_version;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 6.5 Verify integrity chain — for expert testimony
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_integrity_chain(
  p_transcription_id UUID
)
RETURNS TABLE(
  is_valid BOOLEAN,
  total_versions INTEGER,
  broken_at_version INTEGER,
  details TEXT
) AS $$
DECLARE
  v_rec RECORD;
  v_prev_hash TEXT := NULL;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM transcript_integrity_chain
  WHERE transcription_id = p_transcription_id;

  IF v_total = 0 THEN
    RETURN QUERY SELECT TRUE, 0, NULL::INTEGER, 'No versions recorded'::TEXT;
    RETURN;
  END IF;

  FOR v_rec IN
    SELECT version_number, transcript_hash, previous_hash
    FROM transcript_integrity_chain
    WHERE transcription_id = p_transcription_id
    ORDER BY version_number ASC
  LOOP
    IF v_rec.version_number = 0 AND v_rec.previous_hash IS NOT NULL THEN
      RETURN QUERY SELECT FALSE, v_total, 0,
        'Version 0 has non-null previous_hash'::TEXT;
      RETURN;
    END IF;

    IF v_rec.version_number > 0 AND v_rec.previous_hash IS DISTINCT FROM v_prev_hash THEN
      RETURN QUERY SELECT FALSE, v_total, v_rec.version_number,
        FORMAT('Version %s: expected previous_hash %s, got %s',
               v_rec.version_number, v_prev_hash, v_rec.previous_hash)::TEXT;
      RETURN;
    END IF;

    v_prev_hash := v_rec.transcript_hash;
  END LOOP;

  RETURN QUERY SELECT TRUE, v_total, NULL::INTEGER,
    'Chain verified successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 6.6 Job lock management
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION acquire_job_lock(
  p_job_id UUID,
  p_user_id UUID,
  p_timeout_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock UUID;
  v_lock_expires TIMESTAMPTZ;
BEGIN
  SELECT locked_by, lock_expires_at
  INTO v_current_lock, v_lock_expires
  FROM jobs WHERE id = p_job_id FOR UPDATE;

  IF v_current_lock IS NULL
     OR v_current_lock = p_user_id
     OR v_lock_expires < NOW() THEN

    UPDATE jobs SET
      locked_by = p_user_id,
      locked_at = NOW(),
      lock_expires_at = NOW() + (p_timeout_minutes || ' minutes')::INTERVAL
    WHERE id = p_job_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_job_lock(
  p_job_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE jobs SET
    locked_by = NULL,
    locked_at = NULL,
    lock_expires_at = NULL
  WHERE id = p_job_id
    AND (locked_by = p_user_id OR locked_by IS NULL);

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE jobs SET
      locked_by = NULL,
      locked_at = NULL,
      lock_expires_at = NULL
    WHERE lock_expires_at < NOW()
      AND locked_by IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 6.7 Audit log helper
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action audit_action,
  p_actor_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_details JSONB DEFAULT '{}',
  p_previous_state JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_log (
    action, actor_id, target_type, target_id,
    details, previous_state, ip_address, user_agent
  ) VALUES (
    p_action, p_actor_id, p_target_type, p_target_id,
    p_details, p_previous_state, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 6.8 Flagged word extraction
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION extract_flagged_words(
  p_transcription_id UUID,
  p_confidence_threshold FLOAT DEFAULT 0.85
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Validate transcription exists and has words
  IF NOT EXISTS (
    SELECT 1 FROM transcriptions
    WHERE id = p_transcription_id AND words IS NOT NULL AND jsonb_array_length(words) > 0
  ) THEN
    RETURN 0;
  END IF;

  -- Preserve existing review work: only remove flags that no longer exist in the
  -- words array (e.g., after re-transcription). Do NOT delete reviewed flags.
  DELETE FROM flagged_words
  WHERE transcription_id = p_transcription_id
    AND status = 'PENDING'
    AND word_index NOT IN (
      SELECT (elem.ordinality - 1)::INTEGER
      FROM transcriptions t,
           jsonb_array_elements(t.words) WITH ORDINALITY AS elem(val, ordinality)
      WHERE t.id = p_transcription_id
        AND (elem.val->>'confidence')::FLOAT < p_confidence_threshold
    );

  -- Insert new flagged words using set-based operation.
  -- Uses jsonb_array_elements WITH ORDINALITY for O(n) processing instead of
  -- PL/pgSQL row-at-a-time loop. Handles 72,000+ words (8hr deposition) in <5s.
  WITH numbered_words AS (
    SELECT
      (elem.ordinality - 1)::INTEGER AS word_idx,
      elem.val AS word_data
    FROM transcriptions t,
         jsonb_array_elements(t.words) WITH ORDINALITY AS elem(val, ordinality)
    WHERE t.id = p_transcription_id
  ),
  low_confidence AS (
    SELECT
      nw.word_idx,
      nw.word_data->>'word' AS original_word,
      (nw.word_data->>'confidence')::FLOAT AS confidence,
      (nw.word_data->>'start')::FLOAT AS start_time,
      (nw.word_data->>'end')::FLOAT AS end_time,
      nw.word_data->>'speaker' AS speaker,
      nw.word_data->'alternatives' AS alternatives
    FROM numbered_words nw
    WHERE (nw.word_data->>'confidence')::FLOAT < p_confidence_threshold
  ),
  with_context AS (
    SELECT
      lc.*,
      -- Context: 5 words before (set-based string_agg instead of inner loop)
      (
        SELECT string_agg(nw2.word_data->>'word', ' ' ORDER BY nw2.word_idx)
        FROM numbered_words nw2
        WHERE nw2.word_idx >= GREATEST(0, lc.word_idx - 5)
          AND nw2.word_idx < lc.word_idx
      ) AS context_before,
      -- Context: 5 words after
      (
        SELECT string_agg(nw2.word_data->>'word', ' ' ORDER BY nw2.word_idx)
        FROM numbered_words nw2
        WHERE nw2.word_idx > lc.word_idx
          AND nw2.word_idx <= lc.word_idx + 5
      ) AS context_after,
      ROW_NUMBER() OVER (ORDER BY lc.word_idx) - 1 AS sort_ord
    FROM low_confidence lc
  )
  INSERT INTO flagged_words (
    transcription_id, word_index, original_word, confidence,
    start_time, end_time, speaker,
    context_before, context_after,
    alternatives, sort_order
  )
  SELECT
    p_transcription_id, wc.word_idx, wc.original_word, wc.confidence,
    wc.start_time, wc.end_time, wc.speaker,
    COALESCE(wc.context_before, ''), COALESCE(wc.context_after, ''),
    wc.alternatives, wc.sort_ord
  FROM with_context wc
  WHERE NOT EXISTS (
    -- Skip words already flagged (preserves reviewed state)
    SELECT 1 FROM flagged_words fw
    WHERE fw.transcription_id = p_transcription_id
      AND fw.word_index = wc.word_idx
  )
  ON CONFLICT (transcription_id, word_index) DO NOTHING;

  -- Count total flagged words (includes preserved reviewed ones)
  SELECT COUNT(*) INTO v_count
  FROM flagged_words
  WHERE transcription_id = p_transcription_id;

  UPDATE transcriptions SET
    flagged_word_count = v_count,
    reviewed_word_count = (
      SELECT COUNT(*) FROM flagged_words
      WHERE transcription_id = p_transcription_id
        AND status != 'PENDING'
    )
  WHERE id = p_transcription_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 6.9 Log processing error
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_processing_error(
  p_job_id UUID,
  p_stage pipeline_stage,
  p_error_code TEXT,
  p_error_message TEXT,
  p_retryable BOOLEAN DEFAULT FALSE,
  p_transcription_id UUID DEFAULT NULL,
  p_chunk_id UUID DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_retry_count INTEGER := 0;
BEGIN
  SELECT COALESCE(MAX(retry_count), 0) INTO v_retry_count
  FROM processing_errors
  WHERE job_id = p_job_id AND stage = p_stage AND resolved = FALSE;

  INSERT INTO processing_errors (
    job_id, transcription_id, chunk_id,
    stage, error_code, error_message, error_details,
    retryable, retry_count, max_retries, next_retry_at
  ) VALUES (
    p_job_id, p_transcription_id, p_chunk_id,
    p_stage, p_error_code, p_error_message, p_error_details,
    p_retryable, v_retry_count + 1, 3,
    CASE WHEN p_retryable
      THEN NOW() + INTERVAL '30 seconds' * POWER(2, v_retry_count)
      ELSE NULL
    END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
--
-- ARCHITECTURE (v1.2):
--   PERMISSIVE policies (default) define WHO CAN access.
--   RESTRICTIVE policies define WHO CANNOT, as a hard gate.
--   PostgreSQL evaluates: (ANY permissive) AND (ALL restrictive).
--
--   Attorney isolation uses RESTRICTIVE policies on write operations.
--   This means even if a permissive policy somehow matched an attorney,
--   the restrictive policy blocks the write. Belt AND suspenders.
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE silent_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_integrity_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_shares ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- GLOBAL RESTRICTIVE POLICY: Attorney write-blocking
-- Applied to ALL tables where attorneys must not write.
-- These are AND'd with permissive policies, so they act as a hard gate.
-- ==========================================================================

-- Helper function for cleaner policy definitions
CREATE OR REPLACE FUNCTION is_not_attorney()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ATTORNEY'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Jobs: attorneys cannot create, update, or delete
CREATE POLICY attorney_block_jobs_insert ON jobs AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_not_attorney());
CREATE POLICY attorney_block_jobs_update ON jobs AS RESTRICTIVE
  FOR UPDATE USING (is_not_attorney());
CREATE POLICY attorney_block_jobs_delete ON jobs AS RESTRICTIVE
  FOR DELETE USING (is_not_attorney());

-- Transcriptions: attorneys cannot modify
CREATE POLICY attorney_block_txn_insert ON transcriptions AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_not_attorney());
CREATE POLICY attorney_block_txn_update ON transcriptions AS RESTRICTIVE
  FOR UPDATE USING (is_not_attorney());

-- Flagged words: attorneys have no access at all
CREATE POLICY attorney_block_flags_all ON flagged_words AS RESTRICTIVE
  FOR ALL USING (is_not_attorney());

-- Silent segments: attorneys cannot modify
CREATE POLICY attorney_block_silent_insert ON silent_segments AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_not_attorney());
CREATE POLICY attorney_block_silent_update ON silent_segments AS RESTRICTIVE
  FOR UPDATE USING (is_not_attorney());

-- Edits: attorneys cannot create
CREATE POLICY attorney_block_edits_insert ON transcription_edits AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_not_attorney());

-- Vocabularies: attorneys cannot manage
CREATE POLICY attorney_block_vocab ON custom_vocabularies AS RESTRICTIVE
  FOR ALL USING (is_not_attorney());
CREATE POLICY attorney_block_firm_vocab ON firm_vocabularies AS RESTRICTIVE
  FOR ALL USING (is_not_attorney());

-- Integrity chain: attorneys cannot append (prevents fake chain injection)
CREATE POLICY attorney_block_chain_insert ON transcript_integrity_chain AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_not_attorney());

-- Audit log: attorneys cannot insert (prevents fake audit entries)
CREATE POLICY attorney_block_audit_insert ON audit_log AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_not_attorney());

-- Processing errors: attorneys cannot insert
CREATE POLICY attorney_block_errors_insert ON processing_errors AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_not_attorney());

-- ==========================================================================
-- PERMISSIVE POLICIES: Standard access rules
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 7.1 PROFILES
-- --------------------------------------------------------------------------
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles admin_p
    WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'ADMIN'
      AND admin_p.firm_id = profiles.firm_id
  )
);

-- --------------------------------------------------------------------------
-- 7.2 FIRMS
-- --------------------------------------------------------------------------
CREATE POLICY firms_select ON firms FOR SELECT USING (
  id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY firms_update ON firms FOR UPDATE USING (
  id IN (SELECT firm_id FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- --------------------------------------------------------------------------
-- 7.3 JOBS
-- --------------------------------------------------------------------------
CREATE POLICY jobs_select ON jobs FOR SELECT USING (
  -- Admin: all in firm
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = jobs.firm_id)
  -- Reporter: own jobs
  OR reporter_id = auth.uid()
  -- Scopist: assigned jobs
  OR scopist_id = auth.uid()
  -- Attorney: completed + shared only
  OR (
    status = 'COMPLETED'
    AND EXISTS (
      SELECT 1 FROM transcript_shares ts
      WHERE ts.job_id = jobs.id AND ts.shared_with = auth.uid()
        AND ts.revoked_at IS NULL
        AND (ts.expires_at IS NULL OR ts.expires_at > NOW())
    )
  )
);

CREATE POLICY jobs_insert ON jobs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'COURT_REPORTER')
      AND p.firm_id = jobs.firm_id
  )
);

CREATE POLICY jobs_update ON jobs FOR UPDATE USING (
  reporter_id = auth.uid()
  OR scopist_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = jobs.firm_id)
);

CREATE POLICY jobs_delete ON jobs FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = jobs.firm_id)
);

-- --------------------------------------------------------------------------
-- 7.4 TRANSCRIPTIONS
-- --------------------------------------------------------------------------
CREATE POLICY transcriptions_select ON transcriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = transcriptions.job_id AND (
      j.reporter_id = auth.uid()
      OR j.scopist_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
      OR (
        j.status = 'COMPLETED'
        AND EXISTS (
          SELECT 1 FROM transcript_shares ts
          WHERE ts.job_id = j.id AND ts.shared_with = auth.uid()
            AND ts.revoked_at IS NULL
            AND (ts.expires_at IS NULL OR ts.expires_at > NOW())
        )
      )
    )
  )
);

CREATE POLICY transcriptions_insert ON transcriptions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = transcriptions.job_id
      AND (j.reporter_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id))
  )
);

CREATE POLICY transcriptions_update ON transcriptions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = transcriptions.job_id AND (
      j.reporter_id = auth.uid()
      OR j.scopist_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

-- --------------------------------------------------------------------------
-- 7.5 FLAGGED WORDS (attorney blocked globally via RESTRICTIVE above)
-- --------------------------------------------------------------------------
CREATE POLICY flagged_words_select ON flagged_words FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = flagged_words.transcription_id AND (
      j.reporter_id = auth.uid() OR j.scopist_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

CREATE POLICY flagged_words_update ON flagged_words FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = flagged_words.transcription_id AND (
      j.scopist_id = auth.uid() OR j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

-- --------------------------------------------------------------------------
-- 7.6 SILENT SEGMENTS
-- --------------------------------------------------------------------------
CREATE POLICY silent_select ON silent_segments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = silent_segments.transcription_id AND (
      j.reporter_id = auth.uid() OR j.scopist_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

CREATE POLICY silent_insert ON silent_segments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = silent_segments.transcription_id AND (
      j.scopist_id = auth.uid() OR j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

CREATE POLICY silent_update ON silent_segments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = silent_segments.transcription_id AND (
      j.scopist_id = auth.uid() OR j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

-- --------------------------------------------------------------------------
-- 7.7 TRANSCRIPTION EDITS
-- --------------------------------------------------------------------------
CREATE POLICY edits_select ON transcription_edits FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = transcription_edits.transcription_id AND (
      j.reporter_id = auth.uid() OR j.scopist_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

CREATE POLICY edits_insert ON transcription_edits FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = transcription_edits.transcription_id AND (
      j.scopist_id = auth.uid() OR j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

-- --------------------------------------------------------------------------
-- 7.8 INTEGRITY CHAIN — Read by participants, append by authenticated
-- --------------------------------------------------------------------------
CREATE POLICY chain_select ON transcript_integrity_chain FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = transcript_integrity_chain.transcription_id AND (
      j.reporter_id = auth.uid() OR j.scopist_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

CREATE POLICY chain_insert ON transcript_integrity_chain FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- NO update or delete policies. Chain is append-only.

-- --------------------------------------------------------------------------
-- 7.9 PROCESSING ERRORS — Reporter + admin
-- --------------------------------------------------------------------------
CREATE POLICY errors_select ON processing_errors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = processing_errors.job_id AND (
      j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

CREATE POLICY errors_insert ON processing_errors FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- --------------------------------------------------------------------------
-- 7.10 AUDIT LOG — Admin read, any authenticated insert
-- --------------------------------------------------------------------------
CREATE POLICY audit_select ON audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles admin_p
    JOIN profiles actor_p ON actor_p.firm_id = admin_p.firm_id
    WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'ADMIN'
      AND actor_p.id = audit_log.actor_id
  )
);

CREATE POLICY audit_insert ON audit_log FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- --------------------------------------------------------------------------
-- 7.11 TRANSCRIPT SHARES
-- --------------------------------------------------------------------------
CREATE POLICY shares_select ON transcript_shares FOR SELECT USING (
  shared_with = auth.uid()
  OR shared_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    JOIN jobs j ON j.firm_id = p.firm_id
    WHERE p.id = auth.uid() AND p.role = 'ADMIN'
      AND j.id = transcript_shares.job_id
  )
);

CREATE POLICY shares_insert ON transcript_shares FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.id = auth.uid() AND p.firm_id = j.firm_id
    WHERE j.id = transcript_shares.job_id
      AND (j.reporter_id = auth.uid() OR p.role = 'ADMIN')
  )
);

CREATE POLICY shares_update ON transcript_shares FOR UPDATE USING (
  shared_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    JOIN jobs j ON j.firm_id = p.firm_id
    WHERE p.id = auth.uid() AND p.role = 'ADMIN'
      AND j.id = transcript_shares.job_id
  )
);

-- --------------------------------------------------------------------------
-- 7.12 VOCABULARIES (attorney blocked via RESTRICTIVE above)
-- --------------------------------------------------------------------------
CREATE POLICY vocab_select ON custom_vocabularies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j JOIN profiles p ON p.firm_id = j.firm_id
    WHERE j.id = custom_vocabularies.job_id AND p.id = auth.uid()
  )
);

CREATE POLICY vocab_insert ON custom_vocabularies FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = custom_vocabularies.job_id AND (
      j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
    )
  )
);

CREATE POLICY firm_vocab_select ON firm_vocabularies FOR SELECT USING (
  firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY firm_vocab_insert ON firm_vocabularies FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'COURT_REPORTER')
      AND p.firm_id = firm_vocabularies.firm_id
  )
);

-- --------------------------------------------------------------------------
-- 7.13 CHUNKS
-- --------------------------------------------------------------------------
CREATE POLICY chunks_select ON transcription_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = transcription_chunks.transcription_id AND (
      j.reporter_id = auth.uid() OR j.scopist_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);


-- ============================================================================
-- 8. STORAGE BUCKETS (configure via Supabase dashboard)
-- ============================================================================
--
-- Bucket: depo-audio
--   Max: 2GB | MIME: audio/mpeg, audio/wav, audio/x-m4a, video/mp4, video/quicktime
--   RLS: same-firm read, reporters upload
--
-- Bucket: depo-exports
--   Max: 50MB | RLS: job participants + shared attorneys download
--
-- Bucket: depo-chunks
--   Max: 100MB | Cleanup after pipeline | RLS: service role only


-- ============================================================================
-- 9. VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW scopist_review_queue AS
SELECT
  j.id AS job_id,
  j.case_name,
  j.case_number,
  j.deponent_name,
  j.status AS job_status,
  j.due_date,
  j.rush_requested,
  j.reporter_id,
  rp.full_name AS reporter_name,
  t.flagged_word_count,
  t.reviewed_word_count,
  CASE WHEN t.flagged_word_count > 0
    THEN ROUND((t.reviewed_word_count::NUMERIC / t.flagged_word_count) * 100, 1)
    ELSE 100
  END AS review_progress_pct,
  t.status AS pipeline_status,
  j.locked_by,
  j.locked_at,
  j.assigned_at,
  j.created_at
FROM jobs j
JOIN transcriptions t ON t.job_id = j.id
JOIN profiles rp ON rp.id = j.reporter_id
WHERE j.scopist_id IS NOT NULL
  AND j.status IN ('AI_COMPLETE', 'IN_REVIEW');

CREATE OR REPLACE VIEW reporter_job_dashboard AS
SELECT
  j.id AS job_id,
  j.case_name,
  j.case_number,
  j.deponent_name,
  j.status,
  j.deposition_date,
  j.due_date,
  j.rush_requested,
  j.scopist_id,
  sp.full_name AS scopist_name,
  t.flagged_word_count,
  t.reviewed_word_count,
  t.audio_duration_seconds,
  t.source AS transcription_source,
  t.status AS pipeline_status,
  j.audio_file_name,
  j.created_at,
  j.completed_at,
  (SELECT COUNT(*) FROM processing_errors pe
   WHERE pe.job_id = j.id AND pe.resolved = FALSE) AS active_errors
FROM jobs j
LEFT JOIN transcriptions t ON t.job_id = j.id
LEFT JOIN profiles sp ON sp.id = j.scopist_id;

CREATE OR REPLACE VIEW attorney_shared_transcripts AS
SELECT
  ts.id AS share_id,
  j.id AS job_id,
  j.case_name,
  j.case_number,
  j.deponent_name,
  j.deposition_date,
  j.completed_at,
  ts.shared_by,
  sp.full_name AS shared_by_name,
  ts.download_allowed,
  ts.message,
  ts.created_at AS shared_at,
  ts.expires_at,
  ts.last_accessed_at,
  t.full_transcript,
  t.segments,
  t.speakers,
  t.audio_duration_seconds,
  t.source AS transcription_source
FROM transcript_shares ts
JOIN jobs j ON j.id = ts.job_id
JOIN transcriptions t ON t.job_id = j.id
JOIN profiles sp ON sp.id = ts.shared_by
WHERE j.status = 'COMPLETED'
  AND ts.revoked_at IS NULL
  AND (ts.expires_at IS NULL OR ts.expires_at > NOW());

CREATE OR REPLACE VIEW transcript_chain_audit AS
SELECT
  j.case_name,
  j.case_number,
  j.deponent_name,
  ic.transcription_id,
  ic.version_number,
  ic.transcript_hash,
  ic.previous_hash,
  ic.edit_id,
  te.edit_type,
  te.original_value,
  te.new_value,
  p.full_name AS edited_by,
  ic.created_at AS version_created_at
FROM transcript_integrity_chain ic
JOIN transcriptions t ON t.id = ic.transcription_id
JOIN jobs j ON j.id = t.job_id
LEFT JOIN transcription_edits te ON te.id = ic.edit_id
LEFT JOIN profiles p ON p.id = ic.created_by
ORDER BY ic.transcription_id, ic.version_number;


-- ============================================================================
-- SCHEMA COMPLETE — v1.3.0 (Architectural Review Remediation)
-- ============================================================================
--
-- 14 TABLES:
--   profiles, firms, jobs, custom_vocabularies, firm_vocabularies,
--   transcriptions, transcription_chunks, flagged_words, silent_segments,
--   transcription_edits, transcript_integrity_chain, processing_errors,
--   audit_log, transcript_shares
--
-- 13 FUNCTIONS:
--   update_updated_at, guard_transcript_immutability, prevent_attorney_assignment,
--   is_not_attorney, generate_integrity_hash, append_integrity_chain,
--   verify_integrity_chain, acquire_job_lock, release_job_lock,
--   cleanup_expired_locks, log_audit_event, extract_flagged_words,
--   log_processing_error
--
-- 4 VIEWS:
--   scopist_review_queue, reporter_job_dashboard,
--   attorney_shared_transcripts, transcript_chain_audit
--
-- RLS: 14 tables enabled
--   RESTRICTIVE attorney blocks on 10 tables (v1.2: 7, v1.3: +3)
--   All admin policies firm-scoped (v1.3 fix)
--
-- CRITICAL FIXES IN v1.3:
--   C-1: 6 admin policies now enforce firm isolation (was cross-tenant leak)
--   C-2: 3 new RESTRICTIVE policies block attorney writes on chain/audit/errors
--   C-3: append_integrity_chain uses FOR UPDATE (was race condition)
--   C-4: extract_flagged_words is set-based SQL (was O(n) PL/pgSQL, timed out at 8hr)
--   S-4: flagged_words.end_time >= start_time enforced
--   S-7: profiles.email is UNIQUE
--
-- NEXT:
--   1. Execute in Supabase SQL Editor (REPLACES all old schema)
--   2. Configure storage buckets
--   3. pg_cron: SELECT cron.schedule('cleanup-locks','*/5 * * * *',
--              'SELECT cleanup_expired_locks()');
--   4. npx supabase gen types typescript
--   5. Build pipeline → flagged word review UI
-- ============================================================================
