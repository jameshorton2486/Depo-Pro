# Editor Load Path E2E Audit — 2026-06-10

## Scope

Read-only end-to-end audit of the Stage 3 transcript load path, from app mount through `editor-api` fetch, to determine where `Failed to load transcript — TypeError: Failed to fetch` can still occur after successful transcript creation.

This audit complements [docs/audits/EDITOR_LOAD_FAILURE_AUDIT.md](/C:/Users/james/projects/depo-pro/docs/audits/EDITOR_LOAD_FAILURE_AUDIT.md:1) by tracing the entire application path instead of only classifying the failure.

## Summary

The Stage 3 load path is split into two independent systems:

1. **Transcript creation path**
   - uses Supabase client `functions.invoke("transcribe-start")`
   - does not depend on `apiBaseUrl`
2. **Transcript editor load path**
   - uses the app’s generic fetch client
   - depends on runtime `config.apiBaseUrl`
   - depends on `supabase.auth.getSession()` returning a session JWT

Because of that split, the app can successfully create transcripts while still failing to load them into the editor.

## End-to-End Trace

### 1. App mount injects runtime API base

- [src/main.tsx](/C:/Users/james/projects/depo-pro/src/main.tsx:37) calls `configureClient(config.apiBaseUrl);`
- `config` comes from `window.DEPO_EDITOR_CONFIG` in standalone mode or from the embedding host

Standalone repo default:

- [index.html](/C:/Users/james/projects/depo-pro/index.html:15) sets `apiBaseUrl: "/mock"`

Implication:

- The editor transport base is **not** hard-coded from `VITE_SUPABASE_URL`
- The active editor endpoint is whatever runtime mount config supplies

### 2. Stage router passes case identity into the document loader

- [src/components/DepoEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/DepoEditor.tsx:90) mounts `DocumentProvider jobId={activeCaseId}`
- [src/components/DepoEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/DepoEditor.tsx:35) calls `loadDocument()` on mount

Important detail:

- The provider starts with a **case id**, not a transcript id

### 3. Workspace layer resolves case/transcript/job identity

- [src/api/workspaceService.ts](/C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:96) tries `getTranscriptJobByTranscriptId`
- then `getTranscriptJobByJobId`
- then `getLatestCompletedTranscriptJob`

For real mode document load:

- [src/api/workspaceService.ts](/C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:560) calls `contractApi.getDocument(target.transcript_id)`

Implication:

- The external route key used for `editor-api` document fetch is the **resolved `transcript_id`**
- The caller does not send the case id to `editor-api`

### 4. Generic API client constructs the document request

- [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:98) defines URL shape as `${_baseUrl}/${jobId}/${path}`
- [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:104) loads documents with `GET ${_baseUrl}/${transcript_id}/document`

Exact request path:

```text
GET ${apiBaseUrl}/${transcript_id}/document
```

### 5. Authorization header behavior

- [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:35) sets `Authorization: Bearer ${accessToken}`
- access token source is `supabase.auth.getSession()`

Important branch:

- if no access token exists in real mode, [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:29) throws `AuthRequiredError` before `fetch()`

Implication:

- A true browser `TypeError: Failed to fetch` means the code got past the no-session guard and actually attempted a network request
- Therefore the failure is more likely:
  - wrong or unreachable `apiBaseUrl`
  - browser-observed transport failure on the actual request
  - a runtime/session problem different from the no-session case

### 6. Editor API function expectations

Live `editor-api` properties:

- `verify_jwt = true` (from `supabase functions list --output json`)
- route expects `Authorization`
- route loads transcript by `transcript_id`

Relevant lines:

- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:107) rejects missing `Authorization`
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:179) loads transcript with `.eq("transcript_id", jobId)`
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:183) throws `"failed to load transcript"` on DB error

### 7. Live reachability checks

Observed unauthenticated live probe:

```powershell
curl.exe -i "https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api/tr_1781098420207_3nnv6u/document"
```

Observed result:

