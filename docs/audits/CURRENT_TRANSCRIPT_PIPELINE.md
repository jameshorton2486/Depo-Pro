# Current Transcript Pipeline

Date: 2026-06-26
Branch: feature/stage3-workspace-core

## Scope

This traces the live pipeline starting from the raw Deepgram callback payload and ending at:

1. what the user sees in the workspace editor
2. what the user gets in TXT and Word download output

Every step below is based on the current runtime code.

## A. Raw Deepgram JSON to Persisted Transcript Rows

### 1. Transcription job is started

- `startTranscription` invokes the `transcribe-start` Edge Function and creates a job record.
  Evidence:
  - [src/api/transcriptionService.ts:124](C:/Users/james/projects/depo-pro/src/api/transcriptionService.ts:124)
  - [src/api/transcriptionService.ts:149](C:/Users/james/projects/depo-pro/src/api/transcriptionService.ts:149)

### 2. Deepgram posts callback payload to Supabase function

- `transcribe-callback` receives the raw JSON payload, validates the callback token, uploads the raw response artifact, and parses the payload as a Deepgram response.
  Evidence:
  - [supabase/functions/transcribe-callback/index.ts:67](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:67)
  - [supabase/functions/transcribe-callback/index.ts:100](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:100)
  - [supabase/functions/transcribe-callback/index.ts:193](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:193)

### 3. Raw Deepgram response is normalized into canonical rows

- `normalizeTranscriptResponse(parsed.response)` converts the callback payload into canonical:
  - speakers
  - utterances
  - words
- It derives stable IDs:
  - `spk_###`
  - `utt_######`
  - `w_########`
- It preserves `raw_text`, initializes `working_text` to `null`, and sets `reviewed=false`, `edited=false`.
  Evidence:
  - [supabase/functions/transcribe-callback/index.ts:610](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:610)
  - [src/lib/transcript/normalize.ts:55](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:55)
  - [src/lib/transcript/normalize.ts:59](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:59)
  - [src/lib/transcript/normalize.ts:63](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:63)
  - [src/lib/transcript/normalize.ts:174](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:174)
  - [src/lib/transcript/normalize.ts:203](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:203)
  - [src/lib/transcript/normalize.ts:210](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:210)

### 4. Canonical rows are inserted into transcript tables

- `ingestTranscript` inserts:
  - `transcripts`
  - `transcript_speakers`
  - `transcript_utterances`
  - `transcript_words`
- The callback function writes `text` and `raw_text` from normalized words and persists `working_text` as nullable.
  Evidence:
  - [supabase/functions/transcribe-callback/index.ts:243](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:243)
  - [supabase/functions/transcribe-callback/index.ts:346](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:346)

## B. Persisted Transcript Rows to Workspace Document

### 5. Workspace resolves the transcript target

- `loadWorkspaceDocument` resolves either transcript id, job id, or latest completed job for the case.
  Evidence:
  - [src/api/workspaceService.ts:121](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:121)
  - [src/api/workspaceService.ts:135](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:135)

### 6. Snapshot load pulls persisted transcript rows

- `loadTranscriptSnapshot` reads:
  - speakers
  - utterances
  - words
- Rows are ordered by speaker index, utterance index, and word index.
  Evidence:
  - [src/api/transcriptRepository.ts:274](C:/Users/james/projects/depo-pro/src/api/transcriptRepository.ts:274)
  - [src/api/transcriptRepository.ts:287](C:/Users/james/projects/depo-pro/src/api/transcriptRepository.ts:287)

### 7. Snapshot is materialized into `EditorDocument`

- `buildEditorDocumentFromSnapshot` constructs the client document used by the editor.
- Display text for each word is `working_text ?? raw_text`.
- This is the first place the user-visible text diverges from canonical raw transcript content.
  Evidence:
  - [src/api/workspaceService.ts:76](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:76)
  - [src/api/workspaceService.ts:108](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:108)
  - [src/api/workspaceService.ts:151](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:151)

