# Depo-Pro Production Gate Sequencing Plan — DRAFT

---
authority_tier: T5
status: DRAFT
owner: Architecture
scope: production-gate-sequencing
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-11
ratified_date: null
last_reviewed: 2026-08-11
next_review: 2027-08-11
ratification: REVIEW
implementation_status: NOT_APPLICABLE
---

DRAFT ONLY — planning authority, not an execution authorization. Engineering baseline
`8cfe18e` → FINAL PRE-GATE MEASURED HEAD `1f081cd`. Production is frozen; nothing has been
pushed, deployed, migrated, backfilled, or activated. This plan is Rev. 2 with two approved
wording corrections (Gate 2 Stage B rollback; Gate 1A rollback). Ground truth used:
`PERSISTED_LINE_TYPE_ENABLED = false`; `certified?` optional/default-off in
`src/lib/export/exportServiceContract.ts` and `exportAdapter.ts`; migration
`supabase/migrations/20260810180000_line_type_review_contract.sql` is additive DDL plus a
deterministic `review_status` backfill from the legacy `manually_reassigned` flag;
`isRealApiMode()` is the build-time `VITE_USE_REAL_API` env; the formatter ships as a
stateless Cloud Run image (`cloudbuild.formatter.yaml` + `formatter_service/Dockerfile`).

## A. R1–R4 classification
R1 flag-reversible · R2 redeploy/code-revert-reversible · R3 data-restore-required · R4
practically irreversible.

| Operation | Class | Reasoning |
|---|---|---|
| Certified formatter image deploy | R2 | Stateless Cloud Run; revert = redeploy prior revision |
| Flip `certified` on in export request | R1/R2 | Per-request field; revert = stop sending / redeploy |
| line_type additive schema migration | R2 | `add column if not exists` nullable/defaulted; droppable, empty |
| line_type review_status backfill | R3-RECOVERABLE | Restorable via backup or recompute from preserved `manually_reassigned` |
| line_type activation flip + deploy | flip R1/R2; accrued structure R3 | Flip reverts by redeploy; new reviewer structure is the PONR |
| Fallback-loader retirement | R2 | Code removal; gated on `isRealApiMode()` verification |
| Python source deletion | R3 while archival bundle exists | Restorable from bundle; program avoids the R4 destruction event |
| Make `main` authoritative | R2/R3 | Git-revertable while bundles exist |
| Obsolete branch/tag deletion | R3 | Recoverable from the retained archival bundle |

## B. Structural/certified dependency
`persisted line_type → Working Transcript → FinalizedTranscriptModel → CFE →
PaginationMap → certified transport → formatter worker → complete certified DOCX`.
line_type activation (Gate 2) precedes certified activation (Gate 3); the stateless
formatter image may be pre-staged in Gate 3 while `certified` stays default-off.

## C. Point of No Easy Return
- LAST CLEAN ABANDONMENT POINT: exit of Gate 1B — dormant additive schema installed and the
  deterministic legacy backfill applied, both with a verified restore path; line_type still
  inactive; every step R2 or R3-recoverable.
- PROGRAM-WIDE POINT OF NO EASY RETURN: the first new human-reviewed structural decision
  persisted under the activated line_type architecture that cannot be losslessly represented
  by the legacy authority — concretely, the first persisted `objection_split` extraction or
  reviewer line_type override (`CONFIRMED`/`OVERRIDDEN`) that render-time
  `qaFixer`/`keepRawLabels` cannot reproduce. This occurs at Gate 2 Stage B, not at the flag
  flip. Crossing requires the dedicated §G PONR sentence, obtained immediately before Stage B;
  no gate approval implies it.

## D. Pre-gate implementation prerequisites (R1/R2 local — not gate actions)
| ID | Prerequisite | Class | Must complete before |
|---|---|---|---|
| P1 | Examination-index synthesized-header fix + regression | R2 | Gate 3 |
| P2 | Legal-parity metadata (`case.ts` additions; caption/certificate → EXACT where required) | R2 | Gate 3 |
| P3 | `loadTranscriptSnapshot`/`isRealApiMode()` production verification; retire fallback if reachable | R2 | Gate 2 |
| P4 | Python reference/template/test harvest | R1 | Gate 5 (retirement phase; does NOT block Gates 1–3) |

P1/P2/P3 land under Gate 0 and are verified before any production gate. P4 moves to the
retirement phase and never blocks schema/activation/deployment.

## E. Revised gate sequence
```
Gate 0   Scoped freeze lift + implement/verify P1, P2, P3
Gate 1A  Dormant additive production schema (DDL only)            [R2]
Gate 1B  Deterministic legacy-state backfill (review_status)     [R3-recoverable]  <- LAST CLEAN ABANDONMENT POINT
Gate 2   Activate line_type + structural validation
           Stage A  read/projection canary (pre-PONR, reversible)
           PROGRAM-WIDE PONR authorization
           Stage B  first new reviewed structural persistence     [PONR crossing]
Gate 3   Deploy (R2) + enable certified output + prod validation
   -- production soak --
Gate 4A  Retire superseded runtime authorities + UFM consolidation
P4       Python harvest / deletion-readiness gate
Gate 4B  RC verification + make main authoritative                [R2/R3, bundle retained]
Gate 5   Clean obsolete branches/worktrees/reference; RETAIN one archival bundle
DONE
```

## F. Gates (fixed template)

### GATE 0 — Scoped Freeze Lift + P1/P2/P3
- Purpose: authorize RC development; implement and verify P1, P2, P3.
- Freeze scope: RC branch only; production untouched.
- Execution-time preconditions: `1f081cd` clean; full ladder green re-run.
- Active authority before/after: unchanged.
- Residual authorities remaining: all.
- Dependencies: none.
- Reversibility class: R1 (freeze re-closes).
- Backup requirement: none.
- Ordered actions: 1) re-verify ground truth; 2) land P1, P2 (R2) as reviewed PRs; 3) resolve
  P3 — verify `isRealApiMode()` invariance with deployed-env evidence, or retire the unranged
  fallback (R2); 4) re-run full ladder.
