-- ============================================================================
-- DEPO-PRO CRITICAL FIXES: RC-1 through RC-5
-- ============================================================================
-- Version:    1.2.1
-- Date:       2026-02-09
-- Purpose:    Fix 5 critical issues identified in architectural review
--
-- CHANGES:
--   RC-1: extract_flagged_words() - prevent destructive deletion of review progress
--   RC-2: append_integrity_chain() - fix race condition with SELECT FOR UPDATE
--   RC-3: Add missing DELETE policies (4 tables)
--   RC-4: Remove is_flagged from words JSONB structure (doc + validation)
--   RC-5: transcript_shares unique constraint - allow re-sharing after revoke
-- ============================================================================


-- ============================================================================
-- RC-1: FIX extract_flagged_words() - NON-DESTRUCTIVE EXTRACTION
-- ============================================================================
-- PROBLEM: DELETE wipes out review progress on re-extraction
-- SOLUTION: Use INSERT ... ON CONFLICT DO NOTHING to preserve existing reviews
-- ============================================================================

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

  IF v_words IS NULL THEN RETURN 0; END IF;

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

COMMENT ON FUNCTION extract_flagged_words IS
'Extract low-confidence words as flagged_words records.
NON-DESTRUCTIVE: Preserves existing review progress by using ON CONFLICT DO NOTHING.
Safe to call multiple times (e.g., retry scenarios).
Returns count of newly inserted flags.';


-- ============================================================================
-- RC-2: FIX append_integrity_chain() - PREVENT RACE CONDITION
-- ============================================================================
-- PROBLEM: Two concurrent edits can both read same version, both insert version N+1
-- SOLUTION: Use SELECT FOR UPDATE to serialize version number assignment
-- ============================================================================

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
  -- CRITICAL FIX: Add FOR UPDATE to serialize version assignment
  -- Prevents race condition where two edits read same version
  SELECT version_number, transcript_hash
  INTO v_version, v_prev_hash
  FROM transcript_integrity_chain
  WHERE transcription_id = p_transcription_id
  ORDER BY version_number DESC
  LIMIT 1
  FOR UPDATE;  -- ← SERIALIZES ACCESS

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

COMMENT ON FUNCTION append_integrity_chain IS
'Append new version to integrity chain with SHA-256 hash.
Uses SELECT FOR UPDATE to prevent race conditions in version numbering.
Returns the new version number.';


-- ============================================================================
-- RC-3: ADD MISSING DELETE POLICIES
-- ============================================================================
-- PROBLEM: 4 tables have no DELETE policies, blocking operational cleanup
-- SOLUTION: Add DELETE policies matching UPDATE policy patterns
-- ============================================================================

-- 3A: custom_vocabularies - Reporter or Admin can delete
CREATE POLICY vocab_delete ON custom_vocabularies FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = custom_vocabularies.job_id AND (
      j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

COMMENT ON POLICY vocab_delete ON custom_vocabularies IS
'Reporter or admin can delete custom vocabulary terms for their jobs';


-- 3B: silent_segments - Scopist, Reporter, or Admin can delete
CREATE POLICY silent_delete ON silent_segments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = silent_segments.transcription_id AND (
      j.scopist_id = auth.uid()
      OR j.reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
    )
  )
);

COMMENT ON POLICY silent_delete ON silent_segments IS
'Scopist, reporter, or admin can delete silent segment markers';


-- 3C: processing_errors - Admin only (errors are evidentiary)
CREATE POLICY errors_delete ON processing_errors FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = processing_errors.job_id AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
  )
);

COMMENT ON POLICY errors_delete ON processing_errors IS
'Admin can delete resolved processing errors for archival';


-- 3D: transcription_chunks - Admin only (cleanup after pipeline)
CREATE POLICY chunks_delete ON transcription_chunks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM transcriptions t JOIN jobs j ON j.id = t.job_id
    WHERE t.id = transcription_chunks.transcription_id
      AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN' AND p.firm_id = j.firm_id)
  )
);

