# Repository Root Cleanup Plan V2 — Authority First

---
authority_tier: T7
original_authority_tier: T6
status: ARCHIVED
owner: Architecture
scope: repository-root-cleanup-plan-v2
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

## Supersession statement

This plan supersedes the **execution sequence and archive taxonomy** in `REPOSITORY_ROOT_CLEANUP_PLAN.md`. The original inventory, Git evidence, sensitive-data findings, and delete-candidate proofs remain valid. No move, deletion, link edit, source change, commit, migration, or external-service action is authorized by this document.

## Phase 0 — Human decisions and containment

- Resolve ownership and sensitive-data handling for `Audit/` and `tools/`.
- Confirm `.env` remains ignored and never inspect or report its values.
- Review local AI histories before deletion.
- Confirm provenance of legal-document-like samples in the locked Wave8 reference without modifying that reference.

**Gate:** no real client data, credentials, or unclear ownership remains in cleanup scope.

## Phase 1 — Freeze authority

For every managed document, record:

- authority tier;
- subsystem scope;
- status;
- governing authority;
- owner;
- supersession target;
- implementation/test/CI relationships where applicable.

Resolve duplicate active authorities before changing any path. Ratify the metadata banner schema and root-level Markdown policy.

**Outputs:** authority registry, duplicate-authority decisions, approved banner schema, constitutional-root exceptions.
**Gate:** every proposed MOVE/ARCHIVE item has a tier and status; no scope has unexplained duplicate active authority.
**Rollback:** revert the documentation-only authority commit.

## Phase 2 — Create indexes and knowledge graph

Create and populate using current paths:

- `docs/architecture/INDEX.md`;
- `docs/standards/INDEX.md`;
- `docs/audits/INDEX.md`;
- `docs/KNOWLEDGE_GRAPH.md`;
- `docs/archive/INDEX.md` and authority-oriented archive directories.

Perform a clean-clone discoverability walkthrough before relocation.

**Gate:** contributors can navigate constitution -> architecture -> standards -> audits -> implementation -> tests -> CI without broad search.
**Rollback:** revert the focused index commit.

## Phase 3 — Move active documents

Move only active documents whose authority, destination, index entry, and inbound references are known. Use `git mv`. Update indexes, links, scripts, prompts, and path examples atomically. Do not edit substantive conclusions while relocating.

No document moves merely because its filename says “audit” or “report,” or because it is old.

**Validation:** old-path search, link validation, index validation, knowledge-graph validation, typecheck, lint, tests, build.
**Rollback:** revert each subsystem-focused move commit.

## Phase 4 — Archive reports and superseded knowledge

Revalidate every prior ARCHIVE candidate against frozen authority. Move only:

- documents explicitly marked `ARCHIVED`, `SUPERSEDED`, or `DEPRECATED`;
- completed Tier-6 reports whose authority/evidence links are recorded.

Use the archive taxonomy `architecture`, `audits`, `reports`, `releases`, `migration`, `handoffs`, `deprecated`, and `experiments`. Add the replacement/authority relationship before moving.

**Validation:** archive index, banner checks, supersession-target checks, no dangling links.
**Rollback:** revert the archive commit.
**Risk:** hiding live authority; mitigated by Phase 1 gate.

## Phase 5 — Relocate remediation evidence

Move `ai_logs/` only after updating remediation script defaults, hash-chain paths, documentation, and index/knowledge-graph entries. Verify hash-chain semantics before and after relocation.

**Validation:** PowerShell dry runs, exact old-path search, hash-chain verification.
**Rollback:** revert the single relocation commit.

## Phase 6 — Remove generated/local artifacts

After human confirmation, remove only the 11 untracked DELETE candidates documented in the inventory. Resolve every absolute target inside the repository and avoid broad globs. These are local cleanup operations, not tracked cleanup commits.

**Validation:** Git status and the full local gate.
**Recovery:** rebuild, reinstall, relink, or restore retained local history using the original audit’s recovery table.

## Phase 7 — Standards documentation migration

Freeze and index active standards. Add authority banners. Move only documentation whose active/deprecated status and dependencies are known. Do not move runtime JSON during this phase.

**Validation:** standards-index uniqueness, authority/supersession checks, standards audits, link checks.
**Rollback:** revert the standards-document commit.

## Phase 8 — Runtime standards migration

Move `abbreviation_registry.json` to a stable runtime-data location and update TypeScript imports, tests, build inputs, standards links, and knowledge-graph edges atomically. Retire `Canonical Standards Folder/` only after both documentation and runtime migrations pass.

**Validation:** focused registry/CFE/editorial tests, typecheck, lint, full tests, build, link and index checks.
**Rollback:** revert the focused runtime migration.
**Risk:** canonical formatting drift.

## Phase 9 — Documentation CI and final verification

Add CI checks for:

- links and local references;
- required banners;
- duplicate active authority;
- invalid/missing/circular supersession;
- unindexed managed documents;
- invalid knowledge-graph targets;
- unauthorized new root Markdown.

Then compare the root to the proposed structure, run the full local gate, inspect `git diff --name-status`, and obtain human approval before deleting tracked content or rewriting history.

## Success criteria

- Root clutter is reduced without weakening discoverability.
- Constitutional documents remain obvious and permanent.
- Every subsystem has a named architecture and standard authority.
- Every audit is linked to what it evaluates and any resulting implementation.
- Every governed implementation maps to tests and CI.
- Archives express supersession and provenance rather than age.
- New root-level audit/report creation is prevented.
