-- =============================================================================
-- editor_apply_working_changes
-- Additive helper for the editor Edge Function. Applies working-text updates
-- and matching append-only audit rows in one security-invoker RPC.
-- =============================================================================

create or replace function public.editor_apply_working_changes(
  p_transcript_id text,
  p_case_id text,
  p_job_id text,
  p_changes jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_change jsonb;
  v_utterance_id text;
  v_working_text text;
  v_tokens text[];
  v_word_ids text[];
  v_existing_texts text[];
  v_next_text text;
  v_old_text text;
  v_saved_count integer := 0;
  v_word_id text;
  v_idx integer;
begin
  if jsonb_typeof(p_changes) <> 'array' then
    raise exception 'changes must be a JSON array';
  end if;

  for v_change in
    select value
    from jsonb_array_elements(p_changes)
  loop
    v_utterance_id := v_change ->> 'utterance_id';
    v_working_text := coalesce(v_change ->> 'working_text', '');

    if v_utterance_id is null or v_utterance_id = '' then
      continue;
    end if;

    select
      array_agg(word_id order by coalesce(word_index, ordinal)),
      array_agg(coalesce(working_text, text) order by coalesce(word_index, ordinal))
    into
      v_word_ids,
      v_existing_texts
    from public.transcript_words
    where transcript_id = p_transcript_id
      and utterance_id = v_utterance_id
      and coalesce(removed, false) = false;

    if v_word_ids is null or array_length(v_word_ids, 1) is null then
      continue;
    end if;

    if btrim(v_working_text) = '' then
      v_tokens := array[''];
    else
      v_tokens := regexp_split_to_array(btrim(v_working_text), '\s+');
    end if;

    for v_idx in 1..array_length(v_word_ids, 1) loop
      v_word_id := v_word_ids[v_idx];
      v_old_text := v_existing_texts[v_idx];

      if v_idx < array_length(v_word_ids, 1) then
        v_next_text := coalesce(v_tokens[v_idx], '');
      else
        v_next_text := array_to_string(v_tokens[v_idx:array_length(v_tokens, 1)], ' ');
      end if;

      update public.transcript_words
      set
        text = v_next_text,
        working_text = case when v_next_text = raw_text then null else v_next_text end,
        edited = (v_next_text <> raw_text)
      where transcript_id = p_transcript_id
        and word_id = v_word_id
        and coalesce(working_text, text) is distinct from v_next_text;
    end loop;

    update public.transcript_utterances
    set text = v_working_text
    where transcript_id = p_transcript_id
      and utterance_id = v_utterance_id;

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
      format('chg_%s_%s_%s', p_job_id, v_utterance_id, floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
      v_utterance_id,
      null,
      array_to_string(v_existing_texts, ' '),
      v_working_text,
      'editor',
      null,
      null,
      p_case_id,
      p_job_id,
      null,
      'bulk_save',
      array_to_string(v_existing_texts, ' '),
      v_working_text
    );

    v_saved_count := v_saved_count + 1;
  end loop;

  return v_saved_count;
end;
$$;
