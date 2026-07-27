# Depo-Pro Decision Matrix

**One question:** *For any proposed change, which document owns the decision — and what kind of review does it get?*

This routing table exists so the "where does this belong?" conversation happens **once, here**, instead of in every PR. It is the first page of the eventual Depo-Pro Governance Manual; it is deliberately not part of DTAS, because DTAS answers *what Depo-Pro is*, not *how the document system works*.

## The document hierarchy (frozen)

Each level is constrained by the ones above it. Each answers exactly one question.

| Level | Document | Answers | Changes at |
|---|---|---|---|
| 0 | **DTAS** — Depo-Pro Constitution | *What is a transcript? What is immutable? What are the Laws?* | Constitutional — rarely |
| 1 | **CTS** — Canonical Transcript Specification | *What objects exist, and what are their invariants?* | Slow |
| 2 | **DPS** — Depo-Pro Processing Standard | *What happens to a transcript — the transformations and their contract?* | Slow–moderate |
| 3 | **Engineering Standards** | *What engineering rules do we hold code to?* | Fast |
| 4 | **ADRs** — Architecture Decision Records | *What specific implementation decision did we make, and why?* | Append-only |
| 5 | **Implementation Specification** | *How is it built on this stack (schema, interfaces, persistence)?* | Fast |
| 6 | **Migration Roadmap** | *In what order do we get there?* | Continuous |
| 7 | **Release / Governance Manual** | *How does engineering work here — and how do we ship?* | As needed |

> **Naming note (unresolved):** Level 2 is written here as **DPS (Processing Standard)**. An earlier discussion named a **DTS (Transformation Standard)** — the spec that defines what a *Transformation* is (input, output, owner, reason, reversibility, provenance, diff). These need reconciling before either is authored: is DTS the same document as DPS, or is the Transformation object contract a *section within* DPS? Flagged for the architect to decide.

## Where a change belongs

| If the change… | It belongs in | Review type |
|---|---|---|
| Changes what a transcript *is*, or a Law | **DTAS** (amendment) | Constitutional |
| Adds / removes / redefines a transcript object or invariant | **CTS** | Constitutional |
| Changes processing behavior or a transformation's contract | **DPS** | Architectural |
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
