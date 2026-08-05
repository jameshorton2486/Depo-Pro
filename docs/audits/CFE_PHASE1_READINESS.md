# CFE Phase 1 Readiness

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: read-only audit

## 1. Readiness Verdict

`PASS`

Phase 1 implementation can proceed without schema changes, migrations, or new persistence structures.

The important current-HEAD caveat is that the repository is **not** a blank slate anymore:

- a `cfe()` module already exists at [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:200)
- Workspace already calls it through [buildEditorContent()](/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:164)
- Export already calls it through [ExportScreen](/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/ExportScreen.tsx:53)

So the implementation problem is no longer “where should CFE go?” in the abstract. It is:

- finish aligning the existing formatter to `DP-010`, `DP-011`, and `DP-012`
- consolidate remaining duplicated formatting logic around the existing CFE seam
- avoid introducing any Layer-1 mutation or schema work

## 2. CFE Insertion Point

### Current formatting entry point

- [src/components/TranscriptEditor/TranscriptEditor.tsx:124]( /C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx:124 ) computes `editorContent` from `buildEditorContent(state.document, languageMap)`
- [src/lib/buildEditorContent.ts:164]( /C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:164 ) is the active Workspace content builder
- [src/lib/buildEditorContent.ts:172]( /C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:172 ) is the exact current point where `cfe(doc, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry)` is invoked

### Exact insertion seam

The clean seam remains:

- downstream of `EditorDocument`
- upstream of TipTap JSON block construction

Concretely:

- `TranscriptEditor` -> `buildEditorContent()` -> `cfe()` -> TipTap `utterance` nodes

If further Phase 1 work is done, the safest insertion/refactor point is still [src/lib/buildEditorContent.ts:172](/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:172), because the formatter output is already flowing through that function before `editor.commands.setContent(...)` at [src/components/TranscriptEditor/TranscriptEditor.tsx:150](/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx:150).

## 3. Implementation Map

| Function | File | Responsibility |
|---|---|---|
| `buildEditorContent()` | [src/lib/buildEditorContent.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:164) | Active Workspace render adapter from `EditorDocument` to TipTap JSON; currently invokes `cfe()` and maps formatted lines into `utterance` nodes |
| `cfe()` | [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:200) | Current canonical formatting core: line building, spacing decisions, speaker prefix formatting, segmentation, pagination handoff, low-confidence / uncertain-speaker flags |
| `classifyUtteranceParagraphs()` | [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:62) | Current display segmentation by speaker transitions within utterances |
| `buildSpacingRules()` | [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:104) | Consumes `abbreviation_registry.json` into runtime spacing rules |
| `buildTrailingSpace()` | [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:171) | Applies current sentence-boundary vs abbreviation spacing |
| `formatSpeakerPrefix()` | [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:187) | Current `Q.` / `A.` / uppercased speaker-label prefix formatting |
| `buildPages()` | [src/editor/pagination.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/pagination.ts:57) | Geometry / page assignment from word-count estimates and role-sensitive line counts |
| `estimateLineCount()` | [src/editor/pagination.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/pagination.ts:31) | Current page geometry math using injected `GeometryProfile` |
| `getBlockRole()` | [src/editor/pagination.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/pagination.ts:18) | Maps speaker roles into `Q` / `A` / `COLLOQUY` blocks |
| `getUtterancePrefix()` | [src/editor/utteranceRender.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/utteranceRender.ts:18) | Legacy / fallback prefix formatting used by `UtteranceNode.renderHTML()` when no explicit `prefix_text` is supplied |
| `abbreviateUtteranceLabel()` | [src/editor/utteranceRender.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/utteranceRender.ts:4) | Legacy colloquy label shortening |
| `UtteranceNode.renderHTML()` | [src/extensions/UtteranceNode.ts](/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts:34) | DOM rendering of line numbers, prefixes, role attrs, and content wrapper |
| `serializeFormattedDocument()` | [src/lib/format/serialize.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/serialize.ts:17) | Serializes formatted lines into plain-text transcript output |
| `serializeFormattedLine()` | [src/lib/format/serialize.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/serialize.ts:11) | Current line-level export serialization |
| `ExportScreen.transcriptText` | [src/components/ExportScreen/ExportScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/ExportScreen.tsx:53) | Current non-Workspace consumer of `cfe()` + `serializeFormattedDocument()` |
| `extractUtteranceTextsFromDoc()` / `reassembleUtteranceTexts()` | [src/lib/format/editorFragments.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/editorFragments.ts:35) | Reassembles split display fragments back into utterance-grain text for save diffing |

