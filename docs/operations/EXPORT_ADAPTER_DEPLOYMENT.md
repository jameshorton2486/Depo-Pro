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
- Version: `5`
- Function ID: `20e7228d-bffe-4496-bbb8-7ba790806dcb`
- Bundle SHA-256: `735210a53c30304b25f84308f6e7c1857809d1b1ccbf455c99f9c4d910f477b5`
- JWT verification: enabled
- Status: `ACTIVE`

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

- Synthetic case: `RC17C-CASE-b3e3204f187e`
- Synthetic transcript: `rc17c-transcript-b3e3204f187e`
- Export job: `export-7b52b968507266302fb1fd02006dac2e`
- Formatter revision: `depo-pro-formatter-00009-26b`
- Observed lifecycle: `QUEUED → PROCESSING → COMPLETED`
- Artifacts: DOCX (36,810 bytes) and PDF (16,661 bytes)
- Signed URLs: present for both artifacts; token values were not recorded
- Duplicate dispatch: returned the same job ID and immutable `COMPLETED` result
- Error: `null`
- Client data: none used or modified; all names and identifiers were fabricated

Certification immutability correctly rejected automatic deletion of the certified synthetic acceptance record. The record is retained as isolated RC evidence rather than bypassing Certification-owner database triggers.

## Runtime IAM evidence

Dedicated identity: `depo-pro-export-adapter@depo-pro-website.iam.gserviceaccount.com`

| Scope | Role |
| --- | --- |
| Project | `roles/cloudtasks.enqueuer` |
| Project | `roles/cloudtasks.taskDeleter` |
| Export Adapter service account only | `roles/iam.serviceAccountUser` (self only) |
| Cloud Run service `depo-pro-formatter` only | `roles/run.invoker` |
| Bucket `gs://depo-pro-exports` only | `roles/storage.objectUser` |

No project-wide Storage role or project-wide Cloud Run role was granted.