- Verification after each action: ladder green; P1/P2 regression; P3 resolved.
- Abort criteria: any of P1/P2/P3 not provable/resolvable locally.
- Rollback trigger: ladder regression.
- Rollback procedure: revert PR(s); freeze re-closes.
- Local Point of No Easy Return: none.
- Exit criteria: P1/P2/P3 complete + verified; nothing deployed.
- Residual authorities killed: none.
- Next gate unlocked: Gate 1A.

### GATE 1A — Dormant Additive Production Schema
- Purpose: install additive line_type DDL in production; no row mutation.
- Freeze scope: migration (DDL) only; re-close after.
- Execution-time preconditions: Gate 0 exit; migration reviewed as strictly additive; backup
  verified restorable.
- Active authority before/after: unchanged; new columns exist but unused (flag off).
- Residual authorities remaining: all.
- Dependencies: Gate 0.
- Reversibility class: R2.
- Backup requirement: verified backup.
- Ordered actions: 1) backup + verify; 2) apply additive DDL; 3) verify columns
  nullable/defaulted and zero existing rows rewritten.
- Verification after each action: schema diff == migration DDL; row-level checksums unchanged;
  app green with flag off.
- Abort criteria: any non-additive effect; unexpected row change.
- Rollback trigger: verification failure.
- Rollback procedure: DEFAULT — leave the verified additive columns dormant with all consuming
  flags off (additive unused columns are safe to retain and dropping them is unnecessary
  schema churn). Drop the columns ONLY if the migration itself causes a demonstrated problem
  AND the drop has been separately verified safe.
- Local Point of No Easy Return: none.
- Exit criteria: dormant columns present; no data mutated; flag off.
- Residual authorities killed: none.
- Next gate unlocked: Gate 1B.

### GATE 1B — Deterministic Legacy-State Backfill — LAST CLEAN ABANDONMENT POINT
- Purpose: set `line_type_review_status` from the legacy `manually_reassigned` flag
  (deterministic, recreatable).
- Freeze scope: the single UPDATE only; re-close after.
- Execution-time preconditions: Gate 1A exit; count preview of affected rows; restore path
  proven (backup restorable and recompute-from-`manually_reassigned` validated on a sample).
- Active authority before/after: unchanged (flag still off); only review_status metadata set.
- Residual authorities remaining: all.
- Dependencies: Gate 1A.
- Reversibility class: R3-RECOVERABLE.
- Backup requirement: MANDATORY verified backup immediately before the UPDATE.
- Ordered actions: 1) fresh backup + verify restore; 2) preview affected-row count; 3) run the
  UPDATE; 4) verify affected rows == preview == count of legacy flag; 5) spot-check recompute
  equivalence.
- Verification after each action: affected-row parity; sampled rows recomputable from
  `manually_reassigned`.
- Abort criteria: count mismatch; recompute divergence; backup not restorable.
- Rollback trigger: any verification failure.
- Rollback procedure: restore backup, or recompute-revert from legacy flag.
- Local Point of No Easy Return: none — this gate's exit is the LAST CLEAN ABANDONMENT POINT.
- Exit criteria: backfill verified + recoverable; flag off; app green.
- Residual authorities killed: none.
- Next gate unlocked: Gate 2.

### GATE 2 — line_type Activation & Structural Validation — PROGRAM-WIDE PONR (at Stage B)
- Purpose: activate line_type; validate the structural chain in a two-stage canary; cross the
  PONR only at Stage B.
- Freeze scope: activation deploy + canary; re-close after.
- Execution-time preconditions: Gate 1B exit; P3 resolved; rollback deploy staged; fresh backup.
- Active authority before: `qaFixer`/`keepRawLabels`/body-only structure. After Stage B:
  persisted line_type is the structural authority for new decisions.
- Residual authorities remaining: `qaFixer`/`keepRawLabels` remain in code (retired Gate 4A).
- Dependencies: Gate 1B; PONR authorization (immediately before Stage B).
- Reversibility class: Stage A R1/R2 (flag off / redeploy); Stage B R3 — PONR.
- Backup requirement: MANDATORY fresh backup before Stage A.
- Ordered actions:
  - Stage A (pre-PONR, read/projection): 1) enable the projection path (flag on) on a
    controlled canary case without creating new reviewed structure; 2) validate
    existing/backfilled line_type → Working → FinalizedTranscriptModel → CFE → PaginationMap on
    production data; 3) confirm invariants (one paginator, coherent coordinates, no garble).
  - PONR authorization: obtain the dedicated §G PONR sentence.
  - Stage B (PONR crossing, persistence): 4) explicitly authorize and create the first new
    reviewed structural decision (a persisted `objection_split`/override not representable by
    legacy); 5) validate it round-trips through to certified coordinates; 6) monitor.
- Verification after each action: Stage A green before any authorization; Stage B first-write
  validated end-to-end.
- Abort criteria: Stage A validation fails → flag off, redeploy, restore if needed (still
  clean — pre-PONR). Stage B is not entered until Stage A green AND PONR authorized.
- Rollback trigger: Stage A failure (clean rollback); Stage B failure (see procedure).
- Rollback procedure: Stage A — flip off + redeploy (R2), clean. Stage B (post-PONR) — this is
  NOT an automatic backup restore. Stop further structural writes immediately; preserve/export
  the post-PONR structural decisions as recovery evidence; then determine whether forward
  correction or data restoration is safer. A pre-Stage-B restore is a deliberate R3 recovery
  operation that may discard reviewer-authored post-crossing structure, so it requires explicit
  Human authorization rather than being an automatic rollback.
