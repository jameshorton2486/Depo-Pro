# DISPLAY IMPROVEMENTS VERIFICATION

Date: 2026-06-17
Mode: Read-only audit refreshed against current worktree
Scope:

- `src/lib/transcript/paragraphDisplayImprovements.ts`
- `src/lib/transcript/workspaceParagraphs.ts`
- current consumers of `buildTranscriptParagraphs(...)`

## Summary

- Canonical transcript storage: `PASS`
- Word timing / click-to-seek integrity: `PASS`
- Original raw token recoverability: `PASS`
- Current transform set limited to safe display normalization: `PASS`
- Interpretive transforms still auto-applied: `PASS (none found)`
- Commit boundary clarity: `PASS` for Group A file set

Bottom line:

- The current implementation applies display-only normalization on the shared paragraph-display path.
- It does not write back to canonical `document.words`, `document.utterances`, or persisted transcript rows.
- Audio sync still reads canonical word timing metadata from editor word marks, not transformed paragraph strings.
- The previously risky interpretive transforms described in the older draft audit are no longer present in the current `paragraphDisplayImprovements.ts`.
- The current transform set is limited to four low-risk display normalizations:
  - spaced initialism cleanup
  - `doctor -> Dr.`
  - `mister -> Mr.`
  - clock time format like `01:27PM -> 1:27 p.m.`

## Check 1 — Canonical untouched?

Result: `PASS`

### Current call site

`applyParagraphDisplayImprovements()` is currently called only in:

- [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:70)
  - inside `flushPendingContentParagraph()`
  - input: in-memory `TranscriptParagraph`
  - write target: `pendingContentParagraph.text`
  - effect: transforms only the derived display paragraph string before it is pushed into the paragraph model

### Current consumers of the transformed paragraph model

- [transcriptClipboard.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/transcriptClipboard.ts:15)
  - clipboard output only
- [exportDocx.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/exportDocx.ts:65)
  - DOCX paragraph specs only

### What it does not touch

No current call site writes back to:

- canonical `document.words[*].text`
- canonical `document.words[*].raw_text`
- canonical `document.utterances[*]`
- persistence paths in `workspaceService`
- transcript ingest / normalization in `normalize.ts`

Finding:

- The transform remains display-only in the current code path.
- No evidence of write-back into canonical transcript rows or raw Deepgram-derived structures.

## Check 2 — Timing / word-id integrity

Result: `PASS`

The current transforms can change rendered token shape:

- `M. D. -> M.D.`
- `doctor Etminan -> Dr. Etminan`
- `mister Nunez -> Mr. Nunez`
- `01:27PM -> 1:27 p.m.`

These do **not** alter the word-level timing backbone because click-to-seek and playback highlighting still read canonical editor word metadata.

### Word-level timing path

- [buildEditorContent.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:59)
  builds inline word nodes from `utt.word_ids`
- [buildEditorContent.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:71)
  attaches `wordMark` attrs including:
  - `word_id`
  - `utterance_id`
  - `speaker_id`
  - `start_time`
  - `end_time`
  - `confidence`
- [TranscriptEditor.tsx](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx:183)
  click-to-seek reads canonical word timing data
- [TranscriptEditor.tsx](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx:230)
  playback highlight uses `findWordAtTime(...)`

### Paragraph provenance

The paragraph model preserves source provenance:

- [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:26)
  `sourceWordIds: string[]`
- [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:113)
  merged paragraphs concatenate source word ids instead of replacing them

Finding:

- Word timing and click-to-seek do not read transformed paragraph text anywhere in the current implementation.
- No evidence that the current display transforms corrupt `word_id -> timing` mapping.

## Check 3 — Reversibility / provenance

Result: `PASS`

The original remains recoverable because the transform runs only on a derived paragraph string.

Canonical original sources remain:

- `raw_text` on each word
- `working_text ?? raw_text` as the canonical editable token path
- `sourceWordIds` on each derived paragraph

Relevant code:

- [workspaceService.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:152)
- [workspaceService.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:153)

Finding:

- The current display normalization is reversible at the data layer because it never overwrites canonical text.

## Check 4 — Transform safety classification

Result: `PASS`

### Current transform set

From [paragraphDisplayImprovements.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/paragraphDisplayImprovements.ts:1):

1. `normalizeSpacedInitialisms`
   - example: `M. D. -> M.D.`, `U. S. A. -> U.S.A.`
   - classification: pure formatting

2. `normalizeHonorificWords`
   - example: `doctor Etminan -> Dr. Etminan`
   - example: `mister Nunez -> Mr. Nunez`
   - classification: display normalization / low risk

3. `normalizeClockTimes`
   - example: `01:27PM -> 1:27 p.m.`
   - classification: display formatting / low risk

### Explicitly absent now

The following earlier interpretive transforms are **not** present in the current file:

- date rewrite
- cause-number rewrite
- numeric reconstruction
- repeated-token dedupe
- hyphenation rewrite

This is also enforced by current tests:

- [paragraphDisplayImprovements.test.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/paragraphDisplayImprovements.test.ts:14)
  asserts no interpretive rewrite of `4 64th` or `PLLC, PLLC, PLLC`
- [paragraphDisplayImprovements.test.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/paragraphDisplayImprovements.test.ts:21)
  asserts no rewrite of dates, cause numbers, or hyphenation

Finding:

- No currently auto-applied interpretive/destructive transform remains in the active display-normalization file.

## Check 5 — Consolidation safety

Result: `PASS`

`buildTranscriptParagraphs(...)` now merges consecutive same-label content paragraphs while preserving provenance.

Evidence:

- [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:109)
  merges only when current and next paragraphs have the same content kind and same label
- [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:116)
  preserves `sourceUtteranceIds`
- [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:117)
  preserves `sourceWordIds`

Focused regression coverage exists:

- [workspaceParagraphs.test.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.test.ts:153)
  proves consecutive same-speaker answer utterances merge
- same test proves the merged paragraph preserves the full source word-id set

Finding:

- Consolidation changes grouping only.
- It does not drop provenance and does not cross speaker/label boundaries blindly.

## Final determination

- Canonical safe: `PASS`
- Timings safe: `PASS`
- Original recoverable: `PASS`
- Current transform set legally safer than prior draft: `PASS`
- Commit boundary aligned to actual code: `PASS`

Recommendation:

- Group A is safe to commit as display-only normalization plus paragraph consolidation, because the current transform file is now limited to non-interpretive formatting rules and the paragraph model preserves provenance.