- `401 Unauthorized`
- JSON body present
- `Access-Control-Allow-Origin: *` present

Observed invalid-JWT live probe:

```powershell
curl.exe -i "https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api/tr_1781098420207_3nnv6u/document" -H "Authorization: Bearer invalid.jwt.token" -H "Origin: http://localhost:5173"
```

Observed result:

- `401 Unauthorized`
- JSON body present
- `Access-Control-Allow-Origin: *` present

Observed preflight:

```powershell
curl.exe -i -X OPTIONS "https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api/tr_1781098420207_3nnv6u/document" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization,content-type,x-client-info,apikey"
```

Observed result:

- `200 OK`
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version`

Implication:

- The current live function is reachable
- Its preflight path is healthy
- Its obvious auth failures are not silent transport failures

## What Was Proven Live

The latest transcript exists and is populated:

- latest `transcription_jobs.status = complete`
- latest `transcript_id = tr_1781098420207_3nnv6u`
- `transcript_words` count for that transcript = `2435`
- matching `transcripts` row exists

That removes creation, callback ingest, and keyterms as the active failure cause.

## Keyterm Hypothesis Status

Confirmed unrelated to Stage 3 load:

- `transcribe-start` is where keyterms are budgeted and serialized
- `editor-api`, `workspaceService`, and the generic API client contain no `keyterm` references
- the latest successful Deepgram request artifact contained actual live keyterms on the outbound request

Therefore a keyterm issue would affect job creation or Deepgram acceptance, not the editor document load transport.

## Smoke Path Availability

The repo contains a dedicated live smoke script:

- [scripts/editor-api-smoke.mjs](/C:/Users/james/projects/depo-pro/scripts/editor-api-smoke.mjs:1)

What it verifies:

- unauthenticated `401`
- authenticated `GET /document`
- working/review/speakers/suggestions/exhibits/certify routes
- cross-user isolation

Why it was not run in this audit:

- it requires `SMOKE_USER_EMAIL`, `SMOKE_USER_PASSWORD`, `SMOKE_USER2_EMAIL`, `SMOKE_USER2_PASSWORD`
- it also requires an `EDITOR_API_SEED_PATH` or the default temp seed file
- those inputs were not present in the repo-local env for this session

This is the best existing executable path for a full authenticated function-level check once credentials are supplied.

## Most Likely Remaining Failure Point

The strongest remaining failure point is **runtime `config.apiBaseUrl` in the actual browser session**.

Reasoning:

- transcription start succeeds via Supabase client functions API
- editor load uses separate generic `fetch`
- editor load base comes from runtime mount config
- standalone repo default remains `"/mock"`
- local repo env does not define the app runtime editor base
- a browser-level `TypeError: Failed to fetch` is more consistent with unreachable runtime URL than with the live `editor-api` behavior observed via curl

## Remaining Unknowns

These cannot be resolved from source or CLI alone:

1. What exact `apiBaseUrl` was mounted in the failing browser session?
2. Did the browser fail on `OPTIONS` or `GET`?
3. Was the request sent to the real Supabase functions host or to some placeholder / host-page route?
4. Was a real session token attached on the failing browser request?

## Required Next Capture

To close the end-to-end audit, capture the failing browser request in Network:

- full request URL
- request method
- whether the failing row is `OPTIONS` or `GET`
- request headers, especially `Authorization`
- response status
- response headers, especially `Access-Control-Allow-Origin`
- response body if present

Also capture the runtime mount log already emitted by the app:

- `[DEPO-PRO] Mounting editor with config: ...`

That will reveal the actual live `apiBaseUrl`.

## Final Assessment

End-to-end, the path now looks like this:

- transcript creation: healthy
- transcript persistence: healthy
- Deepgram keyterms: not implicated
- `editor-api` live function: reachable
- `editor-api` preflight: healthy
- `editor-api` unauth/invalid-JWT behavior: normal JSON 401 with CORS
- remaining likely break: runtime editor base URL or browser-only transport detail in the actual mounted session