COMMENT ON POLICY chunks_delete ON transcription_chunks IS
'Admin can delete chunks after transcription pipeline completes';


-- ============================================================================
-- RC-4: REMOVE is_flagged FROM words JSONB STRUCTURE
-- ============================================================================
-- PROBLEM: Attorneys can see is_flagged in words JSONB, leaking review process
-- SOLUTION: Document that is_flagged MUST NOT be stored in words JSONB
--           Flagging state lives ONLY in flagged_words table
-- ============================================================================

-- Update schema comment on transcriptions.words to remove is_flagged
COMMENT ON COLUMN transcriptions.words IS
'JSONB array of word objects from Deepgram.
STRUCTURE (NO is_flagged field - see flagged_words table instead):
[{
  "word": "objection",
  "punctuated_word": "Objection.",
  "start": 142.56,
  "end": 143.12,
  "confidence": 0.92,
  "speaker": "SPEAKER_01",
  "speaker_channel": 0
}]

CRITICAL: Do NOT include is_flagged in this JSONB.
Flagging state is stored in flagged_words table to prevent attorney information leakage.';

-- Add check function to validate words JSONB does not contain is_flagged
CREATE OR REPLACE FUNCTION validate_words_structure()
RETURNS TRIGGER AS $$
DECLARE
  v_word JSONB;
BEGIN
  -- Only validate if words is not null and not empty
  IF NEW.words IS NOT NULL AND jsonb_array_length(NEW.words) > 0 THEN
    -- Check if any word object contains is_flagged key
    FOR v_word IN SELECT jsonb_array_elements(NEW.words) LOOP
      IF v_word ? 'is_flagged' THEN
        RAISE EXCEPTION 'words JSONB must not contain is_flagged field. Use flagged_words table instead.';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_words_structure
  BEFORE INSERT OR UPDATE ON transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_words_structure();

COMMENT ON FUNCTION validate_words_structure IS
'Prevents is_flagged from being stored in words JSONB to prevent attorney information leakage.
Flagging state must only exist in flagged_words table.';


-- ============================================================================
-- RC-5: FIX transcript_shares UNIQUE CONSTRAINT
-- ============================================================================
-- PROBLEM: Cannot re-share with same attorney after revocation
-- SOLUTION: Change to partial unique index (only enforce when not revoked)
-- ============================================================================

-- Drop existing unique constraint
ALTER TABLE transcript_shares DROP CONSTRAINT IF EXISTS transcript_shares_job_id_shared_with_key;

-- Create partial unique index that allows re-sharing after revocation
CREATE UNIQUE INDEX transcript_shares_active_unique
  ON transcript_shares(job_id, shared_with)
  WHERE revoked_at IS NULL;

COMMENT ON INDEX transcript_shares_active_unique IS
'Ensures one active share per job/attorney pair.
Allows re-sharing after revocation since revoked shares are excluded.';


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify fixes:

-- Verify RC-1: Test extract_flagged_words is non-destructive
-- (Requires test data - manual verification)

-- Verify RC-2: Check append_integrity_chain uses FOR UPDATE
-- SELECT pg_get_functiondef('append_integrity_chain'::regproc);

-- Verify RC-3: Check DELETE policies exist
-- SELECT schemaname, tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename IN ('custom_vocabularies', 'silent_segments', 'processing_errors', 'transcription_chunks')
--   AND cmd = 'DELETE';

-- Verify RC-4: Check trigger exists
-- SELECT tgname, tgrelid::regclass, tgenabled
-- FROM pg_trigger
-- WHERE tgname = 'trg_validate_words_structure';

-- Verify RC-5: Check partial unique index exists
-- SELECT indexdef FROM pg_indexes
-- WHERE indexname = 'transcript_shares_active_unique';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Schema version: 1.2.1
-- Critical fixes: RC-1, RC-2, RC-3, RC-4, RC-5 applied
-- Status: Ready for application code development
-- ============================================================================
