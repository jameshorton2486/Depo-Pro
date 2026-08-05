# Project Authority Index

---
authority_tier: T1
status: ACTIVE
owner: Architecture
scope: repository-authority-navigation
supersedes: docs/archive/architecture/PROJECT_AUTHORITY_INDEX_DRAFT_V1.md
superseded_by: null
approved_by: Project Owner
version: 2.0.0
effective_date: 2026-08-05
ratified_date: 2026-08-05
last_reviewed: 2026-08-05
next_review: 2027-08-05
ratification: RATIFIED
implementation_status: PARTIAL
---

## Purpose

This is the canonical navigation index for Depo-Pro authority. It identifies which
documents govern, which documents provide active evidence, and which records are
historical. A link in this index does not elevate a document beyond its stated tier.

The [Document Authority Registry](DOCUMENT_AUTHORITY_REGISTRY.md) defines precedence,
status vocabulary, ownership, lifecycle, ratification, and conflict handling. The [Document Manifest](../document-manifest.json) is the canonical inventory of managed documents and their stable IDs.

## Constitutional authority

| Document | Tier and status | Scope |
|---|---|---|
| [Master Architecture](MASTER_ARCHITECTURE.md) | T1, active established authority | Product system, workflow, human review, and highest product-system conflict rule |
| [AGENTS.md](../../AGENTS.md) | T1, active established authority | Agent and contributor constraints, subordinate to the Master Architecture conflict rule |
| [Project Charter](PROJECT_CHARTER.md) | T1, active and ratified | Mission and project principles |
| [Document Authority Registry](DOCUMENT_AUTHORITY_REGISTRY.md) | T1, active and ratified | Documentation governance and conflict precedence |
| [Project Authority Index](PROJECT_AUTHORITY_INDEX.md) | T1, active and ratified | Authority discovery and document status routing |
| [README.md](../../README.md) | T1, active discovery authority | Repository orientation, setup, and verification |

## Specialized authority retained at root

| Document | Classification | Reason for fixed root path |
|---|---|---|
| [Architecture Decisions](../../ARCHITECTURE_DECISIONS.md) | T2, active established authority | Existing decision registry and tooling references |
| [Contract Notes](../../CONTRACT_NOTES.md) | T2, active established authority | Frozen API-contract deviation log required by `AGENTS.md` |
| [Canonical Standards Index](../../CANONICAL_STANDARDS_INDEX.md) | T3, active established authority | Current standards discovery and runtime migration dependency |
| [Numbering Registry](../../NUMBERING_REGISTRY.md) | T3, active established authority | Canonical standards and architecture numbering |

These established documents remain active while normalized metadata is introduced.
Their fixed paths are explicit root exceptions; new reports, audits, plans, or
standards must not be added to the repository root.

## Architecture

| Domain | Governing or candidate documents | Status |
|---|---|---|
| System workflow | [Master Architecture](MASTER_ARCHITECTURE.md) | Active governing authority |
| Architecture v1 capstone | [System Architecture v1.0](DEPO_PRO_SYSTEM_ARCHITECTURE_v1.0.md) | Draft freeze candidate; not governing |
| Intake formatting | [Canonical Formatting Architecture](CANONICAL_FORMATTING_ARCHITECTURE.md) | Draft T2 candidate |
| Multi-file transcription | [Multi-file Transcription Design](MULTIFILE_TRANSCRIPTION_DESIGN.md) | Draft T2 design; implementation exists but ratification remains separate |
| Case storage | [Case Storage Specification](CASE_STORAGE_SPEC.md) | Existing architecture candidate; metadata review pending |
| Transcript architecture | [DTAS](DTAS-v1.0.md), [CTS](CTS-v1.0.md), [Structured Transcript Contract](W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md), [Canonical Integrity](W23B_CANONICAL_INTEGRITY.md) | Existing architecture set; scope-specific precedence follows explicit supersession and the Master Architecture |
| Architecture decisions | [ADR directory](adr/) and [Architecture Decisions](../../ARCHITECTURE_DECISIONS.md) | Ratified decisions govern only their declared scopes |

