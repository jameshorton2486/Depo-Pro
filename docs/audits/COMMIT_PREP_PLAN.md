# Commit Preparation Plan

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: read-only inventory with staging recommendations only

## Section 1 — Authority Files

| Authority File | Status | Recommended Action |
|---|---|---|
| `CANONICAL_STANDARDS_INDEX.md` | `TRACKED` | Keep; include in implementation-authorities commit if not already pushed. |
| `NUMBERING_REGISTRY.md` | `TRACKED` | Keep; include in implementation-authorities commit if not already pushed. |
| `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | `UNTRACKED` | Track immediately. This is active spacing authority used to justify CFE behavior. |
| `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | `UNTRACKED` | Track immediately. This is active geometry authority used to justify CFE behavior. |
| `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | `TRACKED` | Keep; verify it matches the ratified text you intend to preserve. |
| `Canonical Standards Folder/abbreviation_registry.json` | `UNTRACKED` | Track immediately. This is a runtime dependency imported by app code. |
| `Canonical Standards Folder/NUMBERING_REGISTRY.md` | `UNTRACKED DUPLICATE` | Do not track. Delete or archive after confirming root `NUMBERING_REGISTRY.md` is the canonical copy. |
| `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | `UNTRACKED DUPLICATE` | Do not track. Remove or archive; current standards graph points at the canonical standards-folder copy. |

### Authority Summary

- Critical reproducibility gap:
  - `src/lib/format/abbreviationRegistry.ts` imports `../../../Canonical Standards Folder/abbreviation_registry.json`
  - that file is currently untracked
  - therefore commit `2a0f09b` is not fully reproducible from Git alone
- Secondary authority gap:
  - `DP-010` and `DP-011` are approved production authorities but remain untracked
- Duplicate-risk files:
  - root `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md`
  - `Canonical Standards Folder/NUMBERING_REGISTRY.md`

## Section 2 — Standards Support Artifacts

| File | Classification | Reason |
|---|---|---|
| `docs/audits/STANDARDS_AUTHORITY_CLEANUP.md` | `KEEP` | Formal governance artifact that explains how the standards graph was repaired. |
| `docs/audits/STANDARDS_FREEZE_REPORT.md` | `KEEP` | Final freeze evidence for the approved authority graph. |
| `docs/audits/DP012_RATIFICATION_REVIEW.md` | `KEEP` | Owner-ratification support artifact for DP-012. |
| `DATA_REALITY_FINDINGS.md` | `KEEP` | Important implementation-precondition audit referenced by later work. |
| `docs/audits/CFE_PHASE1_READINESS.md` | `KEEP` | Directly ties standards to the implementation seam. |
| `docs/audits/CFE_PHASE1_VALIDATION.md` | `KEEP` | Core implementation validation artifact for commit `2a0f09b`. |
| `docs/audits/CFE_FIDELITY_VALIDATION.md` | `KEEP` | Post-implementation fidelity check against available corpus. |
| `CFE_PHASE0_FINDINGS.md` | `KEEP` | Foundational audit for the CFE workstream. |
| `ERROR_COVERAGE_MATRIX.md` | `KEEP` | Important scope/coverage artifact referenced by readiness work. |
| `GEOMETRY_AUTHORITY_RECONCILIATION.md` | `ARCHIVE` | Intermediate standards/governance artifact; preserve only if you want the historical trail. |
| `STANDARDS_CONSISTENCY_AUDIT.md` | `ARCHIVE` | Intermediate standards audit superseded by later cleanup/freeze docs. |
| `AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md` | `ARCHIVE` | Process/investigation artifact, not required for core standards traceability. |
| `KEYTERM_PIPELINE_FINDINGS.md` | `ARCHIVE` | Separate workstream; preserve if needed, but not part of the standards minimum set. |
| `SAVE_FAILURE_FINDINGS.md` | `ARCHIVE` | Investigation artifact outside the minimum standards/CFE traceability set. |
| `TRANSCRIPT_QUALITY_FINDINGS.md` | `ARCHIVE` | Investigation artifact outside the minimum standards/CFE traceability set. |
| `docs/audits/REPOSITORY_HEALTH_AUDIT_2026-06-23.md` | `KEEP` | Formal dated audit with repository-level findings. |
| `docs/audits/SPEAKER_SAVE_CONCURRENCY_AUDIT.md` | `KEEP` | Formal technical audit in correct location. |
| `docs/audits/GIT_HYGIENE_AUDIT.md` | `KEEP` | Immediate prerequisite for safe commit sequencing. |

## Section 3 — CFE Traceability

### Can commit `2a0f09b` be reproduced using only tracked files?

Verdict: `NO`

### Missing tracked dependency

| Dependency | Current State | Why It Matters |
|---|---|---|
| `Canonical Standards Folder/abbreviation_registry.json` | `UNTRACKED` | Imported directly by `src/lib/format/abbreviationRegistry.ts` at build/runtime. |

### Tracked standards dependencies already present

