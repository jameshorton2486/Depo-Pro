# Export Adapter Deployment

## Runtime

The Export Adapter is an authenticated Supabase Edge Function named `export-adapter`. It performs short-lived orchestration only; DOCX/PDF work remains in the private Cloud Run Formatter Service. Large canonical render models are staged in Cloud Storage and dispatched through the adapter-owned `export-adapter-relay` function so Cloud Tasks carries only a bounded object reference.

## Required secrets and configuration

| Name | Purpose |
| --- | --- |
| `EXPORT_GCP_SERVICE_ACCOUNT_JSON` | Server-only Google service-account credential used for Cloud Tasks and Cloud Storage APIs |
| `EXPORT_GCP_PROJECT` | `depo-pro-website` |
| `EXPORT_TASKS_LOCATION` | `us-central1` |
| `EXPORT_TASKS_QUEUE` | `depo-pro-formatter` |
| `EXPORT_ADAPTER_RELAY_URL` | Supabase Edge Function URL ending in `/functions/v1/export-adapter-relay` |
| `EXPORT_ADAPTER_RELAY_OIDC_AUDIENCE` | Exact relay URL used as the Cloud Tasks OIDC audience |
| `EXPORT_FORMATTER_TASK_URL` | Private formatter route ending in `/tasks/format` |
| `EXPORT_FORMATTER_OIDC_AUDIENCE` | Cloud Run service audience without a path |
| `EXPORT_ARTIFACT_BUCKET` | `depo-pro-exports` |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are supplied by the Edge Function runtime. No credential value belongs in Git.

## API

The client invokes the function with an authenticated JSON envelope:

- `{ action: "create", request: ExportServiceRequest }`
- `{ action: "get", jobId, transcriptId }`
- `{ action: "cancel", jobId, transcriptId }`

The function returns the frozen `ExportJob` shape. Create requests stage `exports/requests/{jobId}.json`, enqueue a relay task containing only `{ jobId, transcriptId, requestObjectName }`, and let the relay load and forward the unchanged `{ jobId, request }` formatter envelope. The staged request object is deleted after a terminal formatter response; lifecycle retention for orphaned request objects should also be enforced with a bucket lifecycle rule.

## Deployed adapter

- Supabase project: `lqxiuwlwzkofdfitxuqe`
- Function: `export-adapter` and relay function `export-adapter-relay`
- Versions: `export-adapter` v11; `export-adapter-relay` v1
- Function IDs: `export-adapter` `20e7228d-bffe-4496-bbb8-7ba790806dcb`; `export-adapter-relay` `2a452d94-7959-461d-8773-ecfcf9d7ce2b`
- Bundle SHA-256: pending final bundle digest capture after commit
- JWT verification: enabled for `export-adapter`; disabled for `export-adapter-relay` because it accepts Google Cloud Tasks OIDC and verifies that token in function code
- Status: both functions `ACTIVE`

The function is deployed with its server-only Google credential/configuration installed as Supabase secrets. Secret-list verification exposed names and digests only; credential contents were not printed. The temporary local key file was deleted after installation.

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
## Production evidence — July 22, 2026

- Synthetic case: `RC17C-RELAY-CASE-6c2ef2398ba2`
- Synthetic transcript: `rc17c-relay-transcript-6c2ef2398ba2`
- Export job: `export-83fdcddc1e456fe9c017bdbeb0545318`
- Inline formatter envelope size: 1,252,365 bytes
- Relay Cloud Task envelope size: 205 bytes
- Staged request object: `exports/requests/export-83fdcddc1e456fe9c017bdbeb0545318.json`
- Staged request cleanup: object returned 404 after terminal formatter response
- Completed job object: `exports/jobs/export-83fdcddc1e456fe9c017bdbeb0545318.json`, generation `1784730411965191`, size 2,329 bytes
- Observed lifecycle: `QUEUED → PROCESSING → COMPLETED`
- Artifacts: DOCX and PDF signed URLs present
- Duplicate dispatch: returned the same job ID and immutable `COMPLETED` result
- Error: `null`
- Client data: none used or modified; all names and identifiers were fabricated

## Runtime IAM evidence

Dedicated identity: `depo-pro-export-adapter@depo-pro-website.iam.gserviceaccount.com`

| Scope | Role |
| --- | --- |
| Project | `roles/cloudtasks.enqueuer` |
| Project | `roles/cloudtasks.taskDeleter` |
| Export Adapter service account only | `roles/iam.serviceAccountUser` (self only) |
| Export Adapter service account only | `roles/iam.serviceAccountOpenIdTokenCreator` (self only; required by relay to mint formatter audience token) |
| Cloud Run service `depo-pro-formatter` only | `roles/run.invoker` |
| Bucket `gs://depo-pro-exports` only | `roles/storage.objectUser` |

No project-wide Storage role or project-wide Cloud Run role was granted.
