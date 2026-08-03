> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Workspace Consolidation Plan

## Repository verification

| Item | Result |
|---|---|
| Requested integration branch | `feature/stage3-workspace-core` |
| Actual audited branch | `feat/canonical-transcript-audit` |
| Audited HEAD | `756a38edd0128fa0a50fcd8f3217604e34a924dd` |
| Upstream for audited branch | None configured |
| Integration branch HEAD | `49d32c4eacfc6b2cf667b0d6a1050dacd90835b4` |
| Relationship | Integration HEAD is the merge base; audited HEAD is 3 commits ahead (`0 behind / 3 ahead`) |
| Local default branch | `main` at `3a8ec34e5f884203955c8bf5a45dd5d019e0575b` |
| Remote default branch | `origin/main` (from local symbolic ref) |
| Build | PASS — `npm run build` on 2026-08-03 |
| Tests | PASS — 124 files, 808 tests via `npm test` |
| Remote verification | Not performed; network unavailable and audited branch has no upstream |

The audit was not performed directly on the named integration branch. It was performed on a descendant three commits ahead, which contains the integration branch unchanged plus later audit work. This limitation must be resolved or explicitly accepted before implementation begins.

## KEEP / MERGE / DEPRECATE / ARCHIVE / DELETE

| Feature / code | Recommendation | Reason |
|---|---|---|
| Immutable canonical `raw_text` and stable IDs | KEEP | Recognition authority and integrity anchor |
| Manual TipTap editing + Save | KEEP | Human working-text authority; Save is permanent |
| Corrections Panel | KEEP + MERGE | Best unified review/report surface; must consume canonical run data |
| Speaker Panel and utterance reassignment | KEEP + MERGE AUDIT | Necessary human review; decisions must join one history |
| Confidence Panel | KEEP | QC/review state, not a competing correction engine |
| Recognition/Working/Structured/Legal layer selector | KEEP | Makes transformations explicit |
| Review & Confirm | MERGE | Preserve structure comparison/review as a phase of the unified command |
| Live TS AI Review | MERGE then DEPRECATE CALLERS | Preserve behavior until ATIA Phase 4 parity; eliminate independent execution |
| AI Review sidebar identity | DEPRECATE | Results belong in Corrections; separate tool creates duplicate workflow |
| Legacy suggestion panel/RPC | MIGRATE then DEPRECATE | Convert records/decisions to CorrectionObjects before stopping callers |
| CFE lexical corrections | MERGE into proposal engines | Formatting must not own hidden wording changes |
| CFE spacing/geometry/pagination | KEEP as deterministic formatter after separation | Useful legal formatting behavior |
| Workspace Q&A/objection logic | MERGE | Preserve unique rules behind structure proposal engine |
| Standalone TS correction/structure/formatting engines | CHARACTERIZE then MERGE/ARCHIVE | Useful tested logic but not authoritative while unwired |
| Export editorial/geometry engines | CONSOLIDATE | One deterministic legal-rendering authority is required |
| TIE providers and CorrectionObject model | KEEP / PROMOTE | Locked target architecture |
| Python spec engine | ARCHIVE after parity | Characterization and fallback; do not delete prematurely |
| `transcript_formatter/ai_tools.py` | QUARANTINE then ARCHIVE | Explicit AGENTS.md deprecation rule; deletion prohibited during migration |
| Auto-apply AI working text | DELETE behavior after migration | Machine proposals must await reporter decision |
| Accept All without policy gates | RETIRE or strongly constrain | Bypasses item-level human review intent |

## Low-regression implementation order

1. **Freeze behavior with characterization tests.** Capture CFE, AI Review, structure, speaker, objection, formatting, export, and legacy Python fixtures. Add projection/diff invariants.
2. **Establish the canonical data boundary.** Guarantee a true Recognition projection from immutable `raw_text`, stable IDs, and explicit boundary metadata.
3. **Unify proposal and audit contracts.** Complete CorrectionObject coverage and one append-only decision path; add adapters for existing AI/legacy suggestions.
4. **Introduce the orchestrator behind a feature flag.** Initially call existing engines without changing their algorithms; prohibit direct engine writes.
5. **Separate correction from formatting.** Move CFE lexical rules to deterministic proposals; retain spacing/geometry in the renderer.
6. **Reconcile live AI Review with TIE.** Port candidate/context/prompt behavior to provider adapters and compare fixture outputs. Keep the current TS path working until parity passes.
7. **Unify structure and speaker proposals.** Convert Review & Confirm, Q/A, objection, line-type, and speaker inference into reviewable objects.
8. **Consolidate review UI.** Make Corrections the single queue; keep Speaker/Confidence as filtered views; remove independent run controls only after data migration.
9. **Add `Correct and Format Transcript`.** Wire the single command to the orchestrator, progress, resumability, run version, and QC report.
10. **Consolidate render/export engines.** Prove Workspace/legal/export parity and select one geometry/serialization authority.
11. **Stop old callers, then archive.** Observe telemetry/regressions, retain rollback adapters, and only later remove approved obsolete code.
12. **Certification gate.** Verify accepted decisions replay exactly, pending proposals are visible, and certification locks mutation.

## Final answers

### What currently changes the transcript?

Canonical boundary processing, optional AI auto-apply, manual editor saves, accepted legacy/AI suggestions, speaker reassignment, automatic CFE display corrections, structure/Q&A/objection presentation, and later editorial/export transforms. Confidence review changes state only.

### How many independent correction engines exist?

Nine implementation families were identified. Five affect the current Workspace or persisted working transcript; four are export, target, dormant, or legacy families. Counting individual sub-engines would produce a larger and less useful number.

### Which engines are authoritative?

Today, authority is fragmented. `raw_text` is authoritative recognition; reporter-approved working text is authoritative content; editor API paths are the active mutation boundary. The intended future intelligence authority is TIE + CorrectionObjects + append-only decisions. Renderers are not content authorities.

### Which engines duplicate functionality?

CFE, AI Review, standalone TS correction/structure engines, TIE, Workspace Q&A logic, export engines, legacy suggestions, and Python spec-engine modules overlap in spelling, punctuation, speaker attribution, Q/A, objections, formatting, validation, or audit.

### Which code should be merged or retired?

Merge useful rules and prompts behind the orchestrator and CorrectionObject contract. Deprecate independent AI Review and legacy suggestion execution after migration. Separate and retain CFE formatting while moving lexical changes upstream. Archive legacy Python and dormant duplicate implementations only after parity; do not delete legacy AI code during the mandated migration.

### How should the unified workflow be implemented?

One Workspace command creates a versioned correction run, invokes deterministic and TIE proposal engines, validates/conflict-resolves CorrectionObjects, produces a formatting preview and QC findings, and sends everything to one reporter review queue. Decisions create the Working projection; deterministic renderers create Structured/Legal projections.

### What order minimizes regression risk?

Characterize first, secure the immutable baseline, unify contracts/audit, add adapters/orchestrator, separate correction from formatting, reconcile AI and structure, consolidate UI, introduce the button, consolidate rendering, then stop/archive old callers.

## Stop decision

**STOP before Workspace implementation.** Multiple correction and AI paths exist. Architecture consolidation, behavior characterization, and CorrectionObject/audit unification must precede button removal, renaming, or workflow rewiring.
