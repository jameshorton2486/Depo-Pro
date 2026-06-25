# Paragraph Structure Audit

Date: 2026-06-24  
Branch: `feature/stage3-workspace-core`  
Mode: audit-only

## Purpose

Determine whether Stage 3 can support persistent paragraph merge/split editing under the current frozen architecture:

- no schema changes
- no migrations
- no changes to frozen contract types in `src/api/types.ts`

If not, determine whether the feature is only feasible as session-local UI state.

## Verdict

**Persistent paragraph structure editing is blocked under the current frozen Stage 3 architecture.**

The current workspace can render multiple display blocks from one stored utterance, but save/reload persistence still operates strictly at **one `working_text` per `utterance_id`**. There is no persisted paragraph entity, no persisted paragraph-boundary overlay, and no existing mutation path for regrouping words across utterance boundaries.

Under current constraints, a merge/split tool could be implemented only as **session-local UI state**. It would not survive save/reload.

To make the feature truly persistent, product scope must expand in one of two directions:

1. Add a persisted paragraph-boundary overlay.
2. Add an owner-approved structural mutation path that rewrites canonical utterance grouping.

## Findings

### 1. The frozen contract has no paragraph model

The authoritative Stage 3 contract is still `EditorDocument { speakers, utterances, words }` with `Utterance.word_ids` as the ordering authority and `WorkingChange` keyed only by `utterance_id`.

Relevant files:

- [src/api/types.ts](C:/Users/james/projects/depo-pro/src/api/types.ts:21)
- [src/api/types.ts](C:/Users/james/projects/depo-pro/src/api/types.ts:36)
- [src/api/types.ts](C:/Users/james/projects/depo-pro/src/api/types.ts:71)
- [src/api/types.ts](C:/Users/james/projects/depo-pro/src/api/types.ts:76)

There is no paragraph identifier, no paragraph boundary list, and no paragraph mutation payload in the frozen contract.

### 2. The live editor does not use ProseMirror paragraphs

The TranscriptEditor disables TipTap paragraph nodes entirely with `paragraph: false`. The live document is pushed in through `buildEditorContent(...)` as custom `utterance` nodes.

Relevant files:

- [src/components/TranscriptEditor/TranscriptEditor.tsx](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:46)
- [src/components/TranscriptEditor/TranscriptEditor.tsx](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:125)
- [src/components/TranscriptEditor/TranscriptEditor.tsx](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:150)

This means there is no native paragraph node that could be split/merged and later serialized back through an existing paragraph-aware save path.

### 3. Current “paragraph” behavior is display segmentation, not persisted structure

`buildEditorContent(...)` now routes through the CFE. The formatter computes `segment_index`, `segment_count`, and `paragraph_index`, but these are presentation-layer outputs on formatted lines, not persisted transcript entities.

Relevant files:

- [src/lib/buildEditorContent.ts](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:155)
- [src/lib/buildEditorContent.ts](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:163)
- [src/lib/buildEditorContent.ts](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:200)
- [src/lib/format/types.ts](C:/Users/james/projects/depo-pro/src/lib/format/types.ts:78)
- [src/lib/format/types.ts](C:/Users/james/projects/depo-pro/src/lib/format/types.ts:90)
- [src/lib/format/types.ts](C:/Users/james/projects/depo-pro/src/lib/format/types.ts:91)
- [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:175)
- [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:176)
- [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:593)
- [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:605)

The important consequence is that Stage 3 currently has **rendered segments**, not a persisted paragraph model.

### 4. Save/reload collapses editor structure back to utterance-grain text

On editor updates, the workspace extracts text from `utterance` nodes and reassembles it into a `Map<utteranceId, string>`. If an utterance is visually split into multiple blocks, those blocks are concatenated back together before save.

Relevant files:

- [src/components/TranscriptEditor/TranscriptEditor.tsx](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:78)
- [src/components/TranscriptEditor/TranscriptEditor.tsx](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:87)
- [src/components/TranscriptEditor/TranscriptEditor.tsx](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:163)
- [src/lib/format/editorFragments.ts](C:/Users/james/projects/depo-pro/src/lib/format/editorFragments.ts:38)
- [src/lib/format/editorFragments.ts](C:/Users/james/projects/depo-pro/src/lib/format/editorFragments.ts:52)
- [src/lib/format/editorFragments.ts](C:/Users/james/projects/depo-pro/src/lib/format/editorFragments.ts:77)

