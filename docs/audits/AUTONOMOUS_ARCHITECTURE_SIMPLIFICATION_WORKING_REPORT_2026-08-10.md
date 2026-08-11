# Depo-Pro Autonomous Architecture Simplification Working Report

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: autonomous-simplification-working-report
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

Date: 2026-08-10  
Branch: `feature/stage3-workspace-core`  
Baseline HEAD: `25b600010d0653277c0e0f4f7623aa5b03f88737`  
Status: In progress

This report records evidence gathered under the V2 autonomous architecture simplification, recovery, and modernization program. It is a working audit artifact, not a production authority.

## Capability matrix

| Surface | Read | Write/deploy capability | Current safety disposition |
|---|---:|---:|---|
| GitHub | Yes | Apparent repository admin/write | Do not push or merge without the final integration gate |
| Supabase | Yes | Function deploy and database tooling available | No production deployment or destructive database work without a mandatory human gate |
| Vercel | Yes | Deployment capability available | Local link points to `depo-pro` while the active app is `depo-pro-web`; do not deploy until target identity is explicitly reconciled |
| Depo-Pro application browser | Yes, authenticated | UI interaction available | Read-only baseline work; no transcript mutation during assessment |

## Safety baseline

- Repository: `C:\Users\james\Projects\Depo-Pro`
- Accepted recovery commits are present at HEAD: `a0d025bb1da6410ffb5ae4a6d2e74b7da0870ed8` and `25b600010d0653277c0e0f4f7623aa5b03f88737`.
- Tests: 942/942 passed across 140 files.
- Typecheck: passed.
- Production build: passed.
- Documentation validation: passed (315 documents, 1,023 relationships).
- Repository-wide lint: baseline failure caused by duplicated findings inside two unrelated `.claude/worktrees`; no current-branch file appeared in the output.
- Pre-existing untracked paths: `tools/` and inaccessible `UsersjamesAppDataLocalTempdepo_pytest/`.

## Clean-input benchmark

- Transcript: `tr_1786372056908_hyjqv3`
- Transcription job: `39e4194c-90ad-4a39-a3c6-951bb08f2684`
- Canonical utterances: 1,757
- Canonical words: 13,952
- Speakers: 7
- Ingestion: one physical-audio callback request, no virtual chunks, sequential non-overlapping ordinal/time bands

## Characterization deliverables

- Clean-input defect and necessity matrix — `CLEAN_INPUT_DEFECT_NECESSITY_MATRIX_2026-08-10.md` (DOC-0320).
- AI-review HTTP 500 diagnosis — `AI_REVIEW_HTTP_500_ROOT_CAUSE_2026-08-10.md` (DOC-0317).
- Responsibility graph / AI-pipeline inventory — `AI_PIPELINE_INVENTORY_2026-08-10.md` (DOC-0321).
- Canonical authority matrix — `CANONICAL_AUTHORITY_MATRIX_2026-08-10.md` (DOC-0319).

## Phase G implementation progress (2026-08-10)

All local on `feature/stage3-workspace-core` (no history rewrite). Only the boundary safety fix was additionally deployed, with explicit owner authorization.

| Commit | Change | Class | Verification |
|---|---|---|---|
| `723ab9d` | Documentation-governance gate cleared | docs governance | docs:check 8→0 |
| `478cf7e` | AI-pipeline inventory + elimination map (DOC-0321) | characterization | docs:check green |
| `36dee53` | Retire 5 proven-dead TS engines + tests | Risk A/B, deletion gate | tsc · 896 tests · lint · build |
| `edabe61` | Pause boundary engine (stub-prompt A11/cost exposure) behind default-off flag | in-freeze safety | deno check; **deployed** rev `00004-gk6`, accepted |
| `ac37cae` | Reporter identity from canonical data (remove hardcoded `"Miah Bardot, CSR No. 12129"`) | §14/§57, Risk C | tsc · 899 tests · deno +0 · build |
| `4e3fd18` | qaFixer: objection attribution `MR. RAMON` → canonical `UNIDENTIFIED_SPEAKER`; drop dead `four→form` | §14/§57 | tsc · 901 tests · build |
| `58860d6` | qaFixer: remove blanket deterministic `K.→Okay.` | §14/§57 | tsc · 901 tests |
| `845e2bd` | Standalone `K.→Okay.` verbatim exception, utterance-initial (ADR-0018/DOC-0322); supersedes `58860d6` | bounded exception | tsc · 910 tests · docs:check |
| `c4ad9fd` | Tighten `K.`/`k.`→`Okay.` to whole-utterance (interim); ADR-0018 → **DRAFT**; supersedes `845e2bd` | interim | tsc · 912 tests · docs:check |
| `8a32728` | **Merge** `docs/workspace-ufm-first-render` — brings ratified **A11** + **ADR-0017** onto this branch (they were never fictional; branch-visibility) | merge (docs) | docs:check green (323 docs) |
| `b72bf46` | **Remove `K.→Okay.` from the deterministic path entirely**; reserve for the A5 correction layer (ADR-0018 spec, unimplemented); note the erroneous self-ratification; supersedes `845e2bd`/`c4ad9fd` | correctness/governance | tsc · 905 tests · docs:check |

