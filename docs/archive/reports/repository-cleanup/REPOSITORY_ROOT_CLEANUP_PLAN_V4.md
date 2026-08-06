# Repository Root Cleanup Plan V4 — Conflict Rules Before Ratification

---
authority_tier: T7
original_authority_tier: T6
status: ARCHIVED
owner: Architecture
scope: repository-root-cleanup-plan-v4
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

## Governing drafts

- [Document Authority Registry V2](../../../architecture/DOCUMENT_AUTHORITY_REGISTRY.md)
- [Project Authority Navigation Map](../../../architecture/PROJECT_AUTHORITY_INDEX.md)

This plan authorizes no moves, deletions, commits, migrations, or external changes.

## Phase 0A — Containment

Resolve sensitive-data and ownership stops for `Audit/`, `tools/`, `.env`, local AI histories, and legal-document-like reference samples.

## Phase 0B — Ratify hierarchy and registry

Review and ratify:

- authority hierarchy and exact conflict precedence;
- who may change each tier and required review;
- authority/evidence separation;
- status, ratification, implementation, owner, and archive vocabularies;
- effective/ratified/review dates and T1–T3 versioning;
- retired-authority process;
- enforcement contract;
- root governance-document prohibition.

Ratify the navigation map only after its constitutional routes and source-of-truth claims are verified.

**Gate:** two questions have unambiguous answers for every governed scope: which document wins, and who may change it?

## Phase 1 — Automated classification proposal

Infer T4–T6 classifications mechanically from filenames, content, references, and Git evidence. Propose T1–T3 candidates but require human review. Never auto-ratify, auto-supersede, auto-archive, or move foundational authority.

## Phase 2 — Exception review and authority freeze

Review T1–T3, low-confidence, duplicate-scope, conflicting, sensitive, multi-domain, archive, and delete exceptions. Freeze metadata and explicitly resolve active conflicts.

## Phase 3 — Indexes, Knowledge Graph, and enforcement map

Create Architecture, Standards, Audit, and Archive indexes plus `docs/KNOWLEDGE_GRAPH.md`. Expand the navigation map so every subsystem links governing authority, ADRs, standards, policies/operations, active audits, implementation, tests, CI, and archived reports.

Every active T1–T3 rule must link enforcement or declare `MANUAL_REVIEW_ONLY` with owner/cadence.

## Phase 4 — Move active documents

Move only indexed documents with frozen authority and known inbound references. Update metadata, links, scripts, prompts, indexes, Knowledge Graph, and enforcement mapping atomically.

## Phase 5 — Retire and archive knowledge

Follow the retired-authority process. No active T1–T3 authority moves directly to archive. Completed T6 reports and properly superseded/deprecated documents use the approved archive category and retain reasoning/replacement links.

## Phase 6 — Generated artifacts

After approval, remove only individually verified untracked/generated candidates using resolved repository-contained paths.

## Phase 7 — Standards documentation migration

Move ratified standards under `docs/standards/`; leave runtime JSON in place.

## Phase 8 — Runtime standards migration

Move the runtime abbreviation registry and atomically update imports, tests, builds, authority links, and enforcement mapping. Retire the mixed standards folder only after both migrations pass.

## Phase 9 — Documentation CI

Enforce links, metadata vocabulary, ratification, review dates, versions, duplicate authority, supersession validity/acyclicity, index/Knowledge Graph integrity, enforcement links, and the prohibition on new root governance documents.

## Phase 10 — Verification

Run documentation validation, the full local engineering gate, and a clean-clone discoverability test. Obtain human approval before tracked deletion or history changes.

## Lightweight rule

- T1–T3: formal ratification.
- T4–T5: normal review.
- T6–T7: no formal ratification.
- Automated classification handles routine cases; humans review exceptions.