## 4. Existing Formatting Logic Inventory

### Spacing

- `buildSpacingRules()` in [src/lib/format/cfe.ts:104](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:104)
- `buildTrailingSpace()` in [src/lib/format/cfe.ts:171](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:171)
- `abbreviation_registry.json` consumption through [src/lib/format/abbreviationRegistry.ts:1](/C:/Users/james/Projects/Depo-Pro/src/lib/format/abbreviationRegistry.ts:1)

### Punctuation formatting

- current sentence-boundary behavior is implicit inside `buildTrailingSpace()` at [src/lib/format/cfe.ts:171](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:171)
- no dedicated Phase 1 punctuation pass exists yet for `DP-012 §1`, `§2`, or `§2b`

### Speaker-label formatting

- `formatSpeakerPrefix()` at [src/lib/format/cfe.ts:187](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:187)
- `getUtterancePrefix()` / `abbreviateUtteranceLabel()` at [src/editor/utteranceRender.ts:18](/C:/Users/james/Projects/Depo-Pro/src/editor/utteranceRender.ts:18) and [src/editor/utteranceRender.ts:4](/C:/Users/james/Projects/Depo-Pro/src/editor/utteranceRender.ts:4)
- `UtteranceNode.renderHTML()` fallback prefix logic at [src/extensions/UtteranceNode.ts:57](/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts:57)

### Paragraph formatting

- `classifyUtteranceParagraphs()` at [src/lib/format/cfe.ts:62](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:62)
- current logic is actually segmentation-by-speaker-runs, not full DP-012 paragraph authority
- hard paragraph breaks inside testimony remain only partially representable per [docs/audits/ERROR_COVERAGE_MATRIX.md](/C:/Users/james/Projects/Depo-Pro/docs/audits/ERROR_COVERAGE_MATRIX.md:27)

### Geometry

- `DEFAULT_GEOMETRY_PROFILE` at [src/lib/format/geometryProfile.ts:3](/C:/Users/james/Projects/Depo-Pro/src/lib/format/geometryProfile.ts:3)
- `estimateLineCount()` and `buildPages()` at [src/editor/pagination.ts:31](/C:/Users/james/Projects/Depo-Pro/src/editor/pagination.ts:31) and [src/editor/pagination.ts:57](/C:/Users/james/Projects/Depo-Pro/src/editor/pagination.ts:57)
- line / page attrs written in `buildEditorContent()` at [src/lib/buildEditorContent.ts:184](/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:184)
- rendered in `UtteranceNode.renderHTML()` at [src/extensions/UtteranceNode.ts:69](/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts:69)

## 5. Consumers

### Confirmed current consumers

- `Workspace`
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:124](/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx:124)
  - [src/lib/buildEditorContent.ts:172](/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:172)

- `ExportScreen` text serialization
  - [src/components/ExportScreen/ExportScreen.tsx:53](/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/ExportScreen.tsx:53)

### Unexpected consumer result

- No distinct current `Copy Transcript` consumer was found in `src/`
- current non-Workspace consumer is `ExportScreen`, not a clipboard / copy surface
- `serializeFormattedDocument()` exists and is the obvious reusable seam for a future `Copy Transcript` consumer

## 6. Layer-1 Safety

Verdict: `PASS`

Confirmed:

