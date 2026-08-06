# Document Authority Registry

---
authority_tier: T7
original_authority_tier: T1
status: ARCHIVED
owner: Architecture
scope: repository-documentation-governance-draft-v1
supersedes: null
superseded_by: docs/architecture/DOCUMENT_AUTHORITY_REGISTRY.md
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

## Purpose

This registry defines the permanent vocabulary and governance rules used to classify Depo-Pro documentation. Classification, relocation, archival, indexing, and documentation CI must use these definitions rather than inventing local terminology.

This document must be ratified before bulk document classification or repository reorganization begins.

## Authority tiers

| Tier | Name | Meaning | Ratification |
|---|---|---|---|
| T1 | Constitutional | Project-wide governing and discovery documents; highest repository authority subject to the master architecture conflict rule | Explicit ratification required |
| T2 | Architecture | Living system/subsystem boundaries, ownership, contracts, and architectural decisions | Explicit ratification required |
| T3 | Standards | Normative rules for data, transcript, Intake, speakers, formatting, rendering, certification, security, and similar governed behavior | Explicit ratification required |
| T4 | Operations | Deployment, release, recovery, Deepgram, Supabase, Cloud Build, incident, and maintenance procedures | May be created/updated by the owning domain without architecture ratification |
| T5 | Audit | Evidence, verification, findings, gap analysis, and compliance review | May be created without architecture ratification; cannot establish T1–T3 authority by itself |
| T6 | Report | Implementation, remediation, execution, completion, handoff, and status history | May be created without architecture ratification; records outcomes but does not govern architecture |
| T7 | Archived Knowledge | Retained inactive knowledge classified by archive reason | Requires original tier and replacement/provenance metadata; never used as current authority |

T7 is a lifecycle destination, not permission to erase the document’s former role. A T7 record must retain `original_authority_tier`.

## Publication status vocabulary

Only these values are allowed:

| Status | Meaning |
|---|---|
| `DRAFT` | In development; not authoritative |
| `ACTIVE` | Current and applicable within its declared authority tier |
| `SUPERSEDED` | Replaced by a named document; retained for evidence/history |
| `ARCHIVED` | Inactive and retained; not current authority |
| `DEPRECATED` | Still present during a migration or compatibility period but should not receive new dependence |

No synonym such as “current,” “final,” “old,” or “legacy” may replace the status field.

## Ratification vocabulary

| Value | Meaning |
|---|---|
| `NOT_REQUIRED` | T4–T6 document that follows existing authority |
| `NONE` | Ratification has not started |
| `REVIEW` | Submitted for explicit review |
| `RATIFIED` | Approved by the named approver on `last_ratified` |

T1–T3 documents cannot become `ACTIVE` unless ratification is `RATIFIED`. T4–T6 normally use `NOT_REQUIRED` unless they are explicitly elevated.

## Implementation status vocabulary

| Value | Meaning |
|---|---|
| `NOT_APPLICABLE` | Document does not prescribe implementation |
| `NOT_STARTED` | Ratified requirement has no implementation |
| `PARTIAL` | Some governed requirements are implemented |
| `IMPLEMENTED` | Governed requirements are represented in code/process |
| `VERIFIED` | Implementation is linked to current tests or operational verification |

Implementation status never changes a document’s authority tier or publication status.

## Ownership domains

Only these owner values are allowed unless this registry is ratified again:

- `Project`
- `Architecture`
- `Transcript`
- `Intake`
- `Rendering`
- `Export`
- `Supabase`
- `Deepgram`
- `Deployment`
- `Security`

A document may declare one primary owner. Cross-domain relationships belong in indexes and the knowledge graph rather than ad hoc owner strings.

## Required metadata

Every managed Markdown document must eventually declare:

```yaml
---
authority_tier: T1
status: ACTIVE
owner: Architecture
scope: repository-documentation-governance
supersedes: null
superseded_by: null
approved_by: Project Owner
last_ratified: 2026-08-03
ratification: RATIFIED
implementation_status: VERIFIED
---
```

Rules:

- `authority_tier`, `status`, `owner`, `scope`, `ratification`, and `implementation_status` are always required.
- `supersedes` and `superseded_by` are always present, using `null` when not applicable.
- `approved_by` and `last_ratified` are required when ratification is `RATIFIED`; otherwise they are `null`.
- T7 additionally requires `original_authority_tier` and an archive category.
- Paths in supersession fields must resolve to repository documents.

## Document lifecycle

```text
DRAFT
  -> REVIEW
  -> RATIFIED
  -> ACTIVE
  -> IMPLEMENTED
  -> VERIFIED
  -> SUPERSEDED or DEPRECATED
  -> ARCHIVED
```

The diagram spans three metadata dimensions:

- `status` describes publication/applicability;
- `ratification` describes approval;
- `implementation_status` describes enforcement.

Not every document traverses every state. T4–T6 normally move from `DRAFT` to `ACTIVE` with ratification `NOT_REQUIRED`. T5 audits and T6 reports may become `ARCHIVED` without ever having an implementation status beyond `NOT_APPLICABLE`.

## Lightweight governance rule

- T1–T3 creation, activation, supersession, or deprecation requires explicit ratification.
- T4–T6 may be created and maintained by their owner without architecture approval, provided they cite and do not contradict governing T1–T3 authority.
- T5 audits may challenge an authority but cannot silently replace it.
- T6 reports may record implementation but cannot declare architecture complete on their own.
- Archival never occurs based on age alone.

## Automated classification

Classification should be proposed mechanically and reviewed by exception.

| Filename/content signal | Default proposal | Confidence ceiling |
|---|---|---:|
| `*_AUDIT.md`, `*_FINDINGS.md`, `*_GAP_ANALYSIS.md` | T5 Audit | High |
| `*_REPORT.md`, `*_HANDOFF*.md`, completion/status records | T6 Report | High |
| `*_PLAN.md` | Infer T2/T4/T6 from governing language and owner | Medium |
| `*_CHECKLIST.md`, runbooks, deployment instructions | T4 Operations | High |
| `ADR-*`, architecture ownership/boundary decisions | T2 Architecture | High |
| Standard/spec/policy/rules documents | Propose T3 only when normative language and ratification evidence exist | Medium |
| README, agent rules, master registry/index | Propose T1; always require human review | Low |

Automation must never auto-ratify, auto-supersede, or auto-archive T1–T3 documents. Low-confidence, conflicting, multi-scope, or sensitive documents are review exceptions.

## Archive categories

Allowed categories are:

- `architecture`
- `audits`
- `reports`
- `releases`
- `migration`
- `handoffs`
- `deprecated`
- `experiments`

## Change control

Changes to authority tiers, vocabularies, required metadata, ownership domains, lifecycle rules, or ratification requirements require explicit ratification because inconsistent governance would invalidate automated classification and CI.
