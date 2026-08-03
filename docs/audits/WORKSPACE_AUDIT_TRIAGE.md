# Workspace Audit Triage

**Deliverable:** `WORKSPACE_AUDIT_TRIAGE.md`
**Scope:** Read-only triage of the 9 quarantined audit documents on branch `audit/workspace-surface-unratified` (each carries a PROVISIONAL/UNRATIFIED banner added at quarantine; banners ignored when assessing content).
**Worked against:** branch `feat/canonical-transcript-audit`, HEAD `c6082e10a8d3246d26bfa417fc9863103e6f44ae`. Quarantined set read at `audit/workspace-surface-unratified` (`243c61dd7bb8ca6c92e386c0134b45e1d8c4664c`). Ratified authority read at `origin/docs/ratified-decisions` (`85eecfd`). Prior authoritative audit read at `origin/feat/canonical-transcript-audit:TRANSCRIPT_PIPELINE_AUDIT.md`. Source verified against the working tree (canonical baseline).

## Executive summary

Of the 9 documents, **0 are purely descriptive, 2 are purely prescriptive** (`CANONICAL_TRANSCRIPT_CORRECTION_ARCHITECTURE`, `WORKSPACE_CONSOLIDATION_PLAN`), and **7 are MIXED** (a descriptive inventory/map plus a prescriptive recommendation section). **At least 9 distinct prescriptive statements across 5 documents conflict with a single ratified decision — A5** (AI corrections apply automatically, with recording and visible marking; per-change approval is *not* required). The entire quarantined set was written before A5 existed and is built on the opposite premise — a "propose-only, human-approves-each-change, delete auto-apply, retire Accept-All" model — which A5 explicitly rejected. Separately, **not one of the 9 documents contains a single `file:line` citation**; they reference bare filenames only, so none is usable as evidentiary input as written, and at least one load-bearing structural claim (standalone TS correction engines have "no Workspace caller") is **contradicted by source**. Headline recommendation: keep the four Workspace-*surface* documents as corrected input (they are the genuinely new ground the prior audit never covered and their structural claims resolve to real code), supersede the two that duplicate a better-evidenced prior audit or the ratified architecture, and **discard and redo the consolidation plan** on the ratified A1–A10 / F1–F10 basis. A fresh from-scratch Workspace-surface audit (Prompt P4) is **not** required; a focused verify-and-reconcile pass is.

---

## STEP 2 — Classification

| # | Document | Class | Descriptive portion | Prescriptive portion |
|---|---|---|---|---|
| 1 | `AI_REVIEW_AUDIT.md` | MIXED | "Current path", "Inputs and prompt responsibilities", "Outputs and changes" | "Risks", "Consolidation recommendation" (MERGE into TIE; disable auto-apply; AI Review to cease as independent action) |
| 2 | `CANONICAL_TRANSCRIPT_CORRECTION_ARCHITECTURE.md` | PRESCRIPTIVE | (none — a target-design "Decision" doc) | Entire document ("Decision", "Target flow", "Required boundaries", "UI architecture") |
| 3 | `CORRECTIONS_PANEL_AUDIT.md` | MIXED | "What the panel is", "Record origins", "Mutation behavior" | "Architectural judgment", "Target responsibilities" |
| 4 | `REVIEW_CONFIRM_AUDIT.md` | MIXED | "Current purpose", "Call path", "Inferences and transformations", "Persistence and confirmation semantics" | "Recommendation" (MERGE; emit structure CorrectionObjects) |
| 5 | `TRANSCRIPT_CORRECTION_ENGINE_INVENTORY.md` | MIXED | Engine table (9 families), "concerns implemented more than once" | "Authoritative assignments", "Retirement rule" |
| 6 | `TRANSCRIPT_CORRECTION_INVENTORY.md` | MIXED | "Inventory by mutation class", "What can change each domain", "Duplication hotspots" | "Authority conclusion" |
| 7 | `TRANSCRIPT_PIPELINE_MAP.md` | MIXED | "Current lifecycle", "Stage ownership and mutation map", "Duplicate processing boundaries" | "Required canonical lifecycle" |
| 8 | `WORKSPACE_BUTTON_AUDIT.md` | MIXED | Control/code-path table, "Important UX findings" | "Recommendation" column, "Future button model" |
| 9 | `WORKSPACE_CONSOLIDATION_PLAN.md` | PRESCRIPTIVE | "Repository verification" (descriptive header only) | KEEP/MERGE/DELETE table, "implementation order", "Final answers", "Stop decision" |