- `word_id` preserved
  - contract: [src/api/types.ts:8](/C:/Users/james/Projects/Depo-Pro/src/api/types.ts:8)
  - load path: [src/api/workspaceService.ts:107](/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:107)
  - formatter output preserves `source_word_ids`: [src/lib/format/cfe.ts:251](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:251)

- `raw_text` preserved
  - contract: [src/api/types.ts:11](/C:/Users/james/Projects/Depo-Pro/src/api/types.ts:11)
  - load path: [src/api/workspaceService.ts:109](/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:109)
  - RPC does not overwrite it: [supabase/migrations/20260606113000_editor_api_working_rpc.sql:77](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:77)

- timestamps preserved
  - contract: [src/api/types.ts:14](/C:/Users/james/Projects/Depo-Pro/src/api/types.ts:14)
  - load path: [src/api/workspaceService.ts:112](/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:112)
  - formatter carries through to words and lines: [src/lib/format/cfe.ts:259](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:259)

- confidence preserved
  - contract: [src/api/types.ts:16](/C:/Users/james/Projects/Depo-Pro/src/api/types.ts:16)
  - load path: [src/api/workspaceService.ts:114](/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:114)
  - formatter carries through and emits `LOW_CONFIDENCE`: [src/lib/format/cfe.ts:238](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:238)

No Phase 1 authority requires Layer-1 mutation. The existing save RPC updates working/display text and utterance text only, not `raw_text`, timing, or IDs:

- [supabase/migrations/20260606113000_editor_api_working_rpc.sql:77](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:77)
- [supabase/migrations/20260606113000_editor_api_working_rpc.sql:87](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:87)

## 7. Schema Impact

Verdict: `PASS`

Confirmed:

- no schema changes required
- no migrations required
- no new persistence structures required

Basis:

- `EditorDocument` already contains the input identity/timing fields CFE needs: [src/api/types.ts:36](/C:/Users/james/Projects/Depo-Pro/src/api/types.ts:36)
- current CFE is a pure in-memory transform: [src/lib/format/cfe.ts:200](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:200)
- phase-0 and data-reality audits already concluded CFE Phase 1 can begin without schema work: [docs/audits/CFE_PHASE0_FINDINGS.md](/C:/Users/james/Projects/Depo-Pro/docs/audits/CFE_PHASE0_FINDINGS.md:62), [docs/audits/DATA_REALITY_FINDINGS.md](/C:/Users/james/Projects/Depo-Pro/docs/audits/DATA_REALITY_FINDINGS.md:27)

The only known structural gap is hard paragraph-boundary representation for future AI/structuring work, which is out of Phase 1 scope:

- [docs/audits/ERROR_COVERAGE_MATRIX.md:27](/C:/Users/james/Projects/Depo-Pro/docs/audits/ERROR_COVERAGE_MATRIX.md:27)
- [docs/audits/CFE_PHASE0_FINDINGS.md:45](/C:/Users/james/Projects/Depo-Pro/docs/audits/CFE_PHASE0_FINDINGS.md:45)

## 8. Authority Compliance

### Authority coverage present

- spacing: `DP-010` + `abbreviation_registry.json`
  - [DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md:67](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md:67)
  - [abbreviation_registry.json:5](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/abbreviation_registry.json:5)

- geometry: `DP-011`
  - [DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:6](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:6)

- punctuation: `DP-012 §1`, `§2`, `§2b`
  - [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:23](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:23)
  - [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:40](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:40)
  - [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:50](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:50)

- capitalization: `DP-012 §5`
  - [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:83](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:83)

- number/date normalization: `DP-012 §4`
  - [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:69](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:69)

- garble flags: `DP-012 §6`
  - [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:106](/C:/Users/james/Projects/Depo-Pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:106)

### Missing implementation authority

None.

### Missing implementation coverage on current HEAD

- no dedicated implementation for `DP-012 §1`, `§2`, `§2b`, `§4`, `§5`, or `§6`
- paragraph handling is only partial relative to `DP-012 §7`
- current speaker-label formatting is still split between `cfe.ts` and `utteranceRender.ts`

