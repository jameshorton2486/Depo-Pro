---
authority_tier: T7
original_authority_tier: T6
status: ARCHIVED
owner: Architecture
scope: repository-root-cleanup-plan
supersedes: null
superseded_by: docs/audits/ROOT_DOCUMENT_DISPOSITION_2026-08-05.md
approved_by: null
version: null
effective_date: null
ratified_date: null
last_reviewed: 2026-08-05
next_review: null
ratification: NOT_REQUIRED
implementation_status: NOT_APPLICABLE
archive_category: reports
---

# Repository Root Cleanup Plan

## Guardrails

This is a proposed, reversible implementation sequence. It authorizes no move, deletion, link edit, commit, migration, or external-service action. Use `git mv` for tracked documents in a future approved task. Never move or edit `reference/wave8`.

## Phase 0 — Human decisions and containment

**Scope:** `Audit/`, `tools/`, `.env`, local AI histories, and Wave8 legal-document-like samples.

- Confirm whether `Audit/` contains or has processed real notices/job sheets and whether it belongs in this repository.
- Remove client-identifying hard-coded paths from `tools/` only in a separately approved task; decide whether the tool belongs outside Git or under sanitized `scripts/`.
- Confirm `.env` is ignored and never print values.
- Confirm provenance/de-identification of DOCX/PDF samples under the locked Wave8 reference without modifying them.
- Decide whether local AI histories have retention value before deletion.

**Validation:** `git status --short`, `git check-ignore`, filename-only sensitive scan.  
**Rollback:** no changes in this phase.  
**Stop:** any real client data or credential exposure requires containment/privacy review.

## Phase 1 — Establish documentation indexes

**Scope:** add or update indexes for `docs/audits`, `docs/operations`, `docs/reconciliation`, and `docs/archive` in a future task.

- Record authority, status, date, and supersession metadata.
- Create archive subdirectories only after approving the classification matrix.
- Keep root authority documents in place.

**Validation:** Markdown link checker or `rg`-based path audit.  
**Rollback:** revert the documentation-only commit.  
**Risk:** an archive without an index makes evidence less discoverable.

## Phase 2 — Move active audits and operational documents

Use the exact MOVE rows in `REPOSITORY_ROOT_INVENTORY.md`:

- audits/findings -> `docs/audits/`;
- Deepgram checklist and GitHub cleanup plan -> `docs/operations/`;
- geometry reconciliation -> `docs/reconciliation/`;
- multi-file design -> `docs/architecture/`;
- attorney/UFM mapping -> `docs/standards/` after confirming field ownership.

Update all Markdown links, scripts, prompts, and absolute-path examples in the same commit. Do not change document conclusions while moving them.

**Validation:** `rg` old filenames/paths, link check, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.  
**Rollback:** revert the focused move/link commit.  
**Risk:** stale script paths and external bookmarks.

## Phase 3 — Archive completed and superseded evidence

Move all ARCHIVE rows to the specified `docs/archive` subdirectories with `git mv`. Add an archive index that identifies the current authority for each superseded group. Preserve Git history and original filenames where collision-free.

**Validation:** search old paths, verify archive index, run documentation link checks.  
**Rollback:** revert the archive commit.  
**Risk:** falsely presenting historical claims as current; mitigate with status banners/index metadata.

## Phase 4 — Relocate AI remediation logs

Move `ai_logs/` to `docs/audits/remediation/` only after updating:

- `scripts/run-codex-remediation.ps1`;
- `scripts/rebuild-remediation-history.ps1`;
- hash-chain paths and all documentation links.

Verify that hash-chain semantics are path-independent or regenerate only through the documented, approved mechanism.

**Validation:** PowerShell script dry runs, `rg -F 'ai_logs'`, hash-chain verification.  
**Rollback:** revert the single relocation commit.  
**Risk:** breaking remediation provenance/history tooling.

## Phase 5 — Remove verified generated/local artifacts

After human confirmation, remove only the 11 DELETE candidates listed in the inventory. Do not use broad recursive targets or globs. Resolve and verify each absolute path remains inside the repository. These are local cleanup actions and normally should not create a Git commit because the items are untracked/ignored.

**Validation:** `git status --short`, `npm ci` if dependencies were removed, then full local gate.  
**Rollback:** rebuild/reinstall/relink using the recovery methods in the cleanup audit; restore unique local histories from a user backup if retained.  
**Risk:** loss of unique diagnostics or local tool settings.

## Phase 6 — Dedicated standards-folder migration

Treat this as architecture/runtime work, not simple cleanup. Split runtime registry data, active standards, and archived supporting documents; update imports and authority references atomically. Read AGENTS.md and master architecture again before starting.

**Validation:** standards audits, registry/CFE/editorial tests, typecheck, lint, full tests, build, link checks.  
**Rollback:** revert the entire focused migration.  
**Risk:** build failure or behavioral change in canonical formatting.

## Phase 7 — Final root verification

- Compare actual root against `REPOSITORY_ROOT_PROPOSED_STRUCTURE.md`.
- Confirm no tracked real client data, credentials, signed URLs, build output, caches, or machine-specific paths.
- Run the full local gate.
- Review `git diff --name-status` and ensure all moves are intentional.
- Obtain human approval before deleting any tracked artifact or rewriting history.

## Answers to the requested questions

1. **How many root items?** 122: 28 directories and 94 files.
2. **What must remain?** 42 root items: project/toolchain configs, governing root docs, active source/services, deployment configs, benchmarks, documentation, and normative references.
3. **What should move?** 39 active audits, designs, operational documents, reconciliation material, and AI remediation history.
4. **What should be archived?** 28 completed fix/remediation reports, time-bound stage/release status files, handoffs, and superseded evidence.
5. **What appears safe to delete?** 11 untracked local/generated/cache artifacts, subject to the documented human check and recovery method. No tracked item is a delete candidate.
6. **What requires investigation?** `Audit/` and `tools/` because of unclear ownership and sensitive-data/client-path risk.
7. **What overlaps?** Auth/RLS, intake UI/lifecycle, Deepgram pipeline, certification/export, standards/geometry, stage role audits, and transcript correction reports. Authorities are identified in the cleanup audit.
8. **Sensitive/generated artifacts?** `.env` is expected and ignored; local AI histories may contain prompts; `Audit/` can ingest real legal data; `tools/` exposes machine-specific client-like paths; build/test/cache artifacts are untracked. Locked reference samples require a separate provenance check.
9. **Final root shape?** A conventional Vite/npm repository with active service/source modules, root toolchain/config authorities, and all reports organized under `docs`.
10. **Safest order?** Investigate sensitive items, establish indexes, move active docs, archive historical docs, relocate remediation logs, remove generated artifacts, migrate standards separately, then run full verification.