---

## STEP 3 — Conflict check (prescriptive statements vs ratified F1–F10 / A1–A10)

The dominant conflict axis is **A5**. A5 ratifies that AI corrections *apply automatically*, with recording (A1) and visible marking, the reporter's Certification read-through being the covering human decision, and states **"Per-change approval is not required."** Every prescriptive statement below asserts the pre-A5 opposite.

| Doc | Section | Statement (paraphrased, quoted where load-bearing) | Decision | Nature of conflict |
|---|---|---|---|---|
| AI_REVIEW_AUDIT | Risks #2 | Auto-apply "conflicts with the master rule that AI changes remain explicitly reviewable, acceptable, and rejectable… it changes the working layer before human action" | **A5** | Direct. The asserted "master rule" (human must act before any apply) is exactly what A5 overturned; A5 permits apply-before-per-change-review with marking + Certification read-through. |
| AI_REVIEW_AUDIT | Consolidation recommendation | "Disable automatic working-text application in the target design." | **A5** | Direct. A5 keeps automatic application (conditioned on recording + marking), not disabled. |
| CANONICAL_TRANSCRIPT_CORRECTION_ARCHITECTURE | Correction orchestration / Human decisions | "No deterministic or AI engine directly writes working transcript text… Machine proposals require accept/reject/edit." | **A5** | Direct. Mandates per-change human disposition before any write; A5 removes that requirement. |
| CORRECTIONS_PANEL_AUDIT | Target responsibilities #7 | "Remove independent 'run AI' behavior and unsafe unreviewed bulk acceptance." | **A5** | Partial/framing. A5 makes bulk/automatic application *permissible* when recorded and marked; blanket "unsafe unreviewed" framing contradicts A5's model. |
| WORKSPACE_BUTTON_AUDIT | Recommendation col — "Accept all AI suggestions" | "RETIRE or gate by explicit reviewed batch policy" | **A5** | Partial. A5 does not require item-level pre-review; a recorded+marked bulk apply is compliant. |
| WORKSPACE_BUTTON_AUDIT | Recommendation col — "Re-review" | "MERGE behind canonical orchestration" (remove as independent action) | **A5** | Partial. Re-run of automatic AI review is consistent with A5; removal is not mandated by ratified decisions. |
| WORKSPACE_CONSOLIDATION_PLAN | KEEP/…/DELETE — "Auto-apply AI working text" | "DELETE behavior after migration — Machine proposals must await reporter decision" | **A5** | Direct. A5 preserves auto-apply (with recording + marking); does not require awaiting per-item reporter decision. |
| WORKSPACE_CONSOLIDATION_PLAN | KEEP/…/DELETE — "Accept All without policy gates" | "RETIRE or strongly constrain — Bypasses item-level human review intent" | **A5** | Direct. "Item-level human review intent" is the pre-A5 premise A5 rejected. |
| WORKSPACE_CONSOLIDATION_PLAN | "Stop decision" | "STOP before Workspace implementation… consolidation… must precede button removal, renaming, or workflow rewiring." | **A5** + ratification event | The stop was predicated on unresolved design questions; ratification (F1–F10, A1–A10) resolved them. The stop condition as stated is stale. |

**Checks against the other decisions the prompt flagged — result: alignment, not conflict (reported for completeness):**