## C. Workspace Render Path Before Structure Confirmation

### 8. Transcript editor asks `buildEditorContent` for renderable content

- `TranscriptEditor` builds editor content from `state.document`.
- Before structure is confirmed, it passes the raw `EditorDocument` through the formatter path without display document inference.
  Evidence:
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:128](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:128)
  - [src/lib/buildEditorContent.ts:157](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:157)
  - [src/lib/buildEditorContent.ts:166](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:166)

### 9. `cfe` formats each line

- `cfe` is the main formatter layer. It applies:
  - grouping
  - abbreviation spacing from the registry
  - sentence-boundary spacing
  - deterministic garble corrections
  - slash date normalization
  - age/number normalization
  - low-confidence inline flagging
- Formatted words carry:
  - `text`
  - `inline_flag`
  - `trailing_space`
  Evidence:
  - [src/lib/format/cfe.ts:176](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:176)
  - [src/lib/format/cfe.ts:540](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:540)
  - [src/lib/format/cfe.ts:586](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:586)

### 10. TipTap content is built from formatted lines

- `buildEditorContent` converts each formatted line into a TipTap utterance node.
- If a word has an inline flag, the flag text is inserted directly into the editor content after the token.
  Evidence:
  - [src/lib/buildEditorContent.ts:113](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:113)
  - [src/lib/buildEditorContent.ts:141](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:141)

### 11. User sees raw labels unless structure is confirmed

- `StructureReviewBanner` is shown while `structureConfirmed` is false.
- Both “Review & Confirm” and “Keep Raw Labels” currently call `confirmStructure`, which means the banner gates the display pipeline but does not keep a separate rejected state.
  Evidence:
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:321](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:321)
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:322](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:322)
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:323](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:323)
  - [src/context/DocumentContext.tsx:385](C:/Users/james/projects/depo-pro/src/context/DocumentContext.tsx:385)
  - [src/components/StructureReviewBanner/StructureReviewBanner.tsx:6](C:/Users/james/projects/depo-pro/src/components/StructureReviewBanner/StructureReviewBanner.tsx:6)

## D. Workspace Render Path After Structure Confirmation

### 12. `buildDisplayDocument` infers speaker roles and labels

- Once structure is confirmed, `buildEditorContent` first calls `buildDisplayDocument`.
- This layer can relabel speakers as:
  - reporter
  - videographer
  - witness
  - attorney
- It is display-layer only. It does not rewrite stored transcript rows.
  Evidence:
  - [src/lib/buildEditorContent.ts:166](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:166)
  - [src/lib/transcript/workspacePresentation.ts:254](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:254)
  - [src/lib/transcript/workspacePresentation.ts:385](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:385)

### 13. Structured paragraph classification is built from formatted lines

- `buildTranscriptParagraphs` runs:
  1. `buildDisplayDocument`
  2. `cfe`
  3. line classification into `Q`, `A`, `COLLOQUY`, `PARENTHETICAL`
  4. heading insertion (`PROCEEDINGS`, `EXAMINATION`)
  5. by-line insertion
  6. paragraph merge
  7. `applyParagraphDisplayImprovements`
  8. `applyQaFixer`
  Evidence:
  - [src/lib/transcript/workspacePresentation.ts:408](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:408)
  - [src/lib/transcript/workspacePresentation.ts:513](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:513)
  - [src/lib/transcript/workspacePresentation.ts:532](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:532)
  - [src/lib/transcript/workspacePresentation.ts:587](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:587)

### 14. `qaFixer` restructures Q/A and objections

- `applyQaFixer` splits:
  - embedded short answers out of Q blocks
  - embedded objections out of Q blocks
- It normalizes:
  - `K.` -> `Okay.`
  - `Objection. Four.` -> `Objection. Form.`
- It then remerges consecutive same-kind paragraphs.
  Evidence:
  - [src/lib/transcript/qaFixer.ts:3](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:3)
  - [src/lib/transcript/qaFixer.ts:12](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:12)
  - [src/lib/transcript/qaFixer.ts:54](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:54)
  - [src/lib/transcript/qaFixer.ts:139](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:139)

