create or replace function public.reject_certification_unlock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.certification_date is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'certified transcript cannot be reopened without an audited transition'
      using errcode = '23514';
  end if;

  if new.certification_date is distinct from old.certification_date
    or new.certification_statement is distinct from old.certification_statement
    or new.checklist is distinct from old.checklist
    or new.signature_hash is distinct from old.signature_hash
  then
    raise exception 'certified transcript cannot be reopened without an audited transition'
      using errcode = '23514';
  end if;

  new.updated_at := old.updated_at;
  return new;
end;
$$;

drop trigger if exists case_certifications_reject_unlock on public.case_certifications;

create trigger case_certifications_reject_unlock
  before update or delete on public.case_certifications
  for each row execute function public.reject_certification_unlock();

create or replace function public.preserve_certification_in_case_payload()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  locked_date date;
begin
  select certification_date
    into locked_date
    from public.case_certifications
   where case_id = old.case_id
     and certification_date is not null;

  if locked_date is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE'
    or (new.payload #>> '{certification,certification_date}') is distinct from locked_date::text
  then
    raise exception 'certified case payload cannot remove its certification lock'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists cases_preserve_certification_lock on public.cases;

create trigger cases_preserve_certification_lock
  before update or delete on public.cases
  for each row execute function public.preserve_certification_in_case_payload();

create or replace function public.reject_certified_transcript_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_transcript_id text;
  target_case_id text;
begin
  if tg_op = 'DELETE' then
    target_transcript_id := to_jsonb(old) ->> 'transcript_id';
  else
    target_transcript_id := to_jsonb(new) ->> 'transcript_id';
  end if;

  if tg_table_name = 'transcripts' then
    if tg_op = 'DELETE' then
      target_case_id := old.case_id;
    else
      target_case_id := new.case_id;
    end if;
  else
    select case_id
      into target_case_id
      from public.transcripts
     where transcript_id = target_transcript_id;
  end if;

  if exists (
    select 1
      from public.case_certifications
     where case_id = target_case_id
       and certification_date is not null
  ) then
    raise exception 'certified transcript is locked'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists transcripts_reject_certified_mutation on public.transcripts;
create trigger transcripts_reject_certified_mutation
  before update or delete on public.transcripts
  for each row execute function public.reject_certified_transcript_mutation();

drop trigger if exists transcript_speakers_reject_certified_mutation on public.transcript_speakers;
create trigger transcript_speakers_reject_certified_mutation
  before insert or update or delete on public.transcript_speakers
  for each row execute function public.reject_certified_transcript_mutation();

drop trigger if exists transcript_utterances_reject_certified_mutation on public.transcript_utterances;
create trigger transcript_utterances_reject_certified_mutation
  before insert or update or delete on public.transcript_utterances
  for each row execute function public.reject_certified_transcript_mutation();

drop trigger if exists transcript_words_reject_certified_mutation on public.transcript_words;
create trigger transcript_words_reject_certified_mutation
  before insert or update or delete on public.transcript_words
  for each row execute function public.reject_certified_transcript_mutation();

drop trigger if exists transcript_audit_log_reject_certified_mutation on public.transcript_audit_log;
create trigger transcript_audit_log_reject_certified_mutation
  before insert or update or delete on public.transcript_audit_log
  for each row execute function public.reject_certified_transcript_mutation();

drop trigger if exists transcript_review_state_reject_certified_mutation on public.transcript_review_state;
create trigger transcript_review_state_reject_certified_mutation
  before insert or update or delete on public.transcript_review_state
  for each row execute function public.reject_certified_transcript_mutation();

drop trigger if exists transcript_suggestions_reject_certified_mutation on public.transcript_suggestions;
create trigger transcript_suggestions_reject_certified_mutation
  before insert or update or delete on public.transcript_suggestions
  for each row execute function public.reject_certified_transcript_mutation();

drop trigger if exists speaker_resolution_current_reject_certified_mutation on public.speaker_resolution_current;
create trigger speaker_resolution_current_reject_certified_mutation
  before insert or update or delete on public.speaker_resolution_current
  for each row execute function public.reject_certified_transcript_mutation();
