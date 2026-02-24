-- =============================================================================
-- RLS POLICY GAP CLOSURE — USER DATA TABLES
-- Migration: 20260223175925_rls_user_data_tables.sql
--
-- Adds RLS enable + baseline policies for tables that were missing coverage
-- in the security-baseline scan. Each block is conditional — only applies if
-- the table exists (handles schema drift between local and remote).
--
-- POLICY PHILOSOPHY:
--   • All tables use firm_id isolation where applicable
--   • Fallback: user-owned rows scoped to auth.uid()
--   • Service role (admin client) bypasses RLS automatically
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: ensure the user_belongs_to_firm() function exists
-- (matches existing DB: parameter check_firm_id, uses jobs.reporter_id/scopist_id)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_belongs_to_firm(check_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.firm_id = $1
      AND (j.reporter_id = auth.uid() OR j.scopist_id = auth.uid())
    LIMIT 1
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. extracted_entities (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'extracted_entities') THEN
    ALTER TABLE public.extracted_entities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "extracted_entities_select" ON public.extracted_entities;
    CREATE POLICY "extracted_entities_select" ON public.extracted_entities FOR SELECT USING (
      firm_id IS NULL OR firm_id = (SELECT raw_user_meta_data->>'firmId' FROM auth.users WHERE id = auth.uid())::uuid
      OR auth.uid() IN (SELECT reporter_id FROM public.jobs WHERE id = job_id)
    );
    DROP POLICY IF EXISTS "extracted_entities_insert" ON public.extracted_entities;
    CREATE POLICY "extracted_entities_insert" ON public.extracted_entities FOR INSERT WITH CHECK (
      auth.uid() IN (SELECT reporter_id FROM public.jobs WHERE id = job_id)
      OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "extracted_entities_delete" ON public.extracted_entities;
    CREATE POLICY "extracted_entities_delete" ON public.extracted_entities FOR DELETE USING (
      auth.uid() IN (SELECT reporter_id FROM public.jobs WHERE id = job_id)
      OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. entity_relations (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_relations') THEN
    ALTER TABLE public.entity_relations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "entity_relations_select" ON public.entity_relations;
    CREATE POLICY "entity_relations_select" ON public.entity_relations FOR SELECT USING (
      auth.uid() IN (SELECT reporter_id FROM public.jobs WHERE id = job_id)
      OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "entity_relations_insert" ON public.entity_relations;
    CREATE POLICY "entity_relations_insert" ON public.entity_relations FOR INSERT WITH CHECK (
      auth.uid() IN (SELECT reporter_id FROM public.jobs WHERE id = job_id)
      OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "entity_relations_delete" ON public.entity_relations;
    CREATE POLICY "entity_relations_delete" ON public.entity_relations FOR DELETE USING (
      auth.uid() IN (SELECT reporter_id FROM public.jobs WHERE id = job_id)
      OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. transcript_revisions (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcript_revisions') THEN
    ALTER TABLE public.transcript_revisions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "transcript_revisions_select" ON public.transcript_revisions;
    CREATE POLICY "transcript_revisions_select" ON public.transcript_revisions FOR SELECT USING (
      created_by = auth.uid()
      OR auth.uid() IN (SELECT t.created_by FROM public.transcripts t WHERE t.id = transcript_id)
      OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "transcript_revisions_insert" ON public.transcript_revisions;
    CREATE POLICY "transcript_revisions_insert" ON public.transcript_revisions FOR INSERT WITH CHECK (
      created_by = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. audit_events (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_events') THEN
    ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
    CREATE POLICY "audit_events_select" ON public.audit_events FOR SELECT USING (
      actor_user_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;
    CREATE POLICY "audit_events_insert" ON public.audit_events FOR INSERT WITH CHECK (
      actor_user_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. error_logs (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'error_logs') THEN
    ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "error_logs_select_admin" ON public.error_logs;
    CREATE POLICY "error_logs_select_admin" ON public.error_logs FOR SELECT USING (
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "error_logs_insert" ON public.error_logs;
    CREATE POLICY "error_logs_insert" ON public.error_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. usage_tracking (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_tracking') THEN
    ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "usage_tracking_select" ON public.usage_tracking;
    CREATE POLICY "usage_tracking_select" ON public.usage_tracking FOR SELECT USING (
      user_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "usage_tracking_insert" ON public.usage_tracking;
    CREATE POLICY "usage_tracking_insert" ON public.usage_tracking FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. csr_records (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'csr_records') THEN
    ALTER TABLE public.csr_records ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "csr_records_select" ON public.csr_records;
    CREATE POLICY "csr_records_select" ON public.csr_records FOR SELECT USING (
      created_by_id = auth.uid()
      OR auth.uid() IN (SELECT reporter_id FROM public.jobs WHERE id = job_id)
      OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "csr_records_insert" ON public.csr_records;
    CREATE POLICY "csr_records_insert" ON public.csr_records FOR INSERT WITH CHECK (
      created_by_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "csr_records_update" ON public.csr_records;
    CREATE POLICY "csr_records_update" ON public.csr_records FOR UPDATE USING (
      created_by_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. csr_proper_nouns (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'csr_proper_nouns') THEN
    ALTER TABLE public.csr_proper_nouns ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "csr_proper_nouns_select" ON public.csr_proper_nouns;
    CREATE POLICY "csr_proper_nouns_select" ON public.csr_proper_nouns FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.csr_records cr WHERE cr.id = csr_record_id AND (cr.created_by_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'))
    );
    DROP POLICY IF EXISTS "csr_proper_nouns_insert" ON public.csr_proper_nouns;
    CREATE POLICY "csr_proper_nouns_insert" ON public.csr_proper_nouns FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.csr_records cr WHERE cr.id = csr_record_id AND (cr.created_by_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'))
    );
    DROP POLICY IF EXISTS "csr_proper_nouns_delete" ON public.csr_proper_nouns;
    CREATE POLICY "csr_proper_nouns_delete" ON public.csr_proper_nouns FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.csr_records cr WHERE cr.id = csr_record_id AND (cr.created_by_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'))
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. exhibit_annotation_links (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exhibit_annotation_links') THEN
    ALTER TABLE public.exhibit_annotation_links ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "exhibit_annotation_links_select" ON public.exhibit_annotation_links;
    CREATE POLICY "exhibit_annotation_links_select" ON public.exhibit_annotation_links FOR SELECT USING (
      created_by_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "exhibit_annotation_links_insert" ON public.exhibit_annotation_links;
    CREATE POLICY "exhibit_annotation_links_insert" ON public.exhibit_annotation_links FOR INSERT WITH CHECK (created_by_id = auth.uid());
    DROP POLICY IF EXISTS "exhibit_annotation_links_delete" ON public.exhibit_annotation_links;
    CREATE POLICY "exhibit_annotation_links_delete" ON public.exhibit_annotation_links FOR DELETE USING (
      created_by_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. review_sessions (conditional)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_sessions') THEN
    ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_sessions_select" ON public.review_sessions;
    CREATE POLICY "review_sessions_select" ON public.review_sessions FOR SELECT USING (
      reviewer_id = auth.uid() OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
    );
    DROP POLICY IF EXISTS "review_sessions_insert" ON public.review_sessions;
    CREATE POLICY "review_sessions_insert" ON public.review_sessions FOR INSERT WITH CHECK (reviewer_id = auth.uid());
    DROP POLICY IF EXISTS "review_sessions_update" ON public.review_sessions;
    CREATE POLICY "review_sessions_update" ON public.review_sessions FOR UPDATE USING (reviewer_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
