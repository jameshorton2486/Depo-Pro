# Actual Pipeline Sequence

**Evidence:** `supabase/functions/transcribe-callback/index.ts` and its imported production modules, audited 2026-07-20.

```text
Intake / transcribe-start
  ↓ creates job and Deepgram callback URL
Deepgram callback
  ↓ authenticate job callback token; store immutable raw response artifact
integrityAudit.ts
  ↓ failure: persist manual-review transcript and fail job
multifileCallbackFlow.ts
  ↓ nonfinal source: submit next source and stop
multifileMerge.ts + normalize.ts
  ↓ final source only
canonicalIntegrity.ts
  ↓ failure: persist manual-review transcript and fail job
atomic transcript ingest
  ↓ canonical speakers, utterances, words
boundaryEngine.ts
  ↓ exclusion flags and synthetic boundary rows
preWorkspaceStructure.ts
  ├─ speakerResolutionEngine.ts
  ├─ transcriptParagraphs.ts
  │   ├─ depositionRegionEngine.ts
  │   ├─ qaStructureUtils.ts
  │   └─ CFE formatting path
  └─ buildUfmMetadata.ts
  ↓ persist speaker labels, roles, line types, inclusion metadata
capture immutable Original snapshot
  ↓ job complete
ai-review edge function (asynchronous)
  ├─ aiReview.ts
  └─ aiSuggestionEngine.ts
  ↓ pending suggestions, optional audited auto-apply
workspaceService.ts / DocumentContext
  ↓ load persisted rows and structure
buildEditorContent.ts / structuredTranscriptPackage.ts
  ↓ TipTap workspace, toolbar, and transcriptDownloads.ts export
```

## Not in the production sequence

Repository search found no production invocation of `structureEngine.ts`, `formattingEngine.ts`, `correctionEngines.ts`, or `correctionValidator.ts`. Their tests demonstrate behavior, not active pipeline ownership.