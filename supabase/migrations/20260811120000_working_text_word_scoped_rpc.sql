-- =============================================================================
-- editor_apply_working_word_changes  (DOC-0325 Decision A)
--
-- Word-scoped Working Transcript text save. The existing
-- editor_apply_working_changes locates words by utterance_id, which BREAKS for
-- DERIVED structural units (u1::q, u1::a, u1::obj): those ids exist only in the
-- derived Working Transcript, never in transcript_utterances. The underlying
-- transcript_words rows keep their stable word_id, so this RPC persists the edit
-- by an EXPLICIT ordered word_id list instead of a utterance lookup.
--
-- Overlay-only: writes transcript_words.working_text (keyed by word_id), the same
-- overlay the existing save uses. It NEVER touches raw_text, timestamps, provider
-- confidence, or transcript_utterances — raw/provider evidence stays immutable and
-- no fabricated utterance row is created for a derived unit.
--
-- security invoker: owner scoping is enforced by the transcript_words RLS policies
-- (a caller can only read/update rows they own), and every change is additionally
-- constrained to p_transcript_id. Word ids outside the transcript are ignored
-- (fail-safe), never fabricated.
--
-- Additive + reversible + UNAPPLIED (BETA_FREEZE): no existing object is altered.
-- =============================================================================

create or replace function public.editor_apply_working_word_changes(
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
  v_working_text text;
  v_req_word_ids text[];
  v_word_ids text[];
  v_existing_texts text[];
  v_tokens text[];
  v_next_text text;
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
    v_working_text := coalesce(v_change ->> 'working_text', '');

    -- Requested word ids, in the client's reading order.
    if jsonb_typeof(v_change -> 'word_ids') <> 'array' then
      continue;
    end if;
    select array_agg(value::text)
    into v_req_word_ids
    from jsonb_array_elements_text(v_change -> 'word_ids') as value;

    if v_req_word_ids is null or array_length(v_req_word_ids, 1) is null then
      continue;
    end if;

    -- Resolve ONLY words that belong to this transcript (fail-safe: ids from
    -- another job / unknown ids are dropped). Order canonically by word_index so
    -- distribution is deterministic and matches the derived unit's reading order.
    select
      array_agg(word_id order by coalesce(word_index, ordinal)),
      array_agg(coalesce(working_text, text) order by coalesce(word_index, ordinal))
    into
      v_word_ids,
      v_existing_texts
    from public.transcript_words
    where transcript_id = p_transcript_id
      and word_id = any(v_req_word_ids)
      and coalesce(removed, false) = false;

    if v_word_ids is null or array_length(v_word_ids, 1) is null then
      continue;
    end if;

    if btrim(v_working_text) = '' then
      v_tokens := array[''];
    else
      v_tokens := regexp_split_to_array(btrim(v_working_text), '\s+');
    end if;

    -- Distribute tokens across the words: one token per word, the LAST word takes
    -- any remainder. Identical semantics to editor_apply_working_changes, scoped
    -- to the explicit word set. raw_text is preserved; working_text is nulled when
    -- the token equals raw_text so the overlay only stores genuine edits.
    for v_idx in 1..array_length(v_word_ids, 1) loop
      v_word_id := v_word_ids[v_idx];

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

    -- Audit: record the word-scoped save. No utterance_id (the edited unit is a
    -- derived structural unit, not a provider utterance).
    insert into public.transcript_audit_log (
      transcript_id, change_id, utterance_id, word_id,
      old_text, new_text, source, suggestion_id,
      reviewer_user_id, case_id, job_id, actor, action, before_text, after_text
    )
    values (
      p_transcript_id,
      format('chg_%s_words_%s', p_job_id, floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
      null, null,
      array_to_string(v_existing_texts, ' '),
      v_working_text,
      'editor', null, null, p_case_id, p_job_id, null,
      'bulk_save_words',
      array_to_string(v_existing_texts, ' '),
      v_working_text
    );

    v_saved_count := v_saved_count + 1;
  end loop;

  return v_saved_count;
end;
$$;
