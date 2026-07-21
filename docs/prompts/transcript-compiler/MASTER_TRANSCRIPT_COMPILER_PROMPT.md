# Master Transcript Compiler Prompt

**Version 2.0 (Architecture Aligned)**

> This prompt does not contain rules. It **orchestrates** the compiler passes.
> Each pass is defined in its own module and cites its own ratified authority.
> To change a rule, edit the owning module — never this file.

---

## Compiler pipeline

```
Audio
  ↓
Wave 21 — Recognition            [W21_RECOGNITION_RULES.md]
  ↓
Canonical Transcript
  ↓
Wave 22 — Semantics              [W22_SEMANTIC_RULES.md]
  ↓
Structured Transcript Contract
  ↓
Wave 23 — Deposition Production  [W23_PRODUCTION_RULES.md]
  ↓
Produced Transcript
  ↓
TP-5 — Geometry                  [TP5_GEOMETRY_RULES.md]
  ↓
Rendered Transcript
  ↓
Wave 24 — Deterministic Corrections   [W24_DETERMINISTIC_CORRECTIONS.md]
  ↓
Wave 25 — Canonical Punctuation       [W25_CANONICAL_PUNCTUATION.md]
  ↓
Wave 26 — AI Context Review           [W26_AI_CONTEXT_RULES.md]
  ↓
Professional Draft Transcript
```

## Pass contract

Each pass consumes the previous pass's output and:

1. Operates **only** within its layer's ownership (see each module's "Owns" and
   "Does NOT own").
2. Prefers to move work **upstream** (reducing downstream repair burden / RCI)
   rather than patching symptoms downstream.
3. Mutates the record only when its rule is deterministic; otherwise it flags to
   Wave 26.

## Engineering rule (permanent)

**Every rule has exactly one architectural owner.** If a rule surfaces in two
modules, apply the ownership test and **move it — do not duplicate it.** The
resolved boundaries and full Rule Ownership Matrix live in
[`README.md`](README.md).

## Determinism ladder

- **Deterministic layers:** W21 (metadata-backed), W23, TP-5, W24, W25.
- **Semantic resolution:** W22 (deterministic when directory resolution is
  unambiguous, else flag).
- **Non-deterministic, suggestion-only:** W26. Money and any legally significant
  ambiguity terminate here as Needs Verification — never auto-applied.

## Supersession

This library supersedes the monolithic
`PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`, which is retained as a historical
document only.
