-- Temporary audit function to inspect RLS policies and table status
-- Will be dropped in a subsequent migration after audit completes

CREATE OR REPLACE FUNCTION public.audit_rls_policies()
RETURNS TABLE (
  table_name text,
  policy_name text,
  policy_cmd text,
  policy_roles text[],
  policy_qual text,
  policy_with_check text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    schemaname || '.' || tablename AS table_name,
    policyname AS policy_name,
    cmd AS policy_cmd,
    roles AS policy_roles,
    qual::text AS policy_qual,
    with_check::text AS policy_with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

CREATE OR REPLACE FUNCTION public.audit_rls_status()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    tablename::text AS table_name,
    rowsecurity AS rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
$$;
