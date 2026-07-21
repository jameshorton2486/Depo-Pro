# W25 — Canonical Punctuation

| Field | Value |
|-------|-------|
| **Owner** | Wave 25 |
| **Purpose** | Canonical Punctuation |
| **Inputs** | Corrected Transcript (from Wave 24) |
| **Outputs** | Punctuated Transcript |
| **Consumers** | Wave 26 |

**Layer:** Wave 25 Canonical Punctuation
**Authority:** `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md`,
`DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`,
`abbreviation_registry.json` (single source for abbreviation spacing)
**Pipeline:** (after W24) → **W25** → (feeds W26)

## Purpose

Apply canonical reporter punctuation and spacing. This layer does not change
words (W24) or attribution (W22) — only punctuation, dashes, ellipses, and
spacing, per the ratified standards.

**Question answered:** *"Is the punctuation and spacing canonical?"*

## Owns

- Em dashes (quote-before-dash; no comma against a dash — DP-012)
- Ellipses
- Sentence-boundary vs abbreviation spacing (two spaces vs one — DP-010,
  generated from `abbreviation_registry.json`, never a hand-list)
- Reporter punctuation conventions
- Morson's rules
- Texas rules (jurisdiction-specific punctuation)

**Disposition.** Deterministic against the cited standards. Garble/ambiguity is
flagged via the DP-012 inline garble-flag convention, not silently rewritten.

## Does NOT own

Word/phrase corrections (→ W24) · geometry/tab spacing *position* (→ TP-5; W25
owns the *number of spaces* as a punctuation rule, TP-5 owns tab placement) ·
ambiguous interpretation (→ W26).
