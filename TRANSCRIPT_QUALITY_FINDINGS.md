# Transcript Quality Findings

## Phase 0 Verdict

Phase 0 supports a controlled re-transcription experiment, but not a production switch. The code path confirms the current request is still `nova-3 + diarize=true + filler_words + utterances + smart_format + mip_opt_out + case-driven keyterms`, the name-garble root cause is still the already-proven case↔audio binding defect, and the ingestion path already supports a non-destructive re-transcription into a new job/transcript. The two open audit gaps are external: account-plan entitlement for `diarize_model=latest` / `nova-3-medical`, and the absence of the human-corrected Etminan reference artifact in this working tree. Sources: `src/lib/deepgram/buildDeepgramRequest.ts:46-57`, `supabase/functions/transcribe-start/index.ts:86-130`, `supabase/functions/transcribe-callback/index.ts:247-288`, `KEYTERM_PIPELINE_FINDINGS.md:3-5`, `docs/audits/AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md:396`.

## 1. Request Construction Map

### Current request parameters actually sent

The Deepgram request builder hardcodes these wire parameters today:

- `model=nova-3`
- `punctuate=true`
- `paragraphs=true`
- `diarize=true`
- `filler_words=true`
- `utterances=true`
- `smart_format=true`
- `mip_opt_out=true`

These are defined in one place and converted directly into the query string before the request is sent. Sources: `src/lib/deepgram/buildDeepgramRequest.ts:48-57`, `src/lib/deepgram/buildDeepgramRequest.ts:111-117`, `supabase/functions/transcribe-start/index.ts:293-337`.

### Keyterm request construction

Keyterms are normalized, deduped, sorted by boost, clipped to a hard 100-term cap for the wire request, and appended as repeated `keyterm` query parameters. The envelope also records estimated token usage and the hard token cap. Sources: `src/lib/deepgram/buildDeepgramRequest.ts:71-143`, `src/lib/keytermDerivation.ts:4-10`.

The budget-fit layer drops unselected terms and keeps the request below conservative soft caps before the wire request is built. Sources: `src/lib/deepgram/requestBudget.ts:15-42`.

The UI preview reads the case id plus stored `record.deepgram.keyterms` and exposes selected-term count, estimated-token usage, and wire-term count. Sources: `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:73-80`, `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:197-206`.

### Runtime submission path

The actual submission path is:

1. `startTranscription(caseId)` invokes the `transcribe-start` edge function with `{ case_id }`. Source: `src/api/transcriptionService.ts:124-147`.
2. `transcribe-start` loads the case row and ordered case audio for that same `case_id`. Source: `supabase/functions/transcribe-start/index.ts:86-88`.
3. It normalizes the case payload, budgets `record.deepgram.keyterms`, builds the request preview, creates a fresh transcript business id, and queues a new job bound to the first audio row. Source: `supabase/functions/transcribe-start/index.ts:93-118`.
4. `submitDeepgramJob()` signs the audio URL, stores a request artifact, and sends the HTTP request to Deepgram. Source: `supabase/functions/transcribe-start/index.ts:293-337`.

## 2. Current Deepgram Capabilities vs Public Docs

### What the public docs confirm

- Deepgram’s public changelog includes a `2026-05-13` release entry for **Diarization v2: Improved Batch Speaker Diarization**, which is the public basis for evaluating `diarize_model=latest` as a batch-diarization lever. Source: https://developers.deepgram.com/changelog
- Deepgram’s public diarization docs document speaker diarization as a supported transcription feature. Source: https://developers.deepgram.com/docs/diarization
- Deepgram’s public model docs show `Nova-3` options including `medical`, so `nova-3-medical` is a real model option, not an internal guess. Source: https://developers.deepgram.com/docs/model
- Deepgram’s public keyterm docs confirm Nova-3 keyterm prompting support and document a **500-token** request limit for keyterms. Source: https://developers.deepgram.com/docs/keyterm
- Deepgram’s public smart-format docs describe `smart_format` as a readability-oriented formatting layer, and public pricing/feature materials describe it as covering human-readable punctuation/casing/date/currency/entity-style formatting. Sources: https://developers.deepgram.com/docs/smart-format, https://deepgram.com/pricing

### What cannot be proven from this repo alone

- I could not prove, from local code or repo configuration, whether **this specific Deepgram account** is entitled to `diarize_model=latest` on `nova-3` batch jobs.
- I could not prove, from local code or repo configuration, whether **this specific Deepgram account** has access to `nova-3-medical`.

That requires either:

- Deepgram account billing/admin-console access, or
- a live authenticated test request against the account using those parameters.

### Audit conclusion on capability verification

- **Public-doc existence:** confirmed.
- **This account/plan entitlement:** not determinable read-only from the repo.

## 3. Binding + Keyterm Source

This remains the same root cause already established in the keyterm audit: keyterms are built from the case record, not from the audio content, and the broken result came from attaching Etminan audio to the Garza case.

The builder path is case-driven:

- `buildManagedKeyterms()` harvests keyterms from `CaseRecord` plus provenance, then merges `record.deepgram.keyterms`. Source: `src/lib/keyterms/managedKeyterms.ts:91-136`.
- The request preview reads `record.case_id` and `record.deepgram.keyterms` directly. Source: `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:73-76`.
- `transcribe-start` again reads the same `case_id`, normalizes the case payload, and feeds `record.deepgram.keyterms` into the Deepgram request builder. Source: `supabase/functions/transcribe-start/index.ts:86-105`.