Draft architecture does not govern implementation until ratified. Existing architecture
without normalized metadata retains only the authority already granted by the Master
Architecture, `AGENTS.md`, or an explicit ratified decision.

## Domain standards

| Domain | Route | Status |
|---|---|---|
| Field ownership | [Data Field Reference](../DATA_FIELD_REFERENCE.md) | Active; locked by `AGENTS.md` |
| Transcript data structures | [Data Structures Reference](../DATA_STRUCTURES_REFERENCE.md) | Active; locked by `AGENTS.md` |
| Intake canonical fields | [Canonical Field Governance](../standards/CANONICAL_FIELD_GOVERNANCE.md) | Draft T3 candidate; not governing |
| Formatting and geometry | [Canonical Standards Index](../../CANONICAL_STANDARDS_INDEX.md) | Active established standards route |
| UFM | [UFM Data Dictionary](UFM_DATA_DICTIONARY.md) and [Texas Requirements](UFM_TEXAS_REQUIREMENTS.md) | Existing scope-specific references; unresolved conflicts are stop conditions |
| Recognition quality | [W21 Recognition Quality](W21_RECOGNITION_QUALITY_STANDARD.md) | Existing standard candidate |
| Deepgram keyterms | [Deepgram Keyterm Specification](DEEPGRAM_KEYTERM_SPEC.md) | Existing standard candidate |
| AI transcript correction | [ATIA](../atia/AI_TRANSCRIPT_INTELLIGENCE_AUDIT.md) plus `AGENTS.md` | `AGENTS.md` rules govern; ATIA supplies architecture and audit evidence within that boundary |

## Operations

- [Operations directory](../operations/) — active deployment, release, recovery, and
  Deepgram procedures.
- [Release Candidate Runbook](../operations/RELEASE_CANDIDATE_RUNBOOK.md)
- [Formatter Service Deployment](../operations/FORMATTER_SERVICE_DEPLOYMENT.md)
- [Transcript Finalizer Deployment](../operations/TRANSCRIPT_FINALIZE_WORKER_DEPLOYMENT.md)
- [Deepgram Go-Live Checklist](../operations/DEEPGRAM_GO_LIVE_CHECKLIST.md)
- [Documentation Validation](../operations/DOCUMENTATION_VALIDATION.md)

Operations implement higher authority and cannot amend architecture or standards.

## Evidence and history

- [Audit index](../audits/README.md) — active point-in-time evidence and findings.
- [Documentation index](../README.md) — repository documentation map and placement rules.
- [Archive index](../archive/README.md) — inactive reports, handoffs, status records,
  superseded drafts, and historical audits.
- [Root cleanup audit](../audits/REPOSITORY_ROOT_CLEANUP_AUDIT.md) and
  [root inventory](../audits/REPOSITORY_ROOT_INVENTORY.md) — evidence supporting the
  2026-08-05 reorganization.

Audits may identify drift but do not enact authority. Reports and archives never govern
current behavior.

## Implementation and enforcement

| Layer | Route |
|---|---|
| React application | `src/` |
| Supabase functions and migrations | `supabase/` |
| Transcript finalizer | `transcript_finalize_service/` |
| Formatter service/core | `formatter_service/`, `formatter_core/` |
| TIE and legacy formatter | `transcript_formatter/` |
| JavaScript and TypeScript tests | Colocated `*.test.ts` and `*.test.tsx`; Vitest |
| Python tests | Service and formatter test directories |
| CI | `.github/workflows/verify.yml` |

## Remaining governance debt

1. Normalize metadata on pre-existing T1-T3 documents without changing their substance.
2. Resolve scope overlap among the UFM and engineering-standard candidates.
3. Complete the standards/runtime-registry split without moving imported runtime data prematurely.
4. Reduce the reviewed legacy metadata baseline as documents are substantively revisited.
5. Expand enforcement links for every active T1-T3 rule or declare a manual owner and cadence.