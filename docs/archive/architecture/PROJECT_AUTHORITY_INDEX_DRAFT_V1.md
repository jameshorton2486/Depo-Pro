# Project Authority Index

---
authority_tier: T7
original_authority_tier: T1
status: ARCHIVED
owner: Architecture
scope: repository-authority-navigation-draft-v1
supersedes: null
superseded_by: docs/architecture/PROJECT_AUTHORITY_INDEX.md
approved_by: null
version: 1.0.0
effective_date: null
ratified_date: null
last_reviewed: 2026-08-05
next_review: null
ratification: NOT_REQUIRED
implementation_status: NOT_APPLICABLE
archive_category: architecture
---

## Start here

This is the living table of contents for Depo-Pro authority. It routes contributors and AI agents from project constitution to architecture, standards, operations, evidence, implementation, tests, and CI. It does not create authority merely by linking a document.

The [Document Authority Registry](../../architecture/DOCUMENT_AUTHORITY_REGISTRY.md) defines all tiers, statuses, owners, metadata, lifecycle rules, and ratification requirements used here.

## Project constitution

| Authority | Scope | Status |
|---|---|---|
| [AGENTS.md](../../../AGENTS.md) | Locked repository rules for agents and contributors | Existing governing document; metadata migration pending |
| [Master Architecture](../../architecture/MASTER_ARCHITECTURE.md) | Official system architecture and workflow | Existing governing document; metadata migration pending |
| [README.md](../../../README.md) | Project discovery, setup, integrity rules, and repository map | Existing discovery authority; metadata migration pending |
| [Architecture Decisions](../../../ARCHITECTURE_DECISIONS.md) | Accepted architectural decisions and rationale | Existing authority; metadata migration pending |
| [Contract Notes](../../../CONTRACT_NOTES.md) | Frozen API-contract deviation log | Existing authority required by AGENTS.md |
| [Canonical Standards Index](../../../CANONICAL_STANDARDS_INDEX.md) | Current standards registry | Existing authority; standards migration pending |
| [Numbering Registry](../../../NUMBERING_REGISTRY.md) | Canonical standards/architecture numbering | Existing authority; standards migration pending |

## Architecture routes

| Subsystem | Current route | Notes |
|---|---|---|
| Project workflow and system boundaries | [Master Architecture](../../architecture/MASTER_ARCHITECTURE.md) | Governs conflicts with older specifications |
| Engineering operating model | [Project Operating Standard](../../architecture/PROJECT_OPERATING_STANDARD.md) | Relationship to T1/T2 to be classified |
| Current implementation ownership | [Current Implementation Map](../../architecture/CURRENT_IMPLEMENTATION_MAP.md) | Characterization; authority status pending |
| Transcript pipeline | [Transcript Pipeline Report](../../architecture/TRANSCRIPT_PIPELINE_REPORT.md) | Must be reconciled with newer transcript audits before ratification |
| Case storage | [Case Storage Spec](../../architecture/CASE_STORAGE_SPEC.md) | Tier/status review pending |
| Structured transcript | [W22-2A Structured Transcript Contract](../../architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md) | Tier/status review pending |
| Canonical transcript integrity | [W23B Canonical Integrity](../../architecture/W23B_CANONICAL_INTEGRITY.md) | Tier/status review pending |
| Proceedings events | [ADR-023C](../../architecture/adr/ADR-023C_PROCEEDINGS_EVENT_CONTRACT.md) | Architecture decision |
| Authentication ownership | [ADR-0007](../../architecture/adr/ADR-0007_REACTIVE_AUTHENTICATION_OWNERSHIP.md) | Architecture decision |

## Standards routes

