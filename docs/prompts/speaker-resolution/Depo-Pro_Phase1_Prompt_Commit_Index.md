# Depo-Pro — Prompt & Commit Index (Phase 1: Speaker-Map UX)

A running map of the diagnostic and implementation work, in order, with commit hashes and
roadmap position. All prompt files live in this same outputs folder.

---

## The thread, in one sentence

The DOCX export was labeling every examination turn `A.` (including questions). Diagnosis
proved this was **not a formatter bug** but a **workflow gap**: transcripts whose speaker map
was never confirmed flowed to certified export and silently defaulted every line to `A.` The
fix was a guard + actionable CTA + status badge that make a confirmed speaker map a
precondition for certified export — never a silent fallback.

---

## Diagnostics (read-only audits, no commits)

| Step | Prompt file | Result |
|------|-------------|--------|
| Step 0 | `PROMPT_STEP0_QA_ROLE_DIAGNOSTIC.md` | **Branch 2 — upstream data gap.** Formatter is correct (`getBlockRole` at `pagination.ts:20` maps ATTORNEY→Q, WITNESS→A). Live jobs reach export with null roles + `speaker_map_confirmed = false`. caseId/jobId naming is misleading but resolves to the right job at runtime. |
| Step 0b | `PROMPT_STEP0b_SPEAKER_MAPPING_REACHABILITY.md` | **Outcome A — mapping path works and is reachable; live jobs just never ran it.** Speaker Mapping UI is mounted, saves via `PUT /:jobId/speakers`, writes `role`/`speaker_role` + flips the confirm flag. No code bug; a workflow gap. |

## Implementation (Phase 1 commits)

