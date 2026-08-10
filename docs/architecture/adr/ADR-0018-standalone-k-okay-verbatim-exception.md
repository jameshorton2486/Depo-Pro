---
authority_tier: T4
status: DRAFT
owner: Rendering
scope: verbatim-standalone-k-okay-exception
supersedes: null
superseded_by: null
approved_by: null
version: 0.2.0
effective_date: null
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: REVIEW
implementation_status: IMPLEMENTED
---

# ADR-0018 — Standalone "K." / "k." → "Okay." bounded verbatim exception

**Status:** DRAFT — PENDING RATIFICATION (implemented; see Open questions).
**Date:** 2026-08-10
**Direction approved by:** James (Owner / architecture authority), in review of the Phase G correction work.
**Pending for ratification:** Miah (CSR / format authority) confirmation; and resolution of the correction-vs-rendering classification below.
**Amends (proposed):** the verbatim floor established by **A9** ("Deepgram is the immutable baseline — verbatim … preserved exactly in every output path") in [RATIFIED_DECISIONS.md](../RATIFIED_DECISIONS.md), read together with **A8** ("rendering reads; rendering never writes; a formatting pass is not a correction").
**Related:** A1 (corrections are recorded), A5 (AI corrections apply with recording + visible marking), A10 (deterministic rendering; versioned data), ADR-0011 / ADR-0013 (same class of ratified deterministic transcript rules).

> **Governance correction.** The CFE code comments cited an "A11 / ADR-0017 verbatim floor." **Neither exists** — `RATIFIED_DECISIONS.md` defines architecture decisions A1–A10 only, and there is no `ADR-0017` file. The actual governing authority is **A9** (+ A8). Those stale `A11 / ADR-0017` code comments are tracked for a separate cleanup commit; this ADR does not build a supersession chain on the nonexistent authority.

---

## Context

A court reporter's product rule: a witness who verbally clips **"Okay"** to a sound the recognizer transcribes as a bare **"K."** (or **"k."**) should have that standalone response canonicalized to **"Okay."** This is a recognized ASR artifact, not a discretionary edit.

The prior implementation (removed in `58860d6`, then restored broader-than-authorized in `845e2bd`) treated `K.` too broadly. Two boundaries were tried and rejected:

- **Blanket regex** (`qaFixer`): corrupted `Exhibit K.`, `John K. Smith`, `Mr. K. Smith`.
- **Utterance-initial position** (`845e2bd`): still corrupted a sentence-initial name initial — `K. Smith testified.` → `Okay. Smith testified.`

The approved rule is the **narrowest reliable** one: convert only when the *entire* spoken utterance is solely `K.`/`k.`.

## Decision (proposed)

Convert `K.` / `k.` → `Okay.` deterministically **only when the token is the sole token of its utterance/segment**, applied on every render including the verbatim first render. Owned by the canonical correction authority — the correction registry (rule + metadata) and CFE (application) — **not** `qaFixer` (a retirement candidate).

- **Rule data:** `src/lib/transcript/correctionRegistry.ts` — the `"K."` and `"k."` entries carry `requiresPrecedingPattern: /^$/` **and** `requiresFollowingPattern: /^$/` (no word before or after) plus `verbatimException: true`.
- **Application:** `src/lib/format/cfe.ts` — `applyDeterministicTokenCorrection` runs on every render; outside the corrected render it applies **only** `verbatimException` rules. All other registry corrections stay gated out of verbatim by A9/A8.

### Boundary (whole-utterance only)

| Input (utterance) | Result | Why |
|---|---|---|
| `K.` / `k.` (whole utterance) | `Okay.` | sole token of its segment |
| `K. And then I left.` | unchanged | not sole-token → deferred to correction pipeline |
| `K. Smith testified.` | unchanged | not sole-token (name initial) |
| `Exhibit K.`, `Section K.` | unchanged | preceding token present |
| `John K. Smith`, `Mr. K. Smith` | unchanged | preceding token present |
| bare `K` (no period) | unchanged | rule scoped to the `K.`/`k.` token |
| `Okay.` | unchanged | idempotent |

- **Raw evidence untouched.** Normalization applies only to display/render text; `word.raw_text` (Deepgram evidence) and the stored document are unchanged. Presentation layer only.
- **No residual name-corruption edge.** Unlike the utterance-initial variant, the whole-utterance rule cannot convert `K. Smith testified.` — deliberately deferring every ambiguous longer utterance to the AI/human correction pipeline.

## Governance — open questions for ratification

This ADR is **DRAFT** because the direction is owner-approved but two governance points must close first:

1. **Correction vs. rendering classification.** A9/A8 hold that the render pass preserves the baseline and "a formatting pass is not a correction," while A1/A5 require *corrections* to be recorded (original/new text, engine, version) and visibly marked. A deterministic `K.`→`Okay.` render substitution sits on that line. Either (a) it is a **deterministic rendering normalization** (A10-class, versioned data, no per-change record), or (b) it is a **correction** that A1/A5 require to be recorded and marked. This must be decided; the current implementation treats it as (a).
2. **Format authority.** `K.`→`Okay.` is a transcription/format convention. Per the governance model (format authority = Miah), and the F6 precedent (owner may amend a format rule with the CSR informed), this needs Miah's confirmation before it is treated as ratified format policy.

Until both close, the code ships (owner-approved direction, not deployed) but the ADR remains DRAFT and the decision is not cited as ratified.

## Consequences

- Whole-utterance `K.`/`k.` normalizes to `Okay.` across Workspace and export; every other use of the letter `K` is preserved verbatim.
- **The exception is named and bounded**, so a future cleanup agent must not remove it for "verbatim" reasons without amending this ADR — the near-removal in `58860d6` is exactly the failure mode this record prevents.
- The `verbatimException` field is a governed, discoverable mechanism requiring a numbered ADR plus a positional/context bound; it must not become a backdoor for general lexical correction.

## Alternatives considered

- **Utterance-initial position (`845e2bd`).** Rejected: converts sentence-initial name initials (`K. Smith testified.`).
- **Blanket rule.** Rejected: corrupts exhibit letters and name initials.
- **AI/human pipeline only.** Retained *for the ambiguous longer cases*; the sole-token utterance is reliable enough for deterministic handling and the owner requires it in the verbatim render.

## Implementation (completed; not deployed)

- `correctionRegistry.ts`: `"K."`/`"k."` rules bounded with `requiresPrecedingPattern` + `requiresFollowingPattern` `/^$/` and `verbatimException: true`; `verbatimException` field documented.
- `cfe.ts`: `applyDeterministicTokenCorrection` honors `verbatimException`, runs on every render; comment cites A8/A9 (not the phantom authority).
- `cfe.verbatim.test.ts`: verbatim guard permits the bounded exception; regression suite covers whole-utterance conversion, lowercase `k.`, and the preserved cases (longer utterances, `K. Smith testified.`, `Exhibit K.`, `Section K.`, name initials, bare `K`, idempotency, raw_text).
- Verification: `tsc` clean; `vitest` full suite green; changed-file lint clean; `vite build` ok; `docs:check` green.
