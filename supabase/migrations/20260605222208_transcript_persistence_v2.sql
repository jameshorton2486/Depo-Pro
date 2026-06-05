-- =============================================================================
-- DEPO-PRO Transcript Persistence v2 (Prompt 5, Task 1)
-- Extends the existing transcript schema toward durable transcript jobs,
-- canonical utterance/word persistence, immutable raw packets, and append-only
-- edit auditing.
--
-- Runtime-schema-wins note:
--   The core schema already created transcripts / transcript_words /
--   transcript_utterances / transcript_speakers / transcript_audit_log.
--   This migration extends those tables in place instead of creating a second
--   job-layer table. Prompt 7 will tighten RLS; policies here intentionally
--   stay aligned with the permissive authenticated pattern already in use.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- transcripts -> transcript job layer
-- ---------------------------------------------------------------------------
alter table public.transcripts
  add column if not exists session_id text,
  add column if not exists source_filename text,
  add column if not exists media_kind text not null default 'audio',
  add column if not exists status text not null default 'queued',
  add column if not exists engine text,
  add column if not exists transcription_source text not null default 'deepgram',
  add column if not exists sequence_index integer not null default 0,
  add column if not exists duration_seconds double precision,
  add column if not exists word_count integer not null default 0,
  add column if not exists utterance_count integer not null default 0,
  add column if not exists speaker_count integer not null default 0,
  add column if not exists avg_confidence numeric(5,4),
  add column if not exists raw_storage_path text,
  add column if not exists raw_checksum text,
  add column if not exists last_error text,
  add column if not exists speaker_map_confirmed boolean not null default false;

