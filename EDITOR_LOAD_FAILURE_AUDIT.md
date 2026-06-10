# AUDIT — Failed to load transcript: `TypeError: Failed to fetch`

Profile: `codex --profile depo`  
Run mode: read-only audit  
Branch observed: `release/stage3-rc`

## Verdict

Classification: **editor-api URL / runtime routing problem is the leading cause**, not transcript creation and not the Deepgram keyterm path.

Why this is the best-fit classification:

- The latest live transcription job is `complete`.
- The matching `transcripts` row exists.
- The matching `transcript_words` rows exist and are non-zero.
- The editor load path uses a **different transport path** than transcription creation:
  - transcript creation uses `supabase.functions.invoke("transcribe-start")`
  - editor load uses `fetch(${apiBaseUrl}/${transcript_id}/document)`
- `editor-api` is reachable live and returns CORS-enabled `401` JSON for missing/invalid JWT, so simple `verify_jwt = true` by itself does **not** reproduce a transport-level `TypeError: Failed to fetch` in the current live project.
- The active editor base URL is supplied at runtime via `config.apiBaseUrl`, and the repo’s standalone default is still `"/mock"`. That makes runtime base-URL misconfiguration the strongest remaining transport-level explanation.

## Section A — Create vs. load

### VERIFY-LIVE commands

```powershell
$db=(Get-Content .env | Where-Object { $_ -like 'DIRECT_URL=*' } | ForEach-Object { $_.Substring($_.IndexOf('=')+1).Trim('"') })
psql "$db" -P pager=off -c "select status, transcript_id from transcription_jobs order by created_at desc limit 1;"
```

Then, with that `transcript_id`:

```powershell
psql "$db" -P pager=off -c "select count(*) from transcript_words where transcript_id = 'tr_1781098420207_3nnv6u';"
psql "$db" -P pager=off -c "select transcript_id, case_id from transcripts where transcript_id = 'tr_1781098420207_3nnv6u';"
```

### Observed result

Latest live job:

```text
status   = complete
transcript_id = tr_1781098420207_3nnv6u
```

Matching live persistence:

```text
transcript_words count = 2435
transcripts row exists for transcript_id = tr_1781098420207_3nnv6u
case_id = case_20260610_0suau2
```

### Classification

This is **not** a transcript creation failure. It is a **load / transport failure** after successful creation and ingest.

## Section B — editor-api reachability & auth

### B1. `verify_jwt` on `editor-api`

Local config:

- [supabase/config.toml](/C:/Users/james/projects/depo-pro/supabase/config.toml:1) contains only:
  - `[functions.transcribe-callback]`
  - `verify_jwt = false`
- There is **no** `[functions.editor-api]` override locally.

### VERIFY-LIVE command

```powershell
$env:SUPABASE_ACCESS_TOKEN='…'
supabase functions list --output json
```

### Observed result

Live function metadata shows:

```text
editor-api verify_jwt = true
editor-api version = 3
```

### Important nuance

This is **not enough by itself** to explain `TypeError: Failed to fetch`.

Live probe without auth:

```powershell
curl.exe -i "https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api/tr_1781098420207_3nnv6u/document"
```

Observed result:

- `401 Unauthorized`
- JSON body present
- `Access-Control-Allow-Origin: *` present

Live probe with invalid auth:

```powershell
curl.exe -i "https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api/tr_1781098420207_3nnv6u/document" -H "Authorization: Bearer invalid.jwt.token" -H "Origin: http://localhost:5173"
```

Observed result:

- `401 Unauthorized`
- JSON body present
- `Access-Control-Allow-Origin: *` present

Conclusion:

- `verify_jwt = true` is a real protection boundary.
- But on the current live project, missing/invalid JWT still yields a normal response with CORS, not a transport-level silent failure.
- Therefore **gateway auth is not the leading explanation** for the observed `TypeError: Failed to fetch`.

### B2. How the client calls `editor-api`

Relevant code path:

- [src/api/workspaceService.ts](/C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:560) calls `contractApi.getDocument(target.transcript_id)` in real mode.
- [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:98) builds URLs as `${_baseUrl}/${jobId}/${path}`.
- [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:104) issues `GET` for the document route.
- [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:35) adds `Authorization: Bearer ${accessToken}` when a session token exists.

Exact request shape:

```text
GET ${apiBaseUrl}/${transcript_id}/document
Authorization: Bearer <session token>   (if supabase.auth.getSession() returns one)
```

Additional implication:

- If no access token exists in real mode, [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:29) throws `AuthRequiredError` **before fetch**.
- That means a true browser-level `TypeError: Failed to fetch` is more consistent with:
  - an actual fetch being attempted to the wrong/unreachable URL, or
  - a transport/CORS failure visible only in the browser runtime.

### B3. Base URL sanity

The app does **not** derive the editor load URL from `VITE_SUPABASE_URL`.

Editor load base comes from runtime mount config:

