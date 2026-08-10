---
authority_tier: T4
status: ACTIVE
owner: Rendering
scope: verbatim-standalone-k-okay-exception
supersedes: null
superseded_by: null
approved_by: James
version: 1.0.0
effective_date: 2026-08-10
ratified_date: 2026-08-10
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: RATIFIED
implementation_status: IMPLEMENTED
---

# ADR-0018 — Standalone "K." → "Okay." bounded verbatim exception

**Status:** Ratified
**Date:** 2026-08-10
**Deciders:** James (owner, architecture + product).
**Amends:** The verbatim floor (RATIFIED_DECISIONS **A9**, "Deepgram is the immutable baseline … preserved exactly in every output path"; cited in code as the "A11 / ADR-0017 verbatim floor"). Adds exactly one narrowly-bounded exception; the floor otherwise stands in full.
**Supersedes (behaviorally):** the approach in commit `58860d6`, which removed the `K.` → `Okay.` normalization entirely. This ADR restores it as a *bounded* rule rather than the previous unbounded one.
**Related:** ADR-0011 (stutter double-hyphen), ADR-0013 (recess parenthetical) — same class of ratified deterministic transcript rules; the CFE C1/C1b verbatim guard (`src/lib/format/cfe.verbatim.test.ts`).

---

## Context

A court reporter's product rule: a witness who verbally clips **"Okay"** to a sound the recognizer transcribes as **"K."** should have that standalone token canonicalized to **"Okay."** This is a recognized ASR artifact, not a discretionary edit.

The prior implementation lived in `qaFixer` as a blanket regex (`/(^|\s)K\.(\s|$)/ → "Okay."`) applied to every paragraph. It was removed in `58860d6` because, unbounded, it corrupted legitimate uses of the letter **K**:

- `Exhibit K.` → `Exhibit Okay.` (a letter designation for a *thing*)
- `John K. Smith` / `Mr. K. Smith` → `… Okay. Smith` (a name *initial*)

The mistake was treating every `K.` as equivalent. The correct rule is narrower:

> A **standalone spoken utterance transcribed as `K.`** is a recognized deterministic transcription artifact and canonicalizes to `Okay.` It is an explicit, bounded exception to verbatim preservation. All other uses of the letter `K` — exhibit letters, name initials, identifiers — are preserved verbatim.

This distinction is the whole point: **formatting can be deterministic; facts (who spoke, what word was said) cannot be fabricated deterministically** — but a *recognized, bounded ASR artifact* with a reliable positional signal is a safe, ratified normalization.

## Decision

Introduce a single bounded correction, applied on **every** render (including the verbatim first render), owned by the **canonical deterministic correction authority** — the correction registry (rule + metadata) and CFE (application). It is explicitly **not** placed back into `qaFixer`, which remains a retirement candidate.

- **Rule data:** `src/lib/transcript/correctionRegistry.ts` — the `"K." → "Okay."` entry carries `requiresPrecedingPattern: /^$/` and `verbatimException: true`.
- **Application:** `src/lib/format/cfe.ts` — `applyDeterministicTokenCorrection` runs on every render; outside the corrected render it applies **only** `verbatimException` rules. All other registry corrections remain gated out of verbatim by the A9 floor.

### Boundary (narrowest reliable signal)

Convert `"K."` → `"Okay."` **only when the `K.` token is utterance-initial** (first token of its utterance/segment; `requiresPrecedingPattern: /^$/` matches the empty preceding token). This was chosen over "at any sentence boundary" because a preceding token ending in `.` is unreliable — abbreviations (`Mr.`, `Dr.`, `Exhibit No.`) end in a period, so `Mr. K. Smith` would wrongly convert.

Resulting behavior (verified by `cfe.verbatim.test.ts`, "ADR-0018" suite):

| Input (utterance) | Result | Why |
|---|---|---|
| `K.` (whole answer) | `Okay.` | utterance-initial standalone |
| `K. And then…` | `Okay. And then…` | utterance-initial |
| `Exhibit K.` | unchanged | `K.` not utterance-initial |
| `John K. Smith`, `Mr. K. Smith` | unchanged | `K.` not utterance-initial |
| mid-utterance `K.` | unchanged | not utterance-initial |
| bare `K` (no period) | unchanged | rule is scoped to the `K.` token |
| `Okay.` | unchanged | idempotent |

- **Raw evidence is untouched.** The normalization applies only to display/render text; `word.raw_text` (Deepgram evidence) and the stored document are unchanged. Only the Working Transcript/presentation layer receives it.
- **Idempotent.** `Okay.` never matches `K.`.

### Residual limitation (accepted)

A deterministic rule cannot distinguish a discourse-marker `K.` from a **sentence-initial single-letter name initial** — e.g. `"K. Smith testified."` opening an utterance would convert to `"Okay. Smith testified."` This is rare, and contextual cases like it are exactly what the controlled AI/human correction pipeline is for. The boundary deliberately errs toward the common, safe case and excludes every example raised in review.

## Consequences

- Standalone spoken `K.` is normalized to `Okay.` consistently across Workspace and certified export; the letter `K` in every other context is preserved verbatim.
- **This exception is now documented and named.** A future cleanup agent that sees `K.` → `Okay.` MUST NOT remove it for "verbatim" reasons without amending this ADR — the previous near-removal (`58860d6`) is exactly the failure mode this record prevents.
- The `verbatimException` field establishes a governed, discoverable mechanism for any future bounded exception: it requires a numbered ADR and a positional/context bound. It must not become a backdoor for general lexical correction.

## Alternatives considered

- **Keep it removed (58860d6).** Rejected: contradicts the court-reporting product rule that standalone `K.` is an ASR artifact for `Okay.`
- **Restore the unbounded blanket rule.** Rejected: corrupts `Exhibit K.`, `John K. Smith`, `Mr. K. Smith`, and other identifiers.
- **Bound by "after sentence-ending punctuation".** Rejected: abbreviations ending in `.` (`Mr.`, `Dr.`) trigger false positives.
- **Route through the AI/human correction layer only.** Rejected for this case: it is a reliable, bounded deterministic artifact, and the owner requires it in the verbatim render — not deferred to review.

## Implementation (completed under this ADR — new commit, no push, no deploy)

- `correctionRegistry.ts`: `verbatimException` field; `"K."` rule bounded with `requiresPrecedingPattern: /^$/` + `verbatimException: true`.
- `cfe.ts`: `applyDeterministicTokenCorrection` honors `verbatimException`; runs on every render.
- `cfe.verbatim.test.ts`: verbatim guard permits the exception; 9-case regression suite; mid-utterance `K.` assertions clarified.
- Verification: `tsc` clean; `vitest` 910/910; changed-file lint clean; `vite build` ok; `docs:check` green.
