> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Workspace Button Audit

## Content-affecting and adjacent controls

| Control | Code path | Calls / behavior | Transcript effect | Recommendation |
|---|---|---|---|---|
| Manual Save | `Toolbar.tsx` -> `DocumentContext.saveNow` -> `workspaceService` -> `editor-api` | Persists queued utterance edits with concurrency checks | Writes working text and audit | KEEP permanently |
| Direct editor typing | `TranscriptEditor.tsx` -> `DocumentContext.editUtterance` | Diffs TipTap utterance text; autosave/manual save | Writes working text | KEEP as human authority |
| Review & Confirm / inferred structure | `StructureReviewBanner.tsx` -> `confirmStructure` -> `workspacePresentation.ts` / `qaFixer.ts` | Enables inferred roles, Q/A, colloquy, objections, labels, paragraph restructuring | Display/presentation mutation; no direct DB write | MERGE initiation into unified workflow; retain a review step |
| Keep Raw Labels | same banner -> `keepRawLabels` | Avoids inferred role labels but current builder may still run CFE | Presentation state only; not a true raw view | KEEP only after making semantics accurate |
| Re-review | `AIReviewBanner.tsx` -> `workspaceApi.triggerAIReview` -> `ai-review` | Forces AI Review again | Resets/regenerates suggestions; may auto-apply depending configuration | MERGE behind canonical orchestration |
| AI Review tab | `RightSidebar.tsx` -> `SuggestionsPanel.tsx` | Displays/resolves legacy suggestions | Accept can write working text; reject updates status | DEPRECATE independent execution; migrate records/UI |
| Corrections tab | `RightSidebar.tsx` -> `CorrectionsPanel.tsx` | Computes report; embeds `AISuggestionsSection` | Mostly diagnostic; Accept/Reject/Accept All mutate working text/status | KEEP as unified results/review surface; remove separate execution identity |
| Accept AI suggestion | `AISuggestionsSection` -> hooks -> workspace API -> editor API | Applies proposed token | Writes `working_text`, status, audit | KEEP as CorrectionObject decision |
| Reject AI suggestion | same | Rejects proposed token | Status/audit only | KEEP as CorrectionObject decision |
| Accept all AI suggestions | same | Bulk applies every pending suggestion regardless of displayed confidence grouping | Multiple working-text writes/status changes | RETIRE or gate by explicit reviewed batch policy |
| Speaker Save / map confirmation | `SpeakerPanel.tsx` -> workspace API/editor API | Renames, assigns roles, confirms mapping | Updates speaker rows and potentially word/utterance speaker IDs | KEEP as review UI; route decisions through canonical audit |
| Reassign utterance | `UtteranceContextMenu.tsx` -> editor API | Assigns one utterance and its words to a speaker | Persistent structural change | KEEP; record as canonical decision |
| Mark reviewed/unreviewed | `ConfidencePanel.tsx` -> editor API | Changes confidence review state | No text mutation | KEEP as QC-only action |
| Processing/layer menu | `TranscriptProcessingMenu.tsx` | Selects recognition/working/structured/legal layer | Presentation only | KEEP as view selector, not correction executor |
| Retranscribe/keyterm actions | Corrections report / creation screen | Copies suggested terms or creates a new recognition run | Produces a different baseline, rather than editing current raw text | KEEP as explicit upstream remediation workflow |

## Important UX findings

1. “Corrections” is both a report and a host for mutation controls.
2. “AI Review” names a separate tool even though its useful output belongs in the correction review queue.
3. “Review & Confirm” controls structural presentation, not a complete correction-and-format orchestration.
4. “Keep Raw Labels” does not necessarily mean a pristine Deepgram view because CFE still participates in the initial builder.
5. Automatic AI and CFE work can occur without the future single button.

## Future button model

The only operation that starts machine correction should be **Correct and Format Transcript**. Save, human editing, speaker review, confidence review, correction decisions, layer viewing, and certification remain separate because they are human editing/QC/view actions—not competing correction pipelines.