- Local Point of No Easy Return: YES — Stage B (first non-legacy-representable persisted
  structure).
- Exit criteria: Stage A validated; PONR authorized; Stage B first-write validated; activation
  confirmed.
- Residual authorities killed: starts the retirement clock for `qaFixer`, `keepRawLabels`,
  `structureConfirmed` path (removed Gate 4A).
- Next gate unlocked: Gate 3.

### GATE 3 — Certified Architecture Deployment & Validation
- Purpose: deploy the certified formatter; validate the complete certified DOCX in production
  against the now-live structure.
- Freeze scope: formatter deploy + certified enablement; re-close after.
- Execution-time preconditions: Gate 2 exit; P1 + P2 merged & verified; image built from
  `1f081cd`+P1/P2.
- Active authority before: body-only export. After: certified complete-document export
  (body-only retained as fallback).
- Residual authorities remaining: body-only path; Python `spec_engine/pages` (reference until
  EXACT parity sign-off).
- Dependencies: Gate 2; P1; P2.
- Reversibility class: formatter deploy R2; certified enable R1/R2.
- Backup requirement: none for image (stateless); optional artifact snapshot.
- Ordered actions: 1) deploy formatter image with `certified` default-off (R2); 2) verify
  body-only byte-unchanged; 3) enable `certified` on a canary export over line_type-active
  data; 4) inspect DOCX for reviewed body + all sections + parity classification; 5) roll
  enablement forward.
- Verification after each action: default-off unchanged; canary DOCX passes application-path
  assertions on prod data; parity met.
- Abort criteria: certified defect / parity miss → disable field (R1), redeploy prior image (R2).
- Rollback trigger: certified-output validation failure.
- Rollback procedure: disable field / redeploy — no data restore.
- Local Point of No Easy Return: none (R1/R2).
- Exit criteria: certified DOCX validated in prod; body-only retained.
- Residual authorities killed: enables retirement of body-only default + `spec_engine/pages`.
- Next gate unlocked: production soak → Gate 4A.

### GATE 4A — Post-Activation Runtime Retirement + UFM Consolidation
- Purpose: after an agreed soak, remove now-dead runtime authorities and consolidate
  UFM/finalization.
- Freeze scope: retirement PRs on RC; re-close after.
- Execution-time preconditions: Gates 2–3 validated in prod for the defined soak; full RC
  ladder green.
- Active authority before: legacy paths still present (dead). After: simplified RC.
- Residual authorities remaining: Python reference (until P4/Gate 5); recovery bundles.
- Dependencies: Gate 3 soak.
- Reversibility class: R2.
- Backup requirement: none (code; git-revertable).
- Ordered actions: 1) remove `qaFixer`; 2) remove `keepRawLabels`; 3) retire
  `structureConfirmed` compatibility behavior; 4) retire body-only default where appropriate;
  5) consolidate UFM/finalization duplication; 6) run complete RC ladder.
- Verification after each action: ladder green; behavior matches validated production.
- Abort criteria: regression on any removal.
- Rollback trigger: ladder/behavior regression.
- Rollback procedure: revert the specific retirement PR + redeploy.
- Local Point of No Easy Return: none.
- Exit criteria: superseded runtime authorities removed; UFM consolidated; RC green.
- Residual authorities killed: `qaFixer`, `keepRawLabels`, `structureConfirmed` path,
  body-only default, UFM duplication.
- Next gate unlocked: P4.

### P4 — Python Harvest / Deletion-Readiness Gate (retirement-phase prerequisite)
- Purpose: harvest all still-needed Python assets (fig17–28 templates, `spec_engine` test
  corpus, format references) so nothing of value is lost at deletion.
- Freeze scope: none (additive harvest into RC docs/fixtures; no deletion).
- Execution-time preconditions: Gate 4A exit.
- Active authority before/after: unchanged.
- Residual authorities remaining: Python reference (still present; now harvested).
- Dependencies: Gate 4A; DOC-0326 four-part gate criteria.
- Reversibility class: R1 (additive harvest).
- Backup requirement: none.
- Ordered actions: 1) harvest templates/tests/format rules into governed RC locations; 2) map
  each `transcript_formatter/` subdomain to REPLACED/REFERENCE/HARVESTED/DELETION-READY; 3)
  confirm DOC-0326 gate satisfied for the certified-page subset.
- Verification after each action: every certified-page behavior has a surviving harvested
  asset/test; classification complete.
- Abort criteria: any required asset unharvestable; DOC-0326 not satisfied.
- Rollback trigger: n/a (additive).
- Local Point of No Easy Return: none.
- Exit criteria: harvest complete; deletion-readiness classification signed off.
- Residual authorities killed: none (marks them deletion-ready).
- Next gate unlocked: Gate 4B.

### GATE 4B — RC Verification + Make `main` Authoritative
- Purpose: after the simplified RC is green, reconcile history deliberately and make `main`
  authoritative.
- Freeze scope: merge/reconcile; re-close after.
- Execution-time preconditions: Gate 4A + P4 complete; complete RC verification green.
- Active authority before: RC branch authoritative. After: `main` authoritative.
- Residual authorities remaining: recovery branches/bundles (retained through Gate 5).
- Dependencies: Gate 4A; P4.
- Reversibility class: R2/R3 (git-revertable while bundles exist).
- Backup requirement: recovery bundle of pre-merge `main` + RC.
- Ordered actions: 1) create recovery bundle; 2) reconcile unique `main` history deliberately;
  3) integrate RC → `main`; 4) run complete verification on `main`; 5) make `main` authoritative.
