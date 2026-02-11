-- ═══════════════════════════════════════════════════════════════
-- SECURITY HARDENING: RLS Policy Fixes
-- ═══════════════════════════════════════════════════════════════
--
-- This migration fixes CRITICAL security vulnerabilities found in RLS audit:
--
-- CRITICAL FIXES:
--   1. Fix medical_records migration (wrong table/column references)
--   2. Add missing DELETE policies from RC-3
--   3. Fix cross-tenant admin access (firm scoping)
--   4. Complete attorney blocking policies
--
-- Run this IMMEDIATELY before deploying medical records feature.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PART 1: Fix Medical Records Migration Errors (CRITICAL)
-- ═══════════════════════════════════════════════════════════════

-- Drop broken policies from Phase 10 migration
DROP POLICY IF EXISTS medical_records_select ON medical_records;
DROP POLICY IF EXISTS medical_records_insert ON medical_records;
DROP POLICY IF EXISTS medical_records_update ON medical_records;
DROP POLICY IF EXISTS medical_records_delete ON medical_records;
DROP POLICY IF EXISTS chronology_entries_select ON chronology_entries;
DROP POLICY IF EXISTS chronology_entries_insert ON chronology_entries;
DROP POLICY IF EXISTS chronology_entries_update ON chronology_entries;
DROP POLICY IF EXISTS chronology_entries_delete ON chronology_entries;

-- Fix foreign key constraints (users → profiles)
ALTER TABLE medical_records
  DROP CONSTRAINT IF EXISTS medical_records_uploaded_by_id_fkey,
  DROP CONSTRAINT IF EXISTS medical_records_verified_by_id_fkey;

