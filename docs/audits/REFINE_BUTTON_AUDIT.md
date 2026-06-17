# REFINE BUTTON AUDIT

Date: 2026-06-17
Mode: Read-only
Scope: Workspace `Refine` button only

## Bottom Line

`Refine` is **not** an Anthropic / LLM correction pass. It is a **deterministic transcript reassembly** operation that rebuilds transcript speakers, utterances, and words from the preserved raw Deepgram JSON, then persists that rebuilt result when the user clicks `Apply Refinements`.

It does **not** operate on a display-only layer. It writes back to persisted transcript-derived rows:

- `transcript_speakers`
- `transcript_utterances`
- `transcript_words`

It does **not** modify the preserved raw Deepgram JSON source, but it **does** replace the canonical persisted transcript rows the workspace/editor reads from.

It is **not reversible in the UI as a one-click undo**. The preview dialog is metrics-only. It does not show a textual diff, and there is no built-in revert endpoint on this path.

## 1. Handler

### UI entry point

- [src/components/Toolbar/Toolbar.tsx:11](C:/Users/james/Projects/Depo-Pro/src/components/Toolbar/Toolbar.tsx:11) imports `TranscriptReassemblyDialog`
- [src/components/Toolbar/Toolbar.tsx:130](C:/Users/james/Projects/Depo-Pro/src/components/Toolbar/Toolbar.tsx:130) renders it in the workspace toolbar

### Button + click handler

- [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:67-72](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:67) renders the `Refine` button
- [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:18-39](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:18) defines `handlePreview()`
- [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:42-60](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:42) defines `handleApply()`

### Full call chain

#### Preview path

1. `Toolbar` renders `TranscriptReassemblyDialog`
2. User clicks `Refine`
3. `handlePreview()` runs
4. If the editor is dirty, it first calls [DocumentContext `saveNow()`](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:27)
5. Then it calls [workspaceApi.getTranscriptReassemblyPreview(...)](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:30)
6. `workspaceApi` routes that to:
   - [src/api/workspaceService.ts:1297-1307](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1297) in local mode
   - [src/api/client.ts:148-149](C:/Users/james/Projects/Depo-Pro/src/api/client.ts:148) -> `GET /:jobId/reassembly/preview` in real API mode
7. Real API endpoint is handled by [supabase/functions/editor-api/index.ts:1127-1128](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1127)
8. That path calls [buildReassemblyPreview(...)](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:977)

#### Apply path

1. User clicks `Apply Refinements`
2. `handleApply()` runs
3. It calls [workspaceApi.applyTranscriptReassembly(...)](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:50)
4. `workspaceApi` routes that to:
   - [src/api/workspaceService.ts:1309-1323](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1309) in local mode
   - [src/api/client.ts:151-152](C:/Users/james/Projects/Depo-Pro/src/api/client.ts:151) -> `POST /:jobId/reassembly/apply` in real API mode
5. Real API endpoint is handled by [supabase/functions/editor-api/index.ts:1132-1169](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1132)
6. On success, the UI calls [loadDocument()](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:53) to reload the transcript from persisted storage

## 2. AI or Deterministic?

### Finding: PASS — deterministic only on the Refine path

I found **no Anthropic / Claude / LLM call** anywhere in the Refine chain.

Negative evidence:

- `rg -n "Anthropic|anthropic|claude|messages.create|responses.create|completions|LLM" supabase\\functions\\editor-api\\index.ts src\\api\\workspaceService.ts src\\components\\TranscriptReassembly\\TranscriptReassemblyDialog.tsx`
  - returned no matches

Actual implementation evidence:

- Local preview path:
  - [src/api/workspaceService.ts:747-777](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:747)
  - loads preserved raw Deepgram response
  - runs `normalizeTranscriptResponse(rawResponse)`
  - compares stored metrics vs normalized candidate metrics
- Real API preview path:
  - [supabase/functions/editor-api/index.ts:977-1015](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:977)
  - same pattern: load raw Deepgram JSON, run `normalizeTranscriptResponse(rawResponse)`, compute metrics
- Local apply path:
  - [src/api/workspaceService.ts:889-924](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:889)
- Real API apply path:
  - [supabase/functions/editor-api/index.ts:1132-1169](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1132)

### What Refine is told it may change

There is **no prompt**. There are no model instructions. The behavior comes from deterministic normalization + reassembly code:

- [src/lib/transcript/normalize.ts](C:/Users/james/Projects/Depo-Pro/src/lib/transcript/normalize.ts)
- [src/lib/transcript/reassembly.ts](C:/Users/james/Projects/Depo-Pro/src/lib/transcript/reassembly.ts)

In practical terms, Refine is allowed to:

- rebuild speaker rows
- rebuild utterance rows
- rebuild word rows
- recalculate stored transcript metrics
- reset derived row state to the normalized candidate built from raw Deepgram data

It is **not** an AI copyedit pass.

## 3. Canonical or Display?

### Finding: FLAG — Refine mutates persisted transcript-derived rows

Refine is not confined to display.

#### Local apply path

- [src/api/workspaceService.ts:783-886](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:783) `replaceTranscriptDerivedRows(...)`
- [src/api/workspaceService.ts:789-807](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:789) deletes existing:
  - `transcript_words`
  - `transcript_utterances`
  - `transcript_speakers`
- [src/api/workspaceService.ts:866-882](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:866) inserts rebuilt rows

#### Real API apply path

- [supabase/functions/editor-api/index.ts:1019-1124](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1019) `replaceTranscriptDerivedRows(...)`
- [supabase/functions/editor-api/index.ts:1027-1045](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1027) deletes existing:
  - `transcript_words`
  - `transcript_utterances`
  - `transcript_speakers`
