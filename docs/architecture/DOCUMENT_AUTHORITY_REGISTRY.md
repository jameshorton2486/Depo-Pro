# Document Authority Registry

---
authority_tier: T1
status: ACTIVE
owner: Architecture
scope: repository-documentation-governance
supersedes: docs/archive/architecture/DOCUMENT_AUTHORITY_REGISTRY_DRAFT_V1.md
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

## Ratification record

Version 2.0.0 was ratified by the Project Owner on 2026-08-05. It supersedes the initial registry draft and governs documentation classification, relocation, archival, indexing, and future documentation validation.

## Authority hierarchy and conflict resolution

```text
Project Constitution
  -> Ratified Architecture Standards
  -> Ratified Architecture Decision Records (ADRs)
  -> Ratified Domain Standards
  -> Policies
  -> Operations
  -> Audits (evidence)
  -> Reports (history)
  -> Archives (inactive knowledge)
```

### Conflict rules

1. `docs/architecture/MASTER_ARCHITECTURE.md` is the highest product-system authority and governs conflicts with older specifications, as declared by `AGENTS.md`.
2. `AGENTS.md` governs agent and contributor conduct within its scope, subject to the Master Architecture conflict rule.
3. Lower levels may implement, specialize, or provide evidence for higher levels; they may not contradict or silently replace them.
4. A ratified ADR may refine an architecture standard within its declared scope. It cannot contradict that standard unless it also records the formally ratified amendment or supersession.
5. A ratified domain standard governs implementation within its scope, subject to constitutional, architecture-standard, and applicable ADR authority.
6. Policies and operations explain how authority is followed. They do not create architecture by themselves.
7. Audits are evidence. Reports are history. Neither becomes a standard because it recommends a change or records implementation.
8. Archives never govern current behavior.
9. Within one level, only an explicit `supersedes` relationship resolves conflict. Recency, filename, directory, specificity, code behavior, and test behavior alone do not.
10. An unexplained conflict between active documents is a stop condition. Record it and obtain the review required for that tier.

### Source of truth

| Level | Source of truth | If conflict occurs |
|---|---|---|
| Project Constitution | Master Architecture plus specialized non-conflicting T1 documents | Master Architecture governs product-system conflicts |
| Architecture Standards | Ratified T2 standard named in the Project Authority Index | T1 governs; unresolved T2 conflict requires formal ratification |
| ADRs | Ratified ADR linked to its governing architecture standard | May refine but not silently override T1/T2 |
| Domain Standards | Ratified T3 standard named in the Standards Index | T1/T2/applicable ratified ADRs govern |
| Policies | Active policy linked to T1–T3 authority | Governing authority wins |
| Operations | Active runbook/configuration under an owning domain | Policy and T1–T3 authority win |
| Audits | Evidence record | May trigger a change; cannot enact it |
| Reports | Implementation/history record | Cannot override authority |
| Archives | Inactive retained knowledge | Never governs |

Code, schemas, tests, and CI are enforcement evidence. If they disagree with ratified authority, the mismatch is architectural drift—not silent document supersession.

## Authority tiers

| Tier | Name | Meaning |
|---:|---|---|
| T1 | Constitutional | Project-wide governing and discovery authority |
| T2 | Architecture | System/subsystem boundaries, ownership, contracts, and ADRs |
| T3 | Standards | Normative domain behavior and data rules |
| T4 | Operations | Deployment, release, recovery, Deepgram, Supabase, and maintenance procedures |
| T5 | Audit | Evidence, verification, findings, gap analysis, and compliance review |
| T6 | Report | Implementation, remediation, execution, completion, handoff, and status history |
| T7 | Archived Knowledge | Retained inactive knowledge, never current authority |

T7 is a lifecycle destination. It must retain `original_authority_tier`.

## Authority versus evidence

- T1–T3 govern.
- T4 operationalizes governing authority.
- T5 supplies evidence about authority and implementation.
- T6 records what happened.
- T7 preserves inactive reasoning and provenance.

An audit recommendation becomes governing only through a separately ratified T1–T3 change. An implementation report cannot ratify its own outcome.

## Publication status vocabulary

Only these values are allowed:

| Status | Meaning |
|---|---|
| `DRAFT` | In development; not authoritative |
| `ACTIVE` | Current and applicable within its tier and scope |
| `SUPERSEDED` | Replaced by a named authority |
| `ARCHIVED` | Inactive and retained |
| `DEPRECATED` | Present during migration/compatibility but closed to new dependence |

## Ratification vocabulary

| Value | Meaning |
|---|---|
| `NOT_REQUIRED` | Formal ratification does not apply |
| `NONE` | Ratification has not started |
| `REVIEW` | Submitted for formal review |
| `RATIFIED` | Approved by the named approver on `ratified_date` |

## Implementation status vocabulary

| Value | Meaning |
|---|---|
| `NOT_APPLICABLE` | No implementation prescribed |
| `NOT_STARTED` | Ratified requirements have no implementation |
| `PARTIAL` | Some requirements are implemented |
| `IMPLEMENTED` | Requirements are represented in code/process |
| `VERIFIED` | Implementation is linked to current tests or operational verification |

These are separate dimensions: a document can be `ACTIVE`, `RATIFIED`, and `PARTIAL` simultaneously.