ALTER TABLE medical_records
  ADD CONSTRAINT medical_records_uploaded_by_id_fkey
    FOREIGN KEY (uploaded_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE medical_records
  ADD CONSTRAINT medical_records_verified_by_id_fkey
    FOREIGN KEY (verified_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE chronology_entries
  DROP CONSTRAINT IF EXISTS chronology_entries_created_by_id_fkey,
  DROP CONSTRAINT IF EXISTS chronology_entries_verified_by_id_fkey;

ALTER TABLE chronology_entries
  ADD CONSTRAINT chronology_entries_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE chronology_entries
  ADD CONSTRAINT chronology_entries_verified_by_id_fkey
    FOREIGN KEY (verified_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════
-- PART 2: Correct Medical Records RLS Policies (Firm-Scoped)
-- ═══════════════════════════════════════════════════════════════

-- Medical Records: SELECT
-- Reporter/scopist on job OR firm-scoped admin
CREATE POLICY medical_records_select ON medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = medical_records.job_id
      AND (
        -- Reporter owns the job
        j.reporter_id = auth.uid()

        -- Scopist assigned to job
        OR j.scopist_id = auth.uid()

        -- Admin in same firm (FIRM-SCOPED)
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Medical Records: INSERT
-- Only reporter on job OR firm-scoped admin
CREATE POLICY medical_records_insert ON medical_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = medical_records.job_id
      AND (
        -- Reporter owns the job
        j.reporter_id = auth.uid()

        -- Admin in same firm (FIRM-SCOPED)
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Medical Records: UPDATE
-- Only reporter/admin who can see it
CREATE POLICY medical_records_update ON medical_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = medical_records.job_id
      AND (
        j.reporter_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Medical Records: DELETE
-- Only reporter/admin who can see it
CREATE POLICY medical_records_delete ON medical_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = medical_records.job_id
      AND (
        j.reporter_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- PART 3: Correct Chronology Entries RLS Policies (Firm-Scoped)
-- ═══════════════════════════════════════════════════════════════

-- Chronology Entries: SELECT
-- Anyone who can see the parent medical record
CREATE POLICY chronology_entries_select ON chronology_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN jobs j ON j.id = mr.job_id
      WHERE mr.id = chronology_entries.medical_record_id
      AND (
        j.reporter_id = auth.uid()

        OR j.scopist_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Chronology Entries: INSERT
-- Must have access to the job AND be the creator
CREATE POLICY chronology_entries_insert ON chronology_entries
  FOR INSERT WITH CHECK (
    created_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN jobs j ON j.id = mr.job_id
      WHERE mr.id = chronology_entries.medical_record_id
      AND (
        j.reporter_id = auth.uid()

        OR j.scopist_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Chronology Entries: UPDATE
-- Can update if you can see it
CREATE POLICY chronology_entries_update ON chronology_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN jobs j ON j.id = mr.job_id
      WHERE mr.id = chronology_entries.medical_record_id
      AND (
        j.reporter_id = auth.uid()

        OR j.scopist_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Chronology Entries: DELETE
-- Can delete if you can see it
CREATE POLICY chronology_entries_delete ON chronology_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN jobs j ON j.id = mr.job_id
      WHERE mr.id = chronology_entries.medical_record_id
      AND (
        j.reporter_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- PART 4: Add Missing DELETE Policies (From RC-3)
-- ═══════════════════════════════════════════════════════════════

-- Custom Vocabularies: DELETE
DROP POLICY IF EXISTS vocab_delete ON custom_vocabularies;
CREATE POLICY vocab_delete ON custom_vocabularies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN profiles p ON p.firm_id = j.firm_id
      WHERE j.id = custom_vocabularies.job_id
        AND p.id = auth.uid()
        AND (j.reporter_id = auth.uid() OR p.role = 'ADMIN')
    )
  );

-- Silent Segments: DELETE
DROP POLICY IF EXISTS silent_delete ON silent_segments;
CREATE POLICY silent_delete ON silent_segments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = silent_segments.transcription_id
        AND j.reporter_id = auth.uid()
    )
  );

-- Processing Errors: DELETE
DROP POLICY IF EXISTS errors_delete ON processing_errors;
CREATE POLICY errors_delete ON processing_errors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN profiles p ON p.firm_id = j.firm_id
      WHERE j.id = processing_errors.job_id
        AND p.id = auth.uid()
        AND (j.reporter_id = auth.uid() OR p.role = 'ADMIN')
    )
  );

-- Transcription Chunks: DELETE
DROP POLICY IF EXISTS chunks_delete ON transcription_chunks;
CREATE POLICY chunks_delete ON transcription_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transcription_chunks.transcription_id
        AND j.reporter_id = auth.uid()
    )
  );

-- Flagged Words: DELETE (was missing)
DROP POLICY IF EXISTS flagged_delete ON flagged_words;
CREATE POLICY flagged_delete ON flagged_words
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = flagged_words.transcription_id
        AND j.reporter_id = auth.uid()
    )
  );

-- Transcription Edits: DELETE (was missing)
DROP POLICY IF EXISTS edits_delete ON transcription_edits;
CREATE POLICY edits_delete ON transcription_edits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transcription_edits.transcription_id
        AND j.reporter_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- PART 5: Fix Firm Scoping in Vocabulary Policies
-- ═══════════════════════════════════════════════════════════════

-- Custom Vocabularies: INSERT (fix admin check to include firm)
DROP POLICY IF EXISTS vocab_insert ON custom_vocabularies;
CREATE POLICY vocab_insert ON custom_vocabularies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = custom_vocabularies.job_id
      AND (
        j.reporter_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Custom Vocabularies: UPDATE (add if missing, with firm scoping)
DROP POLICY IF EXISTS vocab_update ON custom_vocabularies;
CREATE POLICY vocab_update ON custom_vocabularies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = custom_vocabularies.job_id
      AND (
        j.reporter_id = auth.uid()

        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.firm_id = j.firm_id
        )
      )
    )
  );

-- Firm Vocabularies: INSERT (add firm scoping)
DROP POLICY IF EXISTS firm_vocab_insert ON firm_vocabularies;
CREATE POLICY firm_vocab_insert ON firm_vocabularies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.firm_id = firm_vocabularies.firm_id
        AND p.role = 'ADMIN'
    )
  );

-- Firm Vocabularies: UPDATE (add if missing)
DROP POLICY IF EXISTS firm_vocab_update ON firm_vocabularies;
CREATE POLICY firm_vocab_update ON firm_vocabularies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.firm_id = firm_vocabularies.firm_id
        AND p.role = 'ADMIN'
    )
  );

