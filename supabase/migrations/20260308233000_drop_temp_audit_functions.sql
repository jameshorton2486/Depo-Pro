-- Clean up temporary audit functions (no longer needed)
DROP FUNCTION IF EXISTS public.audit_rls_policies();
DROP FUNCTION IF EXISTS public.audit_rls_status();
