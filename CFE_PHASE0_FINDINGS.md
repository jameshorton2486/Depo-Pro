# CFE Phase 0 Findings

## A. Model & render map

Status: **Mostly confirmed, with one current-HEAD divergence from the prompt assumptions.**

- The frozen API contract still models the transcript as `EditorDocument { speakers, utterances, words }`; `Word.raw_text` is immutable, `Word.text` is the working/display text, `Utterance.word_ids` carries utterance ordering, and there is no paragraph entity in the contract (`src/api/types.ts:8`, `src/api/types.ts:10`, `src/api/types.ts:11`, `src/api/types.ts:21`, `src/api/types.ts:36`).
- The workspace document materialization path preserves that same shape: `buildEditorDocumentFromSnapshot()` assembles `utterances` from `wordIdsByUtterance`, and each word uses `working_text ?? raw_text` for display without mutating `raw_text` (`src/api/workspaceService.ts:76`, `src/api/workspaceService.ts:108`, `src/api/workspaceService.ts:109`).
- The render entry point is `TranscriptEditor` → `buildEditorContent(state.document, languageMap)` → TipTap `setContent`, so the editor currently consumes an already-built ProseMirror JSON tree rather than a separate formatting layer output (`src/components/TranscriptEditor/TranscriptEditor.tsx:134`, `src/components/TranscriptEditor/TranscriptEditor.tsx:135`, `src/components/TranscriptEditor/TranscriptEditor.tsx:160`).
- The prompt assumption that `buildEditorContent` renders one block per utterance is **refuted on current HEAD**. Legacy behavior still exists in `buildLegacyEditorContent()`, but the active path is gated by `ENABLE_DISPLAY_TURN_SEGMENTATION = true` and currently segments utterances into multiple blocks keyed by `segment_index` / `segment_count` (`src/lib/buildEditorContent.ts:5`, `src/lib/buildEditorContent.ts:21`, `src/lib/buildEditorContent.ts:151`, `src/lib/buildEditorContent.ts:235`, `src/lib/buildEditorContent.ts:286`).
- Geometry/pagination/spacing concerns are currently spread across:
  - block construction, speaker labeling, per-word marks, and page-break node insertion in `buildEditorContent` (`src/lib/buildEditorContent.ts:37`, `src/lib/buildEditorContent.ts:58`, `src/lib/buildEditorContent.ts:77`, `src/lib/buildEditorContent.ts:243`, `src/lib/buildEditorContent.ts:268`);
  - line-count and page math in `buildPages()` / `estimateLineCount()` (`src/editor/pagination.ts:14`, `src/editor/pagination.ts:33`, `src/editor/pagination.ts:55`);
  - save-grain reassembly in `extractUtteranceTexts()` (`src/components/TranscriptEditor/TranscriptEditor.tsx:89`, `src/components/TranscriptEditor/TranscriptEditor.tsx:163`, `src/components/TranscriptEditor/TranscriptEditor.tsx:172`);
  - export-time plain-text assembly in `ExportScreen` (`src/components/ExportScreen/ExportScreen.tsx:49`, `src/components/ExportScreen/ExportScreen.tsx:70`).
- The exact insertion point for a CFE is therefore **upstream of `buildEditorContent` and downstream of `EditorDocument`**: `TranscriptEditor` should consume a `FormattedDocument` emitted by a pure formatter instead of letting `buildEditorContent` keep ad hoc geometry and spacing logic inline (`src/components/TranscriptEditor/TranscriptEditor.tsx:135`, `src/lib/buildEditorContent.ts:235`, `src/editor/pagination.ts:55`).

## B. CFE seam

Status: **Confirmed. A pure seam exists.**

- The clean seam is a new formatter module called immediately before `buildEditorContent` inside `TranscriptEditor`, with `buildEditorContent` reduced to a view adapter from formatted lines/blocks into TipTap JSON (`src/components/TranscriptEditor/TranscriptEditor.tsx:135`, `src/lib/buildEditorContent.ts:235`).
- Nothing in the current editor render path requires I/O. `buildEditorContent()` is already a pure transform from in-memory document state to ProseMirror JSON, and `buildPages()` is already a pure helper over block metadata (`src/lib/buildEditorContent.ts:235`, `src/editor/pagination.ts:55`).
- A CFE of the form `cfe(doc, geometry, registry) -> FormattedDocument` is therefore compatible with the current runtime as a pure computation layer, with no mutation and no network dependency required at the seam (`src/components/TranscriptEditor/TranscriptEditor.tsx:135`, `src/editor/pagination.ts:55`).
- The same seam can be reused by the current export surface because `ExportScreen` independently rebuilds transcript text from `docState.document.utterances` and `word_ids`; that ad hoc assembly can be replaced with the same formatted output rather than a second formatting implementation (`src/components/ExportScreen/ExportScreen.tsx:49`, `src/components/ExportScreen/ExportScreen.tsx:70`).

