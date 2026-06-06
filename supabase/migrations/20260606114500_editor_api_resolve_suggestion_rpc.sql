-- =============================================================================
-- editor_resolve_suggestion
-- Additive helper for atomic suggestion resolution plus optional document edit.
-- =============================================================================

create or replace function public.editor_resolve_suggestion(
  p_transcript_id text,
  p_case_id text,
  p_job_id text,
  p_suggestion_id text,
  p_action text,
  p_edited_text text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_suggestion public.transcript_suggestions%rowtype;
  v_next_text text;
begin
  select *
  into v_suggestion
  from public.transcript_suggestions
  where transcript_id = p_transcript_id
    and suggestion_id = p_suggestion_id;

  if not found then
    raise exception 'unknown suggestion';
  end if;

  if p_action = 'reject' then
    update public.transcript_suggestions
    set status = 'rejected'
    where transcript_id = p_transcript_id
      and suggestion_id = p_suggestion_id;

    return true;
  end if;

  if p_action = 'accept' then
    v_next_text := v_suggestion.suggested_text;
  elsif p_action = 'edit' then
    if p_edited_text is null or btrim(p_edited_text) = '' then
      raise exception 'edited_text is required';
    end if;
    v_next_text := p_edited_text;
  else
    raise exception 'unsupported action';
  end if;

  update public.transcript_suggestions
  set
    status = 'accepted',
    suggested_text = v_next_text
  where transcript_id = p_transcript_id
    and suggestion_id = p_suggestion_id;

  update public.transcript_words
  set
    text = v_next_text,
    working_text = case when v_next_text = raw_text then null else v_next_text end,
    edited = (v_next_text <> raw_text)
  where transcript_id = p_transcript_id
    and word_id = v_suggestion.word_id;

  insert into public.transcript_audit_log (
    transcript_id,
    change_id,
    utterance_id,
    word_id,
    old_text,
    new_text,
    source,
    suggestion_id,
    reviewer_user_id,
    case_id,
    job_id,
    actor,
    action,
    before_text,
    after_text
  )
  values (
    p_transcript_id,
    format('chg_%s_%s_%s', p_job_id, p_suggestion_id, floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
    v_suggestion.utterance_id,
    v_suggestion.word_id,
    v_suggestion.original_text,
    v_next_text,
    'suggestion',
    p_suggestion_id,
    null,
    p_case_id,
    p_job_id,
    null,
    'edit_word',
    v_suggestion.original_text,
    v_next_text
  );

  return true;
end;
$$;
