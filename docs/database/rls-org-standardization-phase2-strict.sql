-- ============================================================================
-- Depo-Pro RLS Org Standardization (Phase 2, Strict Membership Mode)
-- ============================================================================
-- Preconditions:
-- - organizations populated
-- - organization_memberships populated for active users
-- - jobs.org_id fully backfilled (no nulls for tenant rows)
--
-- This script removes org fallback behavior and enforces membership-only scope.
-- SUPER_ADMIN bypass remains explicit.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION app_current_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.org_id
  FROM organization_memberships om
  WHERE om.user_id = auth.uid()
    AND om.status = 'ACTIVE';
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
        OR (j.org_id IS NOT NULL AND app_is_org_member(j.org_id))
      )
  );
$$;

DROP POLICY IF EXISTS jobs_select ON jobs;
CREATE POLICY jobs_select ON jobs
FOR SELECT
USING (
  app_is_super_admin()
  OR reporter_id = auth.uid()
  OR scopist_id = auth.uid()
  OR (org_id IS NOT NULL AND app_is_org_member(org_id))
);

DROP POLICY IF EXISTS jobs_insert ON jobs;
CREATE POLICY jobs_insert ON jobs
FOR INSERT
WITH CHECK (
  app_is_super_admin()
  OR (
    org_id IS NOT NULL
    AND reporter_id = auth.uid()
    AND app_is_org_member(org_id)
  )
  OR (
    org_id IS NOT NULL
    AND app_is_org_admin()
    AND app_is_org_member(org_id)
  )
);

DROP POLICY IF EXISTS jobs_update ON jobs;
CREATE POLICY jobs_update ON jobs
FOR UPDATE
USING (
  app_is_super_admin()
  OR reporter_id = auth.uid()
  OR scopist_id = auth.uid()
  OR (org_id IS NOT NULL AND app_is_org_admin() AND app_is_org_member(org_id))
)
WITH CHECK (
  app_is_super_admin()
  OR reporter_id = auth.uid()
  OR scopist_id = auth.uid()
  OR (org_id IS NOT NULL AND app_is_org_admin() AND app_is_org_member(org_id))
);

DROP POLICY IF EXISTS jobs_delete ON jobs;
CREATE POLICY jobs_delete ON jobs
FOR DELETE
USING (
  app_is_super_admin()
  OR (org_id IS NOT NULL AND app_is_org_admin() AND app_is_org_member(org_id))
);

COMMIT;
