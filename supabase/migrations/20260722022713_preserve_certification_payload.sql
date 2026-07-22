create or replace function public.preserve_certification_in_case_payload()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  locked_certification public.case_certifications%rowtype;
  incoming_certification jsonb;
begin
  select *
    into locked_certification
    from public.case_certifications
   where case_id = old.case_id
     and certification_date is not null;

  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'certified case payload cannot remove its certification lock'
      using errcode = '23514';
  end if;

  incoming_certification := new.payload -> 'certification';

  if incoming_certification is null
    or (incoming_certification ->> 'certification_date') is distinct from locked_certification.certification_date::text
    or (incoming_certification ->> 'certification_statement') is distinct from locked_certification.certification_statement
    or (incoming_certification -> 'checklist') is distinct from locked_certification.checklist
    or (incoming_certification ->> 'signature_hash') is distinct from locked_certification.signature_hash
  then
    raise exception 'certified case payload must match the immutable certification record'
      using errcode = '23514';
  end if;

  return new;
end;
$$;
