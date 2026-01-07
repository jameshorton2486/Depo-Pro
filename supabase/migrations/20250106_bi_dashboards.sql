-- =============================================================================
-- BI DASHBOARD VIEWS (Admin-Only, Read-Only)
-- Applied: 2025-01-06
-- 
-- Analytics views for admin dashboards
-- All metrics are read-only and admin-only
-- =============================================================================

-- =============================================================================
-- CASE METRICS
-- =============================================================================

create or replace view admin_case_metrics as
select
  date_trunc('day', created_at) as day,
  firm_id,
  count(*) as cases_created
from cases
group by day, firm_id
order by day desc;

-- =============================================================================
-- CALENDAR EVENT METRICS
-- =============================================================================

create or replace view admin_calendar_metrics as
select
  date_trunc('day', created_at) as day,
  firm_id,
  count(*) as events_created
from calendar_events
group by day, firm_id
order by day desc;

-- =============================================================================
-- TRANSCRIPT REVISION METRICS
-- =============================================================================

create or replace view admin_transcript_revision_metrics as
select
  date_trunc('day', created_at) as day,
  source,
  count(*) as revisions_created,
  count(*) filter (where applied = true) as revisions_applied
from transcript_revisions
group by day, source
order by day desc;

-- =============================================================================
-- AI vs HUMAN EDIT METRICS
-- =============================================================================

create or replace view admin_ai_metrics as
select
  date_trunc('day', created_at) as day,
  source,
  count(*) as total_revisions,
  count(*) filter (where applied = true) as applied_revisions,
  count(*) filter (where source = 'ai') as ai_revisions,
  count(*) filter (where source = 'user') as user_revisions
from transcript_revisions
group by day, source
order by day desc;

-- =============================================================================
-- ACCESS VIOLATION METRICS
-- =============================================================================

create or replace view admin_access_violation_metrics as
select
  date_trunc('day', created_at) as day,
  action,
  count(*) as violation_count
from audit_logs
where action in ('ACCESS_DENIED', 'UNAUTHORIZED_ACCESS', 'FORBIDDEN')
group by day, action
order by day desc;

-- =============================================================================
-- FIRM ACTIVITY METRICS
-- =============================================================================

create or replace view admin_firm_activity_metrics as
select
  f.id as firm_id,
  f.name as firm_name,
  count(distinct c.id) as total_cases,
  count(distinct j.id) as total_jobs,
  count(distinct ce.id) as total_events,
  count(distinct t.id) as total_transcripts,
  max(c.created_at) as last_case_created,
  max(j.created_at) as last_job_created
from firms f
left join cases c on c.firm_id = f.id
left join jobs j on j.firm_id = f.id
left join calendar_events ce on ce.firm_id = f.id
left join transcripts t on t.firm_id = f.id
group by f.id, f.name
order by total_cases desc;

-- =============================================================================
-- SECURITY METRICS
-- =============================================================================

create or replace view admin_security_metrics as
select
  date_trunc('day', created_at) as day,
  action,
  count(*) as event_count
from audit_logs
where action in (
  'LOGIN',
  'LOGIN_FAILED',
  'ACCESS_DENIED',
  'UNAUTHORIZED_ACCESS',
  'FORBIDDEN',
  'SUSPICIOUS_ACTIVITY'
)
group by day, action
order by day desc;

-- =============================================================================
-- NOTES
-- =============================================================================

-- All views are read-only (no updates allowed)
-- Access controlled by RLS policies on underlying tables
-- Admin-only access enforced by application layer