update public.transcripts
set duration_seconds = coalesce(duration_seconds, duration)
where duration_seconds is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transcripts_media_kind_check'
      and conrelid = 'public.transcripts'::regclass
  ) then
    alter table public.transcripts
      add constraint transcripts_media_kind_check
      check (media_kind in ('audio', 'video'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'transcripts_status_check'
      and conrelid = 'public.transcripts'::regclass
  ) then
    alter table public.transcripts
      add constraint transcripts_status_check
      check (status in ('queued', 'preprocessing', 'transcribing', 'assembling', 'completed', 'failed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'transcripts_transcription_source_check'
      and conrelid = 'public.transcripts'::regclass
  ) then
    alter table public.transcripts
      add constraint transcripts_transcription_source_check
      check (transcription_source in ('deepgram', 'offline-fixture'));
  end if;
end
$$;

create unique index if not exists transcripts_job_id_unique_idx
  on public.transcripts (job_id);
create index if not exists transcripts_status_idx
  on public.transcripts (status, updated_at desc);

-- ---------------------------------------------------------------------------
-- transcript_speakers
-- ---------------------------------------------------------------------------
alter table public.transcript_speakers
  add column if not exists job_id text,
  add column if not exists speaker_index integer,
  add column if not exists speaker_label text,
  add column if not exists assigned_name text,
  add column if not exists speaker_role text,
  add column if not exists word_count integer not null default 0;

update public.transcript_speakers speakers
set
  job_id = transcripts.job_id,
  speaker_index = coalesce(speakers.speaker_index, speakers.deepgram_speaker),
  speaker_label = coalesce(nullif(speakers.speaker_label, ''), nullif(speakers.display_name, '')),
  speaker_role = coalesce(nullif(speakers.speaker_role, ''), nullif(speakers.role, ''))
from public.transcripts transcripts
where transcripts.transcript_id = speakers.transcript_id
  and (
    speakers.job_id is null
    or speakers.speaker_index is null
    or speakers.speaker_label is null
    or speakers.speaker_role is null
  );

create index if not exists transcript_speakers_job_idx
  on public.transcript_speakers (job_id, speaker_index);

-- ---------------------------------------------------------------------------
-- transcript_utterances
-- ---------------------------------------------------------------------------
alter table public.transcript_utterances
  add column if not exists job_id text,
  add column if not exists utterance_index integer,
  add column if not exists speaker_index integer,
  add column if not exists speaker_label text,
  add column if not exists text text,
  add column if not exists avg_confidence numeric(5,4);

update public.transcript_utterances utterances
set
  job_id = transcripts.job_id,
  utterance_index = coalesce(utterances.utterance_index, utterances.ordinal),
  speaker_index = coalesce(
    utterances.speaker_index,
    (
      select speaker.deepgram_speaker
      from public.transcript_speakers speaker
      where speaker.transcript_id = utterances.transcript_id
        and speaker.speaker_id = utterances.speaker_id
      limit 1
    )
  ),
  speaker_label = coalesce(
    nullif(utterances.speaker_label, ''),
    (
      select nullif(speaker.speaker_label, '')
      from public.transcript_speakers speaker
      where speaker.transcript_id = utterances.transcript_id
        and speaker.speaker_id = utterances.speaker_id
      limit 1
    ),
    (
      select nullif(speaker.display_name, '')
      from public.transcript_speakers speaker
      where speaker.transcript_id = utterances.transcript_id
        and speaker.speaker_id = utterances.speaker_id
      limit 1
    )
  )
from public.transcripts transcripts
where transcripts.transcript_id = utterances.transcript_id
  and (
    utterances.job_id is null
    or utterances.utterance_index is null
    or utterances.speaker_index is null
    or utterances.speaker_label is null
  );

create index if not exists transcript_utterances_job_order_idx
  on public.transcript_utterances (job_id, utterance_index);

-- ---------------------------------------------------------------------------
-- transcript_words
-- ---------------------------------------------------------------------------
alter table public.transcript_words
  add column if not exists job_id text,
  add column if not exists word_index integer,
  add column if not exists working_text text,
  add column if not exists speaker_index integer,
  add column if not exists is_filler boolean not null default false,
  add column if not exists removed boolean not null default false;

update public.transcript_words words
set
  job_id = transcripts.job_id,
  word_index = coalesce(words.word_index, words.ordinal),
  speaker_index = coalesce(
    words.speaker_index,
    (
      select speaker.deepgram_speaker
      from public.transcript_speakers speaker
      where speaker.transcript_id = words.transcript_id
        and speaker.speaker_id = words.speaker_id
      limit 1
    )
  )
from public.transcripts transcripts
where transcripts.transcript_id = words.transcript_id
  and (
    words.job_id is null
    or words.word_index is null
    or words.speaker_index is null
  );

create index if not exists transcript_words_job_word_idx
  on public.transcript_words (job_id, word_index);
create index if not exists transcript_words_job_utterance_idx
  on public.transcript_words (job_id, utterance_id, word_index);
create index if not exists transcript_words_job_review_idx
  on public.transcript_words (job_id, reviewed);

-- ---------------------------------------------------------------------------
-- transcript_audit_log
-- ---------------------------------------------------------------------------
alter table public.transcript_audit_log
  alter column old_text drop not null,
  alter column new_text drop not null,
  alter column utterance_id drop not null;

alter table public.transcript_audit_log
  add column if not exists case_id text,
  add column if not exists job_id text,
  add column if not exists actor uuid,
  add column if not exists action text not null default 'edit_word',
  add column if not exists before_text text,
  add column if not exists after_text text;

update public.transcript_audit_log audit
set
  case_id = transcripts.case_id,
  job_id = transcripts.job_id,
  before_text = coalesce(audit.before_text, audit.old_text),
  after_text = coalesce(audit.after_text, audit.new_text)
from public.transcripts transcripts
where transcripts.transcript_id = audit.transcript_id
  and (
    audit.case_id is null
    or audit.job_id is null
    or audit.before_text is null
    or audit.after_text is null
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transcript_audit_log_action_check'
      and conrelid = 'public.transcript_audit_log'::regclass
  ) then
    alter table public.transcript_audit_log
      add constraint transcript_audit_log_action_check
      check (
        action in (
          'edit_word',
          'mark_reviewed',
          'assign_speaker',
          'bulk_save',
          'ingest'
        )
      );
  end if;
end
$$;

create index if not exists transcript_audit_log_job_idx
  on public.transcript_audit_log (job_id, created_at desc);
