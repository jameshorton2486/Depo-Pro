---
authority_tier: T4
status: ACTIVE
owner: Workspace
scope: workspace-format-trigger
supersedes: null
superseded_by: null
approved_by: James
version: 1.0.0
effective_date: 2026-08-06
ratified_date: 2026-08-06
last_reviewed: 2026-08-06
next_review: 2027-08-06
ratification: RATIFIED
implementation_status: NOT_STARTED
---

# ADR-0016 — "Format and Correct Transcript" button (Option C via save + reload)

**Status:** Ratified
**Date:** 2026-08-06
**Deciders:** James (owner, architecture + product); Miah (format authority — final button/dialog copy).
**Amends:** ADR-0012 **OQ-3 only**. OQ-1, OQ-2, OQ-4, OQ-5, OQ-6 are untouched and remain in force.
**Related:** ADR-0012 (workspace open questions); A8 (rendering reads, never writes — versioned deterministic rendering).

---

## Context

ADR-0012 OQ-3 chose **Option A**: rename the AI-suggestion trigger to "Run AI Review" and keep the
two Workspace pipelines separate, on the stated ground that the deterministic formatter (**P-A**)
"runs automatically on load." Two facts discovered since justify amending **OQ-3 specifically**:

1. **The AI trigger was unreachable** on a fresh transcript (the banner returned `null` until
   suggestions already existed). Fixed independently in commit `cfd665c` — a reachability bug, not
   an architecture change. That fix stands regardless of this ADR.

2. **P-A does not re-run after corrections — formatting goes stale within a session.** This is the
   material finding. "Runs automatically on load" is true but incomplete: P-A runs at load and never
   again for the rest of the editing session, so it never re-processes the reporter's corrected text.
   OQ-3's Option A rested on the assumption that a "Format" button would have nothing to do. That
   assumption is false.

### Evidence (verified code trace, read-only)

- A correction dispatches `EDIT_UTTERANCE`, which writes the new text into a **separate
  `workingTexts` map** and returns `state.document` **unchanged (same reference)** —
  `src/context/DocumentContext.tsx:146`.
- P-A's entry point `buildEditorContent` runs inside a `useMemo` keyed on
  `[languageMap, record, state.document, state.keepRawLabels, state.structureConfirmed]` —
  `src/components/TranscriptEditor/TranscriptEditor.tsx:144-152`. `workingTexts` and `editSeq` are
  **not** dependencies, and `state.document` does not change on edit, so the memo does not recompute.
- `saveNow` posts `workingTexts` to the server and dispatches `SAVE_OK`
  (`src/context/DocumentContext.tsx:378`, reducer `:172`), which clears the dirty flag and does
  **not** replace `state.document` and does **not** reload.

Net effect: P-A recomputes only at initial load, on structure-confirm / keep-raw toggle, or on a
full document reload. When a reporter corrects `Objection form` → `Objection, form`, the
deterministic F7 two-space rule, abbreviation handling, number conversion, sentence-boundary spacing,
and Q/A splits do **not** re-apply; the raw typed text sits inside the load-time layout.

### Why P-A is deliberately non-reactive

Re-pushing formatted content into TipTap via `setContent` resets cursor and scroll position and risks
dropping unsaved edits — documented at `src/components/TranscriptEditor/TranscriptEditor.tsx:140-143`.
Auto-reformatting on every keystroke would make live editing hostile. This is a real design
constraint, not an oversight, and it is the reason the two pipelines are separate. An **explicit,
confirmed button press** is exactly the context where a one-time reflow is acceptable.

---

## Decision

**Add a single "Format and Correct Transcript" button to the Workspace. On a confirmed press it
saves the reporter's corrections, reloads the document (re-running the deterministic pipeline P-A
over the corrected text), and then triggers an AI review (P-B).** This adopts the audit's **Option C**
— one entry point over both pipelines — via existing save + reload machinery, not a new pipeline.

Precisely:

1. **Behavior = confirm → save → reload → AI review.** On press, a confirmation dialog appears
   first. On confirm: `saveNow()` → **only on save success** → `loadDocument()` → `triggerAIReview()`.
   The reload replaces `state.document`, which re-runs `buildEditorContent`/`cfe` over the persisted
   corrected text. No new formatting engine is introduced.

2. **Mandatory confirmation (design constraint — the reason this amendment is safe).** Because the
   reload resets cursor and scroll position, the button **must** confirm before acting, with copy
   that names the consequence. Ratified copy:

   > **Format and correct this transcript?**
   > This saves your corrections, reformats the transcript, and runs an AI review.
   > Your place in the document (cursor and scroll position) will be lost.
   >
   > [Format and Correct]  [Keep Raw Labels]  [Cancel]

   Shipping the reflow without this confirmation is explicitly out of bounds: the failure mode is a
   reporter losing her place during real certified work and ceasing to trust the button.

3. **AI is triggered, never silently applied.** The button invokes the AI review pass (P-B), which
   produces reviewable suggestions surfaced in the (now-reachable) AI review banner / Suggestions
   panel. This ADR does **not** enable auto-apply; ADR-0012's principle stands: **AI must never
   silently overwrite verbatim testimony.** The AI half is best-effort — it functions whether or not
   the `AI_REVIEW_BRIDGE` Supabase secret is set (bridge on → prompt-engine CorrectionObjects; bridge
   off → legacy suggestion path). The button must not break when the secret is unset.