The binding defect path is:

- audio drop attaches the file to `record.case_id`, with no semantic validation, via `uploadCaseAudio(record.case_id, file)`. Source: `src/components/IntakeScreen/DocumentUploadPanel.tsx:451-468`.
- `uploadCaseAudio()` inserts the `case_audio` row under that caller-supplied `caseId`. Source: `src/api/fileService.ts:338-376`.
- `startTranscription(caseId)` invokes the edge function for that same case. Source: `src/api/transcriptionService.ts:124-147`.

The prior audit already proved the concrete mismatch on `case_20260622_x416k5`: Garza/Home Depot metadata with Etminan audio attached. Sources: `KEYTERM_PIPELINE_FINDINGS.md:11-30`, `KEYTERM_PIPELINE_FINDINGS.md:88-103`.

## 4. Re-Transcription Mechanism + Cost

### Non-destructive re-transcription path

The current ingestion path already supports a safe A/B retranscription because it creates a new job/transcript identity rather than overwriting prior transcript rows:

- a fresh transcript id is generated by `createTranscriptBusinessId()`. Source: `src/lib/transcriptionJobs.ts:22-25`.
- request/response artifacts are written under that new job/transcript identity. Source: `src/lib/transcriptionJobs.ts:37-63`, `supabase/functions/transcribe-start/index.ts:316-327`.
- the callback ingest inserts a new `transcripts` row with `raw_storage_path`, `raw_checksum`, and the new `job_id` / `transcript_id`. Source: `supabase/functions/transcribe-callback/index.ts:247-288`.
- it then inserts new speaker, utterance, and word rows for that transcript. Source: `supabase/functions/transcribe-callback/index.ts:290-389`.

That means a retranscription test can be run into a **new job/test case** without touching existing transcript rows, which is consistent with the Layer-1 invariants. Sources: `supabase/functions/transcribe-start/index.ts:107-118`, `supabase/functions/transcribe-callback/index.ts:247-389`.

### Public pricing signal

Deepgram’s public pricing page lists Nova speech-to-text pricing and add-ons including keyterm prompting and speaker diarization. On public pay-as-you-go pricing, the posted add-ons are low enough that an ~83-minute retranscription is a trivial spend. Using the public rates shown on the pricing page, an ~83-minute Nova-3 batch retry with diarization and keyterm prompting is still well under USD $1 before any account-specific pricing differences or any unconfirmed model-specific premium. Source: https://deepgram.com/pricing

### What cannot be proven read-only

I could not verify this project’s **actual contracted Deepgram rate card** from the repo. Exact cost for this account would require Deepgram billing access.

## 5. Eval Reference Availability

The repo does **not** currently contain the stated human-corrected Etminan comparison artifact as a local structured file:

- `docs/audits/AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md` explicitly states: “No certified Etminan transcript was found in repo as a structured comparison artifact.” Source: `docs/audits/AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md:396`.
- A recursive file search in this working tree did not find `Dr_Etminan_Transcript.docx`, `case_20260620_iuks6c-transcript.txt`, or any other obvious Etminan/Vargas reference transcript file.

What **is** present is prior evidence that the transcript/data rows exist, and a preserved raw-response-side artifact path has already been established in the earlier data-reality audit. Sources: `DATA_REALITY_FINDINGS.md:5-6`, `DATA_REALITY_FINDINGS.md:45-47`.

### Evaluation implication

Phase 3 A/B measurement is only partially ready from this repo alone:

- **Raw ASR side:** available through the existing transcript/job pipeline.
- **Human-corrected reference side:** not present in this working tree as the named comparison artifact.

To complete the later A/B evaluation exactly as proposed, the human-corrected Etminan transcript must be provided in a readable location accessible to the workspace.

## Audit Answer Summary

### Confirmed

- The current request is still `nova-3 + diarize=true + filler_words=true + utterances=true + smart_format=true + mip_opt_out=true + case-driven repeated keyterms`. Sources: `src/lib/deepgram/buildDeepgramRequest.ts:48-57`, `src/lib/deepgram/buildDeepgramRequest.ts:111-117`.
- The keyterm/input mismatch is still a **binding problem**, not a keyterm-builder problem. Sources: `KEYTERM_PIPELINE_FINDINGS.md:3-5`, `KEYTERM_PIPELINE_FINDINGS.md:88-103`.
- A re-transcription can be run non-destructively into a new job/transcript. Sources: `src/lib/transcriptionJobs.ts:22-25`, `supabase/functions/transcribe-callback/index.ts:247-389`.
- Public Deepgram docs support evaluating `diarize_model=latest`, `nova-3-medical`, `keyterm` limits, and `smart_format` behavior. Sources: https://developers.deepgram.com/changelog, https://developers.deepgram.com/docs/diarization, https://developers.deepgram.com/docs/model, https://developers.deepgram.com/docs/keyterm, https://developers.deepgram.com/docs/smart-format

### Not yet provable from this repo

- Whether this Deepgram account is entitled to `diarize_model=latest`.
- Whether this Deepgram account is entitled to `nova-3-medical`.
- The exact account-specific per-minute pricing.
- The named human-corrected Etminan reference artifact in the working tree.

## Stop

Phase 0 is complete. No code, schema, dependency, or data changes were made. The next step is owner review before any Phase 1 binding fix or Phase 2 request-change experiment.
