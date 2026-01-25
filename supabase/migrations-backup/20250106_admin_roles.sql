-- =============================================================================
-- ADMIN ROLES & ELEVATED RLS
-- Applied: 2025-01-06
-- 
-- Adds admin role support with safe, additive RLS policies
-- Admins are additive, never bypass RLS
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE - Add Role Column
-- =============================================================================

-- Add role column to profiles if it doesn't exist
alter table profiles
add column if not exists role text not null default 'user'
check (role in ('user', 'admin'));

-- Create index for role lookups
create index if not exists profiles_role_idx on profiles(role);

-- =============================================================================
-- ADMIN HELPER FUNCTION
-- =============================================================================

-- Drop existing function if it exists
drop function if exists is_admin();

-- Create admin check function (stable, cacheable)
create or replace function is_admin()
returns boolean
language sql stable
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- =============================================================================
-- UPDATED RLS POLICIES - Add Admin Support
-- =============================================================================

-- =============================================================================
-- PROFILES - Admins can read all profiles
-- =============================================================================

drop policy if exists "read own profile" on profiles;
drop policy if exists "admins read all profiles" on profiles;

create policy "read own profile"
on profiles for select
using (auth.uid() = id);

create policy "admins read all profiles"
on profiles for select
using (is_admin());

-- =============================================================================
-- CASES - Admins can read all cases
-- =============================================================================

drop policy if exists "read own cases" on cases;
drop policy if exists "admins read all cases" on cases;

create policy "read own cases"
on cases for select
using (auth.uid() = owner_id);

create policy "admins read all cases"
on cases for select
using (is_admin());

-- Update policy still only allows updating own cases
drop policy if exists "update own cases" on cases;

create policy "update own cases"
on cases for update
using (auth.uid() = owner_id);

-- Admins can update any case (for support purposes)
create policy "admins update cases"
on cases for update
using (is_admin());

-- =============================================================================
-- CALENDAR_EVENTS - Admins can read all events
-- =============================================================================

drop policy if exists "read own calendar events" on calendar_events;
drop policy if exists "admins read all calendar events" on calendar_events;

create policy "read own calendar events"
on calendar_events for select
using (auth.uid() = user_id);

create policy "admins read all calendar events"
on calendar_events for select
using (is_admin());

-- =============================================================================
-- JOBS - Admins can read all jobs
-- =============================================================================

drop policy if exists "read own jobs" on jobs;
drop policy if exists "admins read all jobs" on jobs;

create policy "read own jobs"
on jobs for select
using (auth.uid() = created_by_id);

create policy "admins read all jobs"
on jobs for select
using (is_admin());

-- =============================================================================
-- AUDIT_LOGS - Admins can read all audit logs
-- =============================================================================

drop policy if exists "read own audit logs" on audit_logs;
drop policy if exists "admins read all audit logs" on audit_logs;

create policy "read own audit logs"
on audit_logs for select
using (auth.uid() = user_id);

create policy "admins read all audit logs"
on audit_logs for select
using (is_admin());

-- =============================================================================
-- GOOGLE_TOKENS - Keep user-only access (never expose tokens to admins)
-- =============================================================================

-- Google tokens remain user-only for security
-- No admin access policy added intentionally

-- =============================================================================
-- NOTES
-- =============================================================================

-- All policies follow the pattern:
-- 1. User can access their own data (original policy)
-- 2. Admin can access all data (additive policy)
-- 
-- This ensures:
-- - Admins are additive, never bypass RLS
-- - Each policy is explicit and auditable
-- - No service role needed for admin UI flows