-- Firm Vocabularies: DELETE (add if missing)
DROP POLICY IF EXISTS firm_vocab_delete ON firm_vocabularies;
CREATE POLICY firm_vocab_delete ON firm_vocabularies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.firm_id = firm_vocabularies.firm_id
        AND p.role = 'ADMIN'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- PART 6: Complete Attorney Blocking Policies
-- ═══════════════════════════════════════════════════════════════

-- Helper function already exists: is_not_attorney()

-- Attorney blocks for append-only tables (UPDATE/DELETE)
DROP POLICY IF EXISTS attorney_block_chain_update ON transcript_integrity_chain;
CREATE POLICY attorney_block_chain_update ON transcript_integrity_chain AS RESTRICTIVE
  FOR UPDATE WITH CHECK (is_not_attorney());

DROP POLICY IF EXISTS attorney_block_chain_delete ON transcript_integrity_chain;
CREATE POLICY attorney_block_chain_delete ON transcript_integrity_chain AS RESTRICTIVE
  FOR DELETE USING (is_not_attorney());

DROP POLICY IF EXISTS attorney_block_audit_update ON audit_log;
CREATE POLICY attorney_block_audit_update ON audit_log AS RESTRICTIVE
  FOR UPDATE WITH CHECK (is_not_attorney());

DROP POLICY IF EXISTS attorney_block_audit_delete ON audit_log;
CREATE POLICY attorney_block_audit_delete ON audit_log AS RESTRICTIVE
  FOR DELETE USING (is_not_attorney());

DROP POLICY IF EXISTS attorney_block_errors_update ON processing_errors;
CREATE POLICY attorney_block_errors_update ON processing_errors AS RESTRICTIVE
  FOR UPDATE WITH CHECK (is_not_attorney());

DROP POLICY IF EXISTS attorney_block_errors_delete ON processing_errors;
CREATE POLICY attorney_block_errors_delete ON processing_errors AS RESTRICTIVE
  FOR DELETE USING (is_not_attorney());

-- Attorney blocks for transcription_edits DELETE
DROP POLICY IF EXISTS attorney_block_edits_delete ON transcription_edits;
CREATE POLICY attorney_block_edits_delete ON transcription_edits AS RESTRICTIVE
  FOR DELETE USING (is_not_attorney());

-- Attorney blocks for silent_segments DELETE
DROP POLICY IF EXISTS attorney_block_silent_delete ON silent_segments;
CREATE POLICY attorney_block_silent_delete ON silent_segments AS RESTRICTIVE
  FOR DELETE USING (is_not_attorney());

-- Attorney blocks for medical records (all operations)
DROP POLICY IF EXISTS attorney_block_medical_all ON medical_records;
CREATE POLICY attorney_block_medical_all ON medical_records AS RESTRICTIVE
  FOR ALL USING (is_not_attorney());

DROP POLICY IF EXISTS attorney_block_chronology_all ON chronology_entries;
CREATE POLICY attorney_block_chronology_all ON chronology_entries AS RESTRICTIVE
  FOR ALL USING (is_not_attorney());

-- ═══════════════════════════════════════════════════════════════
-- PART 7: Add Transcription Chunks Missing Policies
-- ═══════════════════════════════════════════════════════════════

-- Chunks: INSERT (was missing)
DROP POLICY IF EXISTS chunks_insert ON transcription_chunks;
CREATE POLICY chunks_insert ON transcription_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transcription_chunks.transcription_id
        AND j.reporter_id = auth.uid()
    )
  );

-- Chunks: UPDATE (was missing)
DROP POLICY IF EXISTS chunks_update ON transcription_chunks;
CREATE POLICY chunks_update ON transcription_chunks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transcription_chunks.transcription_id
        AND j.reporter_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Run these after migration to verify policies are correct:

-- Check medical_records foreign keys reference profiles (not users)
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('medical_records', 'chronology_entries')
  AND ccu.table_name = 'profiles';

-- Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'medical_records',
    'chronology_entries',
    'custom_vocabularies',
    'firm_vocabularies',
    'silent_segments',
    'processing_errors',
    'transcription_chunks',
    'flagged_words',
    'transcription_edits',
    'transcript_integrity_chain',
    'audit_log'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verify RESTRICTIVE attorney blocks exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'attorney_block_%'
ORDER BY tablename, policyname;