| Commit | Prompt file | Hash | What it did |
|--------|-------------|------|-------------|
| One (safety) | `PROMPT_PHASE1_EXPORT_GUARD.md` | `a50fff2ee9b15d235cdc3d2df0225ebe4b305e11` | Shared `requireConfirmedSpeakerMap` reader; certified lane (DOCX/package) hard-blocks when unconfirmed; draft lane (TXT) allowed but stamped `DRAFT — UNCONFIRMED SPEAKER MAP`. Added the ATTORNEY→Q / WITNESS→A contract test (the lock that was missing when all-`A.` passed 265 green). 265→269 tests. |
| Two-a (CTA) | `PROMPT_PHASE1_COMMIT2A_MAPPING_CTA.md` | `0e702a752af2dc4dbf5c954bf4dec8259f15fe4d` | "Map Speakers Now" CTA routes the block to the **failed transcript's** Speaker Mapping view (via new one-shot focus carrier `src/lib/workspaceFocus.ts` + exposed `navigateToTranscript`). Unknown/future export formats default to certified→blocked. 269→271 tests. |
| Two-b (badge) | `PROMPT_PHASE1_COMMIT2B_STATUS_BADGE.md` | `60d2009de1b4672e00b564dfca4233307c45bc25` | Read-only `SpeakerMapStatusBadge` in the workspace header (`Toolbar.tsx`), shown only when unconfirmed, off the existing `DocumentContext.speakerMapConfirmed`. Case list skipped (didn't carry the flag); no transcript-list surface exists. 271→273 tests. |
| Two-c (case-list badge) | `PROMPT_PHASE1_COMMIT2C_CASELIST_BADGE.md` | `fb7b4fa06cfc225aa02323359f70603367ba72be` | Extended the existing case-list data path to surface `speaker_map_confirmed`; reused the badge on case rows. No formatter/guard/CTA change. (Baseline 56/273 → 57/276.) |

**Parent chain:** `597735fb` (formatter, pre-existing) → `a50fff2e` → `0e702a75` → `60d2009d` → `fb7b4fa0`.

## Stage S formatter port (roadmap step 3)

Driven by `Wave8_Formatter_Port_Spec.md`. Layered: A (role resolution) → B (RenderLine + line
builders) → C (orchestrator) → rewire `docxFormatter` to consume RenderLines. Vocabulary
bridge locked: `ATTORNEY→examining_attorney`, `WITNESS→witness`, `REPORTER→court_reporter`,
`INTERPRETER→interpreter`, unknown→`other`. `defending_attorney` + `videographer` are deferred
mapping-UI/persistence extensions (unlock objection isolation + off-record transitions).

| Layer | Prompt file | Hash | What it did |
|-------|-------------|------|-------------|
| A (role resolution) | `PROMPT_STAGES_LAYERA_SPEAKERMAPPING.md` | `021d3f3a34dad719bead24516aba18b9aee5da84` | `src/editor/speakerMapping.ts`: deterministic vocabulary adapter + `roleToQaMode` (colloquy → `""`) + `participantLabel` (fixed court-officer labels; `MR. SURNAME` form) + `buildIndexMap` (first-wins). Pure logic, no render-path/UI change. 276→285 tests. |
| B (RenderLine + builders) | `PROMPT_STAGES_LAYERB_RENDERLINE.md` | `4b0f7fa6df019afa1a06474bd18c2c5dfbf4a02e` | New `src/editor/stageS/` folder: `models.ts` (RenderLine + line-type/tab constants), `colloquy.ts` (two-space rule), `objectionHandler.ts` (marker list + interruption/resumption dash), `lineBuilder.ts` (qa/colloquy/by/examination/parenthetical/flagged factories). Pure logic, not wired. Task 0 confirmed no prior TS RenderLine existed (only docs); formatter is still painter-style `qa/colloquy/parenthetical` paragraph kinds. 285→293 tests. |

**Port parent chain:** `fb7b4fa0` (2c) → `021d3f3a` (Layer A) → `4b0f7fa6` (Layer B).

---

## Known, intentional gaps (logged, not defects)

- **`workspaceFocus.ts` uses localStorage** (matches the existing `certificationReady` idiom).
  Fine for a one-shot queue→consume carrier; minor stale-value caveat if a focus is queued and
  never consumed. Not worth churn now.
- **Four existing unmapped live jobs** were deliberately **not** backfilled or inferred. They
  now correctly refuse certified export and route to mapping like any other job.
- **Keyterm commit `1fb0478`** still owes Level 1/2 verification (independent of this thread).

---

## Roadmap position

- **Phase 1 (Formatting) speaker-map UX: DONE** through `fb7b4fa0` (guard → CTA → workspace badge → case-list badge).
- **Wave 8 formatter salvage audit: DONE** — see `Wave8_Formatter_Port_Spec.md` (the port-ready spec).
- **Stage S port — Layer A (role resolution): DONE** at `021d3f3a`.
- **Stage S port — Layer B (RenderLine + line builders): DONE** at `4b0f7fa6`.

Next, in order:

1. **Stage S port — Layer C** (the `renderStageS` orchestrator: examination ritual, objection isolation, off-record state machine, re-attribution). Objection isolation + off-record ship here but stay inert until `defending_attorney` / `videographer` are captured (deferred mapping-UI extension). ← next implementation step
2. **Rewire `docxFormatter`** to consume `RenderLine`s — the seam where Stage S line-types/tab-levels meet the formatter's existing `qa/colloquy/parenthetical` paragraph kinds. Verify by visual-diff against the three hand-built reference files.
3. **Mapping-UI/persistence extension** for `defending_attorney` + `videographer` → activates objection isolation + off-record (no Stage S code change).
4. **Correction layer** (Phase 2) — deterministic rules + propose-only AI guardrail (`four_part_test`), reusing `requireConfirmedSpeakerMap` as the precondition.
5. **Exhibits** (Phase 3).
6. **Templates / pagination** (Phase 4).

See `Wave8_Salvage_Review.md` for the full salvage map and `Wave8_Formatter_Port_Spec.md` for port detail.
