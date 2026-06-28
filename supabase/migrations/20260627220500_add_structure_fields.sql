alter table public.transcript_utterances
  add column if not exists line_type text default null,
  add column if not exists ai_suggested_line_type text default null,
  add column if not exists manually_reassigned boolean not null default false;
