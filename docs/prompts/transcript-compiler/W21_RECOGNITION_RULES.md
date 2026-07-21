# W21 — Recognition Rules

| Field | Value |
|-------|-------|
| **Owner** | Wave 21 |
| **Purpose** | Recognition |
| **Inputs** | Source audio / raw ASR output |
| **Outputs** | Canonical Transcript |
| **Consumers** | Wave 22 |

**Layer:** Wave 21 Recognition Quality
**Authority:** `docs/architecture/W21_RECOGNITION_QUALITY_STANDARD.md`
**Pipeline:** Audio → **W21** → Canonical Transcript

## Purpose

Correct ASR output **without interpreting legal meaning.**

**Question answered:** *"What did the speaker actually say?"*

## Owns

- STT cleanup
- Boundary cleanup
- Speaker-boundary cleanup
- Word ordering
- Proper-noun / name recognition **(metadata-backed only)**
- Confidence normalization

---

## R21.1 — Single-word STT injections

A stray one-word utterance split out of an adjacent turn.

```
THE VIDEOGRAPHER:
can
```

**Disposition.** Deterministic — move `can` into the adjacent utterance. Never
promote it to its own speaker turn (that would pre-empt a Wave 22 decision).

## R21.2 — Three-word STT injections

Interleaved fragments manufactured by diarization noise.

```
THE REPORTER:
And
THE VIDEOGRAPHER:
can
THE WITNESS:
...
```

**Disposition.** Deterministic — merge the fragments back into the proper
utterance.

## R21.3 — Trailing fragments

An utterance carries a fragment that belongs to the next turn.

```
A.
Yes.
Okay. And as a physician...
Q.
```

**Disposition.** Deterministic — split at the correct utterance boundary. This
is boundary repair; speaker/role is resolved later by Wave 22.

## R21.4 — Proper-noun / name recognition (metadata-backed)

The recognizer misheard a name that the case metadata already knows.

```
Rico Laura   →   Rocio Laura
```

**Disposition.**
- **Deterministic** only when the corrected form is present in the Participant
  Directory or the auto-seeded keyterm set (witnesses, attorneys, case number,
  reporter name).
- Otherwise → **flag to W26.** Never invent a spelling.

> **Boundary — do not confuse with W24.** Generic homophones and mishearings
> that are *not* recoverable from this case's metadata (`standing steam` →
> `Standing Seam`, `curriculum of IT` → `curriculum vitae`, `accent` →
> `accident`) are **Wave 24** deterministic corrections, not recognition. The
> test: *is the correct form in this case's metadata?* If no, it is not W21.

---

## Does NOT own

`Q.` · `A.` · proceedings · speaker ownership · objections · geometry ·
metadata-independent word corrections (→ W24).