| Dependency | State |
|---|---|
| `CANONICAL_STANDARDS_INDEX.md` | `TRACKED` |
| `NUMBERING_REGISTRY.md` | `TRACKED` |
| `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | `TRACKED` |
| `docs/audits/CFE_PHASE1_VALIDATION.md` | `TRACKED` |
| `docs/audits/STANDARDS_FREEZE_REPORT.md` | `TRACKED` |
| `docs/audits/DP012_RATIFICATION_REVIEW.md` | `TRACKED` |
| `docs/audits/STANDARDS_AUTHORITY_CLEANUP.md` | `TRACKED` |
| `DATA_REALITY_FINDINGS.md` | `TRACKED` |

### Untracked governance dependencies

| Dependency | Current State | Traceability Impact |
|---|---|---|
| `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | `UNTRACKED` | Code behavior can be justified, but the underlying approved source text is not yet in Git. |
| `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | `UNTRACKED` | Same issue for geometry behavior. |
| `docs/audits/CFE_PHASE1_READINESS.md` | `UNTRACKED` | Important support artifact for why Phase 1 was safe to implement. |
| `docs/audits/CFE_FIDELITY_VALIDATION.md` | `UNTRACKED` | Post-implementation fidelity evidence remains outside Git. |

### Traceability Bottom Line

- `2a0f09b` is build-reproducible only after `Canonical Standards Folder/abbreviation_registry.json` is tracked.
- `2a0f09b` is governance-reproducible only after `DP-010` and `DP-011` are tracked.

## Section 4 — Untracked File Inventory

| File | Classification | Rationale |
|---|---|---|
| `AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md` | `ARCHIVE` | Keep only if you want the investigation trail; should eventually live under `docs/audits/`. |
| `CFE_PHASE0_FINDINGS.md` | `KEEP` | Foundational CFE artifact. |
| `Canonical Standards Folder/CHANGELOG_dp010_incorporation.md` | `ARCHIVE` | Historical changelog, not active authority. |
| `Canonical Standards Folder/CHANGELOG_dp012_qa_review.md` | `ARCHIVE` | Historical changelog, not active authority. |
| `Canonical Standards Folder/CHANGELOG_three_tab_paragraph_rule.md` | `ARCHIVE` | Historical changelog, not active authority. |
| `Canonical Standards Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md` | `ARCHIVE` | Historical architecture doc. |
| `Canonical Standards Folder/DEPO_PRO_FORMATTER_SPEC.md` | `ARCHIVE` | Historical architecture doc. |
| `Canonical Standards Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md` | `ARCHIVE` | Prompt/reference artifact. |
| `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md` | `ARCHIVE` | Historical standard. |
| `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | `KEEP` | Active authority. |
| `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | `KEEP` | Active authority. |
| `Canonical Standards Folder/NUMBERING_REGISTRY.md` | `DELETE` | Duplicate of tracked root registry. |
| `Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md` | `ARCHIVE` | Prompt artifact, not authority. |
| `Canonical Standards Folder/PROMPT_WORKSPACE_DOCX_TAB_STOPS.md` | `ARCHIVE` | Prompt artifact, not authority. |
| `Canonical Standards Folder/TRANSCRIPT_GEOMETRY_STANDARD.md` | `ARCHIVE` | Supporting geometry history superseded by DP-011. |
| `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md` | `ARCHIVE` | Historical architecture record. |
| `Canonical Standards Folder/abbreviation_registry.docx` | `ARCHIVE` | Authoring artifact; runtime uses JSON. |
| `Canonical Standards Folder/abbreviation_registry.json` | `KEEP` | Runtime dependency and approved authority data. |
| `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | `DELETE` | Duplicate non-canonical root copy. |
| `ERROR_COVERAGE_MATRIX.md` | `KEEP` | Important scope/coverage artifact. |
| `GEOMETRY_AUTHORITY_RECONCILIATION.md` | `ARCHIVE` | Intermediate governance artifact. |
| `KEYTERM_PIPELINE_FINDINGS.md` | `ARCHIVE` | Separate workstream; preserve if wanted. |
| `PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | `DELETE` | Duplicate legacy naming variant. |
| `SAVE_FAILURE_FINDINGS.md` | `ARCHIVE` | Investigation artifact. |
| `STANDARDS_CONSISTENCY_AUDIT.md` | `ARCHIVE` | Intermediate standards artifact. |
| `TRANSCRIPT_QUALITY_FINDINGS.md` | `ARCHIVE` | Investigation artifact. |
| `docs/audits/CFE_FIDELITY_VALIDATION.md` | `KEEP` | Current formal audit deliverable. |
| `docs/audits/CFE_PHASE1_READINESS.md` | `KEEP` | Current formal audit deliverable. |
| `docs/audits/GIT_HYGIENE_AUDIT.md` | `KEEP` | Current formal audit deliverable. |
| `docs/audits/REPOSITORY_HEALTH_AUDIT_2026-06-23.md` | `KEEP` | Current formal audit deliverable. |
| `docs/audits/SPEAKER_SAVE_CONCURRENCY_AUDIT.md` | `KEEP` | Current formal audit deliverable. |
| `etminan_response.json` | `ARCHIVE` | Useful validation corpus artifact; keep only if moved to a deliberate fixtures/reference location later. |
| `parity_job.json` | `DELETE` | Misleading artifact with mismatched case metadata and transcript content. |
| `reference/wave8/backend/__pycache__/` | `IGNORE` | Local Python cache artifact under read-only reference tree. |
| `reference/wave8/backend/ai_review/__pycache__/` | `IGNORE` | Local Python cache artifact under read-only reference tree. |
| `scripts/inspect-deepgram-clusters.mjs` | `KEEP` | Useful read-only diagnostic utility. |
| `src/lib/supabase.test.ts` | `KEEP` | Real test coverage for the currently modified auth/session code. |

## Section 5 — `.gitignore` Recommendations

Recommended exact additions:

```gitignore
**/__pycache__/
*.pyc
.aider.chat.history.md
.aider.input.history
.aider.tags.cache.v4
```

Notes:

- `.aider*` already covers some local agent artifacts, but not the explicit files currently present with non-matching names.
- I do not recommend ignoring `docs/audits/*.md` or `Canonical Standards Folder/*.md` because those contain intentional deliverables and authorities.
- I do not recommend ignoring `etminan_response.json` globally unless you have decided that real transcript payloads should never be versioned.

## Section 6 — Commit Groups

### Commit Group A — Implementation Authorities

Purpose:

- close the reproducibility gap for CFE Phase 1
- ensure approved standards and runtime authority inputs are in Git

Exact files:

- `CANONICAL_STANDARDS_INDEX.md`
- `NUMBERING_REGISTRY.md`
- `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`
- `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`
- `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md`
- `Canonical Standards Folder/abbreviation_registry.json`

Exact `git add` command:

```powershell
git add CANONICAL_STANDARDS_INDEX.md NUMBERING_REGISTRY.md "Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md" "Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md" "Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md" "Canonical Standards Folder/abbreviation_registry.json"
```

Recommended commit message:

```text
docs(standards): track active formatting authorities and registry inputs
```

### Commit Group B — Standards Support Documents

Purpose:

- preserve the audit and ratification trail that explains why the authority set is frozen and how CFE Phase 1 was validated

Exact files:

- `docs/audits/STANDARDS_AUTHORITY_CLEANUP.md`
- `docs/audits/STANDARDS_FREEZE_REPORT.md`
- `docs/audits/DP012_RATIFICATION_REVIEW.md`
- `docs/audits/CFE_PHASE1_READINESS.md`
- `docs/audits/CFE_PHASE1_VALIDATION.md`
- `docs/audits/CFE_FIDELITY_VALIDATION.md`
- `CFE_PHASE0_FINDINGS.md`
- `DATA_REALITY_FINDINGS.md`
- `ERROR_COVERAGE_MATRIX.md`

Exact `git add` command:

```powershell
git add docs/audits/STANDARDS_AUTHORITY_CLEANUP.md docs/audits/STANDARDS_FREEZE_REPORT.md docs/audits/DP012_RATIFICATION_REVIEW.md docs/audits/CFE_PHASE1_READINESS.md docs/audits/CFE_PHASE1_VALIDATION.md docs/audits/CFE_FIDELITY_VALIDATION.md CFE_PHASE0_FINDINGS.md DATA_REALITY_FINDINGS.md ERROR_COVERAGE_MATRIX.md
```

Recommended commit message:

```text
docs(audits): add standards freeze and cfe traceability reports
```

### Commit Group C — Repository Hygiene

Purpose:

- formalize ignore coverage for local/generated residue
- optionally retain repository-hygiene and repository-health audit docs

Exact files:

- `.gitignore`
- `docs/audits/GIT_HYGIENE_AUDIT.md`
- `docs/audits/REPOSITORY_HEALTH_AUDIT_2026-06-23.md`
- `docs/audits/SPEAKER_SAVE_CONCURRENCY_AUDIT.md`

Exact `git add` command:

```powershell
git add .gitignore docs/audits/GIT_HYGIENE_AUDIT.md docs/audits/REPOSITORY_HEALTH_AUDIT_2026-06-23.md docs/audits/SPEAKER_SAVE_CONCURRENCY_AUDIT.md
```

Recommended commit message:

```text
chore(repo): add hygiene rules and repository audit records
```

## Recommended Non-Execution Cleanup Sequence

Do not run yet; this is sequencing only.

1. Commit Group A first.
   - This closes the production-authority gap.
2. Commit Group B second.
   - This restores standards/CFE traceability.
3. Commit Group C third.
   - This cleans the repo story without mixing it into authority commits.
4. Only after those are committed, handle application-code drift separately:
   - `src/api/client.ts`
   - `src/lib/supabase.ts`
   - `src/main.tsx`
   - `src/lib/supabase.test.ts`
5. Only after that, remove duplicate/junk files and verify a clean working tree.

## Bottom Line

The repository is closest to safe when you treat the next work as a reproducibility repair, not a feature continuation.

The single most important immediate action is:

- track `Canonical Standards Folder/abbreviation_registry.json`

because current app code imports it directly, and commit `2a0f09b` cannot be reproduced cleanly from Git until that file is version-controlled.
