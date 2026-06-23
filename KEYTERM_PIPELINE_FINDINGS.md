# KEYTERM_PIPELINE_FINDINGS

## One-line verdict

This is a **case↔audio binding defect, not a keyterm-builder defect**: the Garza/Home Depot case `case_20260622_x416k5` carried internally consistent Garza metadata and stored keyterms, but the attached audio and resulting transcript were for the Etminan/Vargas proceeding. Evidence: `src/components/IntakeScreen/DocumentUploadPanel.tsx:451-471`, `src/api/fileService.ts:338-372`, `src/api/transcriptionService.ts:124-146`, `supabase/functions/transcribe-start/index.ts:86-116`.

## Probe 1 — Case↔audio binding

The bound audio and the case metadata describe different proceedings.

SQL:

```sql
select
  c.case_id,
  c.payload #>> '{caption,case_name,value}' as case_name,
  c.payload #>> '{witnesses,0,name,value}' as witness_name,
  c.created_at,
  ca.original_filename as audio_filename,
  ca.uploaded_at
from public.cases c
join public.case_audio ca on ca.case_id = c.case_id
where c.case_id = 'case_20260622_x416k5';
```

Result:

```text
case_20260622_x416k5|Delia Garza v. Home Depot USA, INC., A/K/A The Home Depot and Shawn Herber|Heath Thomas|2026-06-22 21:40:46.513089+00|04-24-26 Dr Mohammed Etminan, MD - Audio (1) (1).mp3|2026-06-22 21:41:57.601+00
```

The transcript row built from that same case/audio pair preserved the Etminan filename:

SQL:

```sql
select id, case_id, transcript_id, source_filename, based_on, deepgram_request_id, created_at
from public.transcripts
where transcript_id = 'tr_1782164554896_cra5eh';
```

Result:

```text
d691d7f0-d6bd-4fa0-b623-1ef43a768621|case_20260622_x416k5|tr_1782164554896_cra5eh|04-24-26 Dr Mohammed Etminan, MD - Audio (1) (1).mp3|f_1782164501272_s20t|019ef149-0853-7b60-b324-c15017a79181|2026-06-22 21:43:13.320204+00
```

The stored utterances for that transcript are Etminan/Vargas content, not Garza/Home Depot content:

SQL:

```sql
select ordinal, speaker_label, left(text, 180) as text
from public.transcript_utterances
where transcript_id = 'tr_1782164554896_cra5eh'
order by ordinal
limit 12;
```

Result excerpt:

```text
0|Speaker 0|Good afternoon.
1|Speaker 0|We are on the record. Today's date is 04/24/2026,
2|Speaker 0|and the time is now 01:27PM.
3|Speaker 0|This is the beginning of the deposition of doctor Mohammed,
4|Speaker 0|uh, Edmanan, M. D. Will the court reporter be swearing the witness? Yes. This is cause number C572224
5|Speaker 1|l. Rico, Laura, Alessandro,
6|Speaker 1|Vargas, plaintiff versus Leonardo,
7|Speaker 1|Isaias Rodriguez, Sandy, Dean, Kopeke,
8|Speaker 1|and Standing Seam and Specialty Company Inc.
```

Determination: **CONFIRMED MISMATCH**.

## Probe 2 — Where keyterms come from

The keyterm pipeline is case-record driven. `buildManagedKeyterms()` harvests from the stored `CaseRecord` plus provenance, then merges stored `record.deepgram.keyterms`; it does not inspect audio content. Evidence: `src/lib/keyterms/managedKeyterms.ts:91-118`. The Deepgram payload preview also reads `record.deepgram.keyterms` directly. Evidence: `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:73-76`.

At transcription time, the edge function loads the case row by `case_id`, normalizes `caseRow.payload`, then feeds `record.deepgram.keyterms` into `fitStoredKeytermsToRequestBudget()` and `buildDeepgramRequestFromStoredKeyterms()`. Evidence: `supabase/functions/transcribe-start/index.ts:86-105`.

This means the builder used the Garza/Home Depot case payload it was given. The bad match came from the bound audio, not from keyterm derivation.

Determination: **keyterm builder behaving correctly given its input: YES**.

## Probe 3 — Root cause classification

Classification: **(a) wrong case binding**.

Upload flow:

- `DocumentUploadPanel.handleDrop()` sends the dropped audio file to `uploadCaseAudio(record.case_id, file)`. Evidence: `src/components/IntakeScreen/DocumentUploadPanel.tsx:451-471`.
- `uploadCaseAudio()` stores the audio under the caller-supplied `caseId` and inserts a `case_audio` row with `case_id: caseId`. Evidence: `src/api/fileService.ts:338-372`.
- `startTranscription(caseId)` invokes the edge function with that same `case_id`. Evidence: `src/api/transcriptionService.ts:124-146`.
- `transcribe-start` then loads `requireCase(caseId)` and `requireOrderedAudio(caseId)`, takes `firstAudio`, derives keyterms from the case payload, and writes `source_audio_id: firstAudio.audio_id` into the queued job. Evidence: `supabase/functions/transcribe-start/index.ts:86-116`.

There is no validation step in this path that checks whether the selected audio filename/content matches the active case caption, witness, or stored participants before attaching or transcribing.

Why this is **not** the other classes:

- Not **stale case record**: `createCase()` generates a fresh `case_YYYYMMDD_suffix` id and persists a new record. Evidence: `src/api/caseService.ts:64-111`. For the bad case, the case row was created at `21:40:46Z` and the audio was attached at `21:41:57Z`, so the mismatch was introduced immediately on upload, not by a later rename/reuse.
- Not **cached keyterms**: the transcription path reads current `caseRow.payload` and current `record.deepgram.keyterms` for the requested `case_id`. Evidence: `supabase/functions/transcribe-start/index.ts:86-105`.
- Not **transcript/case reuse**: the transcription service passes the explicit `caseId` it is called with. Evidence: `src/api/transcriptionService.ts:124-146`.