- Verification after each action: ladder green on `main`; no diff vs validated RC.
- Abort criteria: post-merge regression.
- Rollback trigger: regression on `main`.
- Rollback procedure: revert merge / restore from bundle.
- Local Point of No Easy Return: none (bundles preserve recovery).
- Exit criteria: `main` authoritative + green; bundles retained.
- Residual authorities killed: none (Git normalization only).
- Next gate unlocked: Gate 5.

### GATE 5 — Obsolete-Artifact Cleanup (retains one archival bundle — no forced R4)
- Purpose: delete obsolete GitHub branches/worktrees/tags and the harvested Python reference,
  while retaining one verified immutable archival recovery bundle offline.
- Freeze scope: deletion operations only; re-close after.
- Execution-time preconditions: Gate 4B stable for the defined period; P4 complete; DOC-0326
  satisfied; deletion authorization.
- Active authority before/after: unchanged (cleanup).
- Residual authorities remaining: one archival recovery bundle, retained by policy.
- Dependencies: Gate 4B; P4.
- Reversibility class: R3 (restorable from the retained archival bundle). The program does NOT
  require an R4 bundle-destruction event.
- Backup requirement: one verified immutable archival bundle stored offline BEFORE any
  deletion; retained (not destroyed).
- Ordered actions: 1) create + verify the archival bundle offline; 2) delete replaced Python
  `spec_engine/pages` + harvested reference (restorable from bundle); 3) delete obsolete remote
  branches/worktrees/tags; 4) verify repo builds/tests green after each removal; 5) retain the
  archival bundle per retention policy — no final-bundle-destruction step.
- Verification after each action: archival bundle restorable before each deletion; green ladder
  after each removal.
- Abort criteria: harvest incomplete; bundle not restorable; any ladder failure.
- Rollback trigger: failed verification.
- Rollback procedure: restore from the retained archival bundle.
- Local Point of No Easy Return: none — target end state keeps the archival bundle, so the R4
  destruction point is never required for completion.
- Exit criteria: GitHub clean; local worktrees clean; `main` authoritative; one archival
  recovery bundle retained.
- Residual authorities killed: Python reference implementation; obsolete branches/tags
  (recoverable from the retained bundle).
- Next gate unlocked: DONE.

## G. Human authorization sentences (exact)
- Gate 0: "I authorize the Depo-Pro scoped freeze lift for Gate 0 RC development and P1/P2/P3 prerequisites."
- Gate 1A: "I authorize the Depo-Pro Gate 1A additive production schema migration."
- Gate 1B: "I authorize the Depo-Pro Gate 1B deterministic legacy-state backfill, with verified backup and proven restore path."
- Gate 2 (gate): "I authorize executing Depo-Pro Gate 2 line_type activation and the Stage A read/projection canary."
- Gate 2 (PONR — mandatory, separate, immediately before Stage B): "I authorize crossing the Depo-Pro Program Point of No Easy Return and persisting the first new human-reviewed structural decision under the activated line_type architecture."
- Gate 3: "I authorize the Depo-Pro Gate 3 certified formatter deployment and certified-output enablement."
- Gate 4A: "I authorize the Depo-Pro Gate 4A retirement of superseded runtime authorities and UFM consolidation."
- P4: "I authorize the Depo-Pro P4 Python harvest and deletion-readiness classification."
- Gate 4B: "I authorize the Depo-Pro Gate 4B integration making `main` authoritative."
- Gate 5: "I authorize the Depo-Pro Gate 5 obsolete-artifact cleanup, retaining one verified archival recovery bundle."

No approval implies any other; each is re-verified at execution time; the PONR sentence is
never implied by a gate approval.

## H. Authority kill map (by gate)
| Gate | Residual authorities killed |
|---|---|
| Gate 2 | (starts retirement clock — none removed yet) |
| Gate 3 | enables body-only-default + `spec_engine/pages` retirement |
| Gate 4A | `qaFixer`, `keepRawLabels`, `structureConfirmed` path, body-only default, UFM duplication |
| Gate 5 | Python reference implementation, obsolete branches/tags |
| (kept) | canonical PaginationMap, deriveWorkingTranscript, certification, buildUfmMetadata |

## I. One-page execution roadmap
```
CURRENT STATE (1f081cd — built, app seam wired, output locally proven, frozen)
  -> PRE-GATE: P1 exam-index . P2 legal metadata . P3 loader verify   [in Gate 0]
  -> GATE 0   Scoped freeze lift + P1/P2/P3                            [R1]
  -> GATE 1A  Dormant additive schema (DDL)                           [R2]
  -> GATE 1B  Deterministic legacy backfill                           [R3-recov]  * LAST CLEAN ABANDONMENT POINT
  -> GATE 2   Activate line_type
               Stage A read/projection canary                         [R1/R2, pre-PONR]
               ** PROGRAM-WIDE PONR authorization **
               Stage B first new reviewed structural persistence      [R3 — PONR CROSSING]
  -> GATE 3   Deploy (R2) + enable certified output + prod validation
  -> -- soak --
  -> GATE 4A  Retire qaFixer/keepRawLabels/body-only + UFM consolidation   [R2]
  -> P4       Python harvest / deletion-readiness                     [R1]
  -> GATE 4B  RC verification + make main authoritative               [R2/R3, bundle retained]
  -> GATE 5   Clean obsolete branches/worktrees/reference; RETAIN archival bundle  [R3, no forced R4]
  -> DONE
```

## J. Status
DRAFT ONLY. No gate executed; no implementation, production, migration, backfill, activation,
deployment, push, merge, `main` change, deletion, or PONR crossing performed in authoring this
plan. The next decision is the Human authorization of Gate 0 (see §G), which is entirely
local/pre-production and authorizes none of: migration, deployment, production data change,
line_type activation, or PONR crossing.

