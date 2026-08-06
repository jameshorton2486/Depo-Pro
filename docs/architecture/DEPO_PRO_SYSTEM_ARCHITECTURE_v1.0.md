# DEPO-PRO System Architecture v1.0 — Freeze Candidate

---
authority_tier: T1
status: DRAFT
owner: Architecture
scope: system-architecture-navigation-and-implementation-baseline
supersedes: null
superseded_by: null
approved_by: null
version: 1.0.0
effective_date: null
ratified_date: null
last_reviewed: 2026-08-03
next_review: null
ratification: REVIEW
implementation_status: PARTIAL
---

## Purpose

This document is the capstone navigation and implementation baseline for DEPO-PRO Architecture v1.0. It summarizes the system, its non-negotiable rules, the authoritative sources, and the approved implementation sequence.

It does not duplicate or silently replace detailed authorities. It routes to them. Until ratified and accompanied by any required amendment to `AGENTS.md`, the existing mandatory pre-read remains `AGENTS.md` plus `docs/architecture/MASTER_ARCHITECTURE.md`.

## Architecture freeze candidate

Architecture v1.0 is **feature-complete as a planning baseline** and ready for implementation review.

If ratified:

- no new architecture, governance, or authority documents are created for planned v1.0 scope;
- factual corrections are made to existing authorities through their normal review process;
- architectural change occurs through an approved ADR that identifies the amended v1.0 authority;
- audits and reports may continue under `docs/audits/` and archive/operations locations, but cannot establish architecture;
- implementation work takes priority over additional governance elaboration.

This freeze does not claim the architecture is implemented. It freezes the target so implementation can converge on it.

## Architecture Freeze Scope (v1.0)

Upon ratification, these decisions are frozen:

1. Canonical Intake architecture with one Canonical Field Registry.
2. Canonical Transcript architecture.
3. The `Raw -> Canonical -> Presentation -> Certification` lifecycle.
4. One canonical Intake field-policy registry.
5. One transcript-processing and correction orchestration engine.
6. AI produces proposals only and does not automatically mutate approved transcript content.
7. Every AI-originated content change requires an explicit human decision.
8. Rendering reads approved canonical/working/structured data and never writes transcript content.
9. Certified transcripts are immutable.
10. Ordered migrations are the authoritative database schema evolution record.
11. Material changes and decisions remain attributable, auditable, and reproducible.

Any change to these decisions requires a new, approved ADR that names the affected v1.0 authority, migration impact, enforcement changes, tests, and rollback plan. Implementation discoveries may expose drift or require clarification; they do not silently reopen the frozen decision.

## What is DEPO-PRO?

DEPO-PRO is a legal deposition production system for court reporters and scopists. It manages:

1. Intake
2. Transcript Creation
3. Transcript Workspace
4. Exhibits
5. UFM Insertions
6. Certification
7. Export

The human court reporter reviews and certifies the final transcript. AI and deterministic engines assist but never become the certifying authority.

## Project charter

The [Project Charter](PROJECT_CHARTER.md) defines mission and principles. The architectural shorthand is:

```text
Raw evidence is immutable.
Canonical data has one owner.
Rendering never changes content.
AI proposes.
Reporters decide.
Certified transcripts are immutable.
Every decision is auditable.
Every output is reproducible.
```

## Architectural model

```text
Case and Source Evidence
  -> Canonical Intake Registry
  -> Recognition / Raw Transcript
  -> Canonical Transcript
  -> Correction Proposal Queue
  -> Reporter Decisions
  -> Working Transcript
  -> Structured Transcript
  -> Deterministic Rendering
  -> Quality and Certification Gates
  -> Immutable Certified Transcript
  -> Reproducible Export Package
```

### Information classes

- **Evidence:** immutable source artifacts, provider output, raw text, timing, confidence, and provenance.
- **Canonical data:** normalized facts with one owner, stable identity, and explicit source ownership.
- **Proposals:** deterministic or AI-generated suggested changes; never hidden authority.
- **Decisions:** reporter actions accepting, rejecting, editing, or directly authoring working content.
- **Projections:** working, structured, and legal/rendered views derived from evidence and decisions.
- **Certified record:** human-approved immutable output and its audit package.

## Non-negotiable rules