## Ownership domains

Allowed primary owners:

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

Cross-domain relationships belong in indexes and the Knowledge Graph.

## Required metadata

```yaml
---
authority_tier: T3
status: ACTIVE
owner: Transcript
scope: transcript-word-integrity
supersedes: null
superseded_by: null
approved_by: Project Owner
version: 1.0.0
effective_date: 2026-08-03
ratified_date: 2026-08-03
last_reviewed: 2026-08-03
next_review: 2027-08-03
ratification: RATIFIED
implementation_status: VERIFIED
---
```

Rules:

- All fields shown are required; unavailable/not-applicable values use `null`.
- T1–T3 require semantic `MAJOR.MINOR.PATCH` versioning and review dates.
- T4–T7 use Git history and dated metadata unless a domain standard requires versions.
- `approved_by` and `ratified_date` are required when ratification is `RATIFIED`.
- `superseded_by` is required for `SUPERSEDED`, and normally for `DEPRECATED`.
- T7 requires `original_authority_tier` and `archive_category`.
- Supersession paths must resolve.

## Lifecycle

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

The lifecycle spans publication status, ratification, and implementation status. T4–T6 normally move from draft to active with ratification `NOT_REQUIRED`. Audits and reports may archive with implementation `NOT_APPLICABLE`.

## Review, approval, and change authority

| Tier | Who may propose | Required review |
|---:|---|---|
| T1 | Project Owner or Architecture owner | Formal Project Owner ratification plus architecture review |
| T2 | Architecture or affected domain owner | Formal Architecture and Project Owner ratification |
| T3 | Owning domain | Formal domain approval plus Architecture ratification |
| T4 | Owning operational domain | Normal reviewed change |
| T5 | Auditor or owning domain | Normal evidence review; disclose conflicts/independence concerns |
| T6 | Implementer or owning domain | No formal ratification; factual owner review as appropriate |
| T7 | Documentation maintainer or former owner | No ratification; validate replacement/provenance |

T1–T3 require formal ratification. T4–T5 require normal review. T6–T7 require no formal ratification. A lower-tier change that alters higher-tier authority must follow the higher-tier process.

## Version policy

- A major version changes authority or incompatible governed behavior.
- A minor version adds compatible governed scope or rules.
- A patch version clarifies without changing behavior.
- Review may reaffirm a version without incrementing it.
- Semantic versions are limited to T1–T3 by default to avoid bureaucracy.

## Enforcement contract

Every active T1–T3 rule must identify an enforcement mechanism or explicitly record `MANUAL_REVIEW_ONLY` with an owner and cadence.

Allowed enforcement includes:

- import/dependency guards;
- schema and migration comparisons;
- static duplicate/forbidden-call searches;
- integration tests for proposal-only AI behavior;
- golden transcript/rendering parity tests;
- documentation CI;
- release/certification gates.

| Example rule | Enforcement pattern |
|---|---|
| One canonical formatter | CI detects duplicate formatter registration or entry points |
| Rendering never mutates content | Import guards and mutation-boundary tests |
| AI emits proposals rather than hidden final text | CorrectionObject integration tests and auto-apply prohibition |
| Migrations govern schema evolution | Migration/schema comparison and deployment checks |
| Rendering parity | Golden transcript tests and renderer comparisons |

The Project Authority Navigation Map and Knowledge Graph must link constitutional rules to implementation, tests, and CI. Unenforced authority is visible governance debt.

## Retired authority process

1. Ratify the replacement or retirement decision.
2. Mark the old authority `SUPERSEDED` or `DEPRECATED`.
3. Populate `superseded_by` with the replacement version and applicable ADR.
4. Update indexes, Knowledge Graph, inbound links, enforcement, and implementation guidance.
5. Preserve the original version and reasoning chain.
6. Move to T7 only after active consumers stop depending on it.

If no replacement exists, `superseded_by` points to a ratified retirement decision explaining why the scope no longer requires authority.

## Automated classification

| Signal | Default proposal | Maximum confidence |
|---|---|---:|
| `*_AUDIT.md`, `*_FINDINGS.md`, `*_GAP_ANALYSIS.md` | T5 | High |
| `*_REPORT.md`, handoff, completion/status | T6 | High |
| checklist, runbook, deployment instructions | T4 | High |
| ADR or architecture ownership/boundary decision | T2 | High |
| standard/spec/policy/rules | T3 candidate only with normative/ratification evidence | Medium |
| README, agent rules, master registry/index | T1 candidate requiring human review | Low |

Automation proposes classifications and confidence. It never ratifies, supersedes, archives, or moves T1–T3.

## Archive categories

Allowed categories: `architecture`, `audits`, `reports`, `releases`, `migration`, `handoffs`, `deprecated`, `experiments`.

Archival never occurs because of age.

## Governance-document location

New governance documents belong under `docs/architecture/` or `docs/standards/`. The root is reserved for permanent discovery/constitutional documents and tool-required configuration. A new root governance document requires a ratified T1 exception recorded in the Project Authority Navigation Map.

## Change control

Changing tiers, precedence, vocabulary, metadata, owners, lifecycle, ratification, versioning, or enforcement rules requires formal T1 ratification.
