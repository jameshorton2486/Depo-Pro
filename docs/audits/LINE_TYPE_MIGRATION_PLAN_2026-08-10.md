# line_type Migration Plan — one persisted reviewed structure for Workspace and every deliverable

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: line-type-migration-plan
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-10
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NOT_REQUIRED
implementation_status: PARTIAL
---

Date: 2026-08-10 · Planning artifact (no code changes, no migration executed). Follows the C2a decision analysis (DOC-0324) with owner decisions **D1–D7 approved** and the invariant **D7 ratified**:

> **The reporter certifies exactly what she reviewed.** Workspace, UFM, certification, and every deliverable (DOCX / PDF / TXT / JSON / package) consume the **same persisted reviewed structure**. Export/rendering must not independently re-infer transcript structure.

Target pipeline: `Deepgram evidence → AI/deterministic structural proposals → Working Transcript → reporter reviews uncertainty → PERSISTED line_type → Workspace → UFM/Finalization → Certification → DOCX/PDF/TXT/JSON`.

## Current state (grounding)

- `transcript_utterances` already has structure columns (migration `20260627220500_add_structure_fields.sql`): `line_type text` (the intended persisted authority — **currently unpopulated**; DOC-0320 found zero non-UNKNOWN values), `ai_suggested_line_type text` (a structural proposal, written **only** by the broken `ai-review`, [ai-review/index.ts:273](../../supabase/functions/ai-review/index.ts:273)), and `manually_reassigned boolean` (a partial review-state flag).
- **Two divergent render-time classifiers** re-infer structure every render: `workspacePresentation.buildTranscriptParagraphs` (Workspace) and `transcriptParagraphs.buildTranscriptParagraphs` (export). Export already *reads* `normalizePersistedLineType(...line_type)` as a hint ([exportAdapter.ts:128,137](../../src/lib/export/exportAdapter.ts:128)) but falls back to inference because `line_type` is empty.
- Read helper exists: `normalizePersistedLineType` / `hasPersistedLineType` ([structuredTranscript.ts:13,28](../../src/lib/transcript/structuredTranscript.ts:13)).
- No `confidence`, `reason/evidence`, or explicit `review_status` columns yet. `confirmStructure`/`keepRawLabels` are ephemeral, never persisted (DOC-0324).

The migration is therefore mostly **populating and reading an existing field consistently**, plus adding a proper proposal/confidence/review contract and converging the two classifiers.

---

## 1. Canonical `line_type` representation

- **Values:** `Q | A | COLLOQUY | PARENTHETICAL | BY_LINE | SECTION_HEADER | UNKNOWN` (union of what both classifiers already emit; `TranscriptParagraphKind`). Keep `UNKNOWN` as the explicit "not yet established" sentinel.
- **Storage:** the existing `transcript_utterances.line_type text`, constrained to the enum (CHECK or an enum type). One row = one utterance's established structural role.
- **Authority rule:** `line_type` is the *single* structural authority. When present and not `UNKNOWN`, every consumer (Workspace, export, UFM, certification) uses it verbatim and **never re-infers**.

## 2. Structural proposal + confidence representation (D2)

The classifier's output contract gains explicit uncertainty. Proposal fields on `transcript_utterances` (or a sibling `transcript_structure_proposals` table if we want history):

- `proposed_line_type text` (rename/reuse `ai_suggested_line_type`), `line_type_confidence real` (0–1), `line_type_reason text` (short evidence, e.g. "speaker role=WITNESS → A"; "regex parenthetical"; "objection cue"). Optionally `proposed_by text` (engine id + version, per A1/A10 versioning).
- The classifier (`classifyLineDescriptor` / `descriptorForLine`) is refactored to **emit** `{ line_type, confidence, reason }` instead of a bare kind. This is the **output-contract change** DOC-0324 flagged — it is real work, not UI.
- Migration aid only (D2): the existing `LOW_CONFIDENCE` (acoustic) / `UNCERTAIN_SPEAKER` (no role) line-flags may seed early "needs review" surfacing, but they are **not** the final confidence authority and must not be plumbed as such.

## 3. Human review / confirmation state (D1)

