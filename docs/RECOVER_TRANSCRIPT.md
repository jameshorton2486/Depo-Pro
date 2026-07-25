# Recovering a stalled transcript

The `recover-transcript` edge function rebuilds a transcript that stalled
mid-pipeline **from its already-stored Deepgram chunk responses** — no
re-transcription, no additional Deepgram cost.

## When to use it

A job stuck in `processing` or `finalizing` (or `failed` after a finalize
crash) whose Deepgram chunk responses are already in storage. This is the exact
situation that produced the 147-minute `tr_1784752224778_0412t7`: Deepgram
succeeded and every chunk response was persisted, but the pipeline died during
merge + transcript creation, leaving the job `processing` with zero transcript
rows.

It will **refuse** a `queued` job (never transcribed — nothing to rebuild;
restart transcription instead) and is a **no-op** for a `complete` one.

## Prerequisites (deploy first)

- Migration `20260724120000` (the `finalizing` status + finalize checkpoint
  columns) applied.
- The Cloud Run finalize worker deployed and reachable via Cloud Tasks
  (`cloudbuild.transcript-finalize.yaml`), with the `FINALIZE_*` env configured
  on the function that dispatches to it.
- `recover-transcript` deployed (`supabase functions deploy recover-transcript`;
  `config.toml` sets `verify_jwt=false`).

## How it works

1. Loads the job by `transcript_id` (or `job_id`).
2. Promotes it to `finalizing`, resetting `finalize_attempts` to 0 so the
   re-drive is not immediately capped.
3. Dispatches the Cloud Run finalize worker. If dispatch is unconfigured, the
   job stays `finalizing` and the **watchdog** re-drives it on its next tick.
4. The finalize worker rebuilds the canonical transcript from the stored
   responses, runs the integrity gate, ingests idempotently (cleanup-then-insert,
   so any partial rows from the original crash are replaced), and marks the job
   `complete`. If a stored response is missing or corrupt, it fails **loudly**
   with the real reason — recovery never fabricates a transcript.

## Recover `tr_1784752224778_0412t7`

Invoke with the service-role key (never paste the key into chat or commit it):

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/recover-transcript" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transcript_id":"tr_1784752224778_0412t7"}'
```

Expected response:

```json
{ "ok": true, "status": "finalizing", "recovered": true, "dispatched": true, "transcript_id": "tr_1784752224778_0412t7" }
```

Then poll the job until it reaches `complete` (finalize runs asynchronously on
Cloud Run):

```sql
select status, finalize_attempts, error
from public.transcription_jobs
where transcript_id = 'tr_1784752224778_0412t7';
```

- `complete` → the transcript now has word/utterance/speaker rows; open it in the
  Workspace to confirm it loads.
- `failed` → read `error` for the real cause (e.g. a missing stored response or a
  canonical-integrity failure). That is the genuine state — fix the underlying
  data before retrying.

## Fallback (no dispatch configured)

If the finalizer task dispatch is not configured, `dispatched` is `false` in the
response but the job is already `finalizing`; the scheduled `transcribe-watchdog`
re-drives `finalizing` jobs within its interval. You can also flip a single job
manually and let the watchdog pick it up:

```sql
update public.transcription_jobs
   set status = 'finalizing', finalize_started_at = now(), finalize_attempts = 0, error = null
 where transcript_id = 'tr_1784752224778_0412t7' and status <> 'complete';
```
