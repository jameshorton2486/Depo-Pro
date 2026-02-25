-- B.4 RLS Policy Verification and Guardrails

-- Ensure RLS is enabled for Phase 10 medical tables
alter table if exists public.medical_records enable row level security;
alter table if exists public.chronology_entries enable row level security;

-- Add fallback policies only if none exist on table.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'medical_records'
  ) and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'medical_records'
  ) then
    execute $sql$
      create policy "Users access medical records through job firm"
      on public.medical_records
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.jobs j
          join public.profiles p on p.firm_id = j.firm_id
          where j.id = medical_records.job_id
            and p.id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.jobs j
          join public.profiles p on p.firm_id = j.firm_id
          where j.id = medical_records.job_id
            and p.id = auth.uid()
        )
      )
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'chronology_entries'
  ) and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chronology_entries'
  ) then
    execute $sql$
      create policy "Users access chronology entries through job firm"
      on public.chronology_entries
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.jobs j
          join public.profiles p on p.firm_id = j.firm_id
          where j.id = chronology_entries.job_id
            and p.id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.jobs j
          join public.profiles p on p.firm_id = j.firm_id
          where j.id = chronology_entries.job_id
            and p.id = auth.uid()
        )
      )
    $sql$;
  end if;
end
$$;

-- Guardrails: fail migration if RLS/policies still missing.
do $$
declare
  med_rls boolean := true;
  chr_rls boolean := true;
  med_policy_count int := 0;
  chr_policy_count int := 0;
begin
  if exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'medical_records'
  ) then
    select rowsecurity into med_rls
    from pg_tables where schemaname = 'public' and tablename = 'medical_records';

    select count(*) into med_policy_count
    from pg_policies
    where schemaname = 'public' and tablename = 'medical_records';
  end if;

  if exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'chronology_entries'
  ) then
    select rowsecurity into chr_rls
    from pg_tables where schemaname = 'public' and tablename = 'chronology_entries';

    select count(*) into chr_policy_count
    from pg_policies
    where schemaname = 'public' and tablename = 'chronology_entries';
  end if;

  raise notice 'B4_VERIFY medical_records => rls_enabled=%, policy_count=%', med_rls, med_policy_count;
  raise notice 'B4_VERIFY chronology_entries => rls_enabled=%, policy_count=%', chr_rls, chr_policy_count;

  if med_rls is false or chr_rls is false then
    raise exception 'B4_VERIFY failed: one or more Phase 10 tables has RLS disabled.';
  end if;

  if med_policy_count = 0 or chr_policy_count = 0 then
    raise exception 'B4_VERIFY failed: one or more Phase 10 tables has zero RLS policies.';
  end if;
end
$$;