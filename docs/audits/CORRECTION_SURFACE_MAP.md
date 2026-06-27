# Correction Surface Map

Date: 2026-06-26
Branch: feature/stage3-workspace-core

## Purpose

This report inventories every place in the live codebase where transcript text, speaker meaning, or export output can change.

## Surface 1 — Source-Layer Retranscription Inputs

### Keyterm normalization before transcription

- `normalizeDeepgramKeyterms` deduplicates and caps keyterms before the transcription request is sent.
  Evidence:
  - [src/api/transcriptionService.ts:73](C:/Users/james/projects/depo-pro/src/api/transcriptionService.ts:73)

### Impact

- This surface changes what Deepgram hears at source.
- It is the correct layer for:
  - names
  - medical terms
  - organization names
  - journal abbreviations

## Surface 2 — Canonical Ingest Normalization

### Response normalization

- `normalizeTranscriptResponse` converts raw Deepgram JSON into canonical transcript rows.
  Evidence:
  - [src/lib/transcript/normalize.ts:174](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:174)

### What it changes

- Generates stable ids.
- Splits utterances by speaker when needed.
- Flags filler words.
- Initializes editable and review fields.

### What it does not change

- Does not perform editorial correction.
- Does not garble-correct.
- Does not infer legal structure.

## Surface 3 — Workspace Reconstruction Layer

### Snapshot to `EditorDocument`

- `buildEditorDocumentFromSnapshot` chooses display text as `working_text ?? raw_text`.
  Evidence:
  - [src/api/workspaceService.ts:76](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:76)
  - [src/api/workspaceService.ts:108](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:108)

### Impact

- This is the first visible correction surface after persistence.
- Any human correction saved to `working_text` appears here automatically.

## Surface 4 — Formatter Correction Layer

### `cfe`

- `cfe` is the main deterministic editorial engine.
  Evidence:
  - [src/lib/format/cfe.ts:540](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:540)

### What it changes

- punctuation spacing
- abbreviation spacing
- sentence boundaries
- quoted sentence boundaries
- deterministic garble corrections
- slash dates
- context-sensitive `No.` spacing
- number normalization in approved contexts
- inline flag emission

### Key supporting surfaces

- deterministic correction map
  - [src/lib/format/cfe.ts:85](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:85)
- inline flag decision
  - [src/lib/format/cfe.ts:263](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:263)
- inline flag application
  - [src/lib/format/cfe.ts:586](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:586)

### Safety class

- Display-layer safe.

## Surface 5 — Speaker Inference Layer

### `buildDisplayDocument`

- `buildDisplayDocument` and `buildSpeakerViews` can change speaker labels and roles in the rendered document without changing canonical stored rows.
  Evidence:
  - [src/lib/transcript/workspacePresentation.ts:254](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:254)
  - [src/lib/transcript/workspacePresentation.ts:385](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:385)

### What it changes

- generic `Speaker N` labels
- attorney label formatting
- reporter/videographer/witness attribution
- physician witness display labels

### Safety class

- Display-layer safe.

## Surface 6 — Structure and Paragraph Layer

### `buildTranscriptParagraphs`

- This layer transforms formatted lines into transcript paragraphs and injects legal transcript structure.
  Evidence:
  - [src/lib/transcript/workspacePresentation.ts:513](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:513)

### What it changes

- PROCEEDINGS / EXAMINATION headings
- BY lines
- inline resumption by-lines
- Q/A labels
- colloquy labels
- paragraph merging

### Safety class

- Display-layer safe.

## Surface 7 — Paragraph Cleanup Layer

### `applyParagraphDisplayImprovements`

- Applies non-canonical-safe display cleanup transforms that are still deterministic and presentation-oriented.
  Evidence:
  - [src/lib/transcript/paragraphDisplayImprovements.ts:16](C:/Users/james/projects/depo-pro/src/lib/transcript/paragraphDisplayImprovements.ts:16)

### Current transforms