- [supabase/functions/editor-api/index.ts:1104-1120](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1104) inserts rebuilt rows

#### What is preserved vs rewritten

Preserved:

- raw Deepgram JSON in storage, loaded via:
  - [src/api/workspaceService.ts:761](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:761)
  - [supabase/functions/editor-api/index.ts:989](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:989)

Rewritten:

- persisted transcript-derived speakers/utterances/words
- review flags reset on rebuilt words:
  - [src/api/workspaceService.ts:855-859](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:855)
  - [supabase/functions/editor-api/index.ts:1093-1098](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1093)
- `working_text` cleared to `null` on rebuilt words:
  - [src/api/workspaceService.ts:859](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:859)
  - [supabase/functions/editor-api/index.ts:1097](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1097)

This means Refine does **not** mutate the preserved raw response, but it **does** replace the persisted canonical transcript rows the workspace loads.

## 4. Relationship to `paragraphDisplayImprovements.ts`

### Finding: PASS — separate path, not invoked by Refine

`paragraphDisplayImprovements.ts` is **not** part of the Refine apply/preview path.

Its current use is here:

- [src/lib/transcript/workspaceParagraphs.ts:70](C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:70)
  - `pendingContentParagraph.text = applyParagraphDisplayImprovements(...)`

That path only runs through `buildTranscriptParagraphs(...)`, which is currently consumed by:

- [src/lib/transcript/transcriptClipboard.ts:15](C:/Users/james/Projects/Depo-Pro/src/lib/transcript/transcriptClipboard.ts:15)
- [src/components/ExportScreen/exportDocx.ts:65](C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/exportDocx.ts:65)

The live editor path uses:

- [src/lib/buildEditorContent.ts:22](C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:22)
  - `buildWorkspaceParagraphs(...)`

Not:

- `buildTranscriptParagraphs(...)`

So the current workspace screen can still show un-normalized strings such as:

- `doctor Mohammad`
- `M. D.`
- `01:27PM`

even while export/clipboard may pass through display-only formatting transforms.

### Conclusion

Refine does **not** invoke `paragraphDisplayImprovements.ts`. They are separate systems:

- `Refine` = deterministic rebuild of persisted transcript rows from raw Deepgram JSON
- `paragraphDisplayImprovements.ts` = display/export/clipboard string formatting layer

## 5. Reversibility and Scope

### Finding: FLAG — preview is reversible, apply is not a one-click undo

Preview behavior:

- The dialog previews only metrics and blocked reasons
- It does **not** show per-word, per-utterance, or per-label text diffs
- Evidence:
  - [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:121-144](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:121)
  - [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:147-172](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:147)

Apply behavior:

- Once applied, the transcript is reloaded from persisted storage
- There is no dedicated `undo Refine` action
- The editor history is not available as a safety net here:
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:58](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx:58) sets `undoRedo: false`

### Could Refine rewrite or drop verbatim testimony?

Yes, in the limited sense that it replaces the stored utterance/word segmentation and labels with a rebuilt normalized candidate. That can change:

- utterance boundaries
- speaker row composition
- stored speaker labels
- stored word/utterance row set

However, it is not freeform rewriting text with an LLM. Its source of truth is the preserved raw Deepgram JSON.

### Does it touch the interpretive transforms removed from auto-apply?

No evidence found that Refine calls `paragraphDisplayImprovements.ts` at all, so the recently removed auto-apply interpretive display transforms are not being invoked by Refine.

## 6. Persistence

### Finding: FLAG — Refine persists immediately on Apply

Before preview:

- If the editor is dirty, `handlePreview()` calls `saveNow()` first
- Evidence:
  - [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:27-30](C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:27)
  - [src/context/DocumentContext.tsx:374-389](C:/Users/james/Projects/Depo-Pro/src/context/DocumentContext.tsx:374)

On apply:

- The rebuilt transcript is persisted immediately by the apply endpoint
- Local mode:
  - [src/api/workspaceService.ts:904-924](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:904)
- Real API mode:
  - [supabase/functions/editor-api/index.ts:1148-1169](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1148)

Audit persistence:

- It appends a transcript audit log entry after apply
- Local mode:
  - [src/api/workspaceService.ts:909-915](C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:909)
- Real API mode:
  - [supabase/functions/editor-api/index.ts:1152-1164](C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1152)

## Plain-English Answer

- **Does Refine use AI?**
  - No. I found no Anthropic / Claude / LLM call on the Refine path. It is deterministic rebuild/reassembly logic.

- **Does Refine touch canonical or only display?**
  - It touches persisted transcript-derived rows, not just display. It deletes and recreates speaker, utterance, and word rows from preserved raw Deepgram JSON.

- **Can Refine risk rewriting or dropping verbatim testimony?**
  - It does not free-write with AI, but it can change stored segmentation and derived transcript rows because it rebuilds them from raw Deepgram output. That is materially more invasive than a display-only formatter.

- **Is Refine reversible by the user?**
  - Not as a one-click undo. The preview is metrics-only, and applying persists immediately. The user can manually edit afterward, but there is no dedicated revert flow for Refine itself.

## Final Assessment

- **AI or rules?** PASS — rules only
- **Display-only?** FLAG — no, it rewrites persisted transcript-derived rows
- **Verbatim-safe?** MIXED — safer than AI free-rewrite, but still a canonical rebuild operation
- **Reversible in UI?** FLAG — no dedicated undo/revert path

