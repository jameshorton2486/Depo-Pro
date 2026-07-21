# W24 — Deterministic Corrections

| Field | Value |
|-------|-------|
| **Owner** | Wave 24 |
| **Purpose** | Deterministic Corrections |
| **Inputs** | Rendered Transcript |
| **Outputs** | Corrected Transcript |
| **Consumers** | Wave 25 |

**Layer:** Wave 24 Deterministic Corrections
**Pipeline:** Rendered Transcript → **W24** → (feeds W25)

## Purpose

Apply **metadata-independent, unambiguous** string substitutions from a
canonical correction registry. Everything here is deterministic by definition —
if a correction is not certain, it does not belong in this layer.

**Question answered:** *"Which known-wrong strings map to a single known-right
string, regardless of this case?"*

## Owns

General-purpose homophone and habitual-mishearing corrections that are **not**
recoverable from case metadata (those are Wave 21).

```
accent            →   accident
standing steam    →   Standing Seam
curriculum of IT  →   curriculum vitae
lamest terms      →   layman's terms
```

**Disposition.** Deterministic substitution from the registry.

---

## Explicitly NOT deterministic

Legally significant or ambiguous transformations never live here. The canonical
example:

```
Money:  $7.50  →  $750     ❌ NOT deterministic
```

Money is legally significant. It routes to **W26 as Needs Verification (high
confidence)** — flagged, never auto-applied.

---

## Boundary — W24 vs W21

The governing test: *is the correct form derivable from this case's metadata
(Participant Directory, auto-seeded keyterms)?*

- **Yes** → it is **W21** recognition (e.g. a witness/attorney name in the
  directory).
- **No** → it is **W24** (a general dictionary substitution).

A rule may not appear in both. If it does, apply the test and move it.

## Does NOT own

Recognition (→ W21) · punctuation/spacing (→ W25) · ambiguous or legally
significant changes (→ W26).
