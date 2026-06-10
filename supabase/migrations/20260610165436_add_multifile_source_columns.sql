alter table public.case_audio
  add column if not exists source_index integer not null default 0;

create index if not exists case_audio_case_source_idx
  on public.case_audio (case_id, source_index, uploaded_at desc);

alter table public.transcription_jobs
  add column if not exists source_audio_id text,
  add column if not exists source_index integer;

create index if not exists transcription_jobs_case_source_idx
  on public.transcription_jobs (case_id, source_index, created_at desc);
