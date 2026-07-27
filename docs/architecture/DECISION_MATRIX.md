# Depo-Pro Decision Matrix

**One question:** *For any proposed change, which document owns the decision — and what kind of review does it get?*

This routing table exists so the "where does this belong?" conversation happens **once, here**, instead of in every PR. It is the first page of the eventual Depo-Pro Governance Manual; it is deliberately not part of DTAS, because DTAS answers *what Depo-Pro is*, not *how the document system works*.

## The DPAS Specification Set

These documents are not independent essays. Together they are one coordinated artifact — the **Depo-Pro Architecture Specification (DPAS)** — describing the system from different viewpoints. Members: DTAS, CTS, DPS, DTS, Engineering Standards, ADRs, and this Decision Matrix.

**Specification inheritance chain:**

```
DTAS  →  CTS  →  DPS  →  DTS  →  Implementation
```

The four spec viewpoints are orthogonal — each answers a different question, and none subsumes another:

- **DTAS — *why*** the architecture exists (the Laws).
- **CTS — *what*** exists (the objects and their invariants).
- **DPS — *where*** transformations happen (the pipeline: stages, boundaries, ownership, ordering, determinism, replay, failure).
- **DTS — *what a transformation is*** (the language every stage speaks: transformation object, classes, patch algebra, lineage, identity propagation, reversibility, provenance, diff generation).

**Why DPS and DTS are both kept, not merged.** They are proven distinct by the replaceability test: replace the recognition vendor and only Stage 0's *implementation* changes — DPS/DTS/CTS/DTAS all hold. Replace the AI and the *stage* (Semantic Interpretation) still exists in DPS; only the transformations it emits (DTS instances) change. When a substitution touches exactly one layer, the boundaries are correct. Collapsing "where processing happens" and "what a transformation is" into one document would couple two things that change for different reasons.

**One-fact-one-place at the document level (Law 4, applied to the specs).** DPS references DTS invariants rather than restating them: DPS's replay and determinism guarantees are a *consequence* of DTS reversibility and determinism, so DPS cites them, never redefines them. The same fact lives in exactly one specification.

## The document hierarchy (frozen)

Each level is constrained by the ones above it. Each answers exactly one question.

| Level | Document | Answers (one question) | State |
|---|---|---|---|
| 0 | **DTAS** — Constitution / Architecture Standard | *Why does the architecture exist? What are the Laws?* | Ratifying (PR #33 + #36) |
| 1 | **CTS** — Canonical Transcript Specification | *What objects exist, and what are their invariants?* | Planned |
| 2 | **DPS** — Processing Standard | *How does a transcript move through the system? (stages, boundaries, ordering, determinism, replay, failure)* | Planned |
| 3 | **DTS** — Transformation Standard | *What is a transformation? (object, classes, patch algebra, lineage, reversibility, provenance, diff)* | Planned |
| 4 | **Engineering Standards** | *What engineering rules do we hold code to?* | Living |
| 5 | **ADRs** — Architecture Decision Records | *What specific implementation decision, and why?* | Append-only |
| 6 | **Implementation Specification** | *How is it built on this stack (schema, interfaces, persistence)?* | Active |
| 7 | **Migration Roadmap** | *In what order do we get there?* | Continuous |
| 8 | **Release / Governance Manual** | *How does engineering work here — and how do we ship?* | Future |

**Ratification order — hold below Level 0 until DTAS is constitutional:** ratify DTAS (merge PR #33 + #36) → write CTS → review and lock objects → write DPS → write DTS → only then expand implementation. Everything below Level 0 inherits from it; a late DTAS change is exponentially expensive, so nothing beneath it is authored until it is ratified.

## Where a change belongs

| If the change… | It belongs in | Review type |
|---|---|---|
| Changes what a transcript *is*, or a Law | **DTAS** (amendment) | Constitutional |
| Adds / removes / redefines a transcript object or invariant | **CTS** | Constitutional |
| Changes how a transcript moves through the system (stages, ordering, stage contracts) | **DPS** | Architectural |
| Changes what a transformation *is* (object, patch algebra, lineage, reversibility, provenance) | **DTS** | Architectural |
| Records a specific implementation decision / trade-off | **ADR** | Architectural |
| Changes an engineering convention (state scope, idioms, error handling) | **Engineering Standards** | Engineering |
| Changes storage, schema, interfaces, or indexes | **Implementation Specification** | Engineering |
| Changes sequencing, phasing, or rollout | **Migration Roadmap** | Operational |
| Changes release, deploy, or operational governance | **Release / Governance Manual** | Operational |

## Review types

Different layers demand different reviewers and different criteria:

- **Constitutional Review** — DTAS, CTS. Does it preserve the architecture's invariants? Highest bar; amendments are argued and versioned.
- **Architectural Review** — DPS, ADRs. Does it conform to the Laws and Principles? Does it avoid competing representations and parallel paths?
- **Engineering Review** — Engineering Standards, Implementation Specification. Does it meet the standards, tests, and quality gates?
- **Operational Review** — Migration Roadmap, Release. Is the sequencing safe, reversible, and observable?

## The binding chain

```
Law  →  Principle  →  Engineering Standard  →  ADR  →  Implementation
```

- A **Principle** may never contradict a **Law**.
- An **Engineering Standard** may never contradict a **Principle** or a **Law**.
- An **implementation** may never contradict an **accepted ADR**.

Each layer is constrained by the one above it. That is what keeps architecture leading implementation rather than trailing it.