## Probe 4 — Blast radius

Completed transcripts census:

SQL:

```sql
select
  t.transcript_id,
  t.case_id,
  t.source_filename,
  t.status,
  t.created_at,
  c.payload #>> '{caption,case_name,value}' as case_name,
  c.payload #>> '{caption,case_style,value}' as case_style,
  c.payload #>> '{witnesses,0,name,value}' as witness_name
from public.transcripts t
join public.cases c on c.case_id = t.case_id
where t.status = 'completed'
order by t.created_at desc;
```

Result:

```text
tr_1782164554896_cra5eh|case_20260622_x416k5|04-24-26 Dr Mohammed Etminan, MD - Audio (1) (1).mp3|completed|2026-06-22 21:43:13.320204+00|Delia Garza v. Home Depot USA, INC., A/K/A The Home Depot and Shawn Herber|Delia Garza v. Home Depot USA, INC., A/K/A The Home Depot and Shawn Herber|Heath Thomas
tr_1781997360020_glu2tx|case_20260620_iuks6c|04-24-26 Dr Mohammed Etminan, MD - Audio (1) (1).mp3|completed|2026-06-20 23:16:20.732707+00|ROCIO LAURA ELIZONDO VARGAS, Plaintiff, vs. LEONARDO ISAIAS RODRIGUEZ; SANDY DEAN KOEPKE; and STANDING SEAM & SPECIALTY COMPANY, INC., Defendants|ROCIO LAURA ELIZONDO VARGAS, Plaintiff, vs. LEONARDO ISAIAS RODRIGUEZ; SANDY DEAN KOEPKE; and STANDING SEAM & SPECIALTY COMPANY, INC., Defendants|Mohammad Etminan, M.D.
tr_1781718945317_sookpn|case_20260617_6sx9lq|Dr_Entiminan_Audio.mp3|completed|2026-06-17 17:56:08.124283+00|ROCIO LAURA ELIZONDO VARGAS v. LEONARDO ISAIAS RODRIGUEZ; SANDY DEAN KOEPKE; and STANDING SEAM & SPECIALTY COMPANY, INC.|Rocio Laura Elizondo Vargas v. Leonardo Isaias Rodriguez; Sandy Dean Koepke; and Standing Seam & Specialty Company, Inc.|Mohammad Etminan, M.D.
tr_1781712831571_x0qi8w|case_20260617_g0fldj|audio1728584021 (4).mp3|completed|2026-06-17 16:14:29.762418+00|Delia Garza v. Home Depot U.S.A., Inc. A/K/A The Home Depot and Shawn Herber|Delia Garza v. Home Depot USA, Inc. A/K/A The Home Depot and Shawn Herber|Heath Thomas
```

Assessment:

| Transcript | Assessment | Why |
|---|---|---|
| `tr_1782164554896_cra5eh` | **Confirmed mismatch** | Garza/Home Depot case metadata with Etminan filename and Etminan/Vargas utterance content. |
| `tr_1781997360020_glu2tx` | No mismatch found | Etminan filename aligns with Vargas/Etminan case metadata. |
| `tr_1781718945317_sookpn` | No mismatch found | Etminan filename aligns with Vargas/Etminan case metadata. |
| `tr_1781712831571_x0qi8w` | **Indeterminate** | Generic audio filename gives no semantic signal, and this completed transcript has no persisted canonical words/utterances to inspect. |

Evidence for the indeterminate older Garza transcript having no canonical transcript content:

SQL:

```sql
select transcript_id, count(*)
from public.transcript_words
where transcript_id = 'tr_1781712831571_x0qi8w'
group by transcript_id;
```

Result:

```text
-- no rows
```

SQL:

```sql
select transcript_id, count(*)
from public.transcript_utterances
where transcript_id = 'tr_1781712831571_x0qi8w'
group by transcript_id;
```

Result:

```text
-- no rows
```

Blast radius:

- **1 confirmed affected completed transcript**
- **1 additional completed transcript indeterminate from read-only evidence**

Quality impact:

- `tr_1782164554896_cra5eh`: high likelihood of degraded transcription quality, because Garza/Home Depot keyterms were boosted while Etminan/Vargas names were not.
- `tr_1781712831571_x0qi8w`: cannot assess transcription degradation from stored transcript content because no canonical words/utterances are present.

## Probe 5 — Minimal fix surface

Minimal fix:

1. Prevent mismatched binding at upload/transcription time by validating that the active case metadata and selected audio appear to describe the same proceeding before `uploadCaseAudio(record.case_id, file)` is accepted or before `transcribe-start` submits Deepgram. The existing fix surface is the upload/transcribe path, not the keyterm builder. Evidence: `src/components/IntakeScreen/DocumentUploadPanel.tsx:451-471`, `src/api/fileService.ts:338-372`, `src/api/transcriptionService.ts:124-146`, `supabase/functions/transcribe-start/index.ts:86-116`.
2. No schema change is required for that guard; the defect is in binding/validation logic, not storage shape.

Re-transcription:

- **Yes** for the confirmed mismatch `tr_1782164554896_cra5eh`, after rebinding the correct case/audio pair or creating the correct case record for the Etminan audio.
- Possibly **yes** for any additional cases found by a broader audit; the current evidence supports **1 definite re-transcription candidate** and **1 indeterminate legacy candidate**.
