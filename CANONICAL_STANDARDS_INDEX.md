# Canonical Standards Index

Date: 2026-06-23  
Status: frozen authority index for CFE Phase 1 implementation  
Purpose: single source of truth for standards status, authority order, and citation discipline

Nothing is a live standard unless it is registered here.

## Top-Level Governing Policy

### Canonical Editorial Policy

- File: [CANONICAL_EDITORIAL_POLICY.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/CANONICAL_EDITORIAL_POLICY.md)
- Status: `APPROVED`
- Role: top-level governing policy for all DP-### records and transcript-formatting decisions
- Precedence: every DP-### record inherits from this policy and must conform to it

## Active Standards

### DP-010 — Spacing

- File: [DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md)
- Status: `APPROVED`
- Authority scope: sentence spacing, abbreviation spacing, honorific spacing, closing-quote sentence spacing, speaker-label colon spacing
- Canonical data dependency: [abbreviation_registry.json](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/abbreviation_registry.json)

### DP-011 — Geometry

- File: [DP-011_CANONICAL_GEOMETRY_AUTHORITY.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md)
- Status: `APPROVED`
- Authority scope: page geometry, format box, margins, tab system, line spacing, return-to-margin continuation

### DP-012 — Punctuation / Formatting Normalization / Garble Flags / Paragraph Rules / Direct-Address Capitalization

- File: [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md)
- Status: `APPROVED`
- Authority scope: punctuation placement, deterministic formatting normalization, garble flag rendering, paragraph/tab refinements, resumption by-line format, direct-address capitalization

## Historical Standards

### DP-009 — Historical Spacing Record

- File: [DP-009_HONORIFIC_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md)
- Status: `HISTORICAL`
- Role: retained record of the original honorific/abbreviation spacing decision
- Replacement authority: `DP-010`

## Historical Architecture References

### DEPO_PRO_FORMATTER_SPEC.md

- File: [DEPO_PRO_FORMATTER_SPEC.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_SPEC.md)
- Status: `HISTORICAL`
- Role: pre-freeze formatter architecture proposal
- Limitation: not current implementation authority during beta

### DEPO_PRO_FORMATTER_RULE_ENGINE.md

- File: [DEPO_PRO_FORMATTER_RULE_ENGINE.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md)
- Status: `HISTORICAL`
- Role: pre-freeze/post-freeze rule-engine architecture proposal
- Limitation: not the geometry authority; geometry is explicitly superseded by `DP-011`

## Numbering Registry

See [NUMBERING_REGISTRY.md](/C:/Users/james/projects/depo-pro/NUMBERING_REGISTRY.md).

Namespace rules:

- `DP-###` is reserved for standards / decision records governing formatting or transcript behavior.
- `ADR-###` is reserved for architecture decisions.
- `WAVE-##` is reserved for implementation-wave or architecture-program records.
- Numbers are never reused.
- A document must be registered before it is cited as authority.

## Authority Hierarchy

### Level 1 — Canonical Editorial Policy

- `CANONICAL_EDITORIAL_POLICY.md`

This is the top-level governing policy. Every DP-### record inherits from it.

### Level 2 — Approved DP Standards

- `DP-010`
- `DP-011`
- `DP-012`

These are the live authorities for CFE Phase 1 implementation.

### Level 3 — Canonical Registry Data

- [abbreviation_registry.json](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/abbreviation_registry.json)

This is canonical data consumed under `DP-010`. It is not a peer decision record; it is controlled data under the approved spacing standard.

### Level 4 — Historical Architecture Documents

- `DEPO_PRO_FORMATTER_SPEC.md`
- `DEPO_PRO_FORMATTER_RULE_ENGINE.md`

These are retained for context only.

### Level 5 — Legacy Notes / Changelogs

- prompt indexes
- changelogs
- audit notes
- reconciliation memos

These may explain history, but they do not create authority.

## DP-011 Reference Resolution

The repository now resolves `DP-011` unambiguously as:

- `DP-011` = geometry authority only

There is no standalone registered in-repository DP decision for direct-address title capitalization outside `DP-012`.

Implications:

- any repository text that cites `DP-011` as the direct-address-capitalization authority is a historical broken reference
- those citations must not be used as active authority
- direct-address capitalization is now housed within `DP-012`

Current in-repo locations where the topic appears:

- [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md) §5
- [DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md) note
- changelog records describing earlier prompt work

These are historical references, not active authority over capitalization.

## Citation Rules

Implementation work should currently cite:

- `CANONICAL_EDITORIAL_POLICY.md` for top-level policy and authority hierarchy
- `DP-010` for spacing
- `DP-011` for geometry
- `DP-012` for punctuation, deterministic formatting normalization, garble flags, paragraph rules, and direct-address capitalization

Implementation work should not cite:

- `DP-009` as current authority
- `DEPO_PRO_FORMATTER_SPEC.md` as current implementation authority
- `DEPO_PRO_FORMATTER_RULE_ENGINE.md` as current geometry authority
- `DP-011` as a capitalization authority
