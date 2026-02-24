-- =============================================================================
-- RLS POLICY GAP CLOSURE — USER DATA TABLES
-- Migration: 20260223175925_rls_user_data_tables.sql
--
-- Adds RLS enable + baseline policies for tables that were missing coverage
-- in the security-baseline scan.
--
-- POLICY PHILOSOPHY:
--   • All tables use firm_id isolation where applicable
--   • Fallback: user-owned rows scoped to auth.uid()
--   • Service role (admin client) bypasses RLS automatically
--
-- REVIEW BEFORE PUSHING:
--   Some policies reference helper functions (user_belongs_to_firm, etc.)
--   that must already exist in the database. Verify against your baseline.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: ensure the user_belongs_to_firm() function exists
-- (no-op if already present from security_hardening migration)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_belongs_to_firm(firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.firm_id = $1
      AND j.created_by_id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1
    FROM public.job_assignments ja
    WHERE ja.job_id IN (SELECT id FROM public.jobs WHERE firm_id = $1)
      AND ja.scopist_id = auth.uid()
    LIMIT 1
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. extracted_entities
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.extracted_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extracted_entities_select" ON public.extracted_entities;
CREATE POLICY "extracted_entities_select" ON public.extracted_entities
  FOR SELECT
  USING (
    firm_id IS NULL
    OR firm_id = (SELECT raw_user_meta_data->>'firmId' FROM auth.users WHERE id = auth.uid())::uuid
    OR auth.uid() IN (
      SELECT created_by_id FROM public.jobs WHERE id = job_id
    )
  );

DROP POLICY IF EXISTS "extracted_entities_insert" ON public.extracted_entities;
CREATE POLICY "extracted_entities_insert" ON public.extracted_entities
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by_id FROM public.jobs WHERE id = job_id
    )
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "extracted_entities_delete" ON public.extracted_entities;
CREATE POLICY "extracted_entities_delete" ON public.extracted_entities
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT created_by_id FROM public.jobs WHERE id = job_id
    )
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. entity_relations
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.entity_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entity_relations_select" ON public.entity_relations;
CREATE POLICY "entity_relations_select" ON public.entity_relations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT created_by_id FROM public.jobs WHERE id = job_id
    )
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "entity_relations_insert" ON public.entity_relations;
CREATE POLICY "entity_relations_insert" ON public.entity_relations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by_id FROM public.jobs WHERE id = job_id
    )
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "entity_relations_delete" ON public.entity_relations;
CREATE POLICY "entity_relations_delete" ON public.entity_relations
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT created_by_id FROM public.jobs WHERE id = job_id
    )
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. transcript_revisions
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.transcript_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transcript_revisions_select" ON public.transcript_revisions;
CREATE POLICY "transcript_revisions_select" ON public.transcript_revisions
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT t.created_by FROM public.transcripts t
      WHERE t.id = transcript_id
    )
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "transcript_revisions_insert" ON public.transcript_revisions;
CREATE POLICY "transcript_revisions_insert" ON public.transcript_revisions
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. audit_events (read-only for owners; insert allowed for authenticated users)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
CREATE POLICY "audit_events_select" ON public.audit_events
  FOR SELECT
  USING (
    actor_user_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;
CREATE POLICY "audit_events_insert" ON public.audit_events
  FOR INSERT
  WITH CHECK (
    actor_user_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. error_logs (admin-only read; insert open to authenticated)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_logs_select_admin" ON public.error_logs;
CREATE POLICY "error_logs_select_admin" ON public.error_logs
  FOR SELECT
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "error_logs_insert" ON public.error_logs;
CREATE POLICY "error_logs_insert" ON public.error_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. usage_tracking (user sees own rows; admin sees all)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_tracking_select" ON public.usage_tracking;
CREATE POLICY "usage_tracking_select" ON public.usage_tracking
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "usage_tracking_insert" ON public.usage_tracking;
CREATE POLICY "usage_tracking_insert" ON public.usage_tracking
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. csr_records  (job owner / same firm)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.csr_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csr_records_select" ON public.csr_records;
CREATE POLICY "csr_records_select" ON public.csr_records
  FOR SELECT
  USING (
    created_by_id = auth.uid()
    OR auth.uid() IN (
      SELECT created_by_id FROM public.jobs WHERE id = job_id
    )
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "csr_records_insert" ON public.csr_records;
CREATE POLICY "csr_records_insert" ON public.csr_records
  FOR INSERT
  WITH CHECK (
    created_by_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "csr_records_update" ON public.csr_records;
CREATE POLICY "csr_records_update" ON public.csr_records
  FOR UPDATE
  USING (
    created_by_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. csr_proper_nouns  (via parent csr_record ownership)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.csr_proper_nouns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csr_proper_nouns_select" ON public.csr_proper_nouns;
CREATE POLICY "csr_proper_nouns_select" ON public.csr_proper_nouns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.csr_records cr
      WHERE cr.id = csr_record_id
        AND (
          cr.created_by_id = auth.uid()
          OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
        )
    )
  );

DROP POLICY IF EXISTS "csr_proper_nouns_insert" ON public.csr_proper_nouns;
CREATE POLICY "csr_proper_nouns_insert" ON public.csr_proper_nouns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.csr_records cr
      WHERE cr.id = csr_record_id
        AND (
          cr.created_by_id = auth.uid()
          OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
        )
    )
  );

DROP POLICY IF EXISTS "csr_proper_nouns_delete" ON public.csr_proper_nouns;
CREATE POLICY "csr_proper_nouns_delete" ON public.csr_proper_nouns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.csr_records cr
      WHERE cr.id = csr_record_id
        AND (
          cr.created_by_id = auth.uid()
          OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
        )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. exhibit_annotation_links
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.exhibit_annotation_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exhibit_annotation_links_select" ON public.exhibit_annotation_links;
CREATE POLICY "exhibit_annotation_links_select" ON public.exhibit_annotation_links
  FOR SELECT
  USING (
    created_by_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "exhibit_annotation_links_insert" ON public.exhibit_annotation_links;
CREATE POLICY "exhibit_annotation_links_insert" ON public.exhibit_annotation_links
  FOR INSERT
  WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "exhibit_annotation_links_delete" ON public.exhibit_annotation_links;
CREATE POLICY "exhibit_annotation_links_delete" ON public.exhibit_annotation_links
  FOR DELETE
  USING (
    created_by_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. review_sessions
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_sessions_select" ON public.review_sessions;
CREATE POLICY "review_sessions_select" ON public.review_sessions
  FOR SELECT
  USING (
    reviewer_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "review_sessions_insert" ON public.review_sessions;
CREATE POLICY "review_sessions_insert" ON public.review_sessions
  FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "review_sessions_update" ON public.review_sessions;
CREATE POLICY "review_sessions_update" ON public.review_sessions
  FOR UPDATE
  USING (reviewer_id = auth.uid());

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
