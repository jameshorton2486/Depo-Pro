> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Review & Confirm Audit

## Current purpose

The current structure-review banner asks the reporter to accept inferred deposition structure or retain raw speaker labels. Its state lives in `DocumentContext` (`structureConfirmed`, `keepRawLabels`) and controls which presentation `TranscriptEditor` builds.

## Call path

```text
StructureReviewBanner
  -> DocumentContext.confirmStructure() or keepRawLabels()
  -> TranscriptEditor rebuild
  -> buildEditorContent
  -> workspacePresentation / CFE path
  -> paragraph, speaker label, role, Q/A, colloquy, objection and page presentation
```

## Inferences and transformations

- Maps known/case-derived participants to display names and roles.
- Infers question, answer, colloquy, speaker line, and related paragraph roles.
- Inserts or normalizes display speaker labels.
- Splits embedded objections and short answers.
- Applies objection-specific wording normalization.
- Merges compatible paragraphs.
- Runs CFE-based token correction, spacing, turn segmentation, flags, and geometry in the broader editor-content path.

## Persistence and confirmation semantics

The confirmation itself is presentation state, not a complete persisted correction run. It does not provide one CorrectionObject per inferred structural change. “Keep Raw Labels” avoids inferred labels but does not guarantee an immutable-raw transcript because excluded-utterance filtering and CFE transforms can still occur in the surrounding builder. Subsequent edits may persist text derived from the transformed view.

Speaker map confirmation is a related but distinct workflow in `SpeakerPanel`; it persists speaker choices and pipeline state through the editor API.

## Recommendation

MERGE Review & Confirm into the canonical Correct and Format Transcript workflow as the **structure-review phase**, not merely rename the existing button. Preserve the useful visual comparison and reporter choice, but generate explicit speaker/structure CorrectionObjects with stable locations and reasons. Confirmation should accept/reject those objects and write the shared decision audit.

The recognition view must be a genuinely lossless `raw_text` projection. The working/structured/legal views must be named projections, so “raw,” “corrected,” and “formatted” cannot be confused.