This is the decisive constraint. Even if the UI created custom split/merge boundaries between display blocks, the current extraction path would persist only the flattened utterance text.

### 5. Workspace persistence only updates existing words and utterances

The client persistence path in `workspaceService` tokenizes one `working_text` string per `utterance_id`, updates `transcript_words`, then updates `transcript_utterances.text`.

Relevant files:

- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:284)
- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:316)
- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:333)
- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:359)
- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:360)
- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:625)

This path does not:

- create new utterances
- delete utterances
- change `word_ids` ownership across utterances
- persist display-only segment boundaries

### 6. The server save API enforces the same utterance-only model

The Edge Function save route validates only `utterance_id` + `working_text`, then calls `editor_apply_working_changes(...)`. The RPC loads existing words for that utterance, rewrites those word rows, and updates the matching `transcript_utterances` row.

Relevant files:

- [supabase/functions/editor-api/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:390)
- [supabase/functions/editor-api/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:425)
- [supabase/functions/editor-api/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:442)
- [supabase/functions/editor-api/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:443)
- [supabase/migrations/20260606113000_editor_api_working_rpc.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:7)
- [supabase/migrations/20260606113000_editor_api_working_rpc.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:39)
- [supabase/migrations/20260606113000_editor_api_working_rpc.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:47)
- [supabase/migrations/20260606113000_editor_api_working_rpc.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:77)
- [supabase/migrations/20260606113000_editor_api_working_rpc.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:87)

There is no current API for “merge these blocks” or “split this utterance at word X.”

## Architectural Implications

### What is possible today

The current architecture can support:

- render-time segmentation of a stored utterance into multiple display blocks
- reassembly of those blocks into one saved utterance string
- session-local UI controls that rearrange visible blocks temporarily

### What is not possible today

The current architecture cannot persist:

- a manual paragraph split inside one utterance
- a manual merge across multiple displayed segments if that boundary is not already implied by the canonical utterance
- any user-authored paragraph boundary that differs from what `cfe(...)` recomputes on reload

## Options Considered

### Option A — Session-local paragraph UI only

This is technically feasible.

Implementation shape:

- keep custom split/merge state in React/editor memory
- apply it between `buildEditorContent(...)` and render
- do not attempt to save it

Result:

- low-risk
- no schema work
- no contract change
- **not durable**

This does not satisfy the product requirement if the user expects save/reload persistence.

### Option B — Persist by mutating canonical utterances

This would mean paragraph editing is really an **utterance regrouping** feature.

Required behavior:

- split one `transcript_utterances` row into two or more rows, or merge multiple rows into one
- reassign existing `transcript_words.utterance_id` memberships
- rebuild `EditorDocument.utterances[].word_ids`
- add dedicated mutation endpoints and audit semantics

This might be possible without a schema migration, because the underlying tables already exist, but it is **not** available today and it is **not Layer-2-only**. It changes stored structural grouping in canonical transcript rows.

That is outside the current freeze-safe editor/save model and requires an explicit product decision.

### Option C — Persist a separate paragraph-boundary overlay

This is the clean Layer-2 approach.

Required behavior:

- persist paragraph boundary metadata separate from canonical words/utterances
- load that overlay before `buildEditorContent(...)`
- save merge/split operations into the overlay, not into canonical word ownership

This preserves Layer 1 best, but it requires new persisted metadata. Under the current constraints, that means schema/storage scope expansion.

## Recommended Decision

**Stop at the audit.**

Do not implement paragraph merge/split as a persistent feature under the current frozen assumptions.

If product wants durability, choose one of these scope changes explicitly:

1. Approve structural mutation of canonical utterances.
2. Approve a new persisted paragraph overlay.

If product does not want either scope change, the feature should be treated as **session-local only** and described that way in the UX.

## Safe Insertion Point If Scope Expands Later

If this work is approved later, the safest insertion point is:

1. load canonical `EditorDocument`
2. apply owner-approved structure layer
3. pass the structured result into `buildEditorContent(...)`
4. persist structure changes through a dedicated API, not `saveWorking`

The current `saveWorking` pipeline should not be repurposed for paragraph persistence because it is explicitly designed to flatten editor state back to utterance-grain text.