1. `raw_text`, word identity, timing, and confidence remain immutable.
2. Field source ownership follows `docs/DATA_FIELD_REFERENCE.md`.
3. Transcript-domain shapes follow `docs/DATA_STRUCTURES_REFERENCE.md` and ratified transcript contracts.
4. Human edits change working/overlay state, never raw evidence.
5. AI produces reviewable CorrectionObjects or equivalent migration adapters—not rewritten final transcripts.
6. The TIE/provider boundary remains vendor-neutral; legacy AI remains protected until characterized and migrated.
7. One canonical correction orchestration path replaces competing machine-correction entry points.
8. Rendering and export never introduce unreviewed lexical or structural content changes.
9. Manual Save remains permanent.
10. Certified/export-locked transcripts cannot be silently mutated.
11. Every material change has provenance and an append-only audit decision.
12. Test fixtures are synthetic; client transcripts, notices, credentials, and signed URLs are not committed.
13. `reference/wave8/` remains read-only normative reference and is never imported into runtime source or executed in CI.
14. Frozen API contract shapes are not renamed or reshaped; deviations use local types and `CONTRACT_NOTES.md`.
15. New architecture documents require an ADR that amends this v1.0 baseline.

## System ownership

| Domain | Canonical responsibility | Must not own |
|---|---|---|
| Intake | Case facts, source provenance, participants, field ownership, keyterms | Transcript wording or render geometry |
| Recognition | Provider request/result capture, timing, confidence, raw speaker observations | Human identity decisions or final transcript wording |
| Canonical transcript | Stable IDs, lossless normalized structure, source boundaries | Hidden editorial correction |
| Correction orchestration | Versioned deterministic/AI proposals, validation, conflicts, run provenance | Direct certification or silent final-text replacement |
| Reporter Workspace | Human editing and accept/reject/edit decisions | Alternative canonical storage or hidden pipelines |
| Structure | Reviewable Q/A, colloquy, objection, examination, and region proposals/decisions | Legal page geometry |
| Rendering | Styles, spacing, labels, geometry, pagination, serialization | Lexical correction or evidence mutation |
| Certification | Completeness checks, reporter attestation, immutable lock | New correction generation after lock |
| Export | Reproducible packaging of certified/approved projections | Content authority |

## Authoritative document routes

### Constitution and governance

- [Project Charter](PROJECT_CHARTER.md)
- [Master Architecture](MASTER_ARCHITECTURE.md)
- [AGENTS.md](../../AGENTS.md)
- [Document Authority Registry V2](DOCUMENT_AUTHORITY_REGISTRY.md) — draft pending ratification
- [Project Authority Navigation Map](PROJECT_AUTHORITY_INDEX.md) — draft pending ratification
- [Architecture Decisions](../../ARCHITECTURE_DECISIONS.md)
- [Contract Notes](../../CONTRACT_NOTES.md)

### Intake and case data

- [Data Field Reference](../DATA_FIELD_REFERENCE.md)
- [Data Structures Reference](../DATA_STRUCTURES_REFERENCE.md)
- [UFM Data Dictionary](UFM_DATA_DICTIONARY.md)
- [UFM Texas Requirements](UFM_TEXAS_REQUIREMENTS.md)
- [Case Storage Specification](CASE_STORAGE_SPEC.md)
- [Deepgram Keyterm Specification](DEEPGRAM_KEYTERM_SPEC.md)

The authority/supersession relationships among candidate Intake/UFM documents must be frozen during the classification phase; this capstone does not fabricate that resolution.

### Transcript architecture

- [Depo-Pro Transcript Architecture Standard](DTAS-v1.0.md)
- [Canonical Transcript Specification](CTS-v1.0.md)
- [Structured Transcript Contract](W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md)
- [Canonical Integrity](W23B_CANONICAL_INTEGRITY.md)
- [Recognition Quality Standard](W21_RECOGNITION_QUALITY_STANDARD.md)
- [AI Transcript Intelligence Audit](../atia/AI_TRANSCRIPT_INTELLIGENCE_AUDIT.md)
- [Transcript Correction Readiness Audit](../audits/TRANSCRIPT_CORRECTION_READINESS_AUDIT.md)

### Standards and rendering

- [Canonical Standards Index](../../CANONICAL_STANDARDS_INDEX.md)
- [Numbering Registry](../../NUMBERING_REGISTRY.md)
- Active DP standards and runtime abbreviation registry in `Canonical Standards Folder/`, pending the separately governed runtime/document migration

### Operations and evidence

- Operations: `docs/operations/`
- Audits: `docs/audits/`
- Locked reference: `reference/wave8/`
- CI: `.github/workflows/verify.yml`

Audits are evidence, not architecture. Reports record history, not authority.

## Implementation sequence

Architecture work now yields to review-gated phases composed of small, independently mergeable PRs. A phase is an architectural objective; a PR is the implementation and review unit. Never wire more than one consumer in one PR.

## Phase 1 — Canonical Intake Registry

