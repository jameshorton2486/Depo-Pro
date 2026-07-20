# Project Operating Standard

**Status:** Governing index for DEPO-PRO engineering work.

This document does not replace any higher authority. It defines the order in which the standards available on this branch govern work and keeps implementation as the default focus.

## Order of Authority

1. [AGENTS.md](../../AGENTS.md) — locked project rules. It requires `docs/architecture/MASTER_ARCHITECTURE.md` to govern any conflict.
2. **Master Architecture** — `docs/architecture/MASTER_ARCHITECTURE.md` is the highest architectural authority whenever it is present, as required by `AGENTS.md`. This index does not supersede it.
3. [Architecture Decisions](../../ARCHITECTURE_DECISIONS.md) — accepted architectural decisions and their rationale.
4. [Repository Stabilization Standard](../audits/2026-07-20-git-governance/REPOSITORY_STABILIZATION_STANDARD.md) — Git preservation, commit discipline, checkpoints, and release readiness. It governs repository process only and cannot override architecture.
5. Prompt-library and sprint documents present on the active branch — execution detail only; they may not override higher-order standards.

If two documents conflict, use the highest applicable authority. Record a material unresolved conflict as an additive decision record rather than silently changing a standard. Documents not present on the active branch are not linked or treated as active authority.

## Frozen Baseline

After repository stabilization is complete, the Repository Stabilization Standard and this operating index are frozen by default. Amend them only when implementation reveals a genuine gap that cannot be resolved within their existing rules. Prefer a dated additive decision record or amendment; do not wholesale rewrite historical standards.

## Implementation Default

Governance work is complete enough to support delivery. Spend the substantial majority of effort on implementation, verification, and release readiness.

After stabilization, resume the next approved implementation item consistent with the Master Architecture and the active roadmap. Wave 23D — Examination State Machine is the intended next transcript-pipeline milestone only after that consistency check. Do not create a new governance document unless implementation uncovers a genuine architectural gap.