- **A8 (rendering reads, never writes):** The docs *align*. CANONICAL_…ARCHITECTURE "Formatting… must not silently correct lexical content"; WORKSPACE_CONSOLIDATION "Formatting must not own hidden wording changes." No conflict.
- **A6 (proceedings persisted, not re-inferred):** Align. Docs recommend persisting boundary/structure as explicit metadata and treat render-time re-inference as a defect. No conflict.
- **A4 (single speaker-identity owner):** Align. CORRECTIONS/ENGINE inventories flag multi-path speaker resolution as duplication to consolidate. No conflict.
- **A9 (Deepgram immutable baseline; fillers/stutters preserved):** Align. Docs consistently protect immutable `raw_text`; none recommend normalizing verbatim fillers/stutters. No conflict.
- **A1 (corrections recorded):** Align — the docs' CorrectionObject + append-only `correction_decisions` model is what A1 ratifies.
- **A3 (Python layout-only; oath synthesis deleted, not ported):** Partial gap, not conflict. Docs say "ARCHIVE after parity / do not delete prematurely" for the Python spec engine; A3 mandates outright *deletion* of oath synthesis. The docs neither contradict nor reflect A3's deletion mandate — a correction needed, not a conflict.
- **F7 (objection spacing = two spaces, per F3):** Not addressed by any prescriptive doc; see STEP 4 for the live drift.

---

## STEP 4 — Evidence quality

**Global finding (applies to all 9):** none of the quarantined documents contains any `file:line` citation. They cite bare filenames (`normalize.ts`, `aiReview.ts`, `CorrectionsPanel.tsx`, …) with no line anchors and no quoted code. **As written, no document in the set is usable as evidentiary input** under the standing guardrail; each requires re-citation at `file:line` before it can gate any decision. That said, I independently verified the core structural claims and the *filenames* resolve to real code. Per-document hit rates below reflect my source verification of load-bearing claims (not citations the docs themselves supplied).

Path note: the docs' bare filenames map to `src/components/**` and `src/lib/transcript/**` (e.g., `CorrectionsPanel.tsx` → `src/components/CorrectionsPanel/CorrectionsPanel.tsx`), not the `src/features/workspace/**` a reader might assume.

**AI_REVIEW_AUDIT — 5/5 verified**
1. AI Review runs via the edge function and a TS policy path — `supabase/functions/ai-review/index.ts:1`, `src/lib/transcript/aiReview.ts:1`, `src/lib/transcript/aiSuggestionEngine.ts:1` all exist. ✅
2. `AI_REVIEW_AUTO_APPLY` gates auto-apply — `supabase/functions/ai-review/index.ts:52`. ✅
3. Auto-apply writes `working_text` and inserts audit — `supabase/functions/ai-review/index.ts:206-210` (`transcript_words.update(plan.update)`), `:222-241` (`transcript_audit_log` insert). ✅
4. **Nuance the doc omits:** auto-apply defaults **OFF** — `isAIReviewAutoApplyEnabled(undefined) === false` (`src/lib/transcript/aiReview.ts:186`; test `src/lib/transcript/aiReview.test.ts:158`). The doc frames auto-apply as an active risk without noting it is opt-in. ✅ (claim true but under-qualified)
5. UI splits "AI Review" and "Corrections" — `src/components/RightSidebar/RightSidebar.tsx:32,34,81-82`. ✅

**CANONICAL_TRANSCRIPT_CORRECTION_ARCHITECTURE — 4/5 verified (1 aspirational)**
1. `corrections` / `correction_runs` / `correction_decisions` tables exist — `supabase/migrations/20260729120000_corrections.sql:27,49,89`. ✅
2. TIE provider-neutral path exists — `transcript_formatter/services/tie/correction_object.py`, `transcript_formatter/providers/{adapter,anthropic_adapter,mock_adapter,registry}.py`. ✅
3. Immutable recognition baseline (`raw_text`) is a real column/concept — consistent with prior audit §2 and `normalize.ts`. ✅
4. "One correction-run ID and one context hash per invocation" — schema supports it (`correction_runs.context_hash`, `supabase/migrations/20260729120000_corrections.sql:46`). ✅
5. "The live TS AI Review becomes a temporary adapter that emits the same CorrectionObjects" — **aspirational/UNVERIFIED**; no such adapter exists in source today. Would be verified by an import of the CorrectionObject contract from `aiReview.ts` (none found). ⚠️

