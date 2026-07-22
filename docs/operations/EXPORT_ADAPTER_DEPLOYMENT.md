# Export Adapter Deployment

## Runtime

The Export Adapter is an authenticated Supabase Edge Function named `export-adapter`. It performs short-lived orchestration only; DOCX/PDF work remains in the private Cloud Run Formatter Service.

## Required secrets and configuration

| Name | Purpose |
| --- | --- |
| `EXPORT_GCP_SERVICE_ACCOUNT_JSON` | Server-only Google service-account credential used for Cloud Tasks and Cloud Storage APIs |
| `EXPORT_GCP_PROJECT` | `depo-pro-website` |
| `EXPORT_TASKS_LOCATION` | `us-central1` |
| `EXPORT_TASKS_QUEUE` | `depo-pro-formatter` |
| `EXPORT_FORMATTER_TASK_URL` | Private formatter route ending in `/tasks/format` |
| `EXPORT_FORMATTER_OIDC_AUDIENCE` | Cloud Run service audience without a path |
| `EXPORT_ARTIFACT_BUCKET` | `depo-pro-exports` |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are supplied by the Edge Function runtime. No credential value belongs in Git.

## API

The client invokes the function with an authenticated JSON envelope:

- `{ action: "create", request: ExportServiceRequest }`
- `{ action: "get", jobId, transcriptId }`
- `{ action: "cancel", jobId, transcriptId }`

The function returns the frozen `ExportJob` shape.

## Deployed adapter

- Supabase project: `lqxiuwlwzkofdfitxuqe`
- Function: `export-adapter`
- Version: `2`
- Function ID: `20e7228d-bffe-4496-bbb8-7ba790806dcb`
- Bundle SHA-256: `39198d752fd550c957b5f77068d8ceab06336b6607c25b8fbd53dfb5a1eca5dc`
- JWT verification: enabled
- Status: `ACTIVE`

The function is deployed, but production acceptance is not complete until its server-only Google credential/configuration is installed and the synthetic flow below succeeds.

## Production acceptance

Production validation must record:

- deployed Edge Function version;
- authenticated synthetic case/transcript and persisted certification evidence;
- deterministic adapter job ID and Cloud Task name;
- Formatter Service revision;
- `QUEUED → PROCESSING → COMPLETED` observations;
- DOCX/PDF signed artifact metadata;
- duplicate request result;
- formatter failure behavior;
- queued cancellation behavior;
- confirmation that no client data was used or changed.