### 15. Paragraph display improvements run before final paragraph text is committed

- `applyParagraphDisplayImprovements` currently normalizes:
  - spaced initialisms
  - clock times
- It no longer rewrites spoken words like `doctor` or `mister`.
  Evidence:
  - [src/lib/transcript/paragraphDisplayImprovements.ts:16](C:/Users/james/projects/depo-pro/src/lib/transcript/paragraphDisplayImprovements.ts:16)

## E. Workspace Manual Correction and Persistence

### 16. User edits produce utterance diffs in the editor

- TipTap updates are diffed by utterance and sent into `DocumentContext.editUtterance`.
  Evidence:
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:151](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:151)

### 17. Save persists to `working_text`

- `saveNow` builds `{ utterance_id, working_text }` changes.
- `naivePersistWorking` tokenizes the edited utterance text and writes per-word `working_text` values.
- It does not mutate `raw_text`.
  Evidence:
  - [src/context/DocumentContext.tsx:327](C:/Users/james/projects/depo-pro/src/context/DocumentContext.tsx:327)
  - [src/context/DocumentContext.tsx:330](C:/Users/james/projects/depo-pro/src/context/DocumentContext.tsx:330)
  - [src/api/workspaceService.ts:290](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:290)
  - [src/api/workspaceService.ts:316](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:316)
  - [src/api/workspaceService.ts:322](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:322)
  - [src/api/workspaceService.ts:335](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:335)

### 18. Speaker reassignment persists separately

- `persistSpeakers` updates speaker rows and, when `utterance_speaker_map` is provided, rewrites utterance and word `speaker_id` assignments.
  Evidence:
  - [src/api/workspaceService.ts:457](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:457)
  - [src/api/workspaceService.ts:504](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:504)
  - [src/api/workspaceService.ts:505](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:505)

## F. Download Pipeline

### 19. Toolbar uses clean transcript builders for TXT and Word

- The toolbar computes `transcriptText` by calling `buildFormattedTranscriptText`.
- If `structureConfirmed` is true, structured clean output is used.
- If `structureConfirmed` is false, raw formatted clean output is used.
  Evidence:
  - [src/components/Toolbar/Toolbar.tsx:43](C:/Users/james/projects/depo-pro/src/components/Toolbar/Toolbar.tsx:43)
  - [src/lib/transcriptDownloads.ts:9](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:9)
  - [src/lib/transcriptDownloads.ts:17](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:17)
  - [src/lib/transcriptDownloads.ts:21](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:21)

### 20. Raw clean path

- Raw clean path is:
  - `cfe`
  - `serializeFormattedDocumentClean`
- This preserves corrected token text and spacing but omits inline flags.
  Evidence:
  - [src/lib/transcriptDownloads.ts:20](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:20)
  - [src/lib/format/serialize.ts:30](C:/Users/james/projects/depo-pro/src/lib/format/serialize.ts:30)
  - [src/lib/format/serialize.ts:35](C:/Users/james/projects/depo-pro/src/lib/format/serialize.ts:35)

### 21. Structured clean path

- Structured clean path is:
  - `buildTranscriptParagraphsClean`
  - `renderTranscriptParagraphTextClean`
  - `stripInlineFlagSpans`
- This preserves structural markers and removes only the bracketed flag annotations.
  Evidence:
  - [src/lib/transcript/workspacePresentation.ts:590](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:590)
  - [src/lib/transcript/workspacePresentation.ts:683](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:683)
  - [src/lib/transcript/workspacePresentation.ts:708](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:708)

## Summary

The live transcript pipeline is not one monolithic correction engine. It is a staged pipeline:

1. callback ingest
2. canonical normalization
3. workspace document reconstruction
4. formatter corrections
5. optional structure inference
6. paragraph post-processing
7. manual human edits
8. clean export serialization

That is the architecture the next correction work must fit, rather than bypass.
