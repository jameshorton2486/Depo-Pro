# Transcript Creation Audit — 2026-06-10

## Scope

Determine why "the transcript is not being created" and test the specific hypothesis that Deepgram keyterms are not being handled correctly.

## Primary Finding

The current live system **is creating transcripts successfully**. The failure mode observed in the UI is **not** "transcript creation failed," and the evidence does **not** support the theory that Deepgram keyterms are breaking transcript creation.

## Evidence

### 1. Live `transcription_jobs` rows completed successfully

Query run against the linked production database showed the two newest jobs as `complete`:

```sql
select id, case_id, transcript_id, status, error, request_path, response_path, created_at, updated_at
from transcription_jobs
order by created_at desc
limit 10;
```

Observed latest rows:

- `b2fe3bfd-3122-4d41-afe3-9aa4791047c1`
  - `case_id = case_20260610_0suau2`
  - `transcript_id = tr_1781098420207_3nnv6u`
  - `status = complete`
- `5116b426-4cee-4dd8-8271-050e21db6026`
  - `case_id = case_20260610_lfazay`
  - `transcript_id = tr_1781097659267_1hfrwn`
  - `status = complete`

Neither row had an error message.

### 2. Live `transcripts` rows were inserted

Query:

```sql
select transcript_id, case_id, job_id, status, word_count, utterance_count, speaker_count, raw_storage_path
from transcripts
order by created_at desc
limit 10;
```

Observed latest rows:

- `tr_1781098420207_3nnv6u`
  - `status = completed`
  - `word_count = 2435`
  - `utterance_count = 370`
  - `speaker_count = 5`
- `tr_1781097659267_1hfrwn`
  - `status = completed`
  - `word_count = 2341`
  - `utterance_count = 363`
  - `speaker_count = 5`

This proves the callback ingest path persisted transcript metadata.

### 3. Live `transcript_words` rows were inserted

Query:

```sql
select transcript_id, count(*) as word_rows
from transcript_words
group by transcript_id
order by count(*) desc
limit 10;
```

Observed latest rows:

- `tr_1781098420207_3nnv6u` → `2435`
- `tr_1781097659267_1hfrwn` → `2341`

This proves the transcript body was materialized, not just the job shell.

### 4. The saved Deepgram request artifact included keyterms

The latest request artifact was downloaded from Storage and inspected:

- `case-files/.../b2fe3bfd-3122-4d41-afe3-9aa4791047c1_deepgram_request.json`

Observed facts from that artifact:

- `keyterms_count = 24`
- `estimated_token_usage = 104`
- the saved request preview contained 24 explicit keyterm objects
- the saved Deepgram wire URL contained repeated `keyterm=` query parameters

Examples present in the actual outbound request:

- `Heath Thomas`
- `Curtis L. Cukjati`
- `Home Depot`
- `25-cv-00598-OLG`
- `Texas Rules of Civil Procedure`

This directly falsifies the theory that keyterms were omitted or mishandled in a way that prevented transcript creation on the successful run.

## Code Path Findings

### Keyterms are budgeted, serialized, and stored before the Deepgram call

- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:90) applies `fitStoredKeytermsToRequestBudget(...)`.
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:99) builds the Deepgram request preview via `buildDeepgramRequestFromStoredKeyterms(...)`.
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:119) saves the request artifact that was later inspected.
- [src/lib/deepgram/buildDeepgramRequest.ts](/C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:111) slices the selected list to the wire cap and appends repeated `keyterm` params.
- [src/lib/deepgram/requestBudget.ts](/C:/Users/james/projects/depo-pro/src/lib/deepgram/requestBudget.ts:15) performs the token-budget fit before the request is sent.

### Successful callback ingest persists the transcript

- [supabase/functions/transcribe-callback/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:190) normalizes the Deepgram response.
- The same function inserts rows into `transcripts`, `transcript_speakers`, `transcript_utterances`, and `transcript_words`.

The live database rows above match that code path exactly.

## What This Means

The operational problem has shifted:

- Earlier blockers were real-mode and CORS issues.
- Those no longer explain "transcript not created."
- The latest evidence shows transcript creation succeeds end-to-end.
- If the user still sees a failure, the remaining issue is more likely in **post-ingest loading/rendering**, not in Deepgram start or callback ingest.

## Most Likely Remaining Failure Surface

The strongest remaining suspect is the Stage 3 transcript load path rather than transcript creation itself.

- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:179) loads the transcript by `transcript_id`.
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:183) throws `"failed to load transcript"` on query failure.
- [supabase/functions/editor-api/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:88) now has the widened browser CORS header list, which removes the earlier preflight blocker.

Given the live `transcripts` and `transcript_words` rows exist, a remaining user-visible failure is now more likely to be:

- `editor-api` request/auth failure
- RLS mismatch on transcript reads
- a frontend document-load issue after successful backend fetch

## Conclusion

The audit result is clear:

- **Transcript creation is working.**
- **Deepgram keyterms are being included in the live request.**
- **Keyterm handling is not the current root cause of "transcript is not being created."**

The observed symptom has likely been misclassified. The more accurate description is:

- transcript creation succeeded
- transcript persistence succeeded
- the remaining issue is probably transcript retrieval/loading in the editor workflow

## Recommended Next Diagnostic Step

Capture the actual response for the Stage 3 document request:

```text
GET /functions/v1/editor-api/<transcript_id>/document
```

Specifically record:

- HTTP status
- response body
- any JSON `error`

That request will distinguish:

- read/auth/RLS failure in `editor-api`
- frontend rendering failure after a successful fetch
- any remaining mismatch between `transcript_id` routing and the editor load flow
