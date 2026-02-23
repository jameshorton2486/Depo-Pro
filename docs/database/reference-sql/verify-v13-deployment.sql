-- =============================================================================
-- Verify v1.3 schema deployment
-- Run in Supabase SQL Editor after deploying depo-pro-schema-v1.3.sql
-- Expect: one row per check with exists = true
-- =============================================================================

SELECT 'profiles' AS object_name, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS "exists"
UNION ALL SELECT 'firms', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'firms')
UNION ALL SELECT 'jobs', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs')
UNION ALL SELECT 'transcriptions', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcriptions')
UNION ALL SELECT 'flagged_words', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flagged_words')
UNION ALL SELECT 'transcript_integrity_chain', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcript_integrity_chain')
UNION ALL SELECT 'cleanup_expired_locks()', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'cleanup_expired_locks');