| Domain | Current authority candidate | Classification state |
|---|---|---|
| Field ownership | [Data Field Reference](../../DATA_FIELD_REFERENCE.md) | Locked by AGENTS.md; T3 ratification metadata pending |
| Transcript data structures | [Data Structures Reference](../../DATA_STRUCTURES_REFERENCE.md) | Locked by AGENTS.md; T3 ratification metadata pending |
| UFM data | [UFM Data Dictionary](../../architecture/UFM_DATA_DICTIONARY.md) and [UFM Texas Requirements](../../architecture/UFM_TEXAS_REQUIREMENTS.md) | Duplicate/scope authority review required |
| Deepgram keyterms | [Deepgram Keyterm Spec](../../architecture/DEEPGRAM_KEYTERM_SPEC.md) | Tier/status review pending |
| Engineering | [Engineering Standards](../../architecture/ENGINEERING_STANDARDS.md) and [W0 Engineering Operations Standard](../../architecture/W0_ENGINEERING_OPERATIONS_STANDARD.md) | Relationship/supersession review required |
| Recognition quality | [W21 Recognition Quality Standard](../../architecture/W21_RECOGNITION_QUALITY_STANDARD.md) | Tier/status review pending |
| Formatting and geometry | [Canonical Standards Index](../../../CANONICAL_STANDARDS_INDEX.md) | Runtime registry migration blocks final relocation |
| AI transcript correction | [ATIA](../../atia/AI_TRANSCRIPT_INTELLIGENCE_AUDIT.md) plus AGENTS.md constraints | Architecture/standard boundary must be classified |

No candidate in this section is declared ratified by this draft index. The standards classification phase must establish exactly one unexplained active authority per scope.

## Operational routes

| Domain | Current route |
|---|---|
| Formatter deployment | [Formatter Service Deployment](../../operations/FORMATTER_SERVICE_DEPLOYMENT.md) |
| Transcript finalization | [Transcript Finalize Worker Deployment](../../operations/TRANSCRIPT_FINALIZE_WORKER_DEPLOYMENT.md) |
| Release candidate | [Release Candidate Runbook](../../operations/RELEASE_CANDIDATE_RUNBOOK.md) |
| Transcript recovery | [Recover Transcript](../../RECOVER_TRANSCRIPT.md) |
| Deepgram operations | Root go-live checklist pending classification/move |
| Supabase operations | Architecture, migrations, and runbooks require index expansion |

## Audit and evidence routes

- Current audit corpus: `docs/audits/`
- Repository cleanup evidence: [Root Inventory](../../audits/REPOSITORY_ROOT_INVENTORY.md)
- Authority model proposal: [Repository Documentation Authority Model](../audits/REPOSITORY_DOCUMENTATION_AUTHORITY_MODEL.md)
- Authority-first execution plan: [Cleanup Plan V2](../reports/repository-cleanup/REPOSITORY_ROOT_CLEANUP_PLAN_V2.md)

The permanent `docs/audits/INDEX.md` remains a Phase 2 deliverable after this registry is ratified.

## Implementation, tests, and CI

| Layer | Current route |
|---|---|
| React application | `src/` |
| Supabase functions and migrations | `supabase/` |
| Transcript finalizer | `transcript_finalize_service/` |
| Formatter service/core | `formatter_service/`, `formatter_core/` |
| TIE and legacy formatter | `transcript_formatter/` |
| JS/TS tests | colocated `*.test.ts` and `*.test.tsx`, run by Vitest |
| Python tests | service and formatter test directories |
| CI | `.github/workflows/verify.yml` |

`docs/KNOWLEDGE_GRAPH.md` will eventually map individual authorities to these implementation, test, and CI targets.

## Navigation gaps

1. The registry and this index are drafts and require explicit ratification.
2. Architecture and standards documents do not yet carry normalized metadata.
3. Several standards scopes have multiple candidates without frozen supersession.
4. The Audit Index, Standards Index, Architecture Index, and Knowledge Graph are not yet implemented.
5. Root-level audits/reports remain until classification and indexing are complete.
6. Documentation CI is not yet present.

These gaps are the next governance work; they are not permission to move documents.
