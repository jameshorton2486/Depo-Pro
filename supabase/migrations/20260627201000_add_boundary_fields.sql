alter table public.transcript_utterances
  add column if not exists excluded_from_output boolean default false,
  add column if not exists exclusion_reason text default null,
  add column if not exists is_synthetic boolean default false;

create index if not exists idx_utterances_excluded
  on public.transcript_utterances(transcript_id, excluded_from_output)
  where excluded_from_output = false;
