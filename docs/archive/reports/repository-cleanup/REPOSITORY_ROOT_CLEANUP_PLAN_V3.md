# Repository Root Cleanup Plan V3 — Registry Before Classification

---
authority_tier: T7
original_authority_tier: T6
status: ARCHIVED
owner: Architecture
scope: repository-root-cleanup-plan-v3
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

This plan supersedes the execution sequence in V2. The root inventory, sensitive-data findings, recovery evidence, documentation authority proposal, and V2 rationale remain useful evidence. No move, deletion, source change, commit, migration, or external-service action is authorized here.

## Phase 0A — Human containment decisions

- Resolve ownership and sensitive-data handling for `Audit/` and `tools/`.
- Preserve `.env` as ignored local configuration without inspecting values.
- Review local AI histories before deletion.
- Confirm provenance of legal-document-like Wave8 reference samples without modifying the locked reference.

**Gate:** no real client data, credentials, or unclear ownership remains in cleanup scope.

## Phase 0B — Establish and ratify the Authority Registry

Use [DOCUMENT_AUTHORITY_REGISTRY.md](../../../architecture/DOCUMENT_AUTHORITY_REGISTRY.md) to freeze:

- T1–T7 meanings;
- publication status vocabulary;
- ratification vocabulary;
- implementation-status vocabulary;
- ownership domains;
- required metadata;
- document lifecycle;
- lightweight ratification rules;
- archive categories;
- automated-classification boundaries.

Ratify [PROJECT_AUTHORITY_INDEX.md](../../../architecture/PROJECT_AUTHORITY_INDEX.md) as the living authority table of contents after its initial constitutional routes are verified.

**Gate:** registry vocabulary is ratified and cannot change without explicit change control.
**Rollback:** revert the registry/index documentation commit.
**Risk:** classification inconsistency if the registry remains fluid.

## Phase 1 — Automated classification proposal

Generate proposed metadata for managed documents using filename, location, headings, normative language, inbound references, and Git history.

Default inference examples:

- `*_AUDIT.md`, `*_FINDINGS.md`, `*_GAP_ANALYSIS.md` -> T5;
- `*_REPORT.md`, handoffs, completion/status records -> T6;
- checklists/runbooks/deployment instructions -> T4;
- ADRs and ownership/boundary decisions -> T2;
- specifications/policies/rules -> T3 candidate requiring ratification evidence;
- constitutional candidates -> T1 candidate requiring human review.

Automation assigns a proposal and confidence only. It never ratifies, supersedes, archives, or moves T1–T3 documents.

**Output:** machine-generated classification matrix with confidence and exception reason.
**Gate:** all managed documents have a proposal or explicit inference failure.

## Phase 2 — Human exception review and authority freeze

Review only:

- T1–T3 candidates;
- low-confidence items;
- duplicate scope authorities;
- multi-domain documents;
- conflicting supersession claims;
- sensitive or unclear ownership;
- proposed archive/delete outcomes.

Freeze final metadata and resolve duplicate active authorities before path changes.

**Gate:** every MOVE/ARCHIVE candidate has finalized metadata; no scope has unexplained duplicate active authority.

## Phase 3 — Create permanent indexes and knowledge graph

Create/populate with current paths:

- `docs/architecture/INDEX.md`;
- `docs/standards/INDEX.md`;
- `docs/audits/INDEX.md`;
- `docs/KNOWLEDGE_GRAPH.md`;
- `docs/archive/INDEX.md`.

Update `PROJECT_AUTHORITY_INDEX.md` to route into all four indexes. Perform a clean-clone discoverability walkthrough.

**Gate:** contributors can navigate constitution -> architecture -> standards -> operations/audits -> implementation -> tests -> CI without broad search.

## Phase 4 — Move active documents

Move only indexed documents with frozen authority and known inbound references. Use `git mv`; update banners, indexes, knowledge graph, scripts, prompts, and links atomically. Do not change substantive conclusions during relocation.

**Validation:** old-path search, documentation checks, typecheck, lint, tests, build.
**Rollback:** revert subsystem-focused move commits.

## Phase 5 — Archive reports and superseded knowledge

Archive only documents explicitly classified as T7 or completed T6 reports with recorded authority/evidence links. Use `architecture`, `audits`, `reports`, `releases`, `migration`, `handoffs`, `deprecated`, and `experiments`. Age alone is never sufficient.

**Validation:** archive index, original-tier metadata, replacement targets, links, no active authority hidden in archive.

## Phase 6 — Generated/local artifacts

After human approval, remove only the 11 untracked DELETE candidates from the inventory using individually resolved repository-contained paths. Do not create a tracked cleanup commit for ignored local output.

## Phase 7 — Standards documentation migration

Move ratified standards to `docs/standards/` after the Standards Index is authoritative. Leave runtime JSON untouched.

## Phase 8 — Runtime standards migration

Move `abbreviation_registry.json` to stable runtime data and atomically update imports, tests, builds, standards links, and knowledge-graph edges. Retire `Canonical Standards Folder/` only after both migrations pass.

## Phase 9 — Documentation CI

Enforce:

- valid internal links and references;
- registered vocabulary and metadata;
- ratification rules for active T1–T3 documents;
- duplicate active-scope detection;
- valid and acyclic supersession;
- index and knowledge-graph integrity;
- no unauthorized new root-level Markdown.

Use a shrinking migration allowlist for existing documents that do not yet have banners.

## Phase 10 — Final verification

Run the full local gate, perform the clean-clone discoverability test, compare the root to the approved target, inspect `git diff --name-status`, and obtain human approval before deleting tracked data or rewriting history.

## Lightweight-governance success rule

- T1–T3 require explicit ratification.
- T4–T6 may be created by the owning domain without architecture approval when they follow existing authority.
- Automation handles obvious classification; humans review exceptions.
- The governance system must shorten decisions and navigation, not create paperwork for routine operational evidence.
