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
