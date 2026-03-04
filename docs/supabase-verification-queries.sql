-- ============================================================
-- DEPO-PRO SUPABASE VERIFICATION QUERIES
-- Run manually in: https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx/sql/new
-- Run each block separately. Check Messages tab for NOTICE output.
-- ============================================================

-- CHECK 1: Storage buckets are private
SELECT name, public
FROM storage.buckets
WHERE name IN ('depo-audio', 'depo-files', 'depo-exports', 'depo-chunks')
ORDER BY name;
-- PASS: All 4 rows show public = false

-- CHECK 2: RLS enabled + policies exist on critical tables
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p
  ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'jobs', 'transcriptions', 'flagged_words',
    'profiles', 'firms', 'transcription_edits',
    'audit_events', 'review_sessions', 'medical_records'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rls_enabled ASC, t.tablename;
-- PASS: All tables show rls_enabled = true, policy_count > 0

-- CHECK 3: Core functions exist
SELECT proname, pg_get_function_arguments(oid) AS args
FROM pg_proc
WHERE proname IN (
  'user_belongs_to_firm',
  'append_integrity_chain',
  'extract_flagged_words',
  'acquire_job_lock',
  'release_job_lock'
)
ORDER BY proname;
-- PASS: All 5 function names returned

-- CHECK 4: flagged_words table structure (confirm corrected_word and status columns)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'flagged_words'
ORDER BY ordinal_position;
-- PASS: corrected_word (text, nullable), status (flagged_word_status, not null) exist

-- CHECK 5: Immutability triggers on transcriptions
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'transcriptions'
ORDER BY trigger_name;

-- CHECK 6: 'users' view should NOT exist (we use 'profiles')
SELECT viewname FROM pg_views
WHERE viewname = 'users' AND schemaname = 'public';
-- PASS: zero rows returned

-- CHECK 7: Full bucket + RLS audit readout (check Messages tab after running)
DO $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE '--- BUCKET AUDIT ---';
  FOR r IN
    SELECT name, public, file_size_limit,
           COALESCE(array_length(allowed_mime_types,1),0) AS mime_count
    FROM storage.buckets
    WHERE name IN ('depo-audio','depo-files','depo-exports','depo-chunks')
    ORDER BY name
  LOOP
    RAISE NOTICE 'bucket=% public=% size_limit=% mime_types=%',
      r.name, r.public, r.file_size_limit, r.mime_count;
  END LOOP;

  RAISE NOTICE '--- RLS AUDIT ---';
  FOR r IN
    SELECT t.tablename, t.rowsecurity AS rls_enabled, COUNT(p.policyname) AS policies
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.rowsecurity ASC, t.tablename
  LOOP
    RAISE NOTICE 'table=% rls=% policies=%', r.tablename, r.rls_enabled, r.policies;
  END LOOP;
END $$;
