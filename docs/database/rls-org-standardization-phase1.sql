-- ============================================================================
-- Depo-Pro RLS Org Standardization (Phase 1, Transition-Safe)
-- ============================================================================
-- Goal:
-- - Standardize access checks around organization scope at Postgres layer.
-- - Keep transition compatibility while organization_memberships backfill is in progress.
--
-- Approach:
-- - Org-membership first.
-- - Fallback to profiles.org_id / profiles.firm_id when no memberships exist.
-- - Preserve assignment-based access for reporter/scopist.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1) Helper functions (single source of truth for RLS predicates)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION app_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT p.role::text = 'SUPER_ADMIN'
    FROM profiles p
    WHERE p.id = auth.uid()
  ), false);
$$;

CREATE OR REPLACE FUNCTION app_current_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH m AS (
    SELECT om.org_id
    FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.status = 'ACTIVE'
  ),
  p AS (
    SELECT p.org_id AS org_id
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.org_id IS NOT NULL
    UNION
    SELECT p.firm_id::uuid AS org_id
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.firm_id IS NOT NULL
  )
  SELECT org_id FROM m
  UNION
  SELECT org_id FROM p;
$$;

CREATE OR REPLACE FUNCTION app_is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_is_super_admin()
         OR EXISTS (
           SELECT 1
           FROM app_current_user_org_ids() uo
           WHERE uo = p_org_id
         );
$$;

CREATE OR REPLACE FUNCTION app_is_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_is_super_admin()
         OR COALESCE(app_user_role(), '') IN (
              'ADMIN',
              'AGENCY_OWNER',
              'AGENCY_MANAGER',
              'FIRM_OWNER',
              'FIRM_MANAGER'
            );
$$;

CREATE OR REPLACE FUNCTION app_can_access_job(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jobs j
    WHERE j.id = p_job_id
      AND (
        app_is_super_admin()
        OR j.reporter_id = auth.uid()
        OR j.scopist_id = auth.uid()
        OR app_is_org_member(COALESCE(j.org_id, j.firm_id))
      )
  );
$$;

-- --------------------------------------------------------------------------
-- 2) Jobs policies (org-standardized)
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS jobs_select ON jobs;
CREATE POLICY jobs_select ON jobs
FOR SELECT
USING (
  app_is_super_admin()
  OR reporter_id = auth.uid()
  OR scopist_id = auth.uid()
  OR app_is_org_member(COALESCE(org_id, firm_id))
);

DROP POLICY IF EXISTS jobs_insert ON jobs;
CREATE POLICY jobs_insert ON jobs
FOR INSERT
WITH CHECK (
  app_is_super_admin()
  OR (
    reporter_id = auth.uid()
    AND app_is_org_member(COALESCE(org_id, firm_id))
  )
  OR (
    app_is_org_admin()
    AND app_is_org_member(COALESCE(org_id, firm_id))
  )
);

DROP POLICY IF EXISTS jobs_update ON jobs;
CREATE POLICY jobs_update ON jobs
FOR UPDATE
USING (
  app_is_super_admin()
  OR reporter_id = auth.uid()
  OR scopist_id = auth.uid()
  OR (
    app_is_org_admin()
    AND app_is_org_member(COALESCE(org_id, firm_id))
  )
)
WITH CHECK (
  app_is_super_admin()
  OR reporter_id = auth.uid()
  OR scopist_id = auth.uid()
  OR (
    app_is_org_admin()
    AND app_is_org_member(COALESCE(org_id, firm_id))
  )
);

DROP POLICY IF EXISTS jobs_delete ON jobs;
CREATE POLICY jobs_delete ON jobs
FOR DELETE
USING (
  app_is_super_admin()
  OR (
    app_is_org_admin()
    AND app_is_org_member(COALESCE(org_id, firm_id))
  )
);

-- --------------------------------------------------------------------------
-- 3) Transcriptions and children (job-based org scope)
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS transcriptions_select ON transcriptions;
CREATE POLICY transcriptions_select ON transcriptions
FOR SELECT
USING (app_can_access_job(job_id));

DROP POLICY IF EXISTS transcriptions_insert ON transcriptions;
CREATE POLICY transcriptions_insert ON transcriptions
FOR INSERT
WITH CHECK (
  app_can_access_job(job_id)
  AND (
    app_is_super_admin()
    OR app_is_org_admin()
    OR EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = transcriptions.job_id
        AND j.reporter_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS transcriptions_update ON transcriptions;
CREATE POLICY transcriptions_update ON transcriptions
FOR UPDATE
USING (app_can_access_job(job_id))
WITH CHECK (app_can_access_job(job_id));

DROP POLICY IF EXISTS flagged_words_select ON flagged_words;
CREATE POLICY flagged_words_select ON flagged_words
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = flagged_words.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS flagged_words_update ON flagged_words;
CREATE POLICY flagged_words_update ON flagged_words
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = flagged_words.transcription_id
      AND app_can_access_job(t.job_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = flagged_words.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS edits_select ON transcription_edits;
CREATE POLICY edits_select ON transcription_edits
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = transcription_edits.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS edits_insert ON transcription_edits;
CREATE POLICY edits_insert ON transcription_edits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = transcription_edits.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS chunks_select ON transcription_chunks;
CREATE POLICY chunks_select ON transcription_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = transcription_chunks.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS silent_select ON silent_segments;
CREATE POLICY silent_select ON silent_segments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = silent_segments.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS silent_insert ON silent_segments;
CREATE POLICY silent_insert ON silent_segments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = silent_segments.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS silent_update ON silent_segments;
CREATE POLICY silent_update ON silent_segments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = silent_segments.transcription_id
      AND app_can_access_job(t.job_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM transcriptions t
    WHERE t.id = silent_segments.transcription_id
      AND app_can_access_job(t.job_id)
  )
);

DROP POLICY IF EXISTS errors_select ON processing_errors;
CREATE POLICY errors_select ON processing_errors
FOR SELECT
USING (app_can_access_job(job_id));

DROP POLICY IF EXISTS errors_insert ON processing_errors;
CREATE POLICY errors_insert ON processing_errors
FOR INSERT
WITH CHECK (
  app_can_access_job(job_id)
  AND (
    app_is_super_admin()
    OR app_is_org_admin()
    OR EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = processing_errors.job_id
        AND j.reporter_id = auth.uid()
    )
  )
);

COMMIT;
