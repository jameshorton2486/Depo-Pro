-- Auto-retry watchdog wiring.
--
-- Adds attempt tracking and schedules the `transcribe-watchdog` edge function,
-- which re-signs the audio URL and resubmits stalled jobs to Deepgram before
-- giving up. The pure-SQL reaper (fail_stale_transcription_jobs) from
-- 20260717200000 stays in place as a last-resort fallback.

alter table public.transcription_jobs
  add column if not exists watchdog_attempts integer not null default 0;

-- Widen the SQL-only reaper's timeout so, where the edge function is scheduled
-- (shorter threshold, ~20 min), the edge function gets first crack at resubmitting
-- before the reaper fails a job outright. cron.schedule upserts by job name.
do $$
begin
  perform cron.schedule(
    'fail-stale-transcription-jobs',
    '*/10 * * * *',
    $cron$ select public.fail_stale_transcription_jobs(interval '60 minutes'); $cron$
  );
exception when others then
  raise notice 'pg_cron unavailable (%); SQL reaper schedule left unchanged.', sqlerrm;
end;
$$;

-- Schedule the auto-retry edge function every 5 minutes. Requires pg_net plus two
-- Vault secrets: `project_url` (e.g. https://<ref>.supabase.co) and
-- `service_role_key`. The secrets are read live inside the cron command so the key
-- is never stored in the job definition. Skipped with a notice when prerequisites
-- are missing — add the secrets and re-run, or drive the function from an external
-- scheduler (POST /functions/v1/transcribe-watchdog with the service-role bearer).
do $$
declare
  v_project_url text;
  v_service_key text;
begin
  execute 'create extension if not exists pg_net';

  select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_project_url is null or v_service_key is null then
    raise notice 'transcribe-watchdog not scheduled: set Vault secrets project_url and service_role_key, then re-run this schedule block.';
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
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
exception when others then
  raise notice 'transcribe-watchdog schedule skipped (%). Drive it from an external scheduler instead.', sqlerrm;
end;
$$;
