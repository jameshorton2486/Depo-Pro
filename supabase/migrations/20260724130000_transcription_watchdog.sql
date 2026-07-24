-- Auto-retry watchdog (DTAS Roadmap Phase 4).
--
-- Two stall points are swept by the `transcribe-watchdog` edge function:
--   - queued/processing with no Deepgram callback -> re-sign + resubmit.
--   - `finalizing` past the finalize lease -> re-dispatch the Cloud Run finalize
--     worker.
-- This migration adds the Deepgram resubmit counter, a pure-SQL last-resort
-- reaper (now covering `finalizing` too), and schedules both via pg_cron/pg_net.

alter table public.transcription_jobs
  add column if not exists watchdog_attempts integer not null default 0;

-- Last-resort reaper: fails jobs stuck past a timeout so the case is freed and
-- the UI surfaces an actionable error. Covers `finalizing` as well so a finalize
-- that never completes (dead worker, exhausted retries) cannot pin the case's
-- single-active-job guard forever. Idempotent; safe on any interval.
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
         error = 'RETRYABLE_WATCHDOG_TIMEOUT: no progress within '
                 || p_timeout::text || '. Restart transcription for this case.'
   where status in ('queued', 'processing', 'finalizing')
     -- updated_at is refreshed by the set_updated_at trigger on every state
     -- change, so it reflects the last time the job made progress.
     and updated_at < (now() - p_timeout);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.fail_stale_transcription_jobs(interval) is
  'Fails transcription jobs stuck in queued/processing/finalizing past the timeout so the case is freed. Idempotent.';

grant execute on function public.fail_stale_transcription_jobs(interval) to service_role;

-- Schedule the SQL reaper with a wide timeout so the edge function (shorter
-- threshold) gets first crack at resubmitting/re-driving before the reaper fails
-- a job outright. cron.schedule upserts by job name, so re-running is safe.
do $$
begin
  execute 'create extension if not exists pg_cron';

  perform cron.schedule(
    'fail-stale-transcription-jobs',
    '*/10 * * * *',
    $cron$ select public.fail_stale_transcription_jobs(interval '60 minutes'); $cron$
  );
exception when others then
  raise notice 'pg_cron unavailable (%). Drive public.fail_stale_transcription_jobs() from an external scheduler instead.', sqlerrm;
end;
$$;

-- Schedule the auto-retry edge function every 5 minutes. Requires pg_net plus
-- Vault secrets: `project_url` (https://<ref>.supabase.co) and one of
-- `watchdog_secret` (preferred — a stable scheduler secret matching the
-- function's WATCHDOG_SECRET env) or `service_role_key`. The secret is read live
-- inside the cron command so it is never stored in the job definition. Skipped
-- with a notice when prerequisites are missing — add the secrets and re-run, or
-- drive the function from an external scheduler (POST
-- /functions/v1/transcribe-watchdog with the bearer secret).
do $$
declare
  v_project_url text;
  v_bearer text;
begin
  execute 'create extension if not exists pg_net';

  select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_bearer from vault.decrypted_secrets where name = 'watchdog_secret' limit 1;
  if v_bearer is null then
    select decrypted_secret into v_bearer from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  end if;

  if v_project_url is null or v_bearer is null then
    raise notice 'transcribe-watchdog not scheduled: set Vault secrets project_url and watchdog_secret (or service_role_key), then re-run this block.';
    return;
  end if;

  perform cron.schedule(
    'transcribe-watchdog',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/transcribe-watchdog',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(
            (select decrypted_secret from vault.decrypted_secrets where name = 'watchdog_secret'),
            (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
          )
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
exception when others then
  raise notice 'transcribe-watchdog schedule skipped (%). Drive it from an external scheduler instead.', sqlerrm;
end;
$$;
