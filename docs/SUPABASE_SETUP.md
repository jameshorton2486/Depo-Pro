# Supabase Setup — Transcription Pipeline

Everything the Supabase project needs for the transcription pipeline, the stuck-job
watchdog, and the two-copy transcript model. Do the steps in order.

## 1. Database extensions

Enable via **Dashboard → Database → Extensions** *before* applying migrations. The
watchdog migration attempts `create extension … if not exists` but swallows failures,
so if the migration role can't create them, scheduling is silently skipped.

| Extension | Purpose |
| --- | --- |
| `pg_cron` | schedules the watchdog + SQL reaper |
| `pg_net` | lets the cron job call the `transcribe-watchdog` function over HTTP |

pg_cron jobs live in the `cron` schema. Confirm jobs land in the database your app
uses (Dashboard → Database → Cron).

## 2. Vault secrets

Only needed so pg_cron can invoke the watchdog via pg_net. **Dashboard → Project
Settings → Vault.** Names are case-sensitive and must match exactly — the cron
command looks them up by name.

| Vault secret name | Value |
| --- | --- |
| `project_url` | `https://<project-ref>.supabase.co` (no trailing slash) |
| `service_role_key` | the project's service-role key |

The scheduled cron command reads these live from `vault.decrypted_secrets`, so the key
is never written into the stored job definition. The watchdog schedule only registers
when **both** secrets exist — add them before pushing migrations. Prefer an external
scheduler? Skip Vault and POST to `/functions/v1/transcribe-watchdog` with the
service-role bearer on your own cron.

> Rotating the service-role key later? Update the `service_role_key` Vault secret too,
> or the watchdog's calls start returning 401.

## 3. Edge Function secrets

**Dashboard → Edge Functions → Secrets** (or `supabase secrets set KEY=value`).

| Secret | Used by | Required? |
| --- | --- | --- |
| `DEEPGRAM_API_KEY` | start / callback / watchdog | required |
| `ANTHROPIC_API_KEY` | callback (boundary engine) | required |
| `TRANSCRIPT_PRUNE_SUPERSEDED` | callback — `true` enables destructive replace-on-retranscribe | optional (leave unset until validated) |
| `WATCHDOG_STALE_MINUTES` | watchdog — stale threshold (default `20`) | optional |
| `WATCHDOG_MAX_ATTEMPTS` | watchdog — resubmits before failing (default `2`) | optional |

**Do not set** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` —
Supabase injects these into every edge function automatically.

## 4. Storage

The private `case-files` bucket must exist. Browser uploads, downloads, updates, and
removals use owner-scoped Storage RLS under the
`<owner_user_id>/<case_id>/...` path convention. The
`20260719003250_owner_scoped_storage_delete_policy.sql` migration grants only the
owning authenticated user permission to remove an object. The Original-snapshot
upload and retranscription prune run as the **service role**, which bypasses bucket
RLS.

## 5. Apply migrations

```bash
supabase db push
```

Runs as the migration/`postgres` role, which already has rights to create
pg_cron/pg_net, create the `security definer` reaper, and `grant execute … to
service_role`. No custom DB role or manual grants needed.

If you pushed before adding the Vault secrets, re-run the scheduling `DO $$ … $$`
block from `supabase/migrations/20260717203000_transcription_watchdog_autoretry.sql`
once both secrets exist. It is idempotent (`cron.schedule` upserts by job name).

## 6. Deploy functions

Deploy the new `transcribe-watchdog` and redeploy `transcribe-start` /
`transcribe-callback`.

- `transcribe-callback` must keep **`--no-verify-jwt`** — Deepgram's webhook
  authenticates with the `token` query param, not a JWT.
- `transcribe-watchdog` verifies `Authorization: Bearer <service-role-key>` itself, so
  it works with JWT verification on or off.

## 7. Verify

```sql
-- watchdog is scheduled
select jobname, schedule, active from cron.job where jobname = 'transcribe-watchdog';

-- SQL reaper is scheduled
select jobname, schedule from cron.job where jobname = 'fail-stale-transcription-jobs';
```

Then run one transcription end-to-end and confirm:

- the transcript opens in the workspace,
- the toolbar **Original** button renders the immutable Original snapshot,
- `transcripts.original_storage_path` is populated for the new row.

## 8. Enable destructive behavior last

- **Replace-on-retranscribe** (`TRANSCRIPT_PRUNE_SUPERSEDED=true`) deletes superseded
  transcripts + their storage artifacts. Validate on a case with 2+ transcripts on a
  branch before enabling in production.
- **Watchdog** timeouts: edge function ~20 min, SQL reaper ~60 min. Confirm they fit
  your Deepgram latencies before relying on them.

See also: [TWO_COPY_TRANSCRIPT_MODEL.md](TWO_COPY_TRANSCRIPT_MODEL.md).