## K. Gate 1A/1B execution appendix (added 2026-08-11 after Gate 0 + STATE A resolution)

### K.1 Migration-history finding (read-only)
Established via authenticated read-only Management API query of `supabase_migrations.schema_migrations`:
- Only relevant Supabase environment: project **Depo-Pro** (ref `lqxiuwlwzkofdfitxuqe`, West US / Oregon). No staging/dev project exists in the account.
- 36 migrations recorded; **max applied version `20260722024834`**. Version `20260810180000` is **NOT present** (nor `20260811120000`).
- **Classification: STATE A — UNAPPLIED EVERYWHERE RELEVANT.**
- **Corollary (migration-behind caveat):** production is **4 migrations behind** the repo (`20260804230000` canon_raw_b, `20260804233000` canon_raw_d, `20260810180000` line_type, `20260811120000` working_text). A `supabase db push` for Gate 1A would also apply the two canon_raw migrations and working_text — **outside the line_type gate scope**. The operator must review/accept those pending migrations, or apply the Gate 1A DDL in isolation by another means, at Gate 1A execution time.

### K.2 Split result (local, STATE A)
- **Gate 1A** = `supabase/migrations/20260810180000_line_type_review_contract.sql` — additive DDL + constraints only; **zero DML**.
- **Gate 1B** = `supabase/migrations/20260812090000_line_type_review_backfill.sql` — the deterministic, idempotent backfill `UPDATE` only.
- Guarded by `src/lib/db/lineTypeMigrationGateSplit.test.ts` (1A no DML; 1B single backfill, no schema changes; 1B ordered after 1A; consistent table/column). Neither migration applied anywhere.

### K.3 Gate 1A preflight (read-only)
Before: confirm project `lqxiuwlwzkofdfitxuqe`; `select version from supabase_migrations.schema_migrations where version='20260810180000';` → expect empty; `select to_regclass('public.transcript_utterances');` → not null; the 3 target columns absent in `information_schema.columns`; `select count(*) from public.transcript_utterances;` (row-count fingerprint).
After: the 3 columns present (review_status not null default `'UNREVIEWED'`); both check constraints present in `pg_constraint`; **no Gate 1B mutation** — `select count(*) from public.transcript_utterances where line_type_review_status='OVERRIDDEN';` → expect **0**; row count unchanged; `PERSISTED_LINE_TYPE_ENABLED` still false.

### K.4 Gate 1B preview + verification (read-only)
Preview (after 1A, before 1B): expected-change count `select count(*) from public.transcript_utterances where manually_reassigned=true and line_type_review_status='UNREVIEWED';`; already-OVERRIDDEN count → expect 0.
Post-backfill: OVERRIDDEN count == preview expected-change count; idempotency — the preview-eligible query returns 0; non-`manually_reassigned` rows remain `'UNREVIEWED'`; `line_type` untouched.

### K.5 Backup / restore
Managed daily backups (+ PITR on paid tiers) — verify tier/PITR in the dashboard before each gate. Gate 1A (additive) columns are droppable; still take a pre-op backup. Gate 1B (data mutation): **mandatory verified backup immediately before**; "restorable" means confirming a recovery point just before the `UPDATE`, not merely that a backup exists. Rehearse restore on a non-prod clone if available; never rehearse destructive restore against production.

### K.6 Rollback refinements
- Gate 1A: DEFAULT = leave additive dormant columns installed, flags off, diagnose. Drop only on a demonstrated schema problem with a separately verified-safe drop.
- Gate 1B: **least-destructive recovery is recomputation, not restore** — `manually_reassigned` is preserved and the transform is deterministic, so the pre-backfill state is exactly reconstructable (`set line_type_review_status='UNREVIEWED' where manually_reassigned=true and line_type_review_status='OVERRIDDEN'`), valid while no reviewer has set OVERRIDDEN through the app (requires the flag + endpoint, both off). Backup restore is the fallback.

### K.7 Application compatibility (both exit states)
Gate 1A exit (columns exist, default `UNREVIEWED`/null, backfill not run, flag off): readers (`isReviewLocked`, `line_type_confidence ?? 1`, optional typed fields) handle the defaults; the projection is inert (`PERSISTED_LINE_TYPE_ENABLED=false`); no code assumes the backfill ran. Gate 1B exit (backfill done, flag off): production behavior still governed by the legacy authority until Gate 2 — the LAST CLEAN ABANDONMENT POINT. Validated by the existing full suite (flag-off is the tested state).

### K.8 Is Gate 1A now independently executable?
**YES (locally).** The Gate 1A migration is DDL-only and separable from Gate 1B. The remaining execution-time gates are Human/operator actions: the migration-behind review (K.1), a verified production backup (K.5), and the Gate 1A authorization sentence (§G). No production action taken here.

## L. Gate 1A execution package — pending-migration audit (added 2026-08-11)

### L.1 Corrected lag — production is EIGHT migrations behind (not four)
Full read-only diff of `schema_migrations` (36 applied, contiguous, no gaps, no orphans) vs repo (44). Production max = `20260722024834`. Pending, in order: (1) `20260724120000` transcription_job_finalizing [finalize worker, additive DDL, R2]; (2) `20260724130000` transcription_watchdog [additive DDL + create fn whose UPDATE is fn-body only, R2]; (3) `20260729120000` corrections [corrections/TIE, additive tables/indexes/triggers/RLS, R2]; (4) `20260804230000` canon_raw_b_provenance_columns [CANON-RAW, additive nullable columns, R2]; (5) `20260804233000` canon_raw_d_directory_provenance [CANON-RAW, additive nullable JSONB, R2]; (6) `20260810180000` line_type_review_contract [**Gate 1A**, additive DDL + constraints, zero DML, R2]; (7) `20260811120000` working_text_word_scoped_rpc [editor working-text, additive create fn with fn-body DML only, R2]; (8) `20260812090000` line_type_review_backfill [**Gate 1B**, apply-time UPDATE, R3-recoverable]. Guarded by `src/lib/db/pendingMigrationApplyTimeDml.test.ts`: only Gate 1B mutates rows at apply time; the other seven are additive (their UPDATE/INSERT live inside `$$` function bodies).

