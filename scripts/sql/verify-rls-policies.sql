-- Depo-Pro Stream B.4
-- RLS verification and medical chronology checks.

-- 1) Full policy inventory
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 2) Public table RLS status summary
select
  t.tablename,
  t.rowsecurity as rls_enabled,
  count(p.policyname) as policy_count
from pg_tables t
left join pg_policies p
  on t.tablename = p.tablename and t.schemaname = p.schemaname
where t.schemaname = 'public'
group by t.tablename, t.rowsecurity
order by t.rowsecurity asc, t.tablename;

-- 3) Critical tables row security status
select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
and tablename in (
  'profiles', 'firms', 'jobs', 'transcriptions',
  'transcription_edits', 'transcription_chunks',
  'flagged_words', 'review_sessions', 'audit_log',
  'medical_records', 'chronology_entries',
  'calendar_events', 'exhibits'
)
order by tablename;

-- 4) Critical table policy coverage matrix by command
with critical_tables as (
  select unnest(array[
    'profiles', 'firms', 'jobs', 'transcriptions',
    'transcription_edits', 'flagged_words', 'medical_records',
    'chronology_entries', 'invoices', 'audit_log', 'audit_logs'
  ]) as tablename
),
policy_cmds as (
  select tablename, cmd, count(*) as cnt
  from pg_policies
  where schemaname = 'public'
  group by tablename, cmd
)
select
  ct.tablename,
  coalesce(max(case when pc.cmd = 'SELECT' then pc.cnt end), 0) as select_policies,
  coalesce(max(case when pc.cmd = 'INSERT' then pc.cnt end), 0) as insert_policies,
  coalesce(max(case when pc.cmd = 'UPDATE' then pc.cnt end), 0) as update_policies,
  coalesce(max(case when pc.cmd = 'DELETE' then pc.cnt end), 0) as delete_policies
from critical_tables ct
left join policy_cmds pc on pc.tablename = ct.tablename
group by ct.tablename
order by ct.tablename;

-- 5) Medical chronology tables policy checks
select * from pg_policies where tablename = 'medical_records';
select * from pg_policies where tablename = 'chronology_entries';

-- 6) Optional gap remediation (run only if missing)
-- alter table medical_records enable row level security;
-- create policy "Users access medical records through job firm"
-- on medical_records for all
-- to authenticated
-- using (
--   exists (
--     select 1 from jobs j
--     join profiles p on p.firm_id = j.firm_id
--     where j.id = medical_records.job_id
--     and p.id = auth.uid()
--   )
-- );
--
-- alter table chronology_entries enable row level security;
-- create policy "Users access chronology through job firm"
-- on chronology_entries for all
-- to authenticated
-- using (
--   exists (
--     select 1 from jobs j
--     join profiles p on p.firm_id = j.firm_id
--     where j.id = chronology_entries.job_id
--     and p.id = auth.uid()
--   )
-- );
