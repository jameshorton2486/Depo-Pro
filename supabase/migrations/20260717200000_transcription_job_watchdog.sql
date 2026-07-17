-- Stuck-job watchdog.
--
-- If Deepgram never fires the callback (dropped webhook, provider outage, a
-- chunk that errors after being accepted) a job sits in 'queued'/'processing'
-- forever, and the partial unique index (case_id where status in
-- ('queued','processing')) blocks the case from ever being retranscribed.
--
-- This reaper fails jobs that have been inactive past a timeout so the case is
-- freed and the UI can surface an actionable error. It is idempotent and safe to
-- run on any interval.

create or replace function public.fail_stale_transcription_jobs(
  p_timeout interval default interval '30 minutes'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.transcription_jobs
     set status = 'failed',
         error = 'RETRYABLE_WATCHDOG_TIMEOUT: no Deepgram callback within '
                 || p_timeout::text || '. Restart transcription for this case.'
   where status in ('queued', 'processing')
     -- updated_at is refreshed by the set_updated_at trigger on every state
     -- change, so it reflects the last time the job made progress.
     and updated_at < (now() - p_timeout);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.fail_stale_transcription_jobs(interval) is
  'Fails transcription jobs stuck in queued/processing past the timeout so the case is freed. Idempotent.';

-- Service role (edge functions / external schedulers) may invoke it directly.
grant execute on function public.fail_stale_transcription_jobs(interval) to service_role;

-- Schedule it every 5 minutes via pg_cron when the extension is available. Wrapped
-- so environments without pg_cron still apply the migration cleanly — the function
-- can then be driven by a scheduled edge function or external cron instead.
do $$
begin
  execute 'create extension if not exists pg_cron';

  -- cron.schedule upserts by job name, so re-running the migration is safe.
  perform cron.schedule(
    'fail-stale-transcription-jobs',
    '*/5 * * * *',
    $cron$ select public.fail_stale_transcription_jobs(interval '30 minutes'); $cron$
  );
exception when others then
  raise notice 'pg_cron unavailable (%). Skipping schedule; drive public.fail_stale_transcription_jobs() from an external scheduler.', sqlerrm;
end;
$$;