### L.2 Dependency DAG (not timestamp order)
`6 Gate 1A -> 8 Gate 1B` is the only REQUIRED edge (1B needs the `line_type_review_status` column). Everything else is ORDER-ONLY / INDEPENDENT (finalizing/watchdog touch `transcription_jobs`; corrections adds new tables; canon_raw_b/d touch `field_provenance`/`contacts`+`firms`; working_text is an RPC on `transcript_words`). Gate 1A depends only on the pre-existing `line_type` column (`20260627220500`, already applied) — NO dependency on any unapplied migration.

### L.3 CLI behavior (supabase 2.75.0)
`supabase db push --linked` / `migration up --linked` apply ALL pending versions not on the remote history table, in version order (require the DB password). `--dry-run` previews. There is NO `--target` / selective-single-migration flag. A normal push applies all 8 — deploying five unrelated workstreams + working_text, then executing Gate 1B's DML. Unacceptable for a narrow Gate 1A.

### L.4 Mechanism options
A. Normal `db push` — applies all 8. REJECTED. B. Out-of-band Gate 1A DDL via authenticated SQL (idempotent `add column if not exists`) — installs ONLY line_type schema, but `schema_migrations` won't record `20260810180000` → schema-vs-history divergence needing documented reconciliation (a later full push re-runs the idempotent DDL and records it); that history write is part of Gate 1A. C. Scoped `db push` excluding Gate 1B (hold back `20260812090000`, push 1–7, restore for a later Gate 1B) — keeps migration history perfectly correct, but DEPLOYS the five unrelated additive workstreams + working_text (all additive/idempotent/dormant until their code deploys). D. Supported selective apply — NONE.

### L.5 Minimum-vs-correctness finding (§10)
The Gate 1A minimum (line_type dormant schema ONLY) is achievable via B but not while preserving migration-history correctness; C preserves history correctness but does not achieve the minimum. No mechanism achieves both — surfaced, not silently broadened; the choice is a Human decision.

### L.6 Verdict
**GATE 1A NOT READY — blocker: deployment-mechanism / scope decision.** Gate 1A is code-ready, DDL-only, dependency-clean and independently executable in principle; but production being 8 migrations behind across 4 unrelated workstreams means no mechanism installs the line_type-only schema while keeping `schema_migrations` truthful without a Human decision (accept the additive-backlog deploy via C, or out-of-band DDL + documented reconciliation via B). Recommended: C if the additive backlog is acceptable to deploy (cleanest history); B if strict line_type isolation is required.

## M. CRITICAL — production schema/history DRIFT (read-only, 2026-08-11)
Preparing the Option C catch-up, read-only inspection of the ACTUAL production schema (not just `schema_migrations`) found the schema is AHEAD of the recorded history for two migrations:
- **`20260724120000` finalizing + `20260724130000` watchdog are ALREADY APPLIED out-of-band** — present in production: `transcription_jobs.finalize_started_at` / `finalize_attempts` / `watchdog_attempts`; the status check constraint already includes `finalizing`; the `fail_stale_transcription_jobs()` function; `pg_cron` + `pg_net`; and **both cron jobs are LIVE** (`fail-stale-transcription-jobs */10`, `transcribe-watchdog */5`). The live reaper matches the migration file (`RETRYABLE_WATCHDOG_TIMEOUT`, 60-min interval). **Yet neither version is recorded in `schema_migrations`.**
- **`20260729120000` corrections, `20260804230000/233000` canon_raw_b/d, `20260810180000` line_type (1A), `20260811120000` working_text are genuinely ABSENT.** Gate 1B (`20260812090000`) absent.

Consequences: (1) the watchdog reaper is ALREADY running — Gate 1A would NOT newly activate it (no new operational surprise). (2) The Option C premise ("7 additive, inert migrations") is FALSE for 2 of the 7: re-running finalizing+watchdog via `db push` would re-execute `create or replace function` + drop/recreate the status constraint + drop/recreate the partial unique index on the LIVE, cron-active transcription subsystem (idempotent and matching the file, but touching live objects with a brief index-recreate gap) purely to reconcile history. (3) Root cause: a prior out-of-band production apply that never recorded versions — a governance/process gap predating this work.

Recommendation (Human decision required):
- **C-scoped (recommended):** Gate 1A applies ONLY the genuinely-absent, additive/inert migrations — `20260729120000`, `20260804230000`, `20260804233000`, `20260810180000` (line_type 1A), `20260811120000` — withholding finalizing + watchdog (already applied) AND Gate 1B. Reconcile the finalizing/watchdog history separately (verify byte-match, then record or idempotently re-apply) as its own explicit step. Keeps Gate 1A to installing genuinely-new inert schema; avoids re-running DDL on the live transcription subsystem.
- **C-full:** apply all 7 (idempotent re-apply reconciles finalizing+watchdog history) — simpler history, but re-runs live-object DDL.

### M.1 Verdict
**GATE 1A NOT READY — new blocker: production schema/history drift.** finalizing + watchdog are applied out-of-band and unrecorded; the clean "additive catch-up" premise no longer holds unmodified. Requires a Human decision (C-scoped vs C-full) and acknowledgment of the pre-existing drift before the execution runbook is finalized. corrections / canon_raw_b/d / line_type(1A) / working_text remain genuinely absent — the core of any catch-up.

