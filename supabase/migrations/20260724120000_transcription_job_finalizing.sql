-- Phase 2 (DTAS Roadmap): move transcript finalization out of the Deepgram
-- webhook into a dedicated, resumable worker.
--
-- The webhook previously ran the entire heavy finalize (download every stored
-- chunk response -> merge -> canonical integrity -> insert tens of thousands of
-- word rows -> Anthropic boundary detection -> AI review) synchronously, which
-- exceeded edge-function CPU/time/memory limits and left jobs silently stuck in
-- `processing`. The new flow adds a `finalizing` state: the webhook stores the
-- last chunk, flips the job to `finalizing`, and hands off to the
-- `finalize-transcript` worker.
--
-- This migration:
--   1. widens the status check to allow `finalizing`,
--   2. keeps `finalizing` in the "one active job per case" guard so a case
--      cannot start a second transcription while one is still finalizing,
--   3. adds checkpoint columns so the worker is idempotent/resumable and the
--      watchdog (Roadmap Phase 4) can detect a stalled finalize.

alter table public.transcription_jobs
  drop constraint if exists transcription_jobs_status_check;

alter table public.transcription_jobs
  add constraint transcription_jobs_status_check
  check (status in ('queued', 'processing', 'finalizing', 'complete', 'failed'));

-- Recreate the single-active-job guard to treat `finalizing` as active. A job
-- that is being finalized still owns the case; a new queued/processing job for
-- the same case must not be created until it reaches `complete` or `failed`.
drop index if exists public.transcription_jobs_case_active_idx;
create unique index if not exists transcription_jobs_case_active_idx
  on public.transcription_jobs (case_id)
  where status in ('queued', 'processing', 'finalizing');

-- Checkpoint columns for the resumable finalize worker.
--   finalize_started_at: when the worker most recently began finalizing; the
--     watchdog uses staleness of this to re-dispatch a stalled `finalizing` job.
--   finalize_attempts:   number of finalize attempts (re-invocation counter);
--     lets the worker/watchdog cap retries and surface a real failure instead
--     of looping forever.
alter table public.transcription_jobs
  add column if not exists finalize_started_at timestamptz,
  add column if not exists finalize_attempts integer not null default 0;
