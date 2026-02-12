-- Fix Phase 10 RLS Policies (Security Audit Finding C.3)
-- Issue: Original policies reference 'users' table and camelCase columns
-- Fix: Use 'profiles' table and snake_case (reporter_id, scopist_id)

-- ══════════════════════════════════════════════════════════════
-- MEDICAL_RECORDS POLICIES
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS medical_records_select ON medical_records;
CREATE POLICY medical_records_select ON medical_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = medical_records.job_id
    AND (
      j.reporter_id = auth.uid()
      OR j.scopist_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'::user_role
      )
    )
  )
);

DROP POLICY IF EXISTS medical_records_insert ON medical_records;
CREATE POLICY medical_records_insert ON medical_records
FOR INSERT WITH CHECK (
  uploaded_by_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = medical_records.job_id
    AND (
      j.reporter_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'::user_role
      )
    )
  )
);

DROP POLICY IF EXISTS medical_records_update ON medical_records;
CREATE POLICY medical_records_update ON medical_records
FOR UPDATE USING (
  uploaded_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'::user_role
  )
);

DROP POLICY IF EXISTS medical_records_delete ON medical_records;
CREATE POLICY medical_records_delete ON medical_records
FOR DELETE USING (
  uploaded_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'::user_role
  )
);

-- ══════════════════════════════════════════════════════════════
-- CHRONOLOGY_ENTRIES POLICIES
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS chronology_entries_select ON chronology_entries;
CREATE POLICY chronology_entries_select ON chronology_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN medical_records mr ON mr.job_id = j.id
    WHERE mr.id = chronology_entries.medical_record_id
    AND (
      j.reporter_id = auth.uid()
      OR j.scopist_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'::user_role
      )
    )
  )
);

DROP POLICY IF EXISTS chronology_entries_insert ON chronology_entries;
CREATE POLICY chronology_entries_insert ON chronology_entries
FOR INSERT WITH CHECK (
  created_by_id = auth.uid()
);

DROP POLICY IF EXISTS chronology_entries_update ON chronology_entries;
CREATE POLICY chronology_entries_update ON chronology_entries
FOR UPDATE USING (
  created_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'::user_role
  )
);

DROP POLICY IF EXISTS chronology_entries_delete ON chronology_entries;
CREATE POLICY chronology_entries_delete ON chronology_entries
FOR DELETE USING (
  created_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'::user_role
  )
);

-- ══════════════════════════════════════════════════════════════
-- VERIFICATION QUERY
-- ══════════════════════════════════════════════════════════════

-- Run this after migration to verify policies are correct:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  LEFT(qual::text, 100) AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('medical_records', 'chronology_entries')
ORDER BY tablename, cmd;
*/
