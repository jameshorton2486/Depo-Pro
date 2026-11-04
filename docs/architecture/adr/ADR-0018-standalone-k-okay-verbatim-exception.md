---
authority_tier: T4
status: DRAFT
owner: Rendering
scope: verbatim-standalone-k-okay-exception
supersedes: null
superseded_by: null
approved_by: null
version: 0.4.0
effective_date: null
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: REVIEW
implementation_status: NOT_STARTED
---

# ADR-0018 — Standalone "K." / "k." → "Okay." correction (specified for the A5 layer)

**Status:** DRAFT — specified, UNIMPLEMENTED. Not applied in the deterministic path.
**Date:** 2026-08-10
**Direction approved by:** James (Owner), in review of the Phase G correction work.
**Pending for ratification:** Miah (CSR / format authority) confirmation; and A5 correction-engine implementation once it is un-gated for clean data.
**Governs / relates to:** **A11** ("No fabrication of the spoken record"), **A5** ("AI corrections apply automatically, with recording and visible marking"), **A9** (immutable baseline), **ADR-0017** (workspace first render; correction-engine scope §4b), and the **C1** verbatim guard (`cfe.verbatim.test.ts`).

> **Correction of an earlier error.** A prior revision of this ADR (commit `845e2bd`) was frontmatter-marked `ratification: RATIFIED, approved_by: James`. That status was **self-assigned by the agent in error** — James did not ratify it. Ratification has been the owner's alone throughout (A11 and ADR-0017 each waited for explicit authorization). The status is DRAFT and stays DRAFT until the owner ratifies. This note is retained deliberately.
>
> **Earlier governance mis-diagnosis, now resolved.** An audit on `feature/stage3-workspace-core` concluded the code's "A11 / ADR-0017" citations were fictional. They were not — A11 (`RATIFIED_DECISIONS.md`) and ADR-0017 were ratified on `docs/workspace-ufm-first-render` and had not been merged onto the code branch. They are now merged; the citations resolve.

---

## Context

Real deposition evidence confirms that an utterance-initial **"K." / "k."** is commonly the spoken discourse word **"Okay."** — not only as a one-word answer but before a full sentence:

- `K.` → `Okay.`
- `K. Time is 06:04PM. We're off the record.` → `Okay. Time is 06:04PM. We're off the record.`
- `K. So, go ahead.` → `Okay. So, go ahead.`
- `K. Anything else?` → `Okay. Anything else?`
- `K. Which in this in the last CT scan was no longer there?` → `Okay. Which …`

And literal uses of the letter **K** must be preserved:

- `John K. Smith`, `Mr. K. Smith`, `Exhibit K.`, `Section K.`, `Company K.` → unchanged.

## Decision

`K.` → `Okay.` is a **correction**, not typographic normalization: it replaces one word with a *different* word (the audio was "'kay"; Deepgram misheard it). Under **A11** and the **C1** verbatim guard, corrections must not run in the first-render / deterministic path — that path preserves the baseline, and nothing there records or marks a change. Under **A5**, corrections are applied by the correction engine, **recorded and visibly marked**, and reviewed by the reporter at certification.

Therefore:

1. **Remove `K.` → `Okay.` from the deterministic path entirely.** It is no longer a `DETERMINISTIC_TOKEN_CORRECTIONS` entry, and there is no verbatim exception. `cfe` leaves `K.` untouched in every render (pinned by `cfe.verbatim.test.ts`).
2. **Specify it as an A5 correction-engine rule (unimplemented).** When the correction engine is built, it applies this rule, records it (A1), and marks it for reporter review (A5).

This also dissolves the residual worry: `K. Smith testified.` is never silently corrupted, because the verbatim path stops touching `K.` at all, and any A5 proposal is marked and reviewable.

### Matcher specification (for the future A5 rule)

Normalize **utterance-initial** `K.` / `k.` → `Okay.` when it is the spoken discourse word "Okay." — **including when followed by more speech**. Do NOT restrict to a sole-token utterance: real deposition evidence shows the common case is `K.` opening a full sentence. Preserve literal K uses associated with a name, exhibit/section designation, or identifier.

**Acceptance set (must convert):**
- `K.` → `Okay.`
- `K. So, go ahead.` → `Okay. So, go ahead.`
- `K. Anything else?` → `Okay. Anything else?`
- `K. Time is 06:04PM. We're off the record.` → `Okay. Time is 06:04PM. We're off the record.`

**Exclusion set (must NOT convert):**
- `John K. Smith`, `Mr. K. Smith` — not utterance-initial; `K.` is a middle initial (a preceding token).
- `Exhibit K.`, `Section K.`, `Company K.` — not utterance-initial; `K.` is a designation (a preceding noun).
- Any `K.` preceded by an honorific or a capitalized given name.

**Discriminator + failure mode (stated plainly).** Utterance-initial position admits both the discourse "Okay." and a sentence-initial single-letter *name initial*. The available signal is **what follows**: a capitalized token that is not a sentence-start word reads as a surname (→ preserve); a lowercase word or discourse marker reads as the discourse "Okay." (→ convert). This is a **heuristic with a known failure mode** — `K. Smith testified.` is genuinely ambiguous and the rule may occasionally misfire (e.g. `K. Smith Industries told me`). That ambiguity is exactly why the rule lives in **A5**: a misfire is a *marked proposal the reporter reverts in one click* at read-through, not a silent verbatim mutation. Do NOT build a proper-name detection subsystem for this exception.

**Cleaner signal to evaluate against the data (before finalizing).** `K. Time is …` reads as a reporter/videographer **on-record time announcement**, not witness speech. Speakers already carry a role (THE REPORTER / THE VIDEOGRAPHER via `resolveSpeakerDisplayName`), so if these utterances are speaker-attributed to the reporter/videographer — a known utterance shape — that attribution may be a more reliable trigger than the capitalization heuristic. Verify against the clean benchmark fixture before ratifying the matcher.

## Consequences

- Verbatim / deterministic render never fabricates `Okay.` from `K.`; the C1 guard holds with `K.` untouched.
- The common `K. So …` / `K. Anything else?` correction is not lost — it moves to the layer that records and marks it.
- **Gating caveat:** the correction engine is still gated on clean data. Chunk-interleaving corruption is not misrecognition, and tuning correction rules against spliced turns teaches the wrong instinct. So today the answer is **"gated out, specified for later,"** not "shipped." This rule activates when the A5 engine is implemented for clean input.

## Alternatives considered (and rejected)

- **Verbatim/deterministic normalization (bounded or not).** Rejected: a word→different-word substitution in the verbatim floor is still a substitution the C1 guard/A11 forbid, whether the match is broad or narrow. Tightening the matcher does not change the layer it runs in.
- **Whole-utterance-only match.** Rejected by real evidence: `K. So, go ahead.` etc. are utterance-initial but not sole-token.
- **Utterance-initial deterministic match in the render path.** Correct *matcher*, wrong *layer* — it belongs in A5, recorded and marked.

## Implementation status

- **Done:** removed `K.`/`k.` from the deterministic path (`correctionRegistry.ts`, `cfe.ts`); C1 guard and reservation tests pin `K.` untouched in every render.
- **Not done (future):** the A5 correction-engine rule per the matcher spec, activated for clean input, recorded (A1) and marked (A5).
