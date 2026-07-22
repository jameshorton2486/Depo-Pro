create or replace function public.save_case_with_certification(
  p_case jsonb,
  p_certification jsonb,
  p_updated_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_case_id text := p_case ->> 'case_id';
  case_already_exists boolean;
begin
  if target_case_id is null or target_case_id = '' then
    raise exception 'case_id is required' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.cases where case_id = target_case_id
  ) into case_already_exists;

  if not case_already_exists then
    insert into public.cases (
      case_id,
      proceeding_type,
      stage,
      notes,
      payload,
      updated_at
    ) values (
      target_case_id,
      coalesce(p_case ->> 'proceeding_type', ''),
      coalesce(p_case ->> 'stage', 'intake'),
      coalesce(p_case ->> 'notes', ''),
      coalesce(p_case -> 'payload', '{}'::jsonb),
      p_updated_at
    );
  end if;

  if p_certification is null or jsonb_typeof(p_certification) = 'null' then
    delete from public.case_certifications where case_id = target_case_id;
  else
    insert into public.case_certifications (
      case_id,
      certification_date,
      certification_statement,
      checklist,
      signature_hash,
      updated_at
    ) values (
      target_case_id,
      nullif(p_certification ->> 'certification_date', '')::date,
      coalesce(p_certification ->> 'certification_statement', ''),
      coalesce(p_certification -> 'checklist', '{}'::jsonb),
      p_certification ->> 'signature_hash',
      p_updated_at
    )
    on conflict (case_id) do update set
      certification_date = excluded.certification_date,
      certification_statement = excluded.certification_statement,
      checklist = excluded.checklist,
      signature_hash = excluded.signature_hash,
      updated_at = excluded.updated_at;
  end if;

  insert into public.cases (
    case_id,
    proceeding_type,
    stage,
    notes,
    payload,
    updated_at
  ) values (
    target_case_id,
    coalesce(p_case ->> 'proceeding_type', ''),
    coalesce(p_case ->> 'stage', 'intake'),
    coalesce(p_case ->> 'notes', ''),
    coalesce(p_case -> 'payload', '{}'::jsonb),
    p_updated_at
  )
  on conflict (case_id) do update set
    proceeding_type = excluded.proceeding_type,
    stage = excluded.stage,
    notes = excluded.notes,
    payload = excluded.payload,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_case_with_certification(jsonb, jsonb, timestamptz) from public;
grant execute on function public.save_case_with_certification(jsonb, jsonb, timestamptz) to authenticated;