## C. Sync-safety check

Status: **Confirmed for a read-only formatting pass.**

- The model preserves immutable raw tokens: `Word.raw_text` is explicitly immutable in the API contract, while display/edit operations use `Word.text` / `working_text` (`src/api/types.ts:10`, `src/api/types.ts:11`, `src/api/workspaceService.ts:108`, `src/api/workspaceService.ts:109`).
- The editor render path keeps source-word linkage intact by emitting each visible token as a text node marked with `wordMark` metadata carrying `word_id`, timing, confidence, speaker, and review state (`src/lib/buildEditorContent.ts:65`, `src/lib/buildEditorContent.ts:77`, `src/lib/buildEditorContent.ts:199`, `src/lib/buildEditorContent.ts:227`).
- The save path remains keyed to existing utterances and existing word rows. In the local persistence path, `saveWorking` tokenizes one `working_text` string per `utterance_id`, remaps it across the existing utterance’s words, updates `transcript_words`, updates `transcript_utterances.text`, and appends audit entries (`src/context/DocumentContext.tsx:319`, `src/context/DocumentContext.tsx:321`, `src/api/workspaceService.ts:316`, `src/api/workspaceService.ts:333`, `src/api/workspaceService.ts:359`, `src/api/workspaceService.ts:360`).
- The Edge/RPC path does the same thing server-side: `editor_apply_working_changes` loads the utterance’s existing `word_id` array in order, splits the submitted utterance text into tokens, updates those existing rows, updates `transcript_utterances.text`, and writes an append-only audit log (`supabase/migrations/20260606113000_editor_api_working_rpc.sql:7`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:47`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:48`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:64`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:80`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:87`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:92`).
- That means a read-only formatter that consumes word-units and emits formatted lines carrying `source_word_ids` can remain sync-safe: it does not need to alter `word_id`, `raw_text`, timestamps, or audio linkage because the live editor already preserves those as the underlying identity layer (`src/api/types.ts:8`, `src/api/types.ts:11`, `src/lib/buildEditorContent.ts:77`).

## D. Paragraph split/merge gap

Status: **Confirmed gap. This is the BETA_FREEZE stop-and-ask.**

- No current paragraph split/merge operation exists in the workspace model or persistence layer. The editable grain today is:
  - utterance-grain text changes via `workingTexts` / `saveWorking` (`src/context/DocumentContext.tsx:319`, `src/context/DocumentContext.tsx:321`, `src/api/workspaceService.ts:625`);
  - reviewed/unreviewed word flags (`src/api/types.ts:86`, `src/api/types.ts:87`, `src/api/workspaceService.ts:388`, `src/api/workspaceService.ts:400`, `src/api/workspaceService.ts:411`);
  - speaker edits plus optional `utterance_speaker_map` reassignment (`src/api/types.ts:90`, `src/api/workspaceService.ts:457`, `src/api/workspaceService.ts:504`, `supabase/functions/editor-api/index.ts:503`, `supabase/functions/editor-api/index.ts:530`).
- There is no paragraph entity in the frozen API contract to target for regrouping, and the existing save RPC only updates text for an existing `utterance_id`; it does not create, delete, split, or merge utterance/grouping rows (`src/api/types.ts:21`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:7`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:87`).
- A sync-safe regroup would therefore have to change stored grouping, not token identity. The minimally affected stored fields/rows would be:
  - `transcript_utterances` boundaries and text;
  - the `utterance_id` membership of affected `transcript_words`;
  - the corresponding `EditorDocument.utterances[].word_ids` ordering projection (`src/api/workspaceService.ts:76`, `src/api/workspaceService.ts:108`, `src/api/workspaceService.ts:359`, `src/api/workspaceService.ts:360`, `src/api/workspaceService.ts:508`, `src/api/workspaceService.ts:521`).
- Representation option **A — mutate utterances**:
  - split/merge would rewrite `transcript_utterances` rows and reassign existing `transcript_words.utterance_id` memberships;
  - schema impact: likely no new table, but new mutation semantics/endpoints and nontrivial persistence logic would be required;
  - freeze posture: still a stop-and-ask because it changes persistence behavior and structural grouping semantics.
