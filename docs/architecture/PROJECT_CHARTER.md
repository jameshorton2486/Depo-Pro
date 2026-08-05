# DEPO-PRO Project Charter

---
authority_tier: T1
status: ACTIVE
owner: Project
scope: project-mission-and-principles
supersedes: null
superseded_by: null
approved_by: Project Owner
version: 1.0.0
effective_date: 2026-08-05
ratified_date: 2026-08-05
last_reviewed: 2026-08-05
next_review: 2027-08-05
ratification: RATIFIED
implementation_status: PARTIAL
---

## Mission

Produce the highest-quality legally defensible deposition transcript through deterministic, auditable, reproducible processing with final authority retained by the human court reporter.

DEPO-PRO exists to reduce manual effort without weakening transcript accuracy, provenance, human review, or legal defensibility.

## Principles

1. **Raw evidence is immutable.** Recognition text, timing, confidence, source identity, and stable word identity are preserved.
2. **Canonical data has one owner.** Every governed field and transformation has one authoritative owner and no unexplained parallel implementation.
3. **Rendering never changes content.** Rendering controls presentation, geometry, pagination, and serialization; lexical or structural changes enter the reviewable correction workflow.
4. **AI proposes.** AI produces bounded, attributable proposals—not hidden final transcripts or certification decisions.
5. **Reporters decide.** Machine-generated corrections, speaker assignments, structure, and formatting suggestions remain reviewable, acceptable, rejectable, and editable.
6. **Certified transcripts are immutable.** Certification creates a protected legal record; later change requires an explicit governed process.
7. **Every decision is auditable.** Material transformations and human decisions retain actor, time, reason, provenance, and before/after state.
8. **Every output is reproducible.** Given the same baseline, approved decisions, configuration, and implementation version, the system can reproduce its working and legal outputs.
9. **Standards are enforced.** Constitutional and architectural rules link to implementation boundaries, tests, CI, or an explicit manual review owner.
10. **Architecture serves implementation.** Governance reduces ambiguity and risk; it must not become a substitute for building and validating the product.

## Human authority

The court reporter is the final reviewing and certifying authority. DEPO-PRO may assist, detect, propose, organize, render, validate, and preserve evidence. It may not silently decide the certified record.

## Success metrics

| Metric | Desired outcome |
|---|---|
| Transcript quality | Measurable reduction in recognition and editorial defects without hidden content changes |
| Determinism | Deterministic stages produce identical outputs for identical inputs and versions |
| Auditability | Every material change and decision can be traced and explained |
| Reproducibility | Working, structured, rendered, and certified outputs can be reconstructed from governed inputs |
| Legal defensibility | The system preserves evidence, human authority, provenance, and certification integrity |
| Maintainability | Each domain has one owner, explicit boundaries, focused tests, and no unexplained duplicate pipeline |
| Usability | Reporters experience a coherent workflow rather than disconnected correction tools |

## Product boundaries

DEPO-PRO supports case intake, transcript creation, transcript review and correction, exhibits, UFM insertions, certification, and export. The official seven-stage workflow remains governed by the Master Architecture.

The project prioritizes reliability, accuracy, simplicity, and human review over opaque automation or architectural novelty.

## Governance boundary

This charter defines **why** DEPO-PRO exists and the principles against which architecture and implementation are evaluated. It does not replace subsystem architecture, domain standards, ADRs, operations, audits, or tests.

If this charter conflicts with the current Master Architecture before ratification/reconciliation, the Master Architecture governs under the existing repository rules.

## Amendment

As a T1 constitutional document, this charter requires formal Project Owner ratification. Amendments use semantic versioning and must identify their rationale, affected architecture, enforcement implications, effective date, and review date.
