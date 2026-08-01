create or replace function public.atomic_ingest_transcript(
  p_transcript jsonb,
  p_speakers jsonb,
  p_utterances jsonb,
  p_words jsonb,
  p_audit jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_transcript) <> 'object'
    or jsonb_typeof(p_speakers) <> 'array'
    or jsonb_typeof(p_utterances) <> 'array'
    or jsonb_typeof(p_words) <> 'array'
    or jsonb_typeof(p_audit) <> 'object' then
    raise exception 'atomic transcript ingest received invalid JSON payloads';
  end if;

  if exists (
    select 1 from public.transcripts
    where transcript_id = p_transcript ->> 'transcript_id'
      and job_id = p_transcript ->> 'job_id'
  ) then
    return;
  end if;

  insert into public.transcripts (
    transcript_id, case_id, job_id, media_url, duration, based_on,
    deepgram_request_id, session_id, source_filename, media_kind, status,
    engine, transcription_source, sequence_index, duration_seconds, word_count,
    utterance_count, speaker_count, avg_confidence, raw_storage_path,
    raw_checksum, last_error, speaker_map_confirmed, owner_user_id
  )
  select
    x.transcript_id, x.case_id, x.job_id, x.media_url, x.duration, x.based_on,
    x.deepgram_request_id, x.session_id, x.source_filename, x.media_kind, x.status,
    x.engine, x.transcription_source, x.sequence_index, x.duration_seconds, x.word_count,
    x.utterance_count, x.speaker_count, x.avg_confidence, x.raw_storage_path,
    x.raw_checksum, x.last_error, x.speaker_map_confirmed, x.owner_user_id
  from jsonb_to_record(p_transcript) as x(
    transcript_id text, case_id text, job_id text, media_url text, duration double precision,
    based_on text, deepgram_request_id text, session_id text, source_filename text,
    media_kind text, status text, engine text, transcription_source text,
    sequence_index integer, duration_seconds double precision, word_count integer,
    utterance_count integer, speaker_count integer, avg_confidence numeric,
    raw_storage_path text, raw_checksum text, last_error text,
    speaker_map_confirmed boolean, owner_user_id uuid
  );

  insert into public.transcript_speakers (
    transcript_id, speaker_id, display_name, deepgram_speaker, role, job_id,
    speaker_index, speaker_label, assigned_name, speaker_role, word_count, owner_user_id
  )
  select transcript_id, speaker_id, display_name, deepgram_speaker, role, job_id,
    speaker_index, speaker_label, assigned_name, speaker_role, word_count, owner_user_id
  from jsonb_to_recordset(p_speakers) as x(
    transcript_id text, speaker_id text, display_name text, deepgram_speaker integer,
    role text, job_id text, speaker_index integer, speaker_label text,
    assigned_name text, speaker_role text, word_count integer, owner_user_id uuid
  );

  insert into public.transcript_utterances (
    transcript_id, utterance_id, speaker_id, start_time, end_time, ordinal,
    job_id, utterance_index, speaker_index, speaker_label, text,
    avg_confidence, owner_user_id
  )
  select transcript_id, utterance_id, speaker_id, start_time, end_time, ordinal,
    job_id, utterance_index, speaker_index, speaker_label, text,
    avg_confidence, owner_user_id
  from jsonb_to_recordset(p_utterances) as x(
    transcript_id text, utterance_id text, speaker_id text, start_time double precision,
    end_time double precision, ordinal integer, job_id text, utterance_index integer,
    speaker_index integer, speaker_label text, text text, avg_confidence numeric,
    owner_user_id uuid
  );

  insert into public.transcript_words (
    transcript_id, utterance_id, word_id, speaker_id, ordinal, text, raw_text,
    start_time, end_time, confidence, reviewed, edited, job_id, word_index,
    working_text, speaker_index, is_filler, removed, owner_user_id
  )
  select transcript_id, utterance_id, word_id, speaker_id, ordinal, text, raw_text,
    start_time, end_time, confidence, reviewed, edited, job_id, word_index,
    working_text, speaker_index, is_filler, removed, owner_user_id
  from jsonb_to_recordset(p_words) as x(
    transcript_id text, utterance_id text, word_id text, speaker_id text,
    ordinal integer, text text, raw_text text, start_time double precision,
    end_time double precision, confidence numeric, reviewed boolean, edited boolean,
    job_id text, word_index integer, working_text text, speaker_index integer,
    is_filler boolean, removed boolean, owner_user_id uuid
  );

  insert into public.transcript_audit_log (
    transcript_id, change_id, utterance_id, word_id, old_text, new_text, source,
    suggestion_id, reviewer_user_id, case_id, job_id, actor, action,
    before_text, after_text, owner_user_id
  )
  select transcript_id, change_id, utterance_id, word_id, old_text, new_text, source,
    suggestion_id, reviewer_user_id, case_id, job_id, actor, action,
    before_text, after_text, owner_user_id
  from jsonb_to_record(p_audit) as x(
    transcript_id text, change_id text, utterance_id text, word_id text,
    old_text text, new_text text, source text, suggestion_id text,
    reviewer_user_id uuid, case_id text, job_id text, actor uuid, action text,
    before_text text, after_text text, owner_user_id uuid
  )
  on conflict (change_id) do nothing;
end;
$$;

revoke all on function public.atomic_ingest_transcript(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.atomic_ingest_transcript(jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;
