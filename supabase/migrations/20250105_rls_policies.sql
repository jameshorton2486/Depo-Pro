-- =============================================================================
-- RLS POLICIES FOR DEPO-PRO
-- Applied: 2025-01-05
-- 
-- These policies assume:
-- - auth.uid() is the source of truth
-- - No cross-user access (users only see their own data)
-- - Admin access will be added later (explicitly)
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

alter table profiles enable row level security;

-- Drop existing policies if any
drop policy if exists "read own profile" on profiles;
drop policy if exists "update own profile" on profiles;

create policy "read own profile"
on profiles for select
using (auth.uid() = id);

create policy "update own profile"
on profiles for update
using (auth.uid() = id);

-- =============================================================================
-- CASES TABLE
-- =============================================================================

alter table cases enable row level security;

-- Drop existing policies if any
drop policy if exists "read own cases" on cases;
drop policy if exists "create own cases" on cases;
drop policy if exists "update own cases" on cases;

create policy "read own cases"
on cases for select
using (auth.uid() = owner_id);

create policy "create own cases"
on cases for insert
with check (auth.uid() = owner_id);

create policy "update own cases"
on cases for update
using (auth.uid() = owner_id);

-- =============================================================================
-- CALENDAR_EVENTS TABLE
-- =============================================================================

alter table calendar_events enable row level security;

-- Drop existing policies if any
drop policy if exists "read own calendar events" on calendar_events;
drop policy if exists "write own calendar events" on calendar_events;
drop policy if exists "update own calendar events" on calendar_events;

create policy "read own calendar events"
on calendar_events for select
using (auth.uid() = user_id);

create policy "write own calendar events"
on calendar_events for insert
with check (auth.uid() = user_id);

create policy "update own calendar events"
on calendar_events for update
using (auth.uid() = user_id);

-- =============================================================================
-- JOBS TABLE
-- =============================================================================

alter table jobs enable row level security;

-- Drop existing policies if any
drop policy if exists "read own jobs" on jobs;
drop policy if exists "create own jobs" on jobs;

create policy "read own jobs"
on jobs for select
using (auth.uid() = created_by_id);

create policy "create own jobs"
on jobs for insert
with check (auth.uid() = created_by_id);

-- =============================================================================
-- AUDIT_LOGS TABLE
-- =============================================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists audit_logs_user_id_idx on audit_logs(user_id);
create index if not exists audit_logs_action_idx on audit_logs(action);
create index if not exists audit_logs_created_at_idx on audit_logs(created_at);

-- RLS for audit logs - users can read their own logs, admins can read all (added later)
alter table audit_logs enable row level security;

drop policy if exists "read own audit logs" on audit_logs;

create policy "read own audit logs"
on audit_logs for select
using (auth.uid() = user_id);

-- =============================================================================
-- GOOGLE_TOKENS TABLE
-- =============================================================================

create table if not exists google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Google tokens - users can only access their own tokens
alter table google_tokens enable row level security;

drop policy if exists "read own google tokens" on google_tokens;
drop policy if exists "write own google tokens" on google_tokens;
drop policy if exists "update own google tokens" on google_tokens;

create policy "read own google tokens"
on google_tokens for select
using (auth.uid() = user_id);

create policy "write own google tokens"
on google_tokens for insert
with check (auth.uid() = user_id);

create policy "update own google tokens"
on google_tokens for update
using (auth.uid() = user_id);
