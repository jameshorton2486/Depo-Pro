# Transcript Finalize Worker Deployment

## Purpose

The Transcript Finalize Worker moves heavy Deepgram finalization out of the `transcribe-callback` webhook.

The bounded callback path is:

```text
Deepgram callback
  -> store raw chunk response
  -> mark job finalizing
  -> enqueue Cloud Tasks payload { job_id }
  -> return quickly
```

The private worker path is:

```text
Cloud Tasks
  -> private Cloud Run POST /tasks/finalize
  -> load transcription_jobs state
  -> load stored Deepgram chunk responses
  -> normalize / merge / canonical integrity
  -> persist transcript rows
  -> mark job complete or failed
```

## Runtime

| Item | Value |
| --- | --- |
| Cloud Run service | `depo-pro-transcript-finalize` |
| Worker route | `POST /tasks/finalize` |
| Health route | `GET /healthz` |
| Container build file | `cloudbuild.transcript-finalize.yaml` |
| Dockerfile | `transcript_finalize_service/Dockerfile` |

## Required Cloud Run environment

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key used by the worker for transcript finalization persistence |
| `ANTHROPIC_API_KEY` | Optional; enables post-completion boundary enrichment |

`SUPABASE_SERVICE_ROLE_KEY` must be provided through Secret Manager or an equivalent server-only runtime secret mechanism. It must not be committed to Git or exposed to the browser.

## Required transcribe-callback environment

| Variable | Purpose |
| --- | --- |
| `FINALIZE_GCP_PROJECT` | Google Cloud project containing the Cloud Tasks queue |
| `FINALIZE_TASKS_LOCATION` | Cloud Tasks location, typically `us-central1` |
| `FINALIZE_TASKS_QUEUE` | Queue name, recommended `depo-pro-transcript-finalize` |
| `FINALIZE_WORKER_TASK_URL` | Exact worker route ending in `/tasks/finalize` |
| `FINALIZE_WORKER_OIDC_AUDIENCE` | Cloud Run audience, normally the Cloud Run service URL without path |
| `FINALIZE_GCP_SERVICE_ACCOUNT_JSON` | Server-only service account JSON used only to enqueue Cloud Tasks |

For transition compatibility, `FINALIZE_GCP_PROJECT`, `FINALIZE_TASKS_LOCATION`, and `FINALIZE_GCP_SERVICE_ACCOUNT_JSON` can fall back to the existing export adapter Google variables when the dedicated finalizer variables are not present. Production should prefer dedicated finalizer names.

## IAM

Use a dedicated service account if possible:

```text
depo-pro-transcript-finalizer@depo-pro-website.iam.gserviceaccount.com
```

Minimum permissions:

| Scope | Role |
| --- | --- |
| Cloud Tasks queue/project | `roles/cloudtasks.enqueuer` |
| Cloud Run service `depo-pro-transcript-finalize` only | `roles/run.invoker` |
| Service account self-scope | `roles/iam.serviceAccountOpenIdTokenCreator` only if the caller must mint OIDC tokens |

Do not grant project-wide Cloud Run invocation unless service-scoped IAM is unavailable.

## Idempotency and recovery

The worker is safe to invoke multiple times for the same job:

- `complete` returns success without rewriting transcript rows.
- `failed` returns success without rewriting transcript rows.
- `finalizing` rebuilds from persisted raw chunk responses.
- partial transcript rows from an interrupted attempt are cleaned before re-ingest.
- `finalize_attempts` caps poison retries.

Jobs in `queued` or `processing` are rejected by the worker because they are not ready for finalization.

## Build

```powershell
gcloud builds submit --config cloudbuild.transcript-finalize.yaml --substitutions _IMAGE=us-central1-docker.pkg.dev/depo-pro-website/depo-pro/depo-pro-transcript-finalize:<tag>
```

## Deploy

```powershell
gcloud run deploy depo-pro-transcript-finalize `
  --image us-central1-docker.pkg.dev/depo-pro-website/depo-pro/depo-pro-transcript-finalize:<tag> `
  --region us-central1 `
  --no-allow-unauthenticated `
  --service-account depo-pro-transcript-finalizer@depo-pro-website.iam.gserviceaccount.com `
  --set-env-vars SUPABASE_URL=<project-url> `
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=<secret-name>:latest,ANTHROPIC_API_KEY=<secret-name>:latest
```

## Acceptance

Validation must demonstrate:

- `transcribe-callback` stores the final Deepgram chunk response.
- job state changes to `finalizing`.
- Cloud Tasks receives a bounded `{ job_id }` payload.
- Cloud Run worker receives `POST /tasks/finalize`.
- transcript rows are created from stored responses.
- job reaches `complete`, or `failed` with a concrete error.
- duplicate task delivery is idempotent.
