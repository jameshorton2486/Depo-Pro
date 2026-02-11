-- ============================================================================
-- DEPO-PRO CRITICAL FIXES: RC-6 through RC-8
-- ============================================================================
-- Version:    1.2.2
-- Date:       2026-02-09
-- Purpose:    Fix remaining critical issues from architectural review
--
-- CHANGES:
--   RC-6: Lock timeout validation - prevent unbounded locks
--   RC-7: Index on lock_expires_at - fix cleanup performance
--   RC-8: JSONB NOT NULL defaults - prevent application crashes
-- ============================================================================


-- ============================================================================
-- RC-6: LOCK TIMEOUT VALIDATION
-- ============================================================================
-- PROBLEM: acquire_job_lock() accepts unbounded timeout (999999 minutes = 694 days)
-- SOLUTION: Add validation to limit timeout to reasonable maximum (8 hours)
-- ============================================================================

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
  -- RC-6 FIX: Validate timeout is within reasonable bounds
  -- Max 480 minutes = 8 hours (reasonable for editing 8-hour deposition)
  IF p_timeout_minutes < 1 OR p_timeout_minutes > 480 THEN
    RAISE EXCEPTION 'Lock timeout must be between 1 and 480 minutes. Requested: %', p_timeout_minutes;
  END IF;

  SELECT locked_by, lock_expires_at
  INTO v_current_lock, v_lock_expires
  FROM jobs WHERE id = p_job_id FOR UPDATE;

  -- If no lock, or lock expired, or current user already has lock
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

  -- Lock is held by another user and not expired
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION acquire_job_lock IS
'Acquire exclusive lock on a job for editing.
Timeout must be between 1-480 minutes (max 8 hours).
Returns TRUE if lock acquired, FALSE if held by another user.';


-- ============================================================================
-- RC-7: INDEX ON LOCK EXPIRY
-- ============================================================================
-- PROBLEM: cleanup_expired_locks() does sequential scan of all locked jobs
-- SOLUTION: Create index on lock_expires_at for efficient cleanup queries
-- ============================================================================

-- Drop existing partial index on locked_by if it doesn't include expiry
-- (idx_jobs_locked only indexes locked_by, not lock_expires_at)

-- Create composite index for efficient expired lock cleanup
CREATE INDEX idx_jobs_lock_expiry ON jobs(lock_expires_at)
  WHERE locked_by IS NOT NULL AND lock_expires_at IS NOT NULL;

COMMENT ON INDEX idx_jobs_lock_expiry IS
'Optimizes cleanup_expired_locks() by indexing lock_expires_at.
Partial index only includes rows where lock fields are populated.
Enables efficient WHERE lock_expires_at < NOW() queries.';


-- ============================================================================
-- RC-8: JSONB NOT NULL DEFAULTS
-- ============================================================================
-- PROBLEM: JSONB columns can be NULL, causing application crashes
-- SOLUTION: Add NOT NULL constraints with appropriate defaults
-- ============================================================================

-- 8A: transcriptions.words - array of word objects
-- Must be NOT NULL to prevent crashes in extract_flagged_words() and UI
ALTER TABLE transcriptions
  ALTER COLUMN words SET DEFAULT '[]'::JSONB;

-- Set existing NULL values to empty array before adding NOT NULL
UPDATE transcriptions SET words = '[]'::JSONB WHERE words IS NULL;

ALTER TABLE transcriptions
  ALTER COLUMN words SET NOT NULL;

COMMENT ON COLUMN transcriptions.words IS
'JSONB array of word objects from Deepgram. NOT NULL, defaults to [].
STRUCTURE (NO is_flagged field - see flagged_words table instead):
[{
  "word": "objection",
  "punctuated_word": "Objection.",
  "start": 142.56,
  "end": 143.12,
  "confidence": 0.92,
  "speaker": "SPEAKER_01",
  "speaker_channel": 0
}]';


-- 8B: transcriptions.segments - array of segment objects
ALTER TABLE transcriptions
  ALTER COLUMN segments SET DEFAULT '[]'::JSONB;

UPDATE transcriptions SET segments = '[]'::JSONB WHERE segments IS NULL;

ALTER TABLE transcriptions
  ALTER COLUMN segments SET NOT NULL;

COMMENT ON COLUMN transcriptions.segments IS
'JSONB array of transcript segments. NOT NULL, defaults to [].
[{
  "text": "Objection, your Honor.",
  "speaker": "SPEAKER_01",
  "start": 142.56,
  "end": 145.30,
  "channel": 0,
  "original_text": "Objection, your Honor."
}]';


-- 8C: transcriptions.speakers - speaker metadata
ALTER TABLE transcriptions
  ALTER COLUMN speakers SET DEFAULT '[]'::JSONB;

UPDATE transcriptions SET speakers = '[]'::JSONB WHERE speakers IS NULL;

ALTER TABLE transcriptions
  ALTER COLUMN speakers SET NOT NULL;

COMMENT ON COLUMN transcriptions.speakers IS
'JSONB array of detected speakers. NOT NULL, defaults to [].
May include speaker labels, channel mappings, or diarization metadata.';


-- 8D: transcriptions.chunking_config - chunking parameters
ALTER TABLE transcriptions
  ALTER COLUMN chunking_config SET DEFAULT '{}'::JSONB;

UPDATE transcriptions SET chunking_config = '{}'::JSONB WHERE chunking_config IS NULL;

ALTER TABLE transcriptions
  ALTER COLUMN chunking_config SET NOT NULL;

COMMENT ON COLUMN transcriptions.chunking_config IS
'JSONB object with chunking configuration. NOT NULL, defaults to {}.
Example: {"chunk_duration_seconds": 1800, "overlap_seconds": 5}';