- `line_type_review_status text` ∈ `UNREVIEWED | CONFIRMED | OVERRIDDEN` (supersedes the boolean `manually_reassigned`, which backfills to `OVERRIDDEN` where true).
- Semantics: a proposal starts `UNREVIEWED`. The reporter accepting keeps the proposed value and sets `CONFIRMED`; changing it writes the new `line_type` and sets `OVERRIDDEN`. Reliable high-confidence proposals may be auto-`CONFIRMED` at a threshold (a product knob), with the reporter's Certification read-through as the covering human decision (A5).
- The Workspace review affordance surfaces `UNREVIEWED` + low-confidence items first.

## 4. Working Transcript persistence (D3)

- `line_type` + `line_type_review_status` are part of the Working Transcript (persisted, owner-scoped, RLS as with other utterance columns). They survive reload (unlike today's ephemeral `structureConfirmed`).
- **Autosave / reopen:** a review decision participates in the same autosave path as other utterance edits — persisted on autosave (not only on explicit save) and restored verbatim on reopen. Because structure is persisted rather than re-derived per session, reopening a partially-reviewed transcript shows the exact prior `line_type`/`review_status` state, and no proposal is silently re-applied over a `CONFIRMED`/`OVERRIDDEN` utterance.
- Write path mirrors the existing F10 speaker-reassignment path through **editor-api** (owner-scoped RPC/endpoint), so review writes are atomic and authorized. No client-side direct DB writes.

## 5. Workspace read/write path (D1/D3)

- **Read:** `buildEditorContent` / `workspacePresentation` consume persisted `line_type` when present (not `UNKNOWN`); only `UNKNOWN`/`UNREVIEWED` utterances are classified for a *proposal* to surface, never silently applied.
- **Write:** a review action (accept / change line_type) dispatches to editor-api, persists `line_type` + `review_status`, and updates local state; the render re-reads persisted structure. Replaces the all-or-nothing `confirmStructure` toggle with per-utterance review.

## 6. Migration from `structureConfirmed` (D1)

- `structureConfirmed` (ephemeral boolean, reset every load) is retired. "Structure confirmation" becomes: (a) proposals persisted with `review_status`, (b) a Workspace review surface, (c) a transcript-level "structure review complete" derived from `review_status` (no `UNREVIEWED` low-confidence items remain) rather than a session flag.
- Interim: keep `structureConfirmed` as a thin compatibility shim during rollout; remove once the review surface + persistence land.

## 7. Remove `keepRawLabels` as a normal transcript mode (D4)

- Delete the `keepRawLabels` branch from `buildEditorContent` / `buildFormattedTranscriptText` and the "Keep Raw Labels" control from `FormatCorrectBanner`. The normal transcript always shows the reviewed/resolved representation.
- Provider labels are not discarded (see §8).

## 8. Raw-evidence inspection surface (D5)

- Provider/Deepgram labels (SPEAKER 0/1/2, diarization) remain available **only** through an explicit **"View Provider Evidence"** surface, backed by immutable raw evidence (extend the existing `RenderLayer "canonical"` / `CanonicalBaselineView` / Pipeline Inspector rather than a competing transcript mode). Read-only; never a Working Transcript representation.

## 9. Workspace/export classifier convergence (D7 — the core defect fix)

- Both render paths consume the **same** persisted `line_type`. Where `line_type` is established, neither infers. The two `buildTranscriptParagraphs` implementations collapse toward **one** shared structural-paragraph builder driven by persisted `line_type` (+ geometry/region presentation, which may stay path-specific). `qaFixer` is removed from this spine (§11).
- Result: the Workspace-reviewed structure and the certified structure are **identical by construction** — the ratified invariant.

## 10. TXT / package-JSON convergence (D6)

- `buildFormattedTranscriptText` and the package JSON derive from the same reviewed structure as the DOCX render model — no `keepRawLabels` branch, no independent inference. All deliverables share one structural source.

## 11. `qaFixer` consumer migration and retirement (§15 of Phase G)

- Sole runtime consumer: `workspacePresentation.ts:743` (`applyQaFixer`). Its responsibilities (Q/A split, embedded-objection split, consecutive re-merge) move to: **proposals** at classification time (persisted as `line_type` after review), not render-time heuristics.
- Sequence: (1) proposal generation covers the split/merge cases qaFixer handled; (2) persisted reviewed `line_type` supplies structure to the converged builder; (3) confirm Q/A parity on the clean baseline; (4) remove the `applyQaFixer` call; (5) retire `qaFixer` + tests through the four-part deletion gate. Its objection-attribution (already `UNIDENTIFIED_SPEAKER`) and any residual structural logic are captured as proposals, not silent transforms.

## 12. Compatibility with existing UNKNOWN transcripts (§12)

- Every existing transcript has `line_type` null/`UNKNOWN`. Behavior must be graceful: `UNKNOWN` → show proposals for review (never a blank or a silent guess). No transcript breaks; the reporter simply sees an unreviewed structure state. Certified transcripts already locked are read-only and unaffected (certification lock migration exists).

## 13. Schema / database changes

Additive, on `transcript_utterances`:
- constrain `line_type` to the enum (CHECK); keep default null.
- add `line_type_confidence real`, `line_type_reason text`, `line_type_review_status text` (default `UNREVIEWED`, CHECK enum).
- reuse `ai_suggested_line_type` as `proposed_line_type` (rename or alias); migrate `manually_reassigned=true` → `review_status=OVERRIDDEN`.
- RLS/owner-scope consistent with existing utterance columns; A7 (migration files are schema authority) — one migration, CI parity with `src/types/database.ts` (hand-written; never let `supabase gen types` overwrite it — see the database-types landmine).

## 14. Backfill strategy

- **No destructive backfill.** Existing utterances stay `line_type = UNKNOWN` / `review_status = UNREVIEWED`; they surface proposals on next open. Optionally, a **read-only proposal-generation pass** (not a write) can pre-compute proposals for display. Any actual `line_type` write is a reviewed decision (or a threshold auto-confirm the owner approves), never a blind backfill of the historical corpus. Certified/locked transcripts excluded.

## 15. Rollback

- Schema: additive columns are safe to leave; a rollback migration can drop the new columns (no data loss for `line_type` itself, which pre-exists). Feature-flag the Workspace review surface + the "consume persisted line_type" switch so render can fall back to the current inference path if needed.
- Code: each step is an independent local commit; the classifier-convergence and qaFixer removal are gated behind the "persisted line_type present" switch so they revert cleanly.

## 16. Tests

- Classifier emits `{line_type, confidence, reason}`; proposal persistence + review-status transitions (UNREVIEWED→CONFIRMED/OVERRIDDEN).
- **Parity test (the invariant):** for a given reviewed document, Workspace-rendered structure == export/certified structure, byte-for-byte on the structural spine. This is the test DOC-0324 found missing.
- UNKNOWN-transcript graceful behavior; keepRawLabels removal (evidence view still shows provider labels); TXT/JSON == DOCX structure; qaFixer parity before removal; editor-api review-write authorization/RLS; regression on the existing `buildEditorContent`/`exportAdapter` suites.

## 17. Deployment sequence

1. (local) Author the migration file + `database.ts` types; classifier contract change; proposal/review persistence in editor-api; Workspace review surface behind a flag; converged builder behind the "persisted line_type" switch; keepRawLabels removal + evidence view; TXT/JSON convergence; tests.
2. (**Human Gate — DB**) Apply the migration to production (§62/§63).
3. (**Human Gate — deploy**) Deploy edge functions (editor-api, ai-review→proposal path) + Cloud Run + front-end.
4. (post-deploy, read-only) Verify proposal generation + review persistence + render/export parity on the clean baseline.
5. Enable the "consume persisted line_type" switch; retire `structureConfirmed`/`keepRawLabels`; remove `qaFixer` via the deletion gate.

---

## Locally reversible vs. Human Gate

**Locally reversible (autonomous, local commits, no prod effect):**
- The migration **file** authoring + `database.ts` type updates (not applied to prod).
- All TS changes: classifier output contract, proposal/confidence types, converged paragraph builder (flag-gated), Workspace review UI, keepRawLabels removal + evidence view, TXT/JSON convergence, editor-api review endpoint code, tests.
- `qaFixer` consumer migration + deletion-gate retirement (behind the switch).

**Requires a Human Gate (do NOT do autonomously):**
- **Applying the schema migration to the production database** (§63 database change).
- **Any write to production `line_type`** on existing transcripts — reviewed decisions or a threshold auto-confirm backfill (§63 production data).
- **Deploying** the changed edge functions / Cloud Run / front-end (§62 production deployment).
- Anything touching **certified/locked** transcripts.

## Notes

- **Clean baseline:** treat `tr_1786372056908_hyjqv3` (1,757 utt / 13,952 words) as the identified clean-baseline candidate (documented across DOC-0318/0320/0321 and referenced in production Cloud Run logs). If independent confirmation is wanted before implementation, verify that record **directly from read-only DB evidence** (source_index 0, no `_multifile_manifest`, utt count > ~1,000, coherent utt0) — **do not retranscribe**.
- **ADR-0018 / K.→Okay.** stays DRAFT and A5-reserved; it is **not** part of this migration. Its acceptance examples remain captured in ADR-0018.
- The whole sequence is behavioral and touches certified output → gated by BETA_FREEZE beyond the local planning/coding steps.

---

## Implementation status (freeze-limited local waves)

Owner authorized the **locally-reversible** implementation (not production migration/deploy).
The BETA_FREEZE posture (working report §116: behavioral waves deferred; precedent `edabe61`:
default-off non-active code permitted as in-freeze safety) bounds this to **non-active,
default-off scaffolding + types + persistence code + invariants + tests + docs**. Landed:

| Wave | Commit | Content | Active? |
|------|--------|---------|---------|
| 1 | `4e54613` | Migration file `20260810180000_line_type_review_contract.sql` (line_type_confidence / line_type_reason / line_type_review_status + enum guards + manually_reassigned→OVERRIDDEN backfill); `database.ts` structure columns typed (Row/Insert/Update); canonical `LineTypeReviewStatus`/`StructuralProposal` types + `normalizeReviewStatus`/`isReviewLocked`. | No — migration **not applied**; types inert. |
| 2 | `082e7da` | `structuralProposal.ts` — pure `{line_type, confidence, reason}` derivation (D2); live classifiers untouched. | No — additive module, unconsumed. |
| 3 | `58647f1` | editor-api `PUT /:jobId/structure` review-persistence endpoint (F10-style, owner-scoped, audit-logged, `assign_line_type`). | No — **not deployed**; no client caller yet. |
| 4 | `d7e390b` | `lineTypeMigration.ts` — default-off `PERSISTED_LINE_TYPE_ENABLED=false`; `shouldProposeStructure` (proposal never overwrites CONFIRMED/OVERRIDDEN); `selectReviewCandidates`. | No — flag off; helpers unconsumed. |

Two DOC-0325-vs-code reconciliations were made and documented in the migration file: (a) `line_type`
value space uses the **short codes** `Q|A|SP|PN|HEADER|UNKNOWN` that `normalizePersistedLineType`
already binds to (not §1's long names); (b) `ai_suggested_line_type` is **aliased** as the proposal,
not renamed (the deployed ai-review function writes it). A third: `database.ts` was already missing the
existing `20260627220500` structure columns — now typed.

### Exact remaining gate (STOP here under freeze)

The **render-path convergence is deferred** — it is behavioral and changes certified output. NOT built:
- The parallel **converged paragraph/structure builder** (collapsing `workspacePresentation` +
  `transcriptParagraphs` onto one persisted-`line_type` spine). Correctness is unverifiable without
  flipping `PERSISTED_LINE_TYPE_ENABLED`, i.e. activation.
- **Wave 5** Workspace structural-review UI + "View Provider Evidence" surface, and the
  **`keepRawLabels` removal** from normal mode.
- **`qaFixer`** retirement (still `RETIRE-VIA-MIGRATION`; sole runtime consumer `workspacePresentation.ts:743`).
- The full **parity/TXT-JSON convergence/long-transcript regression** suite (§16), which asserts the
  post-convergence invariant and therefore needs the convergence to exist.

**Human Gates unchanged and untouched:** apply migration to prod; write/backfill prod `line_type`;
deploy edge functions / Cloud Run / front-end; flip `PERSISTED_LINE_TYPE_ENABLED`; anything on
certified/locked transcripts. Thomas not retranscribed; `tr_1786372056908_hyjqv3` remains the
read-only-verifiable clean-baseline candidate.