- [src/main.tsx](/C:/Users/james/projects/depo-pro/src/main.tsx:37) calls `configureClient(config.apiBaseUrl)`.
- [index.html](/C:/Users/james/projects/depo-pro/index.html:15) still defaults standalone dev to `apiBaseUrl: "/mock"`.

Local env findings:

- `.env.local` is absent in this repo snapshot.
- `.env` does **not** define `VITE_EDITOR_API_BASE_URL`.
- The only repo reference to `VITE_EDITOR_API_BASE_URL` is the smoke script, not the app runtime:
  - [scripts/editor-api-smoke.mjs](/C:/Users/james/projects/depo-pro/scripts/editor-api-smoke.mjs:9)

Conclusion:

- The active editor API base URL is a **runtime mount/config value**, not a repo-local env value.
- Since transcription creation uses a separate transport path, it can succeed while editor loading fails due to bad `apiBaseUrl`.
- This is the strongest remaining explanation for a transport-level `Failed to fetch`.

### VERIFY-LIVE runtime capture required

This cannot be confirmed from the repo alone. Capture one of:

1. Browser console output from:
   - `[DEPO-PRO] Mounting editor with config:`
2. Browser Network tab full request URL for:
   - `GET .../editor-api/<transcript_id>/document`

That will show the actual live `apiBaseUrl`.

### B4. CORS on all response paths

`editor-api` handler behavior:

- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:87) defines `corsHeaders`.
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:96) handles `OPTIONS`.
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:102) returns `404` through `respondError`.
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:107) returns `401` through `respondError` when `Authorization` is missing.
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:143) catches unexpected errors and returns `respondError(500, ...)`.

Observed live preflight:

```powershell
curl.exe -i -X OPTIONS "https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api/tr_1781098420207_3nnv6u/document" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization,content-type,x-client-info,apikey"
```

Observed result:

- `200 OK`
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version`

Conclusion:

- No obvious function-level uncaught-before-CORS path was found.
- Function-level CORS currently appears correct on the live project.

## Section C — Rule out the keyterm hypothesis

### What the code does

Keyterms are assembled only on the transcription start path:

- [src/api/transcriptionService.ts](/C:/Users/james/projects/depo-pro/src/api/transcriptionService.ts:143) uses `client.functions.invoke("transcribe-start", ...)`.
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:90) budgets `record.deepgram.keyterms`.
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:99) builds the Deepgram request preview.
- [src/lib/deepgram/buildDeepgramRequest.ts](/C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:111) serializes wire keyterms.
- [src/lib/deepgram/buildDeepgramRequest.ts](/C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:116) appends repeated `keyterm` query params.

Keyterms are absent from the editor load path:

- `rg -n keyterm supabase/functions/editor-api/index.ts src/api/workspaceService.ts src/api/client.ts`
- observed result: **no matches**

### Standalone keyterm file

Live storage listing for the latest successful case showed only:

- audio
- notice PDF
- Deepgram request artifact
- Deepgram response artifact

No standalone `keyterms.json` artifact was found for the live latest case.

### Conclusion

Classification: **CONFIRMED-UNRELATED**

Reason:

- A keyterm problem would occur on `transcribe-start` / Deepgram job creation.
- Section A shows the latest job completed and produced transcript rows and word rows.
- `editor-api` document loading does not reference keyterms at all.

Therefore a keyterm problem does **not** explain `Failed to load transcript — TypeError: Failed to fetch`.

## Section D — Fix routing

### Root cause classification

**editor-api URL / unreachable runtime target**

This is the best fit from the available evidence.

### Why this classification wins

- Transcript creation succeeded.
- `editor-api` endpoint is reachable live.
- `editor-api` returns CORS-enabled `401` responses for missing/invalid JWT, so simple auth failure is not sufficient to explain a transport-level `Failed to fetch`.
- The editor load path uses a runtime-supplied `apiBaseUrl` that is independent from transcription creation.
- The repo’s standalone default is still `"/mock"`, and the active real base URL cannot be verified from source alone.

### Recommended fix

Do not change code from this audit. Route the fix to runtime configuration:

- Confirm the actual mounted `config.apiBaseUrl` in the failing browser session.
- Set it to the real Edge Function base:
  - `https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api`
- Re-test the exact `GET .../<transcript_id>/document` request.

If the runtime capture proves the URL is already correct, the next branch is not keyterms; it is browser-observed transport/CORS detail on the actual failing request.

## Required runtime captures

This audit cannot observe the browser transport failure directly. The human operator must capture:

1. Browser Network tab for the `editor-api` request:
   - Is it the `OPTIONS` preflight or the `GET` that fails?
   - What is the full request URL?
   - What is the status code?
   - Is there a response body?
   - Is `Access-Control-Allow-Origin` present?

2. The Section A SQL results:
   - latest `transcription_jobs` status + `transcript_id`
   - matching `transcript_words` count
   - matching `transcripts` row

## Summary

- Transcript creation: **working**
- Transcript persistence: **working**
- Keyterm handling: **not implicated**
- `editor-api` auth/CORS: **reachable and currently CORS-enabled**
- Leading remaining issue: **wrong or unreachable runtime `apiBaseUrl` for editor load**