**CORRECTIONS_PANEL_AUDIT — 5/5 verified**
1. `CorrectionsPanel.tsx` is a computed report — `src/components/CorrectionsPanel/CorrectionsPanel.tsx:1`, built via `buildCorrectionReport` from `correctionOrchestrator` (`src/context/DocumentContext.tsx:19`, consumed by the panel). ✅
2. It embeds `AISuggestionsSection` — `src/components/CorrectionsPanel/AISuggestionsSection.tsx:1`. ✅
3. AI Accept/Reject persist — `AISuggestionsSection` wires mutation hooks (`src/components/CorrectionsPanel/AISuggestionsSection.tsx:19`). ✅
4. "Accept All bulk-applies" — `useAcceptAllAISuggestions` + "Accept all {n} suggestions" button (`src/components/CorrectionsPanel/AISuggestionsSection.tsx:19,59,62`). ✅
5. Future CorrectionObjects live in `corrections`/`correction_decisions` — migration confirmed above. ✅

**REVIEW_CONFIRM_AUDIT — 5/5 verified**
1. `StructureReviewBanner` exists and the button is literally "Review & Confirm" — `src/components/StructureReviewBanner/StructureReviewBanner.tsx:27`. ✅
2. State lives in `DocumentContext` as `structureConfirmed` / `keepRawLabels` — `src/context/DocumentContext.tsx:52-53,286-287`. ✅
3. `confirmStructure()` / `keepRawLabels()` actions exist — `src/context/DocumentContext.tsx:208,211,262-263`. ✅
4. Banner drives `TranscriptEditor` rebuild — rendered at `src/components/TranscriptEditor/TranscriptEditor.tsx:418`. ✅
5. Speaker confirmation is a distinct `SpeakerPanel` workflow — `src/components/SpeakerPanel/SpeakerPanel.tsx:1`. ✅

**TRANSCRIPT_CORRECTION_ENGINE_INVENTORY — 4/5 verified, 1 contradicted**
1. `normalize.ts`, `multifileMerge.ts`, `boundaryEngine.ts` exist (family 1) — all present under `src/lib/transcript/`. ✅
2. CFE family — `src/lib/transcript/format/cfe.ts` (referenced), `src/lib/transcript/correctionRegistry.ts:1`. ✅
3. Live TS AI Review family — verified above. ✅
4. TIE family — verified above. ✅
5. **CONTRADICTED:** Family #6 "Standalone TS correction orchestration… primarily tests/types; **no unified Workspace caller**." Source shows `correctionOrchestrator` has **production callers**: `src/context/DocumentContext.tsx:19` (`import { buildCorrectionReport }`) and `src/components/CorrectionsPanel/CorrectionsPanel.tsx:23`. `correctionEngines.ts` is imported by `correctionValidator.ts` (non-test), which is imported by `formattingEngine.ts` and `geometryEngine.ts`. So the "unwired" claim is false for the orchestrator/report entry point. ❌

**TRANSCRIPT_CORRECTION_INVENTORY — 4/5 verified, inherits same contradiction**
1. Deepgram normalization owner `normalize.ts` — exists. ✅
2. AI Review row (`ai-review/index.ts`, `aiReview.ts`, `aiSuggestionEngine.ts`) — verified. ✅
3. Structure Review row (`StructureReviewBanner.tsx`, `workspacePresentation.ts`, `qaFixer.ts`) — `src/lib/transcript/workspacePresentation.ts`, `src/lib/transcript/qaFixer.ts` exist. ✅
4. Corrections report row (`CorrectionsPanel.tsx` + helpers) — `src/components/CorrectionsPanel/CorrectionsPanel.helpers.ts` exists. ✅
5. **CONTRADICTED (same as above):** "Standalone TS correction engines… **No current Workspace execution**." `buildCorrectionReport` executes in the Workspace via `DocumentContext.tsx:19`. ❌