**Goal:** introduce and prove one Canonical Field Registry through small PRs while preserving approved behavior and remaining invisible to users. PR-1A creates infrastructure with no consumers; later Phase 1 PRs wire only their named fields.

- Define the single machine-readable owner/source/normalization/validation policy for every Intake field.
- Record current ownership and policy without redesigning current flows.
- Add characterization and registry-schema tests.
- Preserve frozen contracts and all existing runtime behavior.

### PR-1A — Install the Canonical Registry (no consumers)

Create registry infrastructure only under `src/lib/canonical/`:

- `FieldPolicy.ts`
- `FieldRegistry.ts`
- `FieldKinds.ts`
- `FieldResult.ts`
- `CanonicalFormatter.ts`

Define, but do not execute, policies for Cause Number, Phone Number, Email, Person Name, Organization, Court, Address, Date, Time, and Caption. No production code imports or calls the registry.

**Exit:** clean build; no behavior changes; focused registry unit tests; all existing tests pass; typecheck, lint, and build pass.

### PR-1B — Characterization tests

Pin current Cause Number, phone, attorney/person name, firm/organization name, and court name behavior. Document inconsistencies without fixing them. No production changes.

### PR-1C — Wire one field only

Wire only `caption.case_number` through `Raw -> Registry -> CaseRecord -> UI`. All other fields and formatters remain untouched. Prove persistence, provenance, UI, and round-trip behavior.

### PR-1D — Phone numbers

After PR-1C is stable, wire every Intake phone field. Expected canonical form: `(210) 999-5033`. Do not remove duplicate helpers yet.

### PR-1E — Capitalization foundation

Wire only person names, firm/organization names, and courts. Legal terminology and broad title-casing remain out of scope.
### Phase 1 exit criteria

Phase 1 is complete only when:

- PR-1A through PR-1E were independently reviewed and merged;
- one validated Canonical Field Registry exists in one declared location;
- each included field has a stable key and declared owner/source policy;
- characterization tests preserve prior behavior or identify an explicitly approved field-level correction;
- only the fields named by PR-1C, PR-1D, and PR-1E use the registry;
- no confirmation, Deepgram request, UFM output, transcript, rendering, certification, export, or Workspace redesign occurs;
- frozen API contracts remain unchanged;
- the full CI/local gate passes for every PR.

Phase 1 installs and proves the Intake foundation. Broader consumer migration begins only in Phase 3.

## Phase 2 — Confirmation Engine

Move confidence-based confirmation policy such as `95%+ -> Auto Confirm` into the canonical domain layer—not UI or projection code. Characterize thresholds first. Confirmation remains attributable and reversible where required.

**Exit:** one confirmation-policy owner, preserved behavior, and no duplicate UI/projection decision logic.

## Phase 3 — Consumer migration

Migrate exactly one consumer per PR in this order:

1. Extracted Fields Review
2. Deepgram Request
3. Keyterms
4. UFM
5. Export
6. Workspace

Each PR proves before/after behavior, preserves provenance and frozen contracts, and leaves all later consumers untouched.

## Phase 4 — Remove duplicate Intake logic

Only after every consumer uses the registry, remove inactive `reporterFieldFormatting`, duplicate capitalization helpers, duplicate phone formatters, UFM-specific formatting, and projection formatting in one focused PR. Require reference searches, characterization parity, full tests, and rollback. No new behavior is introduced.
## Phase 5 — Canonical Transcript Engine

```text
Raw
  -> Canonical
  -> Proposal Queue
  -> Reporter Decision
  -> Working Transcript
```

- Guarantee a lossless Recognition projection.
- Complete CorrectionObject and decision persistence.
- Introduce one correction orchestrator behind adapters/feature controls.
- Reconcile live TS AI Review with TIE without deleting migration characterization.
- Prevent engine-level direct writes to approved content.

**Exit:** machine intelligence produces proposals; accepted decisions reproducibly produce the working transcript.

## Phase 6 — Unified Workspace

- Replace independent machine-processing entry points behind one **Correct and Format Transcript** operation.
- Merge useful Review & Confirm and AI Review behavior into the orchestrator.
- Keep Corrections as the unified review queue.
- Retain focused Speaker and Confidence review surfaces.
- Keep direct human editing, view selection, and permanent Save.

**Exit:** one machine-processing entry point, one proposal queue, one decision history.

## Phase 7 — Rendering Separation

- Move lexical corrections out of CFE/rendering.
- Select one deterministic rendering/geometry authority.
- Render only approved working/structured content.
- Establish Workspace/export parity with golden transcripts.

