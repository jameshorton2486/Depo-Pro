do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'transcripts_status_check'
      and conrelid = 'public.transcripts'::regclass
  ) then
    alter table public.transcripts
      drop constraint transcripts_status_check;
  end if;

  alter table public.transcripts
    add constraint transcripts_status_check
    check (status in ('queued', 'preprocessing', 'transcribing', 'assembling', 'completed', 'failed', 'needs_manual_review'));
end
$$;

alter table public.transcript_utterances
  add column if not exists excluded_from_output boolean default false,
  add column if not exists exclusion_reason text default null,
  add column if not exists is_synthetic boolean default false;

create index if not exists idx_utterances_excluded
  on public.transcript_utterances(transcript_id, excluded_from_output)
  where excluded_from_output = false;
