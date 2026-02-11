-- ============================================================================
-- DEPO-PRO BASE SCHEMA MIGRATION
-- ============================================================================
-- Version:    1.3.0
-- Date:       2026-02-08
-- Purpose:    Create foundational tables referenced by subsequent migrations
--
-- This migration must run BEFORE:
--   - 20260209000001_critical_fixes_C1_C2_C4.sql
--   - 20260209010100_critical_fixes_rc1_to_rc5.sql
--   - 20260209010200_critical_fixes_rc6_to_rc8.sql
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
CREATE INDEX idx_jobs_reporter_active ON jobs(reporter_id, status)
  WHERE status NOT IN ('ARCHIVED', 'COMPLETED');

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
-- --------------------------------------------------------------------------
CREATE TABLE transcriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,

  -- Immutable AI output
  deepgram_raw_json     JSONB,
  original_transcript   TEXT,
  original_integrity_hash TEXT,

  -- Current resolved state
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

  -- Pipeline status
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
-- 3.3 FLAGGED WORDS
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
CREATE INDEX idx_flagged_status_count ON flagged_words(transcription_id, status);

-- --------------------------------------------------------------------------
-- 3.4 SILENT SEGMENTS
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

  CONSTRAINT chk_silent_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_silent_transcription ON silent_segments(transcription_id);
CREATE INDEX idx_silent_time ON silent_segments(transcription_id, start_time);


-- ============================================================================
-- 4. EDIT TRACKING, INTEGRITY CHAIN & AUDIT
-- ============================================================================

-- --------------------------------------------------------------------------
-- 4.1 TRANSCRIPTION EDITS
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
CREATE INDEX idx_edits_replay ON transcription_edits(transcription_id, created_at ASC);

-- --------------------------------------------------------------------------
-- 4.2 TRANSCRIPT INTEGRITY CHAIN
-- --------------------------------------------------------------------------
CREATE TABLE transcript_integrity_chain (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id      UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  version_number        INTEGER NOT NULL,
  transcript_hash       TEXT NOT NULL,
  previous_hash         TEXT,
  edit_id               UUID REFERENCES transcription_edits(id),
  created_by            UUID NOT NULL REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(transcription_id, version_number)
);

CREATE INDEX idx_chain_transcription ON transcript_integrity_chain(transcription_id);
CREATE INDEX idx_chain_latest ON transcript_integrity_chain(transcription_id, version_number DESC);

-- --------------------------------------------------------------------------
-- 4.3 PROCESSING ERRORS
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
-- 4.4 AUDIT LOG
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
-- 6. ESSENTIAL FUNCTIONS & TRIGGERS
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
-- 6.3 Integrity hash generation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_integrity_hash(content TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- --------------------------------------------------------------------------
-- 6.4 Integrity chain append
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
-- 6.5 Prevent attorney assignment trigger
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