**TRANSCRIPT_PIPELINE_MAP — 5/5 verified (but redundant; see STEP 5)**
1. Lifecycle stages map to real owners: `normalize.ts`, `multifileMerge.ts`, `boundaryEngine.ts`, `ai-review`, `buildEditorContent.ts` (`src/lib/buildEditorContent.ts:1`), `workspacePresentation.ts`, `qaFixer.ts` — all present. ✅
2. "Marks complete before all enrichment finishes; non-atomic boundary/AI timing" — consistent with prior audit §3.2 (`transcriptFinalize.ts:840-845` swallow). ✅
3. AI enrichment "may auto-apply working_text… can arrive after Workspace opens" — auto-apply verified; async nature consistent. ✅
4. "CFE corrects wording while also formatting and paginating" — consistent with prior audit §3.4/§3.5. ✅
5. Editor audit vs `correction_decisions` are parallel histories — both exist (`transcript_audit_log` insert at `ai-review/index.ts:224`; `correction_decisions` at migration `:89`). ✅

**WORKSPACE_BUTTON_AUDIT — 5/5 verified (control mapping is accurate)**
1. Re-review → `workspaceApi.triggerAIReview` → `ai-review` — `src/components/AIReviewBanner/AIReviewBanner.tsx:42`, button label at `:67`. ✅
2. "AI Review tab | RightSidebar.tsx → SuggestionsPanel.tsx" — `src/components/RightSidebar/RightSidebar.tsx:34,82`; `src/components/SuggestionsPanel/SuggestionsPanel.tsx:1`. ✅
3. "Corrections tab | RightSidebar → CorrectionsPanel; embeds AISuggestionsSection" — `RightSidebar.tsx:32,81`; embed verified. ✅
4. "Accept all AI suggestions… bulk applies every pending suggestion" — `AISuggestionsSection.tsx:62`. ✅
5. "Reassign utterance | UtteranceContextMenu.tsx → editor API" — `src/components/UtteranceContextMenu/UtteranceContextMenu.tsx:1`. ✅

**WORKSPACE_CONSOLIDATION_PLAN — 4/5 verified, self-reported limitation**
1. "Audited HEAD `756a38e…` on `feat/canonical-transcript-audit`, 3 ahead of integration `49d32c4`" — plausible and self-consistent with repo history (current HEAD `c6082e1` is a later commit on the same branch). ✅
2. KEEP rows for canonical `raw_text`, Manual Save, Confidence Panel map to real components (`ConfidencePanel.tsx`, `Toolbar/Toolbar.tsx`). ✅
3. "Auto-apply AI working text — DELETE" — the behavior exists (`ai-review/index.ts:206`) but the recommendation conflicts with A5 (STEP 3). ✅ (behavior real; recommendation invalid)
4. "Python spec engine / `ai_tools.py`" targets exist — `transcript_formatter/` tree present. ✅
5. "Build PASS / Tests PASS (124 files, 808 tests)" — **UNVERIFIED** (not re-run here; would be verified by `npm run build` + `npm test`). ⚠️

---

## STEP 5 — Overlap with prior audit (`TRANSCRIPT_PIPELINE_AUDIT.md`, 2026-08-02, findings-only)

### (a) Agreements
- **No single correction authority; responsibility fragmented across layers.** Prior §1–§2 ("authority for each responsibility is spread across 3–4 layers") ↔ INVENTORY "Executive finding" and ENGINE_INVENTORY "nine families."
- **Display ≠ canonical for CFE.** Prior §3.4 ("`cfe.ts` *shows* corrections… without persisting") ↔ INVENTORY "Display-derived; can leak into later manual saves."
- **Hidden AI auto-apply exists and is contentious.** Prior §3.4 "Hidden auto-apply" ↔ AI_REVIEW_AUDIT Risks #2 (both flag it; both — pre-A5 — lean against it).
- **`correctionEngines.ts` is a latent duplicate.** Prior §3.4/§4 (dead/test-adjacent) ↔ ENGINE_INVENTORY family #6 (candidate modules, not runtime authority). Both undersell its actual reachability (see contradiction below).
- **Structural decisions logged but not applied to canonical.** Prior §3.4 (`qa_split`/`objection_attribution` `pending_reason=structural_apply_engine_v2`) ↔ REVIEW_CONFIRM_AUDIT "presentation state, not a complete persisted correction run."
- **Duplicate paragraph builders / rendering paths.** Prior §3.5 (two `buildTranscriptParagraphs`) ↔ PIPELINE_MAP "Workspace pagination and export geometry are separate implementations."
- **Immutable `raw_text` and the read-only integrity gate are correct as-built.** Prior §2 ✔ rows ↔ all quarantine docs treat `raw_text` as the recognition anchor.

