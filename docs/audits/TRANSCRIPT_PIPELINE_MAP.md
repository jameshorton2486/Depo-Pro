> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Transcript Pipeline Map

**Audited commit:** `756a38edd0128fa0a50fcd8f3217604e34a924dd`

## Current lifecycle

```text
Audio / video + case keyterms
  -> transcribe-start -> Deepgram
  -> transcribe-callback / transcript_finalize_service
  -> normalize.ts + multifileMerge.ts
  -> persisted canonical speakers / utterances / words (`raw_text` immutable)
  -> best-effort boundary enrichment (split, exclude, synthesize)
  -> job marked complete; AI Review may run asynchronously
  -> editor-api / workspaceService maps persisted rows to EditorDocument
  -> buildEditorContent + CFE presentation (automatic on current initial path)
  -> optional structure confirmation / raw-label selection
  -> TipTap Workspace
  -> manual edits, speaker decisions, suggestion decisions, confidence review
  -> working transcript + audit records
  -> Stage-S / structured package / editorial / geometry / export
  -> certification and deliverables
```

## Stage ownership and mutation map

| Stage | Input | Output | Owner | Mutation / concern |
|---|---|---|---|---|
| Recognition request | Media, keyterms, Deepgram configuration | Provider job/result | Transcript creation services | Provider punctuation, diarization, numerals, utterance segmentation are recognition choices |
| Canonicalization | Deepgram response(s) | Stable speakers, utterances, words | `normalize.ts`, `multifileMerge.ts` | Establishes IDs/order and immutable `raw_text`; must remain lossless |
| Finalization | Canonicalized sources | Persisted transcript snapshot | callback/finalizer | Marks complete before all enrichment finishes; non-atomic boundary/AI timing |
| Boundary enrichment | Canonical rows | Split/excluded/synthetic units | `boundaryEngine.ts` | Automatically changes canonical structure/visibility after recognition |
| AI enrichment | Canonical + case context | Suggestions and proposals | `ai-review`, `aiReview.ts`, `aiSuggestionEngine.ts` | May auto-apply `working_text`; runs asynchronously and can arrive after Workspace opens |
| Workspace mapping | Database rows | Frozen `EditorDocument` | `editor-api`, `workspaceService` | Chooses current working/raw word layers and overlays AI fields |
| Initial presentation | EditorDocument | TipTap content | `buildEditorContent`, CFE | Filters excluded units and applies corrections/segmentation/pagination before first edit |
| Structure presentation | Current document + metadata | Q/A/colloquy/objection paragraphs | `workspacePresentation`, `qaFixer` | Separate inferred structural projection selected by Review & Confirm |
| Human working copy | TipTap edits, speaker/suggestion decisions | Working text, speaker rows, review state | `DocumentContext`, panels, `editor-api` | Authoritative operator mutations with optimistic concurrency/audit |
| Quality/reporting | Current document | Correction report and review queues | Corrections/Confidence/Speaker panels | Mixes diagnostics, decisions, and some mutation controls |
| Legal/export projection | Approved working/structured data | Legal pages and artifacts | Stage-S/export engines | Editorial, semantic, geometry, pagination and serialization work is duplicated across stacks |

## Duplicate processing boundaries

- Canonical boundary processing and later presentation splitting both restructure utterances.
- AI Review and TIE both model intelligence as correction proposals, but use different persistence/contracts today.
- CFE corrects wording while also formatting and paginating, crossing the correction/renderer boundary.
- Workspace Q/A/objection logic overlaps standalone TS structure engines and Python spec-engine modules.
- Workspace pagination and export geometry are separate implementations.
- Editor audit records and `correction_decisions` are parallel audit histories.

## Required canonical lifecycle

```text
Immutable Recognition Transcript
  -> Canonical structural storage (lossless, stable IDs)
  -> one Correction Orchestrator
       -> deterministic proposal engines
       -> TIE provider-neutral AI proposal engines
       -> speaker and structure proposals
       -> validation and conflict detection
  -> CorrectionObjects
  -> reporter review / accept / reject / edit
  -> Working Transcript projection
  -> deterministic formatting and QC
  -> Structured / Legal projections
  -> certification
  -> export
```

No engine after recognition may silently replace `raw_text`. Formatting must consume approved content and must not create an alternative content authority.
