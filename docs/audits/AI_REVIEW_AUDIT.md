> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# AI Review Audit

## Current path

```text
transcript finalization (fire-and-forget) or Workspace Re-review
  -> supabase/functions/ai-review/index.ts
  -> src/lib/transcript/aiReview.ts (candidate/context assembly and policy)
  -> src/lib/transcript/aiSuggestionEngine.ts (Anthropic prompt + parsing)
  -> word suggestions, speaker resolutions, proposed line types, review metadata
  -> optional high-confidence auto-apply to working_text
  -> Corrections / AI Review UI decisions
```

## Inputs and prompt responsibilities

The live path assembles canonical transcript context, ambiguous/low-confidence word candidates, speaker issues, structural issues, and case metadata. The suggestion engine asks the model for bounded proposed corrections with reasons and confidence, plus speaker/structure proposals. It parses and clamps model output and identifies high-confidence candidates.

This is materially safer than accepting a rewritten full transcript, but it is not yet the ATIA target because it uses its own TS prompt/persistence path rather than the provider-neutral TIE and first-class CorrectionObject lifecycle.

## Outputs and changes

- Word-level `ai_suggestion`, reason, confidence, and status.
- Speaker-resolution evidence/proposals.
- Proposed line types / structure metadata.
- AI review status and counts.
- If `AI_REVIEW_AUTO_APPLY` is enabled, accepted high-confidence changes can write `working_text` before reporter review.
- Re-review resets/regenerates suggestion state.
- Accept/reject actions subsequently mutate working text or status through editor API paths.

## Risks

1. Automatic invocation and rerun are independent of a single correction workflow.
2. Auto-apply conflicts with the master rule that AI changes remain explicitly reviewable, acceptable, and rejectable; even when audited, it changes the working layer before human action.
3. The UI splits results between “AI Review” and “Corrections.”
4. Word-field suggestions and CorrectionObjects form parallel data models.
5. AI structure and speaker proposals overlap deterministic and human review engines.
6. Completion/enrichment timing is non-atomic; suggestions may arrive after the Workspace has opened.

## Consolidation recommendation

MERGE all useful candidate selection, context assembly, prompt behavior, and parsing tests into the TIE orchestration path. Emit CorrectionObjects only. Disable automatic working-text application in the target design. Preserve the live TS path during Phase 4 reconciliation as required by AGENTS.md, then turn it into a compatibility adapter or stop its callers after parity is proven. AI Review should cease to be an independent Workspace action; its results should appear in the unified Corrections review surface.