## N. C-SCOPED decision — Gate 0R reconciliation + final Gate 1A package (2026-08-11, read-only)
**C-scoped is selected.** Gate 1A applies only the five genuinely-absent migrations; finalizing + watchdog are reconciled via history-repair (Gate 0R), not re-run; Gate 1B stays excluded.

### N.1 Equivalence matrices — ALL EXACT (fail-closed NOT triggered)
finalizing: `finalize_started_at` (timestamptz null) EXACT; `finalize_attempts` (int NOT NULL default 0) EXACT; status CHECK EXACT (canonical `= ANY(ARRAY…)`); `case_active_idx` partial-unique EXACT. watchdog: `watchdog_attempts` EXACT; `fail_stale_transcription_jobs` SECURITY DEFINER + `search_path=public` EXACT; `service_role` EXECUTE grant EXACT; pg_cron+pg_net EXACT; cron `fail-stale */10 → fn('60 min')` EXACT; `transcribe-watchdog */5` pg_net EXACT. Live schema faithfully matches the files → repair-as-applied is truthful.

### N.2 Gate 0R — Migration History Reconciliation (REQUIRED before Gate 1A)
Mechanism: `supabase migration repair 20260724120000 20260724130000 --status applied --linked` — the official CLI mechanism to record versions as applied WITHOUT running their SQL. Precondition: N.1 EXACT (proven); both versions absent pre-repair; `schema_migrations` snapshot + fresh backup. Reversibility: `migration repair … --status reverted` → **R2** (reversible, no application-table change) but a production history write requiring explicit authorization. Verify: post-repair both versions present; zero application objects changed (no SQL ran); objects still match N.1. Authorization: *"I authorize the Depo-Pro Gate 0R migration-history reconciliation: record 20260724120000 and 20260724130000 as applied via migration repair, without re-running their SQL."*

### N.3 Resulting sequential state
After Gate 0R: `schema_migrations` max = `20260724130000`; next pending starts at `20260729120000`. After Gate 1A (5 applied, Gate 1B withheld): max = `20260811120000`; only `20260812090000` pending. History contiguous, no gaps.

### N.4 Gate 1A C-scoped set (exactly 5) + exclusions
Authorized: `20260729120000` corrections, `20260804230000` canon_raw_b, `20260804233000` canon_raw_d, `20260810180000` line_type (1A), `20260811120000` working_text. Excluded: finalizing + watchdog (Gate 0R), Gate 1B (`20260812090000`). Guarded by `src/lib/db/gate1aScopedSet.test.ts` (pins the set; fails on any new/unexpected pending version or reintroduction of an excluded one).

### N.5 CRITICAL — the five are NOT dormant: deployed code is AHEAD of schema
The DEPLOYED edge functions already reference objects the five create, which are ABSENT in the DB: `editor-api` calls `rpc('editor_apply_working_word_changes')` (working_text) and writes `line_type_review_status` (line_type 1A); `ai-review` + `editor-api` read/write `corrections`/`correction_runs`/`correction_decisions` (corrections). So those deployed paths are currently unsatisfied. Applying the five **catches schema up to deployed code**, ACTIVATING: correction persistence, working-text word-change save, and line_type decision persistence. This is arguably the correct reconciliation but is an OPERATIONAL ACTIVATION, not a dormant install — it must be acknowledged. (line_type USE stays gated by `PERSISTED_LINE_TYPE_ENABLED=false`; only decision PERSISTENCE is enabled — pre-Gate-2 / pre-PONR, since persisted decisions do not shape output until the flag flips.) Prereqs present: `set_updated_at()`, `gen_random_uuid`, `transcripts`/`cases`.

### N.6 Gate 1B withholding mechanism (git-safe)
Run the Gate 1A push from an ISOLATED ephemeral workdir; never mutate the tracked migration tree. Copy `supabase/` (config + `.temp` link + migrations MINUS `20260812090000`) to a temp dir; `supabase db push --workdir <temp> --dry-run` → expect exactly the five; then (authorized) `--workdir <temp>` to apply; discard the temp dir. The authoritative worktree (and Gate 1B) are untouched throughout → no shared-worktree/concurrent-agent commit risk. Gate 1B stays pending in the authoritative tree.

### N.7 Execution package (prepared — NOT executed)
PREFLIGHT (read-only) → BACKUP CONFIRM → GATE 0R [separate auth] → RE-READ HISTORY → ISOLATE 1B (temp workdir) → DRY RUN (expect 5) → HUMAN GATE 1A AUTH → PUSH [not now] → POST-VERIFY (history advances through `20260811120000`; `20260812090000` absent; expected objects exist; no `OVERRIDDEN` backfill; flag off; certified default-off; app healthy) → DISCARD temp → VERIFY Gate 1B pending → FREEZE RE-CLOSE.

### N.8 Backup evidence (no overclaim)
BACKUP EXISTS: managed daily backups (verify tier/PITR in dashboard). RESTORE PATH: documented (dashboard restore). RESTORE TESTED: **not** established (cannot rehearse against production). Require a fresh backup immediately before Gate 0R and before Gate 1A.

### N.9 Verdict
**GATE 0R READY FOR HUMAN AUTHORIZATION** — a clean, proven-equivalent history reconciliation (N.1). The Gate 1A C-scoped set is pinned and dependency-clean, but applying it **activates deployed-but-unsatisfied code paths** (N.5) — authorize Gate 0R first, then acknowledge the deployed-code activation before Gate 1A.

