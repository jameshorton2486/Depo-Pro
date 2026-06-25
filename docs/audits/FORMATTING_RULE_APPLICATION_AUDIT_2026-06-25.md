# Formatting Rule Application Audit

Date: 2026-06-25
Branch: `feature/stage3-workspace-core`
Auditor: Codex

## Scope

Audit the live application paths for the following rules:

1. Quote before interrupting dash
2. Question mark placement with closing quotes
3. Inline garble flags
4. Three-tab paragraph rule
5. Number and date formatting
6. Direct-address capitalization
7. `No.` spacing in sentence vs identifier contexts

## Primary finding

The primary transcript render and export paths already inherit formatting from the Canonical Formatting Engine:

- Workspace display: [src/lib/buildEditorContent.ts](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:155)
  - `buildEditorContent()` calls `cfe(...)` when display turn segmentation is enabled.
  - `ENABLE_DISPLAY_TURN_SEGMENTATION` is currently `true` in [src/lib/format/grouping.ts](C:/Users/james/projects/depo-pro/src/lib/format/grouping.ts:4).
- Export TXT / package text: [src/components/ExportScreen/ExportScreen.tsx](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:53)
  - `transcriptText` is built from `serializeFormattedDocument(cfe(...))`.

This means the live workspace and export screen do not bypass CFE for transcript formatting.

## Rule-by-rule verdict

### 1. Quote before interrupting dash

Implemented in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:366) via `normalizeInterruptingDash()`.

Verdict: implemented in formatter and inherited by workspace/export.

### 2. Question mark placement

Implemented in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:376) via `normalizeQuotedQuestionMark()`.

Verdict: implemented in formatter and inherited by workspace/export.

### 3. Inline garble flags

Implemented in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:482) through `buildInlineFlag()` and emitted in `cfe()`.

Verdict: implemented in formatter and inherited by workspace/export.

### 4. Three-tab paragraph rule

Partial implementation only.

What exists:

- Geometry metadata is attached to formatted lines in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:607).
- That metadata is passed into TipTap node attributes in [src/lib/buildEditorContent.ts](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:197).
- The node stores the geometry attributes in [src/extensions/UtteranceNode.ts](C:/Users/james/projects/depo-pro/src/extensions/UtteranceNode.ts:15).

What is missing:

- The browser workspace CSS does not consume those geometry attributes.
- Layout is still hardcoded in [src/index.css](C:/Users/james/projects/depo-pro/src/index.css:71) using fixed grid columns, not tab-stop-driven paragraph rendering.

Verdict: metadata present, live visual enforcement not present.

### 5. Number and date formatting

Implemented in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:386) and [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:413) via `normalizeDateOrdinal()` and `normalizeNumberWord()`.

Verdict: implemented in formatter and inherited by workspace/export.

### 6. Direct-address capitalization

Implemented in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:445) via `capitalizeDirectAddressTitle()`.

Verdict: implemented in formatter and inherited by workspace/export.

### 7. `No.` spacing

Implemented in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:304) through the context-sensitive abbreviation rule.

Verdict: implemented in formatter and inherited by workspace/export.

## Secondary finding

There is one helper that intentionally normalizes whitespace to single spaces:

- [src/lib/format/editorFragments.ts](C:/Users/james/projects/depo-pro/src/lib/format/editorFragments.ts:20)

This helper is used for editor diffing and suggestion/logging helpers, not for the primary transcript render or export string. It is therefore not the source of the live formatting rules in the workspace/export path.

## Action taken

Added workspace-layer regression coverage in [src/lib/buildEditorContent.test.ts](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.test.ts) to prove the rendered editor content preserves:

- `No. 12129`
- `No.  No.`
- quoted-question punctuation
- interrupting-dash punctuation
- direct-address capitalization
- numeral normalization
- inline scopist flags

## Conclusion

- Rules 1, 2, 3, 5, 6, and 7 are implemented in the live application formatting path.
- Rule 4 is only partially implemented: geometry metadata exists, but the browser workspace does not yet render paragraph tabs from that geometry model.
