-- Depo-Pro Stream B.4
-- RLS verification and medical chronology checks.

-- 1) Current policies in public schema
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

-- 2) Critical tables row security status
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

-- 3) Medical chronology tables policy checks
select * from pg_policies where tablename = 'medical_records';
select * from pg_policies where tablename = 'chronology_entries';

-- 4) Optional gap remediation (run only if missing)
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
