-- =============================================================================
-- DEPO-PRO Core Schema Migration (Step 2 of migration plan)
-- Creates: cases, case_audio, transcripts, transcript_speakers,
--          transcript_utterances, transcript_words, transcript_audit_log,
--          transcript_review_state, transcript_suggestions, case_exhibits,
--          case_certifications, exports
--
-- Design notes:
--  * Every table uses a server-generated uuid `id` (gen_random_uuid()).
--    Client code must NEVER send `id` on insert (see 22P02 incident).
--  * Business keys (case_id, transcript_id, word_id, utterance_id,
--    speaker_id, etc.) are TEXT columns preserved exactly as the app
--    generates them, per the audit's stable-ID recommendation.
--  * raw_text immutability is enforced by trigger.
--  * transcript_audit_log is append-only (no UPDATE/DELETE policies).
--  * RLS: authenticated-user policies, matching the existing contacts /
--    field_provenance pattern. TODO(real-auth): when email/password auth
--    replaces the anonymous bootstrap, add owner_user_id uuid not null
--    default auth.uid() to each table and scope policies to it.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger function (idempotent)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------------
create table cases (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique,
  version text not null default '1.0',
  proceeding_type text not null default '',
  stage text not null default 'intake',
  notes text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_stage_idx on cases (stage);
create index cases_updated_idx on cases (updated_at desc);

create trigger cases_set_updated_at
  before update on cases
  for each row execute function set_updated_at();

alter table cases enable row level security;

create policy "cases_select_authenticated" on cases
  for select to authenticated using (true);
create policy "cases_insert_authenticated" on cases
  for insert to authenticated with check (true);
create policy "cases_update_authenticated" on cases
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- case_audio
-- ---------------------------------------------------------------------------
create table case_audio (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references cases(case_id) on delete cascade,
  audio_id text not null,
  original_filename text not null default '',
  mime_type text not null default '',
  duration_seconds double precision,
  file_size_bytes bigint,
  uploaded_at timestamptz,
  storage_path text,
  media_url text,
  created_at timestamptz not null default now(),
  unique (case_id, audio_id)
);

alter table case_audio enable row level security;

create policy "case_audio_select_authenticated" on case_audio
  for select to authenticated using (true);
create policy "case_audio_insert_authenticated" on case_audio
  for insert to authenticated with check (true);
create policy "case_audio_update_authenticated" on case_audio
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- transcripts
-- ---------------------------------------------------------------------------
create table transcripts (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null unique,
  case_id text not null references cases(case_id) on delete cascade,
  job_id text not null,
  media_url text,
  duration double precision,
  based_on text,
  deepgram_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transcripts_case_idx on transcripts (case_id);
create index transcripts_job_idx on transcripts (job_id);

create trigger transcripts_set_updated_at
  before update on transcripts
  for each row execute function set_updated_at();

alter table transcripts enable row level security;

create policy "transcripts_select_authenticated" on transcripts
  for select to authenticated using (true);
create policy "transcripts_insert_authenticated" on transcripts
  for insert to authenticated with check (true);
create policy "transcripts_update_authenticated" on transcripts
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- transcript_speakers
-- ---------------------------------------------------------------------------
create table transcript_speakers (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  speaker_id text not null,
  display_name text not null default '',
  deepgram_speaker integer not null,
  role text,
  unique (transcript_id, speaker_id)
);

alter table transcript_speakers enable row level security;

create policy "transcript_speakers_select_authenticated" on transcript_speakers
  for select to authenticated using (true);
create policy "transcript_speakers_insert_authenticated" on transcript_speakers
  for insert to authenticated with check (true);
create policy "transcript_speakers_update_authenticated" on transcript_speakers
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- transcript_utterances
-- ---------------------------------------------------------------------------
create table transcript_utterances (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  utterance_id text not null,
  speaker_id text not null,
  start_time double precision not null,
  end_time double precision not null,
  ordinal integer not null,
  unique (transcript_id, utterance_id)
);

create index transcript_utterances_order_idx
  on transcript_utterances (transcript_id, ordinal);

alter table transcript_utterances enable row level security;

create policy "transcript_utterances_select_authenticated" on transcript_utterances
  for select to authenticated using (true);
create policy "transcript_utterances_insert_authenticated" on transcript_utterances
  for insert to authenticated with check (true);
create policy "transcript_utterances_update_authenticated" on transcript_utterances
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- transcript_words  (the heart of the system)
-- ---------------------------------------------------------------------------
create table transcript_words (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  utterance_id text not null,
  word_id text not null,
  speaker_id text not null,
  ordinal integer not null,
  text text not null,
  raw_text text not null,
  start_time double precision not null,
  end_time double precision not null,
  confidence real not null,
  reviewed boolean not null default false,
  edited boolean not null default false,
  unique (transcript_id, word_id),
  foreign key (transcript_id, utterance_id)
    references transcript_utterances (transcript_id, utterance_id)
    on delete cascade
);

create index transcript_words_time_idx
  on transcript_words (transcript_id, start_time);
create index transcript_words_utterance_idx
  on transcript_words (transcript_id, utterance_id, ordinal);
create index transcript_words_review_idx
  on transcript_words (transcript_id, reviewed);

-- raw_text immutability: the original transcription may never be altered.
create or replace function reject_raw_text_change()
returns trigger
language plpgsql
as $$
begin
  if old.raw_text is distinct from new.raw_text then
    raise exception 'raw_text is immutable (word_id: %)', old.word_id
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger transcript_words_protect_raw_text
  before update on transcript_words
  for each row execute function reject_raw_text_change();

alter table transcript_words enable row level security;

create policy "transcript_words_select_authenticated" on transcript_words
  for select to authenticated using (true);
create policy "transcript_words_insert_authenticated" on transcript_words
  for insert to authenticated with check (true);
create policy "transcript_words_update_authenticated" on transcript_words
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- transcript_audit_log  (APPEND-ONLY: select + insert, no update/delete)
-- ---------------------------------------------------------------------------
create table transcript_audit_log (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  change_id text not null unique,
  utterance_id text not null,
  word_id text,
  old_text text not null,
  new_text text not null,
  source text not null default 'manual',
  suggestion_id text,
  reviewer_user_id uuid,
  created_at timestamptz not null default now()
);

create index transcript_audit_log_transcript_idx
  on transcript_audit_log (transcript_id, created_at desc);

alter table transcript_audit_log enable row level security;

create policy "transcript_audit_log_select_authenticated" on transcript_audit_log
  for select to authenticated using (true);
create policy "transcript_audit_log_insert_authenticated" on transcript_audit_log
  for insert to authenticated with check (true);
-- Intentionally NO update or delete policies: append-only.

-- ---------------------------------------------------------------------------
-- transcript_review_state
-- ---------------------------------------------------------------------------
create table transcript_review_state (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null unique references transcripts(transcript_id) on delete cascade,
  updated_at timestamptz not null default now(),
  reviewed_word_ids jsonb not null default '[]'::jsonb,
  unreviewed_word_ids jsonb not null default '[]'::jsonb,
  review_complete boolean not null default false,
  review_pct integer
);

create trigger transcript_review_state_set_updated_at
  before update on transcript_review_state
  for each row execute function set_updated_at();

alter table transcript_review_state enable row level security;

create policy "transcript_review_state_select_authenticated" on transcript_review_state
  for select to authenticated using (true);
create policy "transcript_review_state_insert_authenticated" on transcript_review_state
  for insert to authenticated with check (true);
create policy "transcript_review_state_update_authenticated" on transcript_review_state
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- transcript_suggestions
-- ---------------------------------------------------------------------------
create table transcript_suggestions (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  suggestion_id text not null unique,
  word_id text not null,
  utterance_id text not null,
  original_text text not null,
  suggested_text text not null,
  reason text not null default '',
  confidence real not null default 0,
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','edited')),
  created_at timestamptz not null default now()
);

create index transcript_suggestions_transcript_idx
  on transcript_suggestions (transcript_id, status);

alter table transcript_suggestions enable row level security;

create policy "transcript_suggestions_select_authenticated" on transcript_suggestions
  for select to authenticated using (true);
create policy "transcript_suggestions_insert_authenticated" on transcript_suggestions
  for insert to authenticated with check (true);
create policy "transcript_suggestions_update_authenticated" on transcript_suggestions
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- case_exhibits
-- ---------------------------------------------------------------------------
create table case_exhibits (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references cases(case_id) on delete cascade,
  exhibit_id text not null,
  label text not null,
  description text not null default '',
  filename text,
  storage_path text,
  file_url text,
  marked_by text,
  admitted boolean not null default false,
  page_reference integer,
  line_reference integer,
  created_at timestamptz not null default now(),
  unique (case_id, exhibit_id)
);

alter table case_exhibits enable row level security;

create policy "case_exhibits_select_authenticated" on case_exhibits
  for select to authenticated using (true);
create policy "case_exhibits_insert_authenticated" on case_exhibits
  for insert to authenticated with check (true);
create policy "case_exhibits_update_authenticated" on case_exhibits
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- case_certifications
-- ---------------------------------------------------------------------------
create table case_certifications (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique references cases(case_id) on delete cascade,
  certification_date date,
  certification_statement text not null default '',
  checklist jsonb not null default '{}'::jsonb,
  signature_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger case_certifications_set_updated_at
  before update on case_certifications
  for each row execute function set_updated_at();

alter table case_certifications enable row level security;

create policy "case_certifications_select_authenticated" on case_certifications
  for select to authenticated using (true);
create policy "case_certifications_insert_authenticated" on case_certifications
  for insert to authenticated with check (true);
create policy "case_certifications_update_authenticated" on case_certifications
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- exports
-- ---------------------------------------------------------------------------
create table exports (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references cases(case_id) on delete cascade,
  export_id text not null unique,
  format text not null,
  storage_path text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index exports_case_idx on exports (case_id, created_at desc);

alter table exports enable row level security;

create policy "exports_select_authenticated" on exports
  for select to authenticated using (true);
create policy "exports_insert_authenticated" on exports
  for insert to authenticated with check (true);
-- No update policy: an export record is a historical artifact.