### (b) Contradictions (both accounts presented; not resolved)
- **Reachability of the standalone TS correction engines.**
  - *Quarantine account:* ENGINE_INVENTORY family #6 and INVENTORY both state the standalone TS correction orchestration has "no unified Workspace caller" / "No current Workspace execution."
  - *Prior-audit account:* §3.4/§4 narrows the dead-code claim specifically to `correctionEngines.ts` ("imported only by its own tests").
  - *Source:* `correctionOrchestrator.buildCorrectionReport` is imported and executed in production by `src/context/DocumentContext.tsx:19` and consumed by `src/components/CorrectionsPanel/CorrectionsPanel.tsx:23`; `correctionEngines.ts` is imported by non-test `src/lib/transcript/correctionValidator.ts`, itself imported by `formattingEngine.ts` and `geometryEngine.ts`. Both audits therefore understate wiring, and the quarantine set's blanket "no Workspace caller" is the more inaccurate of the two. (Note the two docs are describing overlapping-but-not-identical files, so this is imprecision on both sides rather than a head-to-head factual clash.)
- **Objection-spacing:** Prior §3.4/§4 independently re-verified an *internal* CFE drift — `correctionRegistry.ts:154` emits `Objection. Form.` (one space) vs `:216+` `Objection.  Form.` (two spaces). Confirmed in source. **No quarantine doc surfaces this**, and line 154's one-space form violates ratified **F7/F3** (two spaces). This is a gap in the quarantine set, not a contradiction, but it is material to the ratified format.

### (c) Genuinely new ground (Workspace surface — not covered by the prior audit)
The prior audit is a *data-layer* authority trace (speaker identity, boundaries, proceedings, corrections, rendering) and never enumerates the Workspace UI. The quarantine set's real contribution is the **interaction surface**, and its structural claims verify against source:
- **`WORKSPACE_BUTTON_AUDIT`** — the only inventory of Workspace controls and their code paths (Save, direct typing, Review & Confirm, Keep Raw Labels, Re-review, AI Review tab, Corrections tab, Accept/Reject/Accept-All, Speaker Save, Reassign utterance, Mark reviewed, layer menu, retranscribe). Verified: `RightSidebar.tsx:32,34,81-82`, `AIReviewBanner.tsx:42`, `AISuggestionsSection.tsx:62`, `UtteranceContextMenu.tsx`.
- **`CORRECTIONS_PANEL_AUDIT`** — panel-as-report + embedded mutation controls (`CorrectionsPanel` + `AISuggestionsSection`). New.
- **`REVIEW_CONFIRM_AUDIT`** — semantics of the "Review & Confirm" banner and the imperfect "Keep Raw Labels" projection (`StructureReviewBanner.tsx`, `DocumentContext.tsx:208-211`). New.
- **`AI_REVIEW_AUDIT`** — the "AI Review" vs "Corrections" tab split as a UX problem. New.

---

## STEP 6 — Recommendation