## O. GATE 0R — EXECUTED 2026-08-11 (migration-history reconciliation ONLY)
Human-authorized and executed. **This is the program's first production mutation; it changed only the Supabase migration ledger, no application schema/data.**
- **Command:** `supabase migration repair 20260724120000 20260724130000 --status applied --linked` (CLI connected via the management access token; no DB password used or handled). SQL of the two migrations was NOT executed.
- **Pre-repair (recovery evidence):** 36 applied, max `20260722024834`; both targets absent; equivalence matrices re-verified EXACT (§N.1); watchdog fn md5 `412c540c48f2e4fea018afe4a201709a`, both cron jobs present.
- **Post-repair verification (read-only):** 38 applied, max `20260724130000`; both targets now present; **recovery diff added exactly `20260724120000` + `20260724130000`, removed none**; watchdog fn md5 UNCHANGED; both cron jobs UNCHANGED; `transcription_jobs` columns UNCHANGED; all five Gate 1A objects still ABSENT (no Gate 1A/1B SQL ran); no application data changed; `PERSISTED_LINE_TYPE_ENABLED` false; certified default-off.
- **Rollback (still available, unused):** `supabase migration repair 20260724120000 20260724130000 --status reverted` (R2; reverses only the two ledger rows).
- **Resulting ledger:** applied through watchdog (`20260724130000`). **Pending (6):** `20260729120000` corrections → `20260804230000` canon_raw_b → `20260804233000` canon_raw_d → `20260810180000` line_type (Gate 1A) → `20260811120000` working_text → `20260812090000` Gate 1B backfill.
- Gate 1A NOT executed; PONR NOT approached. Freeze re-closed.

## P. GATE 1A — EXECUTED 2026-08-11 (Additive Production Schema Catch-Up, C-scoped)
Human-authorized (exact five, Gate 1B excluded) and executed. Application-schema DDL only; NO row-data backfill.
- **Preflight (read-only):** 38 applied, max `20260724130000`; all five target objects absent; backup evidence — WAL-G managed backups enabled, 8 backups, latest `2026-08-11T12:25Z` (BACKUP EXISTS; RESTORE PATH = dashboard; RESTORE TESTED not established; PITR off).
- **Mechanism:** isolated ephemeral workdir built from the split migrations (Gate 1B `20260812090000` withheld) + the main worktree's working IPv4-pooler link; the authoritative tree never modified. `db push --dry-run` showed **exactly** the five (Gate 1B absent) → then `db push --linked --yes`.
- **Applied (5):** `20260729120000` corrections, `20260804230000` canon_raw_b, `20260804233000` canon_raw_d, `20260810180000` line_type (DDL-only), `20260811120000` working_text. (`drop constraint if exists` NOTICEs on fresh apply are expected.)
- **Post-execution verification (read-only):** 43 applied, max `20260811120000`; **Gate 1B `20260812090000` ABSENT**; objects present — corrections tables (3), canon_raw_b cols (3), canon_raw_d cols (2), line_type cols (3) + both constraints, working_text RPC (1); **Gate 1B backfill did NOT run — 0 `OVERRIDDEN` rows; all 13,169 utterances `UNREVIEWED`** (additive column default, not the backfill); `PERSISTED_LINE_TYPE_ENABLED` false; certified default-off. Evidence: `docs/audits/gate0r-evidence/schema_migrations_after_gate1a.json`.
- **Operational note (per §N.5):** these bring schema into alignment with already-deployed code, making correction-persistence, working-text-save, and line_type-decision-persistence paths functional. This does NOT make persisted line_type the transcript structural authority — that remains Gate 2 (PONR).
- **Rollback:** additive → reversible by dropping the new objects; managed backup available.
- **Resulting pending (1):** `20260812090000` Gate 1B backfill. Temp workdir discarded; authoritative tree retains Gate 1B, clean. Gate 1B NOT executed; Gate 2 / PONR NOT approached. Freeze re-closed.

## Q. GATE 1B — EXECUTED 2026-08-11 (deterministic legacy-state backfill; LAST CLEAN ABANDONMENT POINT)
Human-authorized and executed. R3-recoverable data operation, but a **no-op against current data** and still **pre-PONR**.
- **Read-only preview:** history max `20260811120000`, only `20260812090000` pending; both columns present; backup fresh (WAL-G, latest `2026-08-11T12:25Z`). Counts: total 13,169; `manually_reassigned=true` **0**; currently `OVERRIDDEN` 0; **expected-to-change 0**; 0 null/invalid/violating status. All assumptions held (empty valid set, not a misfit) -> proceed.
- **Mechanism:** isolated ephemeral workdir (all migrations incl. Gate 1B) + main worktree pooler link; authoritative tree never modified. `db push --dry-run` showed exactly `20260812090000` -> `db push --linked --yes`.
- **Post-execution (read-only):** 44 applied, max `20260812090000`, Gate 1B recorded; **no other migration ran**; **changed rows = 0** (= preview); 13,169 utterances unchanged; **0 `OVERRIDDEN`, all 13,169 `UNREVIEWED`**; `manually_reassigned=true` still 0 (legacy source preserved); **idempotency: 0 remaining**; affected-set md5 identical; raw transcript evidence untouched; `PERSISTED_LINE_TYPE_ENABLED` false; certified default-off. Evidence: `docs/audits/gate0r-evidence/schema_migrations_after_gate1b.json`.
- **Rollback:** not needed (0 rows changed); would be recompute-from-`manually_reassigned` (R3-recoverable), backup available.
- **Resulting state:** migration ledger COMPLETE (0 pending). **LAST CLEAN ABANDONMENT POINT reached:** schema current + deterministic backfill applied + `line_type` still OFF. Temp discarded; authoritative tree clean. Gate 2 / PONR NOT approached.

### Q.1 Gate 2 Stage A precondition status
Satisfied: schema current (line_type columns + constraints present), ledger complete, backfill applied, `PERSISTED_LINE_TYPE_ENABLED=false`, certified default-off, fresh backup. Gate 2 remains a distinct, separately-authorized gate; **Stage B is the program PONR** (first new human-reviewed structural decision not losslessly representable by legacy `qaFixer`).