- spaced initialisms
- clock time normalization

### Safety class

- Display-layer safe.

## Surface 8 — Q/A Fixer Layer

### `applyQaFixer`

- Post-processes paragraph output to match deposition structure expectations.
  Evidence:
  - [src/lib/transcript/qaFixer.ts:139](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:139)

### What it changes

- splits embedded short answers into A paragraphs
- splits objections into colloquy paragraphs
- normalizes `K.` to `Okay.`
- normalizes objection subtype text
- remerges adjacent same-role paragraphs

### Safety class

- Display-layer safe.

## Surface 9 — Manual Edit Layer

### Human edits in TipTap

- The editor diff path captures changed utterance text and persists token-aligned `working_text` values.
  Evidence:
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:151](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:151)
  - [src/context/DocumentContext.tsx:327](C:/Users/james/projects/depo-pro/src/context/DocumentContext.tsx:327)
  - [src/api/workspaceService.ts:290](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:290)

### Safety class

- Canonical working-copy safe.
- Does not mutate `raw_text`.

## Surface 10 — Review State Layer

### Confidence review

- Review actions change `reviewed` state for low-confidence words.
  Evidence:
  - [src/api/workspaceService.ts:397](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:397)

### Impact

- This changes review state, not transcript text.

## Surface 11 — Speaker Reassignment Layer

### `persistSpeakers`

- This is the speaker attribution correction surface.
  Evidence:
  - [src/api/workspaceService.ts:457](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:457)
  - [src/api/workspaceService.ts:504](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:504)

### What it changes

- speaker display metadata
- utterance speaker ids
- word speaker ids
- speaker-map-confirmed state

### Safety class

- Canonical attribution safe, but not text safe.
- It changes speaker ownership, not token text.

## Surface 12 — Workspace Display Flag Surface

### Inline flags in editor and paragraph text

- Editor render path inserts inline flags into the displayed content.
  Evidence:
  - [src/lib/buildEditorContent.ts:141](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:141)
- Paragraph serialization also includes inline flags in non-clean workspace text.
  Evidence:
  - [src/lib/transcript/workspacePresentation.ts:92](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:92)

### Safety class

- Display-layer safe.

## Surface 13 — Clean Delivery Export Surface

### Clean serializers

- Raw clean:
  - `serializeFormattedDocumentClean`
- Structured clean:
  - `buildWorkspaceTranscriptTextClean`
  - `stripInlineFlagSpans`
  Evidence:
  - [src/lib/format/serialize.ts:30](C:/Users/james/projects/depo-pro/src/lib/format/serialize.ts:30)
  - [src/lib/format/serialize.ts:35](C:/Users/james/projects/depo-pro/src/lib/format/serialize.ts:35)
  - [src/lib/transcript/workspacePresentation.ts:104](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:104)
  - [src/lib/transcript/workspacePresentation.ts:708](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:708)
  - [src/lib/transcriptDownloads.ts:9](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:9)

### Impact

- Removes export-only review annotations.
- Preserves the token text itself.

## Correction Surface Summary

| Surface | Layer | Mutates persisted data | Safe for deterministic corrections |
|---|---|---:|---:|
| keyterms | source | no | yes |
| normalizeTranscriptResponse | ingest | yes, canonical rows | no editorial |
| buildEditorDocumentFromSnapshot | reconstruction | no | no |
| cfe | display | no | yes |
| buildDisplayDocument | display | no | yes |
| buildTranscriptParagraphs | display | no | yes |
| applyParagraphDisplayImprovements | display | no | yes |
| applyQaFixer | display | no | yes |
| saveNow / naivePersistWorking | workspace edit | yes, working copy only | human only |
| persistSpeakers | attribution | yes, speaker linkage | yes for speaker mapping |
| clean serializers | export | no | yes |

The missing system piece is not “where can text change?” That already exists. The missing system piece is “which correction belongs to which surface?” and “who decides that consistently?”