So the problem is implementation completeness, not standards-authority absence.

## 9. Phase 1 Scope Map

| Implementation Target | Authority Source | Consumer |
|---|---|---|
| Honorific spacing | `DP-010` + `abbreviation_registry.json` | Workspace, ExportScreen, future Copy Transcript |
| Sentence-boundary spacing | `DP-010` + `abbreviation_registry.json` | Workspace, ExportScreen, future Copy Transcript |
| Speaker-label colon spacing | `DP-010` + `abbreviation_registry.json` | Workspace, ExportScreen, future Copy Transcript |
| Quote / dash interruption handling | `DP-012 §1` | Workspace, ExportScreen, future Copy Transcript |
| Question-mark placement | `DP-012 §2` | Workspace, ExportScreen, future Copy Transcript |
| Dash-adjacent comma cleanup | `DP-012 §2b` | Workspace, ExportScreen, future Copy Transcript |
| Number/date normalization | `DP-012 §4` | Workspace, ExportScreen, future Copy Transcript |
| Direct-address capitalization | `DP-012 §5` | Workspace, ExportScreen, future Copy Transcript |
| Inline garble flag rendering | `DP-012 §6` | Workspace, ExportScreen, future Copy Transcript |
| Tab / line / page geometry metadata | `DP-011` | Workspace |
| Return-to-margin continuation behavior | `DP-011` + `DP-012 §7` | Workspace, ExportScreen, future Copy Transcript |
| Resumption by-line formatting | `DP-012 §9` | Workspace, ExportScreen, future Copy Transcript |

## 10. Files Affected

Primary implementation files:

- [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:200)
- [src/lib/buildEditorContent.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:164)
- [src/lib/format/serialize.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/serialize.ts:17)
- [src/editor/pagination.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/pagination.ts:57)
- [src/extensions/UtteranceNode.ts](/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts:34)

Secondary / likely cleanup targets:

- [src/editor/utteranceRender.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/utteranceRender.ts:18)
- [src/lib/format/grouping.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/grouping.ts:1)
- [src/components/ExportScreen/ExportScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/ExportScreen.tsx:53)
- [src/lib/format/types.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/types.ts:1)
- [src/lib/format/cfe.test.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.test.ts:1)

## 11. Known Exclusions

Out of scope for Phase 1:

- schema changes
- migrations
- persistence redesign
- paragraph-boundary overlay / AI structuring representation
- virtualization
- DOCX rewrite
- certification/export persistence fixes
- speaker reassignment logic
- name correction logic
- content reconstruction

Also not currently present as a distinct runtime consumer:

- `Copy Transcript`

## 12. Recommended First Commit Scope

Because `HEAD` already contains an initial CFE skeleton, the best first implementation commit should be a **delta commit**, not a brand-new formatter introduction.

Recommended first commit scope:

1. extend [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:200) with explicit `DP-012` punctuation, normalization, capitalization, and garble-flag passes
2. consolidate remaining speaker-prefix / label logic so `cfe.ts` is authoritative and [src/editor/utteranceRender.ts](/C:/Users/james/Projects/Depo-Pro/src/editor/utteranceRender.ts:18) becomes fallback-free or trivial
3. keep [src/lib/buildEditorContent.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:164) as a pure render adapter from `FormattedDocument` into TipTap blocks
4. keep [src/components/ExportScreen/ExportScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/ExportScreen.tsx:53) on the same `cfe()` + serializer path
5. add/expand unit coverage in [src/lib/format/cfe.test.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.test.ts:1) for the ratified `DP-012` rules and garble rendering

## Bottom Line

Phase 1 is ready to implement.

The standards authority is complete, the persistence model is sufficient, and the insertion seam already exists on current `HEAD`.

The main engineering task is now to finish the formatter that is already in the tree and make it the single authority for:

- spacing
- punctuation
- normalization
- capitalization
- flag rendering
- geometry metadata

without mutating Layer 1 or opening a schema decision.
