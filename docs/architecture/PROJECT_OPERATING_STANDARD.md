# Project Operating Standard

**Status:** Governing index for DEPO-PRO engineering work.

This document does not replace the standards below. It defines their order of authority when guidance overlaps and keeps implementation as the default focus.

## Order of Authority

1. [Repository Stabilization Standard](../audits/2026-07-20-git-governance/REPOSITORY_STABILIZATION_STANDARD.md) — repository preservation, commit discipline, checkpoints, and release readiness.
2. [Wave 0 Engineering Operations Standard](W0_ENGINEERING_OPERATIONS_STANDARD.md) — engineering workflow and operating vocabulary.
3. [Architecture Decision Record](DECISION_RECORD.md) — decisions and their recorded rationale.
4. [Current Implementation Map](CURRENT_IMPLEMENTATION_MAP.md) — active implementation ownership and wiring.
5. [Single Owner Audit](SINGLE_OWNER_AUDIT.md) — single-owner boundaries for the transcript pipeline.
6. [Recommended Next Implementation](RECOMMENDED_NEXT_IMPLEMENTATION.md) — the approved implementation sequence.
7. Prompt-library and sprint documents — execution detail only; they may not override higher-order standards.

If two documents conflict, use the highest applicable authority. Record a material unresolved conflict as an additive decision record rather than silently changing a standard.

## Frozen Baseline

After repository stabilization is complete, the following are frozen by default:

- Repository Stabilization Standard
- Wave 0 Engineering Operations Standard
- Single Owner Audit
- Architecture Decision Record
- Recommended Next Implementation

Amend these only when implementation reveals a genuine architectural gap that cannot be resolved within their existing rules. Prefer a dated additive decision record or amendment; do not wholesale rewrite historical standards.

## Implementation Default

Governance work is complete enough to support delivery. Spend the substantial majority of effort on implementation, verification, and release readiness.

After stabilization, resume the roadmap at **Wave 23D — Examination State Machine**, followed by dialogue production and the remaining production stages. Do not create a new governance document unless the implementation uncovers a genuine architectural gap.
