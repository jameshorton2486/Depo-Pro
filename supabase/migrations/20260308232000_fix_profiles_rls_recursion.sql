-- Fix infinite recursion in profiles RLS policies
-- ============================================================================
-- PROBLEM:
--   profiles_select and profiles_update both query the profiles table
--   inside their USING clause, which triggers the same RLS policies again
--   → infinite recursion (error 42P17)
--
-- SOLUTION:
--   Create SECURITY DEFINER helper functions that bypass RLS to look up
--   the current user's firm_id and admin status. Then rewrite the policies
--   to call these functions instead of self-referencing subqueries.
--
-- ALSO FIXES:
--   firms_select and firms_update reference profiles, which triggers the
--   recursive profiles policies. After this fix, those will work too.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: get the current user's firm_id without triggering profiles RLS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: check if current user is ADMIN in a specific firm
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_firm_admin(target_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'ADMIN'
      AND firm_id = target_firm_id
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: profiles_select — no more self-referencing subquery
-- "User can SELECT their own row, or any row in their firm"
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select ON profiles;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR firm_id = get_my_firm_id()
);

COMMENT ON POLICY profiles_select ON profiles IS
'User can read own profile or any profile in their firm.
Uses get_my_firm_id() SECURITY DEFINER function to avoid infinite recursion.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: profiles_update — no more self-referencing subquery
-- "User can UPDATE their own row. Admin can UPDATE any row in their firm."
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR is_firm_admin(firm_id)
);

COMMENT ON POLICY profiles_update ON profiles IS
'User can update own profile. Admin can update profiles in same firm.
Uses is_firm_admin() SECURITY DEFINER function to avoid infinite recursion.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: firms_select — references profiles, which was recursive
-- Rewrite to use get_my_firm_id() instead
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS firms_select ON firms;

CREATE POLICY firms_select ON firms FOR SELECT USING (
  id = get_my_firm_id()
);

COMMENT ON POLICY firms_select ON firms IS
'User can read their own firm.
Uses get_my_firm_id() SECURITY DEFINER function to avoid profiles recursion.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: firms_update — references profiles, which was recursive
-- Rewrite to use is_firm_admin() instead
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS firms_update ON firms;

CREATE POLICY firms_update ON firms FOR UPDATE USING (
  is_firm_admin(id)
);

COMMENT ON POLICY firms_update ON firms IS
'Admin can update their own firm.
Uses is_firm_admin() SECURITY DEFINER function to avoid profiles recursion.';