-- 8E: transcriptions.deepgram_config - Deepgram API parameters
ALTER TABLE transcriptions
  ALTER COLUMN deepgram_config SET DEFAULT '{}'::JSONB;

UPDATE transcriptions SET deepgram_config = '{}'::JSONB WHERE deepgram_config IS NULL;

ALTER TABLE transcriptions
  ALTER COLUMN deepgram_config SET NOT NULL;

COMMENT ON COLUMN transcriptions.deepgram_config IS
'JSONB object with Deepgram API parameters used. NOT NULL, defaults to {}.
Example: {"model": "nova-3", "language": "en", "punctuate": true, "diarize": true}';


-- 8F: transcriptions.deepgram_raw_json - RAW API response
-- KEEP NULLABLE - only populated after transcription completes
-- This is immutable evidence, so NULL state is meaningful (not yet transcribed)
COMMENT ON COLUMN transcriptions.deepgram_raw_json IS
'JSONB of complete Deepgram API response. NULLABLE until transcription completes.
Immutable after initial storage - cannot be modified (enforced by trigger).
NULL = transcription not yet started/completed.';


-- 8G: transcription_edits.metadata - edit metadata
ALTER TABLE transcription_edits
  ALTER COLUMN metadata SET DEFAULT '{}'::JSONB;

UPDATE transcription_edits SET metadata = '{}'::JSONB WHERE metadata IS NULL;

ALTER TABLE transcription_edits
  ALTER COLUMN metadata SET NOT NULL;

COMMENT ON COLUMN transcription_edits.metadata IS
'JSONB object with edit metadata. NOT NULL, defaults to {}.
May include UI state, cursor position, batch edit details, etc.';


-- ============================================================================
-- ADDITIONAL SAFETY: Update functions to handle new constraints
-- ============================================================================

-- Update extract_flagged_words to safely handle empty words array
CREATE OR REPLACE FUNCTION extract_flagged_words(
  p_transcription_id UUID,
  p_confidence_threshold FLOAT DEFAULT 0.85
)
RETURNS INTEGER AS $$
DECLARE
  v_words JSONB;
  v_word JSONB;
  v_index INTEGER;
  v_count INTEGER := 0;
  v_inserted INTEGER := 0;
  v_context_before TEXT;
  v_context_after TEXT;
BEGIN
  SELECT words INTO v_words
  FROM transcriptions WHERE id = p_transcription_id;

  -- RC-8 safe: words is now NOT NULL, but check for empty array
  IF v_words IS NULL OR jsonb_array_length(v_words) = 0 THEN
    RETURN 0;
  END IF;

  -- DO NOT DELETE existing flagged_words - preserve review progress
  -- Only insert new flags that don't already exist

  FOR v_index IN 0..jsonb_array_length(v_words) - 1 LOOP
    v_word := v_words->v_index;

    IF (v_word->>'confidence')::FLOAT < p_confidence_threshold THEN
      v_context_before := '';
      v_context_after := '';

      FOR i IN GREATEST(0, v_index - 5)..v_index - 1 LOOP
        v_context_before := v_context_before || ' ' || (v_words->i->>'word');
      END LOOP;

      FOR i IN v_index + 1..LEAST(jsonb_array_length(v_words) - 1, v_index + 5) LOOP
        v_context_after := v_context_after || ' ' || (v_words->i->>'word');
      END LOOP;

      -- Use INSERT ... ON CONFLICT DO NOTHING to preserve existing reviews
      INSERT INTO flagged_words (
        transcription_id, word_index, original_word, confidence,
        start_time, end_time, speaker,
        context_before, context_after,
        alternatives, sort_order
      ) VALUES (
        p_transcription_id, v_index,
        v_word->>'word',
        (v_word->>'confidence')::FLOAT,
        (v_word->>'start')::FLOAT,
        (v_word->>'end')::FLOAT,
        v_word->>'speaker',
        TRIM(v_context_before),
        TRIM(v_context_after),
        v_word->'alternatives',
        v_count
      )
      ON CONFLICT (transcription_id, word_index) DO NOTHING;

      -- Track if insert actually happened
      IF FOUND THEN
        v_inserted := v_inserted + 1;
      END IF;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Update counts: total flagged (including pre-existing) and newly inserted
  UPDATE transcriptions SET
    flagged_word_count = (
      SELECT COUNT(*) FROM flagged_words WHERE transcription_id = p_transcription_id
    ),
    reviewed_word_count = (
      SELECT COUNT(*) FROM flagged_words
      WHERE transcription_id = p_transcription_id
        AND status IN ('CORRECTED', 'CONFIRMED', 'SKIPPED')
    )
  WHERE id = p_transcription_id;

  -- Return count of newly inserted flags (not total)
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RC-6: Lock timeout validation
-- SELECT pg_get_functiondef('acquire_job_lock'::regproc);
-- Should contain: IF p_timeout_minutes < 1 OR p_timeout_minutes > 480

-- Verify RC-7: Index exists
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE indexname = 'idx_jobs_lock_expiry';
-- Should return 1 row with WHERE clause

-- Verify RC-8: JSONB columns are NOT NULL
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'transcriptions'
--   AND column_name IN ('words', 'segments', 'speakers', 'chunking_config', 'deepgram_config')
--   AND data_type = 'jsonb';
-- All should show is_nullable = 'NO'

-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'transcription_edits'
--   AND column_name = 'metadata'
--   AND data_type = 'jsonb';
-- Should show is_nullable = 'NO'


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Schema version: 1.2.2
-- Critical fixes: RC-6, RC-7, RC-8 applied
-- All 8 critical issues now resolved
-- Status: Production-safe (pending fixes for SR-1 through SR-8)
-- ============================================================================
