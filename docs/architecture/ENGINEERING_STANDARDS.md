# Depo-Pro Engineering Standards

Engineering Standards are the third governance register, below the DTAS **Laws** (§7) and **Architectural Principles** (§7A). They are **engineering guidance, not architecture**: they shape how code is written *inside* the boundaries the Laws and Principles already set.

A Standard is **measurable, reviewable, and enforced** in Engineering Review — a rule, not a good idea. But it carries no constitutional weight: a Standard may be added, revised, or retired **without** an ADR or a DTAS version increment. A Standard may never contradict a Principle or a Law; if it appears to, the Standard is what is wrong. A Standard that turns out to encode an architectural boundary should be **promoted** to a Principle (with an ADR); a Principle that turns out to be mere convention should be **demoted** here.

## Current standards

- **Session-only UI state until persistence is justified.** Presentation toggles and view preferences default to in-memory React state; persistence is added only when the requirement is real and the storage location is a decided question. (Case and transcript *content* is never client-persisted — see `AGENTS.md`.)

- **Per-request credential retrieval, not captured tokens.** Auth tokens are read at the point of use, not once at mount, so refresh is transparent and stale tokens never propagate. (Grounds ADR-0007.)

- **Deterministic, pure functions for derived data.** Anything computed from canonical facts — render content, baseline rows, formatting — is a pure function of its inputs: regenerable and disposable (Laws 5 and 10), never a store of truth.

- **Explicit, exhaustive handling of discriminated unions.** Modes and states are modeled as unions with every case handled explicitly, so introducing a new variant is a compile-time obligation rather than a silent gap.