## Architectural reduction scorecard (§41)

| Metric | Before Phase G | After (current) | Note |
|---|---|---|---|
| Dead/duplicate TS correction engines (wired-as-dead) | 5 | 0 | retired via deletion gate (`36dee53`) |
| Live production paths that fabricate record content | 3 (boundary stub-prompt parentheticals; `MR. RAMON` objection label; `four→form`) | 0 live | boundary paused; objection→unidentified; four→form removed (was dead) |
| Hardcoded case-specific defaults in the touched live code | reporter `"Miah Bardot, CSR 12129"` ×2 sites; `MR. RAMON` | 0 | `ac37cae`, `4e3fd18` |
| Uncontrolled paid AI calls in production | up to 3 Sonnet / transcript (boundary, stub prompts) | 0 (flag default-off, deployed) | `edabe61` |
| Deterministic "corrections" that guess/fabricate | blanket `K.→Okay.`, `four→form`, `MR. RAMON` | 0 | `four→form`/`MR. RAMON` removed; `K.→Okay.` removed from the deterministic path and reserved for the A5 correction layer (ADR-0018, spec'd/unimplemented) |
| Competing Q/A structural authorities | `line_type`, `structureEngine`, workspace heuristics, `qaFixer`, spec_engine | `structureEngine` retired; `qaFixer` marked retirement candidate | target = one reviewed structured line-type authority |
| Full test suite | 942/942 (140 files) baseline | 910/910 (135 files) | 5 dead test files removed; regression tests added |

Lower LOC alone is not the objective. The net effect is fewer competing authorities, zero live fabrication of the record, and a single bounded exception replacing several unbounded case-specific rules.

### LOC + module measurement (§41, read-only git)

Baseline = `478cf7e` (`36dee53^`, immediately before the first reduction commit, Wave G1). Recompute from Git as HEAD moves — the numbers are a checkpoint, not permanent facts. **Distinguish gross-removed from replacement-added from net from test/doc/scaffolding added; added tests/docs/inert-scaffolding are NOT bloat.** Snapshot at HEAD `bd294d9`.

**Delta baseline → HEAD** (`git diff --numstat`):

| Domain | Added | Removed | Net | Note |
|---|---|---|---|---|
| **Production TS** (`src/` excl. tests) | 921 | 1,563 | **−642** | net shrinkage *while adding* the line_type foundation, CorrectionObject contract, pagination contract. Net moved −783 → −642 as ~140 lines of inert replacement scaffolding landed (expected, not bloat). |
| Src tests | 577 | 547 | +30 | 5 dead test files removed; new invariant/drift/contract tests added (net roughly flat) |
| `supabase/` (functions + migrations) | 245 | 3 | +242 | line_type migration file + editor-api structure endpoint + edge type-honesty (all non-active/undeployed) |
| `scripts/` + CI | 121 | 0 | +121 | permanent Edge Function deno-check gate (tooling, not product) |
| Docs (excl. generated) | 1,099 | 10 | +1,089 | governance: DOC-0324..0328 + scorecard + branch audit |

**Current production snapshot (tracked LOC):**

| Domain | Files | LOC | | Domain | Files | LOC |
|---|---|---|---|---|---|---|
| TS/TSX production (`src/`, excl. tests) | 224 | 46,592 | | Python `transcript_formatter/` (dead-rel-prod) | 89 py | 21,909 |
| Src tests | 141 | 21,473 | | Cloud Run `formatter_service`+`formatter_core` | — | 1,935 |
| Edge Functions (`supabase/functions`) | 16 | 7,100 | | Migrations | 42 | — |
| Governed docs | 328 | — | | Dependencies | 16 + 19 dev | — |

**Production domain LOC (src, excl. tests):** transcript `src/lib/transcript` 6,414 · rendering/export `src/lib/export`+`src/lib/format` 1,397 · UFM `src/lib/ufm` 779 · Workspace `TranscriptEditor`+`CorrectionsPanel` 1,643 · components total 14,547.

**Modules:** removed **5** (`correctionEngines`, `correctionValidator`, `entityRegistry`, `formattingEngine`, `structureEngine` — Wave G1); added **3** inert (`structuralProposal.ts`, `lineTypeMigration.ts`, `paginationContract.ts`) + relocated `correction_object.schema.json` + the edge gate script. Net −2 live modules while adding the persisted-structure authority the app was missing.

**Engines / authorities / paths (before → current):** dead/duplicate TS correction+reconstruction engines **5 → 0**; competing Q/A structural authorities **5 → 3** (target = 1 reviewed `line_type`); CorrectionObject definitions **3 hand-synced → 2 mechanically drift-tested**; live record-fabricating paths **3 → 0**; Edge Function type verification **none → permanent CI gate**; pagination authorities **(discarded, none queryable) → 1 inert contract**.

**Five largest remaining deletion/consolidation opportunities:**

1. **Python `transcript_formatter/`** — ~21,909 LOC / 89 py (113 tracked). *Responsibility:* certified-page builders, rule tables, UFM, templates, CorrectionObject/schema history, prompts, fixtures. *Reachability:* dead vs current prod execution (DOC-0326). *Must survive:* the certified front/back-matter builders (ADR-0017) — reference implementation of a live-absent capability. *Surviving owner:* live `formatter_core`/TS render model after re-home. *Prerequisite:* pagination producer + certified-page re-home (DOC-0328). *Gate:* four-part, NOT MET. *Human Gate:* deletion + the certified-pages product build.
2. **Cloud Run + `transcript_formatter` PDF/geometry duplication** — the body render+geometry+PDF ARE replicated in `formatter_core` (safely redundant); only the structural pages are the gap. *Reachability:* `formatter_core` live. *Prerequisite:* confirm re-home parity. *Gate:* partial.
3. **`ai-review` legacy word-suggestion path** — ~540 LOC (`supabase/functions/ai-review`). *Responsibility:* legacy per-word suggestions. *Reachability:* reachable but 500s pre-AI; output orphaned (DOC-0321). *Must survive:* nothing unique (CorrectionObject bridge owns it). *Surviving owner:* bridge path. *Prerequisite:* wire a live `corrections` reader (Wave G3). *Gate:* deferred under freeze. *Human Gate:* deploy.
4. **`qaFixer.ts`** — 281 LOC. *Responsibility:* render-time Q/A split + re-merge. *Reachability:* 1 live consumer (`workspacePresentation.ts:743`). *Must survive:* Q/A structural split (→ reviewed `line_type`). *Surviving owner:* persisted `line_type` + converged builder. *Prerequisite:* `line_type` activation + parity. *Gate:* RETIRE-VIA-MIGRATION, NOT MET. *Human Gate:* flag flip.
5. **`aiSuggestionEngine.ts` (276 LOC) + `keepRawLabels`/`structureConfirmed` branches** — *Reachability:* aiSuggestionEngine dead behind the ai-review 500; keepRawLabels/structureConfirmed live render branches. *Must survive:* structure-review capability (→ Workspace review affordance). *Prerequisite:* line_type activation. *Gate:* deferred. *Human Gate:* activation + deploy.

Headline: production TS has **shrunk ~642 LOC net** while the missing structural authority, the CorrectionObject contract, and the pagination contract were *added*; the dominant remaining reduction (~21.9k Python LOC + ~1.1k dead TS AI-path LOC) is staged behind harvest/activation gates — required capability first, deletion second.

### Governance note (verbatim floor) — corrected

An earlier revision of this report claimed the code's "A11 / ADR-0017 verbatim floor" citation was fictional. **That was wrong.** A11 ("No fabrication of the spoken record") and ADR-0017 were ratified on `docs/workspace-ufm-first-render` and had simply never been merged onto the code branch — so an audit of this branch alone could not see them. They are now merged (`8a32728`); the citations resolve. The lesson: a governing document absent from the branch where the code lives reads as a fabricated citation to any branch-local audit — merge, don't re-derive.

- **A11 is the verbatim-floor authority** ("No fabrication… corrections may only replace content the source contains… flagged for human resolution, never reconstructed"), established by ADR-0017, complementing A9.
- **`K.→Okay.` is a correction, not a verbatim normalization**, so it is removed from the deterministic path and reserved for the **A5** correction engine (applied, recorded, marked, reviewed) — specified in ADR-0018, unimplemented, and gated on clean data.
- **ADR-0018 is DRAFT.** A prior revision self-marked it `RATIFIED, approved_by: James` — an **agent error** (the owner did not ratify it), corrected to DRAFT and noted in commit `b72bf46`. Ratification remains the owner's alone; Miah (format authority) confirmation is also pending.
- **Still deferred (separate commit):** sweep any remaining stale/loose `A11 / ADR-0017` references in code comments now that the authorities are present, for citation accuracy.

## qaFixer disposition — Complexity Justification Test (§15)

**"If `qaFixer` disappeared entirely, what legitimate product capability would be lost, and which canonical component should own it?"**

- Legitimate remaining responsibility: **structural** splitting of Q / A / embedded-objection content that diarization merged into one paragraph, plus consecutive-paragraph re-merge. Sole consumer: `workspacePresentation.ts:743`.
- Canonical target owner (per DOC-0319): **one reviewed structured line-type authority** — the persisted `line_type` on canonical utterances (schema exists at `structuredTranscript.ts`), reviewed by a human, replacing render-time heuristics.
- **Can it be retired now under the four-part deletion gate? No.** The gate requires every legitimate responsibility to have a *surviving owner*. The persisted `line_type` authority is defined in schema but **not populated** — DOC-0320 found zero utterances with a non-UNKNOWN persisted line type. Removing `qaFixer` today would drop Q/A structure on the live Workspace/export path.
- **Disposition: RETIRE-VIA-MIGRATION (deferred), not expand.** Exact dependency: (1) populate/curate canonical `line_type` per utterance as the reviewed structured authority; (2) migrate `workspacePresentation` to consume persisted `line_type` instead of `applyQaFixer` heuristics; (3) verify Q/A parity; (4) retire `qaFixer` through the deletion gate. Until then `qaFixer` stays in place, flagged in-code as a retirement candidate, and must not accrue new rules (fabrication/lexical corrections were removed in `4e3fd18`/`58860d6`/`845e2bd`).

## Blockers and deferred operations

- The earlier "repository editor / windows sandbox `helper_unknown_error`" blocker was **disproven** by filesystem evidence (edits landed; commits succeeded). It is not treated as a real blocker; see the false-editor-sandbox memory. Repository edits proceed normally.
- Deferred behavioral waves under BETA_FREEZE: G2 (transport/trigger de-dup), G3 (ai-review consolidation), G5 (paragraph/speaker-owner consolidation). Python `transcript_formatter/` retirement remains a separate Human Gate (harvest rule tables + `.docx` templates first).

## line_type migration (DOC-0325) — freeze-limited local waves landed

Owner accepted DOC-0325 (commit `f819251`) and authorized the locally-reversible implementation.
Under BETA_FREEZE (non-active, default-off only; precedent `edabe61`), Waves 1–4 landed as inert
scaffolding — migration file **not applied**, endpoint **not deployed**, `PERSISTED_LINE_TYPE_ENABLED=false`:

- `4e54613` Wave 1 — review-contract migration file + `database.ts` structure columns + canonical review/proposal types.
- `082e7da` Wave 2 — pure `structuralProposal` derivation (`{line_type, confidence, reason}`); live classifiers untouched.
- `58647f1` Wave 3 — editor-api `PUT /:jobId/structure` review-persistence endpoint (undeployed; `deno check` clean bar the shared Database-stub pattern).
- `d7e390b` Wave 4 (core) — default-off migration flag + `shouldProposeStructure` review-lock invariant + `selectReviewCandidates`.

**Stopped at the freeze gate.** Deferred as activation (owner review before proceeding): the parallel
converged render builder, Wave 5 Workspace review UI + provider-evidence view, `keepRawLabels` removal,
`qaFixer` retirement, and the post-convergence parity/regression suite. Full detail + Human Gates in
DOC-0325 "Implementation status".

## Python transcript_formatter/ characterization (DOC-0326) — retirement prep

`13b8151` — read-only inventory (4 parallel sweeps) grounding the retirement Human Gate. Verdict: **DEAD
relative to production** (standalone Windows CustomTkinter GUI, 113 tracked files; Cloud Run uses a
separate `formatter_core`; only two TS provenance comments reference it) but **NOT yet safe to delete** —
Morson/UFM rule tables, the Python-only certified-output pages (title/caption/appearances/indexes/
certification/changes-signature/post-record retroactive) with no `formatter_core` counterpart, the 10 UFM
templates, and the CorrectionObject schema-of-record (mirrored by `correctionObject.ts`) must be harvested
first, and case-specific/fabrication hazards scrubbed. Four-part deletion gate: **NOT MET**. Independently
confirms the 3-way CorrectionObject sync hazard also noted in DOC-0321. Deletion remains a Human Gate.