4. **Placement — replaces `StructureReviewBanner`.** The button occupies the slot the structure
   banner currently holds (`TranscriptEditor.tsx:417-422`). It is the one obvious action a reporter
   reaches for. It remains available after structure is confirmed, so it also serves the
   re-format-after-corrections case that motivated this ADR.

5. **`Keep Raw Labels` is preserved, not dropped.** The `keepRawLabels` path (currently the banner's
   secondary action) moves into the confirmation dialog as a secondary choice. Choosing it takes the
   keep-raw-labels branch instead of applying inferred structure, then proceeds through the same save
   → reload → AI-review sequence. It is never silently removed.

### Behavior specification

- **Sequence (mandatory ordering):** confirm → `saveNow()` → if save succeeded → `loadDocument()` →
  `triggerAIReview(jobId)`. If `saveNow` fails, **abort** the reload and AI review and surface the
  save error. Reloading after a failed save would fetch server state without the unsaved corrections
  and silently discard them — this ordering is non-negotiable. (Implementation note: `saveNow` must
  expose success to the caller — e.g. return a boolean — since a failed save is signalled only via
  `state.saveError` today.)
- **Structure choice:** primary "Format and Correct" applies inferred structure (`confirmStructure`);
  secondary "Keep Raw Labels" takes the raw-label branch (`keepRawLabels`). Once structure is already
  confirmed, later presses skip the structure choice and show only the reflow confirmation.
- **Disabled state:** disabled while a save is in flight, while a reload is in progress, and when
  `state.document` is null.
- **AI-review resilience:** a failed/absent AI review (e.g. bridge unset, network) must not roll back
  the completed format+reload; surface it non-fatally.
- **Data safety:** corrections live in `workingTexts` until `saveNow` persists them; because save
  precedes and gates reload, no correction is lost. The cursor/scroll reset is the accepted, confirmed
  cost.
- **Canonical Baseline:** the button is not shown in the read-only Canonical Baseline view
  (`isCanonical`), consistent with that view carrying no editorial transforms.

### Non-goals

- **No scroll/cursor restoration in this change.** Restoring the reporter's place after reload is real
  engineering and freeze-adjacent. It is a **separate follow-up**, warranted only if usage shows Miah
  clicks the button mid-review rather than at the end of a pass. The confirmation dialog is the
  interim mitigation.
- Not auto-reformat-on-save. Not enabling AI auto-apply. Does not change what P-A does — only when it
  runs.

---

## Consequences

- Formatting stops silently drifting from corrected text: the reporter has an explicit, consented way
  to reflow after an editing pass, and deterministic corrections/formatting apply to what she typed.
- One button spans both pipelines from the user's view, while P-A and P-B remain separate operations
  in code. Option C is adopted as a UI entry point, not as a pipeline merge.
- **Dependency / caveat — 1000-utterance cap.** P-A formats, and AI review runs over, only the
  utterances the Workspace loaded — capped at 1,000 rows until PR #86
  (`fix/utterance-pagination-1000-cap`) is deployed to `editor-api` on Supabase. Until then, a long
  deposition is reformatted/reviewed only through its first 1,000 utterances. This ADR does not depend
  on #86, but any demo of the button to Miah should follow the #86 redeploy — otherwise AI review
  covers a truncated fraction of the transcript.
- Freeze note: implementation is new, self-contained commits; they do not amend prior commits and are
  independently revertible. No push without owner approval.

---

## Alternatives considered

- **Relabel only (do nothing new).** Rejected: rests on the false assumption that P-A is already
  fresh. The verified trace shows formatting goes stale, so a relabel would leave a real gap.
- **Deterministic-only button (no AI).** Considered in the v0.1 draft of this ADR and superseded by
  the owner's product decision to adopt full Option C. The stale-formatting finding justifies at least
  the deterministic re-run; the owner chose to include AI review behind the same confirmed press.
- **Auto-reformat on save (no button).** Rejected: a `setContent` reflow mid-session resets
  cursor/scroll and can drop in-flight edits (`TranscriptEditor.tsx:140-143`). Hostile as implicit
  behavior; acceptable only as an explicit, confirmed press.
- **Ship the button without a confirmation.** Rejected: the reflow silently discards the reporter's
  place mid-review during certified work. The confirmation is the design constraint that makes Option
  C acceptable.

---

## Implementation plan (authorized by this ADR — new commits only, no push)

Scoped units, one commit each:

1. **saveNow success signal.** `saveNow` returns `Promise<boolean>` (true on success/no-op, false on
   error). Backward-compatible with existing void callers. Update `DocumentContext` types/tests.
2. **Confirmation dialog + button.** New `FormatCorrectDialog` (reflow warning + primary/secondary/
   cancel) and the "Format and Correct Transcript" button; replace `StructureReviewBanner` in
   `TranscriptEditor.tsx`; relocate `Keep Raw Labels` into the dialog; wire the confirmed sequence
   (structure choice → `saveNow` gate → `loadDocument` → `triggerAIReview`). Remove/retarget
   `StructureReviewBanner` and its tests. New tests: confirm→sequence, save-failure aborts, AI-review
   non-fatal, absent in Canonical Baseline, Keep-Raw-Labels branch.

## Follow-ups (not in this change)

- Scroll/cursor restoration after reload (only if mid-review usage warrants).
- Register final button/dialog copy with Miah (format authority), mirroring the OQ-5 precedent.
- `AI_REVIEW_BRIDGE` secret and PR #86 redeploy are operational (owner), tracked outside this ADR.