| # | Document | Recommendation | Justification |
|---|---|---|---|
| 1 | `AI_REVIEW_AUDIT` | **KEEP WITH CORRECTIONS** | Descriptive path/inputs/outputs verified (5/5). Must (a) add `file:line`, (b) note auto-apply defaults OFF (`aiReview.ts:186`), (c) delete/flip Risks #2 and "disable automatic working-text application," which conflict with **A5**. |
| 2 | `CANONICAL_TRANSCRIPT_CORRECTION_ARCHITECTURE` | **SUPERSEDED** | It is a target-architecture "Decision" doc; `RATIFIED_DECISIONS.md` is now the binding architecture authority. Its propose-only core contradicts **A5**; its safe parts (A1/A6/A8) are already ratified. Retain as non-authoritative background only. |
| 3 | `CORRECTIONS_PANEL_AUDIT` | **KEEP WITH CORRECTIONS** | Record-origins/mutation description verified (5/5). Correct "retire unsafe unreviewed bulk acceptance" to the **A5** recorded-and-marked model; add `file:line`. |
| 4 | `REVIEW_CONFIRM_AUDIT` | **KEEP WITH CORRECTIONS** | Call-path/persistence verified (5/5). Its "emit structure CorrectionObjects with accept/reject" recommendation is compatible with **A5** *if* auto-apply+marking is retained (and aligns with **A6**); reword to not require per-change approval; add `file:line`. Also reconcile with ratified **F9/F10** (role-title labels; paragraph reassignment). |
| 5 | `TRANSCRIPT_CORRECTION_ENGINE_INVENTORY` | **KEEP WITH CORRECTIONS** | Inventory is valuable but must fix the **contradicted** "no Workspace caller" claim (`DocumentContext.tsx:19`, `CorrectionsPanel.tsx:23`) and reconcile its "Retirement rule" with **A3** (oath synthesis is *deleted*, not archived). Add `file:line`. |
| 6 | `TRANSCRIPT_CORRECTION_INVENTORY` | **KEEP WITH CORRECTIONS** | Same contradiction to fix; overlaps the prior audit heavily but adds the UI mutation-class table. Add `file:line`. |
| 7 | `TRANSCRIPT_PIPELINE_MAP` | **SUPERSEDED** | Its data-layer/lifecycle content is a lower-evidence restatement of `TRANSCRIPT_PIPELINE_AUDIT.md` (which carries `file:line` and independent re-verification); its "Required canonical lifecycle" duplicates doc #2 (superseded). Low incremental value. |
| 8 | `WORKSPACE_BUTTON_AUDIT` | **KEEP WITH CORRECTIONS** | The single most valuable *new* artifact; control→code mapping verified (5/5). Flip the Recommendation column entries that conflict with **A5** ("Auto-apply DELETE," "Accept All RETIRE," "Re-review MERGE/remove") to the marking model; add `file:line`. |
| 9 | `WORKSPACE_CONSOLIDATION_PLAN` | **DISCARD AND REDO** | Its spine (propose-only, DELETE auto-apply, RETIRE Accept-All, "STOP before implementation") is built on the premise **A5** rejected, and its stop condition assumed open questions that ratification (F1–F10, A1–A10) has since resolved. The plan must be re-derived on the ratified basis; salvage only the verified KEEP rows. |

### Decision question — is a dedicated Workspace-surface audit (Prompt P4) still needed?

**No new from-scratch P4 is warranted; a focused verify-and-reconcile pass is.** The four Workspace-*surface* documents (#1, #3, #4, #8) already map the discovery target the prior audit never touched — buttons, the AI-review panel, the corrections panel, and the review/confirm flow — and the triage independently confirmed their core structural claims resolve to real code (`RightSidebar.tsx:32-82`, `StructureReviewBanner.tsx:27`, `AISuggestionsSection.tsx:62`, `AIReviewBanner.tsx:42`, `DocumentContext.tsx:208-211`). Re-running discovery would mostly re-derive what these four already contain. What they lack is not coverage but **rigor and currency**: (1) zero `file:line` citations, (2) recommendations built on the pre-A5 premise, and (3) one contradicted wiring claim. The efficient path is to **fold #1/#3/#4/#8 into one corrected Workspace-surface reference** — re-citing every claim at `file:line`, flipping the A5-conflicting prescriptions to the ratified recorded-and-marked model, fixing the `correctionOrchestrator`-caller error, and folding in the F7 objection-spacing drift the prior audit already proved — rather than commissioning P4 anew. Reserve a genuinely new audit only for areas none of the nine reached (e.g., the F8 line-numbering / F1 tab-stop *rendering* path, which is Certification-stage and outside the Workspace surface these docs cover).

---

*Triage produced by a read-only verification pass. Provenance and per-claim `file:line` evidence above. No source files were modified. The quarantined documents remain unmerged pending owner disposition of the recommendations in STEP 6.*