**Exit:** rendering can change presentation but cannot change transcript content.

## Phase 8 — Certification and Immutable Record

- Complete validation and reporter attestation gates.
- Lock certified transcript content and its decision/audit context.
- Produce reproducible DOCX, PDF, TXT, JSON, and package outputs from the certified record.
- Define an explicit post-certification correction/version process rather than silent mutation.

**Exit:** the certified transcript is immutable, reproducible, and legally auditable.

## Enforcement baseline

| Rule | Required enforcement direction |
|---|---|
| Raw evidence immutable | Canonical-integrity and mutation-boundary tests |
| One field owner | Intake registry validation and source-owner tests |
| One correction path | Duplicate-entry/registration checks and end-to-end orchestration tests |
| AI proposes only | CorrectionObject integration tests and auto-apply prohibition |
| Rendering never writes content | Import/mutation guards and golden parity tests |
| Certified record immutable | Database/service lock tests and certification integration tests |
| Frozen API contracts | Type tests, import/build gates, and deviation log review |
| Documentation freeze | CI rejects unauthorized new architecture/governance documents |

## Architecture amendment rule

After ratification:

1. Correct factual errors in the owning existing document.
2. Use an ADR for new architectural decisions or changes to v1.0 scope.
3. Name the authority and version being amended.
4. Identify implementation, migration, tests, CI, and rollback effects.
5. Do not create parallel architecture, governance, authority, or roadmap documents.

Audits may reveal drift; they do not amend architecture. Implementation reports may demonstrate completion; they do not ratify it.

## Current maturity and implementation focus

| Area | State |
|---|---|
| Repository governance | Mature enough to freeze |
| Documentation governance | Mature enough to freeze after registry review |
| Intake architecture | Defined; Phase 1 / PR-1A implementation next |
| Transcript architecture | Defined; Phase 5 implementation pending |
| Workspace architecture | Defined; Phase 6 implementation pending |
| Canonical engine | Not complete |
| Rendering separation | Not complete |
| Certification model | Not complete |

## Appendix A — Implementation Rules

Every implementation task and PR must:

1. Read `docs/architecture/PROJECT_CHARTER.md`.
2. Read `docs/architecture/DEPO_PRO_SYSTEM_ARCHITECTURE_v1.0.md`.
3. Continue to satisfy the mandatory `AGENTS.md` and `MASTER_ARCHITECTURE.md` pre-read unless that rule is explicitly amended.
4. Read all ADRs and standards applicable to the changed scope.
5. Confirm the current phase and PR objective, exclusions, and exit criteria before editing.
6. Avoid introducing new architectural decisions during implementation.
7. Stop and report when code reality conflicts with frozen architecture; do not silently redesign or route around it.
8. Add characterization tests before intentionally changing existing behavior.
9. Preserve raw evidence, provenance, auditability, stable identity, human decision authority, and reproducibility.
10. Keep changes bounded to the current PR and exclude opportunistic refactoring.
11. Preserve frozen API contracts and record permitted local deviations in `CONTRACT_NOTES.md`.
12. Use synthetic fixtures only.
13. Run validation proportional to risk and the complete required gate before merge.
14. Update existing authoritative documentation only when implementation reveals a factual error or an approved ADR requires an amendment.
15. Never create a parallel architecture, governance, authority, or roadmap document.

### PR implementation checklist

- [ ] Project Charter reviewed
- [ ] System Architecture v1.0 reviewed
- [ ] `AGENTS.md` and Master Architecture reviewed
- [ ] Applicable ADRs and standards reviewed
- [ ] Phase and PR objective and explicit non-goals confirmed
- [ ] Existing behavior documented
- [ ] Characterization tests added or existing coverage cited
- [ ] No unapproved architectural decision introduced
- [ ] No unrelated changes included
- [ ] Auditability, provenance, and rollback preserved
- [ ] Focused verification passes
- [ ] Typecheck, lint, tests, and build pass as required
- [ ] Existing documentation updated only if required
- [ ] PR exit criteria demonstrated with evidence
## Ratification checklist

Before changing this document to `ACTIVE` / `RATIFIED`:

- Project Owner approves the Project Charter.
- Conflict precedence and authority-change permissions are approved.
- Existing Master Architecture conflicts are either reconciled or explicitly preserved as governing exceptions.
- The phased, review-gated PR implementation sequence is approved.
- The architecture-document freeze and ADR-only amendment rule are approved.
- Effective date, ratified date, next review, and approver are populated.
- Required `AGENTS.md` pre-read behavior is either preserved or changed through an explicitly approved amendment.

Until then, this is a freeze candidate—not law.