- Representation option **B — Layer-2 paragraph overlay**:
  - leave canonical utterances untouched and persist a separate paragraph-boundary overlay keyed to existing word identities;
  - schema impact: requires a new overlay field/table or equivalent persisted boundary structure;
  - freeze posture: explicit schema change, therefore clearly outside the freeze-safe Phase 1–4 formatter work.
- Conclusion: paragraph regroup is **not** present on HEAD and should remain a separate owner-approved decision before implementation. The CFE itself does not require it.

## E. Freeze ledger

Status: **Phases 1–4 appear additive and freeze-safe; paragraph regroup is the only obvious owner-gated item.**

- Freeze-safe, additive, no-schema/no-dependency work supported by the current codebase:
  - introduce a pure formatter module that reads `EditorDocument` and emits formatted lines/blocks;
  - route `TranscriptEditor` rendering through that formatter before TipTap JSON construction;
  - replace `ExportScreen`’s ad hoc transcript assembly with the same formatted output;
  - consolidate current geometry/pagination logic now split between `buildEditorContent` and `pagination.ts` into one formatter-owned configuration path (`src/components/TranscriptEditor/TranscriptEditor.tsx:135`, `src/lib/buildEditorContent.ts:235`, `src/editor/pagination.ts:55`, `src/components/ExportScreen/ExportScreen.tsx:49`).
- Existing human edit surfaces already cover review flags, speaker assignment, and utterance-grain working text, so a read-only formatter does not need new persistence primitives for phases 1–4 (`src/context/DocumentContext.tsx:283`, `src/context/DocumentContext.tsx:319`, `src/api/workspaceService.ts:388`, `src/api/workspaceService.ts:457`).
- Hidden dependency check: none of the audited Phase 1–4 formatter concerns force schema change by themselves. The only audited feature that crosses that line is paragraph split/merge/regroup because the current persistence layer has no structural regroup operation (`supabase/migrations/20260606113000_editor_api_working_rpc.sql:7`, `src/api/workspaceService.ts:316`, `src/api/workspaceService.ts:359`, `src/api/workspaceService.ts:504`).
- Additional current-HEAD caveat: display segmentation is already active in `buildEditorContent`, so a future CFE will need to either absorb or explicitly replace that display-layer behavior rather than assuming a clean one-block-per-utterance baseline (`src/lib/buildEditorContent.ts:5`, `src/lib/buildEditorContent.ts:151`, `src/lib/buildEditorContent.ts:235`).

## F. Geometry-as-config note

Status: **Confirmed feasible.**

- Current geometry/pagination values are already centralized enough to be lifted into an injected config object: `LINES_PER_PAGE`, `CHARS_PER_LINE`, `AVG_CHARS_PER_WORD`, and the role-sensitive `estimateLineCount()` logic all live in one module today (`src/editor/pagination.ts:14`, `src/editor/pagination.ts:15`, `src/editor/pagination.ts:16`, `src/editor/pagination.ts:33`, `src/editor/pagination.ts:55`).
- `buildEditorContent()` already treats pagination as data supplied by `buildPages()` rather than hardwiring page-break decisions into the editor component itself, which makes a `GeometryProfile` handoff mechanically straightforward (`src/lib/buildEditorContent.ts:37`, `src/lib/buildEditorContent.ts:243`, `src/lib/buildEditorContent.ts:268`).
- The standards registry file is now present in the repo under the canonical standards corpus (`Canonical Standards Folder/abbreviation_registry.json`), and the Wave 21 standards/design documents are also present there (`Canonical Standards Folder/abbreviation_registry.json`, `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md`).
- In the audited runtime surfaces, no code path currently consumes that registry; formatting consumers are still building output from local document state and hardcoded logic, not an injected standards/config layer (`src/components/TranscriptEditor/TranscriptEditor.tsx:135`, `src/lib/buildEditorContent.ts:235`, `src/components/ExportScreen/ExportScreen.tsx:49`, `src/api/workspaceService.ts:625`).
- Conclusion: DP-011 geometry can and should be injected as `GeometryProfile` data instead of being hardcoded into formatter logic, and the current code organization does not block that approach.

## Audit verdict

- A. Model & render map: confirmed, except current HEAD already diverges from the old one-block-per-utterance assumption via display segmentation.
- B. CFE seam: confirmed; the seam is immediately upstream of `buildEditorContent`.
- C. Sync-safety check: confirmed for a pure read-only formatter over existing word identities.
- D. Paragraph split/merge gap: confirmed absent; this is the BETA_FREEZE stop-and-ask.
- E. Freeze ledger: confirmed; phases 1–4 are additive, regroup is owner-gated.
- F. Geometry-as-config note: confirmed; current pagination values can be lifted into injected config.
