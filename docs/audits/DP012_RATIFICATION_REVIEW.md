# DP-012 Ratification Review

Date: 2026-06-23  
Scope: owner-decision preparation for `DP-012` only  
Mode: documentation only

## Purpose

This report is not a new standards audit.

Its purpose is to identify which portions of [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md) should become binding, which should remain deferred, and which require textual correction before ratification can be treated as clean.

## Executive Outcome

Recommended disposition:

- `APPROVE`: §2, §2b, §4, §6, §7, §9
- `REJECT`: current §1 text as written
- `REJECT`: current §5 text as written

Governance note:

- `DP-012` already contains direct-address capitalization text, so the authority vehicle can remain `DP-012`.
- The current text in §5 is substantively opposite to the owner decision now favored.
- Ratification can approve the topic under `DP-012`, but the document itself will need a follow-up standards edit before the written authority and owner decision fully align.

## Deterministic Boundary

For implementation planning, the rules in `DP-012` separate into three classes:

### Class A — Automatic Deterministic Formatting

These may be applied automatically by the Canonical Formatting Engine:

- punctuation placement
- spacing adjacent to punctuation/dashes
- number/date normalization where governed by fixed court-reporting rules
- direct-address title capitalization, if ratified under `DP-012`
- paragraph/tab formatting
- resumption by-line formatting

### Class B — Automatic Flagging

These may be emitted automatically, but not silently corrected:

- inline garble flags
- confidence-gated punctuation uncertainty flags where the engine cannot safely determine the rule outcome

### Class C — Human Review Required

These should remain outside automatic formatting authority:

- speaker reassignment
- name correction without exact authority match
- garble replacement
- uncertain content reconstruction
- speculative Q/A or objection restructuring

## Section Review

| Section | Current DP-012 Position | Recommendation | Why |
|---|---|---|---|
| §1 Quote before interrupting dash | Adopts closing quote before dash | `REJECT AS WRITTEN` | Owner direction favors the opposite punctuation outcome: no comma before dash, and the dash outside the quote when the speaker interrupts after quoted material. Current §1 does not match the chosen rule. |
| §2 Question mark outside quote when sentence is the question | Adopt | `APPROVE` | Deterministic punctuation rule with clear Morson basis and direct CFE applicability. |
| §2b No comma introducing or ending dashed material | Adopt | `APPROVE` | Deterministic punctuation cleanup. Safe formatting, not content rewriting. |
| §3 Two spaces after sentence-ending closing quote | Cross-reference to `DP-010` | `NO NEW RATIFICATION NEEDED` | Already governed by active spacing authority. |
| §4 Date ordinals / number-date normalization gate | Gated and pending | `APPROVE`, but ratify as automatic deterministic formatting | Owner direction treats `August 17th -> August 17`, ages-as-figures, and similar governed transformations as formatting rather than AI correction. This is a material change from the current gated wording. |
| §5 Direct-address title capitalization | Reject capitalization; defer to broken `DP-011` reference | `REJECT AS WRITTEN`, replace with approved capitalization rule under `DP-012` | The topic is housed in `DP-012`, but the current text conflicts with the new owner decision and cites an invalid authority path. |
| §6 Inline garble flags | Adopt | `APPROVE` | Matches the required flag-before-correcting boundary. Enables deterministic flagging without content guessing. |
| §7 Three-tab paragraph rule | Adopt | `APPROVE` | Deterministic geometry/paragraph rule with direct CFE impact. Safe formatting authority. |
| §9 Resumption by-line format | Ratified | `APPROVE` | Deterministic formatting rule. Safe to implement automatically if Phase 1 scope includes it. |

## Direct-Address Capitalization Check

Answer to the governance question:

- `DP-012` does already contain direct-address capitalization language.
- It does not contain the desired approved rule.
- Instead, it currently says capitalization should be rejected and incorrectly defers to `DP-011`.

Disposition:

- `APPROVED RULE, HOUSED IN DP-012, TEXTUAL CORRECTION REQUIRED`

That is cleaner than creating a new DP number now, because the topic is already present in the document under review. The follow-up standards edit should rewrite §5 so the repository text matches the owner ratification.

## Ratification Set Recommended For Owner Approval

Recommended approved set under `DP-012`:

- §2 Question mark placement
- §2b No comma against an interrupting dash
- §4 Number/date normalization as deterministic formatting
- §6 Inline garble flags
- §7 Three-tab paragraph rule
- §9 Resumption by-line formatting
- direct-address title capitalization, housed in §5 after textual correction

Recommended rejected current text:

- current §1 wording
- current §5 wording

## CFE-Safe Interpretation

If the above recommendations are adopted, the Canonical Formatting Engine may:

- normalize punctuation and spacing
- normalize governed number/date/title forms
- apply paragraph/tab geometry
- emit inline scopist flags

The Canonical Formatting Engine may not:

- guess at uncertain words
- rewrite names without authority
- infer speaker identity
- replace garbles automatically

## Required Follow-Up After Owner Signoff

This report does not make those changes. It only identifies them.

After owner signoff, the next documentation pass should:

1. update `DP-012` so its text matches the ratified decisions
2. remove the broken `DP-011` capitalization deferral from `DP-012`
3. update [CANONICAL_STANDARDS_INDEX.md](/C:/Users/james/projects/depo-pro/CANONICAL_STANDARDS_INDEX.md)
4. update [NUMBERING_REGISTRY.md](/C:/Users/james/projects/depo-pro/NUMBERING_REGISTRY.md)
5. freeze the standards set

## Bottom Line

`DP-012` is close to ratifiable, but not clean as written.

The two real issues are:

- §1 currently states the opposite punctuation rule from the chosen owner direction
- §5 currently states the opposite capitalization rule and points to a broken authority reference

Everything else needed for CFE Phase 1 is substantially in place once the owner decisions are formally locked and `DP-012` is brought into textual alignment with them.
