-- =============================================================================
-- INCIDENT RESPONSE & MONITORING
-- Applied: 2025-01-06
-- 
-- Track and respond to:
-- - Auth failures
-- - RLS violations
-- - AI errors
-- - External API outages
-- =============================================================================

-- =============================================================================
-- INCIDENTS TABLE
-- =============================================================================

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  category text not null check (category in ('auth', 'rls', 'ai', 'api', 'system', 'other')),
  message text not null,
  metadata jsonb,
  resolved boolean default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists incidents_severity_idx on incidents(severity);
create index if not exists incidents_category_idx on incidents(category);
create index if not exists incidents_resolved_idx on incidents(resolved);
create index if not exists incidents_created_at_idx on incidents(created_at);

-- =============================================================================
-- RLS POLICIES FOR INCIDENTS
-- =============================================================================

alter table incidents enable row level security;

-- Only admins can read incidents
drop policy if exists "admins read all incidents" on incidents;

create policy "admins read all incidents"
on incidents for select
using (is_admin());

-- Only admins can create incidents (system-generated)
-- Note: In practice, incidents are created by application code
-- This policy ensures only admin/system can create incidents

-- Only admins can update incidents (to mark as resolved)
drop policy if exists "admins update incidents" on incidents;

create policy "admins update incidents"
on incidents for update
using (is_admin());

-- =============================================================================
-- INCIDENT METRICS VIEW
-- =============================================================================

create or replace view admin_incident_metrics as
select
  date_trunc('day', created_at) as day,
  severity,
  category,
  count(*) as incident_count,
  count(*) filter (where resolved = true) as resolved_count,
  count(*) filter (where resolved = false) as unresolved_count
from incidents
group by day, severity, category
order by day desc;

-- =============================================================================
-- NOTES
-- =============================================================================

-- Incidents help:
-- - Track auth failures
-- - Monitor RLS violations
-- - Detect AI errors
-- - Track external API outages
-- - Enable incident response workflows
