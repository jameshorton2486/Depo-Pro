# STANDARDS ACCURACY AUDIT

Date: 2026-06-23  
Scope: canonical standards consistency review for formatting authority, implementation authority, and reference integrity  
Mode: audit only

## Executive Summary

The current standards set is **partially consistent but not fully clean**.

The strongest conclusions are:

- `DP-010` should be treated as the active spacing authority.
- `DP-009` should be retained as historical evidence only for new implementation work.
- `DP-012` is not fully ratified and must not be treated as fully binding implementation authority.
- `DEPO_PRO_FORMATTER_SPEC.md` and `DEPO_PRO_FORMATTER_RULE_ENGINE.md` are not current implementation authorities under the present beta architecture.

The principal standards defect is a **broken-reference condition around `DP-011`**:

- `DP-010` and `DP-012` both reference `DP-011` as if it were the direct-address-capitalization decision.
- The actual `DP-011` file present in the repository is [DP-011_CANONICAL_GEOMETRY_AUTHORITY.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md), which governs geometry, not capitalization.

Until that reference mismatch is corrected, the standards set cannot be treated as fully internally consistent.

## Method

This audit is based on direct review of the following repository documents:

- [DP-009_HONORIFIC_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md)
- [DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md)
- [DP-011_CANONICAL_GEOMETRY_AUTHORITY.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md)
- [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md)
- [DEPO_PRO_FORMATTER_SPEC.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_SPEC.md)
- [DEPO_PRO_FORMATTER_RULE_ENGINE.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md)

No implementation changes were made as part of this audit.

## Disposition Table

| Artifact | Current Role | Disposition | Rationale |
|---|---|---|---|
| `DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | Spacing authority | `Active` | Explicitly consolidates `DP-009`, centralizes `abbreviation_registry.json`, and defines the canonical spacing decision path. |
| `DP-009_HONORIFIC_ABBREVIATION_SPACING.md` | Historical decision record | `Historical` | The document itself says it is consolidated into `DP-010` and that new work should cite `DP-010`. |
| `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | Geometry authority | `Active` | It is the only actual `DP-011` file present and explicitly declares itself the canonical geometry authority. |
| `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | Pending punctuation/garble policy | `Proposed` | The document is explicitly marked `PROPOSED` and requires owner ratification for key sections before becoming fully binding. |
| `DEPO_PRO_FORMATTER_SPEC.md` | Legacy architecture / implementation proposal | `Superseded` | It proposes post-freeze schema and architectural work incompatible with the present beta constraints and validated live architecture. |
| `DEPO_PRO_FORMATTER_RULE_ENGINE.md` | Legacy rule-engine / post-freeze architecture | `Superseded` | It explicitly states geometry is superseded and describes a jurisdiction-config architecture that is post-freeze and not current implementation authority. |
| `DP-010` references to `DP-011` as capitalization authority | Cross-reference integrity | `Broken Reference` | The referenced role does not match the actual `DP-011` file in the repository. |
| `DP-012` references to `DP-011` as capitalization authority | Cross-reference integrity | `Broken Reference` | The referenced role does not match the actual `DP-011` file in the repository. |

## Findings

### 1. DP-010 is the active spacing authority

Status: `Confirmed`

[DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md) is the cleanest and most implementation-ready of the standards reviewed.

It does three important things correctly:

- consolidates `DP-009`
- centralizes `abbreviation_registry.json` as canonical data
- defines a single decision model for sentence-boundary punctuation versus abbreviation punctuation

Implementation consequence:

- new formatting work should cite `DP-010`, not re-derive spacing rules from older standards

### 2. DP-009 should be treated as historical-only for new work

Status: `Confirmed`

[DP-009_HONORIFIC_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md) opens by stating that it has been consolidated into `DP-010` and that new work should cite `DP-010`.

Implementation consequence:

- `DP-009` remains useful as evidence and decision history
- it should not be cited as the primary implementation authority going forward

### 3. DP-012 is not fully ratified

Status: `Confirmed`

[DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md) is explicitly marked `PROPOSED — pending owner ratification`.

The document also states that key sections require owner ratification before moving from proposed to approved.

Implementation consequence:

- `DP-012` should not be treated as fully binding implementation authority
- only the portions that merely reaffirm already-approved decisions can be treated as currently binding

### 4. The formatter specification is not current implementation authority

Status: `Confirmed`

[DEPO_PRO_FORMATTER_SPEC.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_SPEC.md) contains a full architecture proposal with:

- new tables
- new migrations
- `transcript_paragraphs`
- `speaker_assignments`
- `jurisdiction_configs`

This conflicts with the present beta constraints and with recent live-code audits showing that the current Layer-1 architecture is already functioning and should not be displaced casually during freeze.

Implementation consequence:

- treat this file as a historical architecture/spec artifact
- do not treat it as present implementation authority during beta

### 5. The formatter rule engine is not the current geometry authority

Status: `Confirmed`

[DEPO_PRO_FORMATTER_RULE_ENGINE.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md) explicitly says geometry is superseded.

It also describes a post-freeze jurisdiction-config architecture, not the current beta implementation authority.

Implementation consequence:

- do not use this document as the authority for margins, continuation, spacing, or tab geometry

### 6. DP-011 references are internally broken across the standards set

Status: `Confirmed`

This is the principal defect in the standards set.

[DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md) describes `DP-011` as a separate decision governing capitalization of direct-address titles.

[DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md) also defers to `DP-011` for direct-address capitalization.

But the actual repository file for `DP-011` is [DP-011_CANONICAL_GEOMETRY_AUTHORITY.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md), which governs geometry.

This creates a direct standards-reference mismatch:

- the cited semantic role of `DP-011` does not match the actual repository artifact named `DP-011`
- implementers cannot reliably know whether `DP-011` means capitalization or geometry without external clarification

Implementation consequence:

- the standards set is not fully internally consistent until the `DP-011` identity mismatch is corrected

## Recommended Standard Roles

### Active

- `DP-010` for spacing
- `DP-011` for geometry

### Historical

- `DP-009`

### Proposed

- `DP-012` until owner ratification is completed

### Superseded / Non-authoritative for current beta implementation

- `DEPO_PRO_FORMATTER_SPEC.md`
- `DEPO_PRO_FORMATTER_RULE_ENGINE.md`

### Broken Reference

- all references in active/proposed standards that describe `DP-011` as the capitalization decision unless and until the numbering is repaired

## Required Cleanup Actions

### Action 1: Repair the DP-011 identity mismatch

Options:

- correct `DP-010` and `DP-012` to reference the actual direct-address-capitalization decision under its proper ID
- or renumber/relabel the capitalization decision so the repository artifacts and cross-references agree

This is the highest-priority standards cleanup item.

### Action 2: Mark the formatter spec and rule engine as historical in the standards index

The standards index should make explicit that:

- these documents are retained for history and post-freeze architecture context
- they are not the current implementation authority during beta

### Action 3: Treat DP-012 as gated pending ratification

Any implementation plan that relies on `DP-012` should distinguish:

- already-binding cross-references to approved standards
- newly proposed rules that still require owner approval

## Final Assessment

The standards set is usable, but not yet cleanly authoritative end-to-end.

The authority picture should currently be interpreted as:

- `DP-010` = spacing authority
- `DP-011` = geometry authority
- `DP-009` = historical record
- `DP-012` = proposed, partially binding only where it restates already-approved standards
- formatter-spec and rule-engine docs = historical/post-freeze architecture artifacts

The one material defect preventing full internal consistency is the `DP-011` broken-reference condition.

Until that is corrected, any implementation work that cites the standards should do so with an explicit mapping note to avoid ambiguity.
