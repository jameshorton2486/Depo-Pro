# Depo-Pro Practices

Practices are recommended engineering patterns — the third and lightest governance register, below the DTAS **Laws** (§7) and **Architectural Principles** (§7A). They are **engineering guidance, not architecture**: they shape how code is written *inside* the boundaries the Laws and Principles already set.

This is a deliberately fast-moving document. A Practice may be added, revised, or retired **without** an ADR or a DTAS version increment. A Practice may never contradict a Principle or a Law; if it appears to, the Practice is what is wrong. A Practice that turns out to encode an architectural boundary should be **promoted** to a Principle (with an ADR); a Principle that turns out to be mere style should be **demoted** here.

## Current practices

- **Prefer session-only UI state until persistence is justified.** Presentation toggles and view preferences default to in-memory React state; promote to persistence only when the requirement is real and the storage location is a decided question. (Case and transcript *content* is never client-persisted — see `AGENTS.md`.)

- **Prefer per-request credential retrieval over captured tokens.** Read auth tokens at the point of use, not once at mount, so refresh is transparent and stale tokens never propagate. (Grounds ADR-0007.)

- **Prefer deterministic, pure functions for derived data.** Anything computed from canonical facts — render content, baseline rows, formatting — is a pure function of its inputs: regenerable and disposable (Laws 5 and 10), never a store of truth.

- **Prefer explicit, exhaustive handling of discriminated unions.** Model modes and states as unions and handle every case explicitly, so introducing a new variant becomes a compile-time obligation rather than a silent gap.
