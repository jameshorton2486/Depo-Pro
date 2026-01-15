-- =============================================================================
-- RLS OPTIMIZATION - SCALAR SUBQUERY PATTERN
-- Applied: 2026-01-10
-- 
-- Optimizes RLS policies by replacing direct auth.uid() calls with
-- scalar subqueries (SELECT auth.uid()) for better query plan caching.
-- 
-- Performance Impact:
-- - Reduces per-row evaluation overhead
-- - Enables PostgreSQL to cache execution plans more efficiently
-- - Maintains identical security behavior
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE - Optimized RLS Policies
-- =============================================================================

-- Ensure RLS is enabled
alter table profiles enable row level security;

-- Drop existing policies (will be recreated with optimizations)
drop policy if exists "read own profile" on profiles;
drop policy if exists "admins read all profiles" on profiles;
drop policy if exists "update own profile" on profiles;

-- SELECT: Users can read only their own profile
-- Optimized: Uses scalar subquery (SELECT auth.uid()) instead of direct auth.uid()
create policy "read own profile"
on profiles for select
to public
using ((select auth.uid()) = id);

-- SELECT: Admins can read all profiles
-- Note: is_admin() function already uses optimized pattern internally
create policy "admins read all profiles"
on profiles for select
to public
using (is_admin());

-- UPDATE: Users can update only their own profile
-- WITH CHECK: Prevents ownership change (id cannot be modified to a different value)
-- Optimized: Uses scalar subquery for both USING and WITH CHECK
create policy "update own profile"
on profiles for update
to public
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- =============================================================================
-- CASES TABLE - Optimized RLS Policies
-- =============================================================================

alter table cases enable row level security;

drop policy if exists "read own cases" on cases;
drop policy if exists "admins read all cases" on cases;
drop policy if exists "create own cases" on cases;
drop policy if exists "update own cases" on cases;
drop policy if exists "admins update cases" on cases;

create policy "read own cases"
on cases for select
to public
using ((select auth.uid()) = owner_id);

create policy "admins read all cases"
on cases for select
to public
using (is_admin());

create policy "create own cases"
on cases for insert
to public
with check ((select auth.uid()) = owner_id);

create policy "update own cases"
on cases for update
to public
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "admins update cases"
on cases for update
to public
using (is_admin())
with check (is_admin());

-- =============================================================================
-- CALENDAR_EVENTS TABLE - Optimized RLS Policies
-- =============================================================================

alter table calendar_events enable row level security;

drop policy if exists "read own calendar events" on calendar_events;
drop policy if exists "admins read all calendar events" on calendar_events;
drop policy if exists "write own calendar events" on calendar_events;
drop policy if exists "update own calendar events" on calendar_events;

create policy "read own calendar events"
on calendar_events for select
to public
using ((select auth.uid()) = user_id);

create policy "admins read all calendar events"
on calendar_events for select
to public
using (is_admin());

create policy "write own calendar events"
on calendar_events for insert
to public
with check ((select auth.uid()) = user_id);

create policy "update own calendar events"
on calendar_events for update
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- =============================================================================
-- JOBS TABLE - Optimized RLS Policies
-- =============================================================================

alter table jobs enable row level security;

drop policy if exists "read own jobs" on jobs;
drop policy if exists "admins read all jobs" on jobs;
drop policy if exists "create own jobs" on jobs;

create policy "read own jobs"
on jobs for select
to public
using ((select auth.uid()) = created_by_id);

create policy "admins read all jobs"
on jobs for select
to public
using (is_admin());

create policy "create own jobs"
on jobs for insert
to public
with check ((select auth.uid()) = created_by_id);

-- =============================================================================
-- AUDIT_LOGS TABLE - Optimized RLS Policies
-- =============================================================================

alter table audit_logs enable row level security;

drop policy if exists "read own audit logs" on audit_logs;
drop policy if exists "admins read all audit logs" on audit_logs;

create policy "read own audit logs"
on audit_logs for select
to public
using ((select auth.uid()) = user_id);

create policy "admins read all audit logs"
on audit_logs for select
to public
using (is_admin());

-- =============================================================================
-- GOOGLE_TOKENS TABLE - Optimized RLS Policies
-- =============================================================================

alter table google_tokens enable row level security;

drop policy if exists "read own google tokens" on google_tokens;
drop policy if exists "write own google tokens" on google_tokens;
drop policy if exists "update own google tokens" on google_tokens;

create policy "read own google tokens"
on google_tokens for select
to public
using ((select auth.uid()) = user_id);

create policy "write own google tokens"
on google_tokens for insert
to public
with check ((select auth.uid()) = user_id);

create policy "update own google tokens"
on google_tokens for update
to public
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- =============================================================================
-- NOTES
-- =============================================================================
-- 
-- All policies now use the scalar subquery pattern: (SELECT auth.uid())
-- This optimization:
-- 1. Allows PostgreSQL to cache the auth.uid() result per query
-- 2. Reduces per-row evaluation overhead
-- 3. Maintains identical security behavior
-- 
-- UPDATE policies include WITH CHECK clauses to prevent:
-- - Ownership changes (id, owner_id, user_id, created_by_id)
-- - Privilege escalation attempts
-- 
-- All policies are idempotent and safe to run multiple times.
