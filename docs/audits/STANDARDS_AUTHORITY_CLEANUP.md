# Standards Authority Cleanup

Date: 2026-06-23  
Scope: standards graph normalization, authority repair, numbering control, and freeze-ready classification  
Mode: documentation-only cleanup

## Purpose

This document is not another standards audit.

The audit phase is complete.

This cleanup pass exists to:

- normalize the standards graph into one authoritative structure
- resolve the `DP-011` authority mismatch at the repository level
- classify standards and historical artifacts clearly
- establish namespace control so numbering collisions do not recur

## Cleanup Outcome

The repository should now be interpreted as:

- `DP-009` = `HISTORICAL`
- `DP-010` = `ACTIVE` spacing authority
- `DP-011` = `ACTIVE` geometry authority
- `DP-012` = `PROPOSED` pending ratification

No other repository document should be treated as a live formatting authority during pre-CFE implementation.

## 1. DP-011 Authority Repair

### Question

Repository documents described `DP-011` in two incompatible ways:

- geometry authority
- direct-address-capitalization authority

### Repository facts

- the only repository file registered as `DP-011` is [DP-011_CANONICAL_GEOMETRY_AUTHORITY.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md)
- `DP-010` and `DP-012` contain historical references that describe `DP-011` as the direct-address-capitalization decision
- [DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md) explicitly says no standalone `DP-011` file exists for that capitalization rule

### Determination

Disposition:

- **A standalone capitalization decision does not exist in the repository under a registered active identifier.**

This means:

- there is no alternate in-repository identifier to repair those references to
- there is no basis to relabel geometry away from `DP-011`
- the capitalization references must be treated as invalid historical references

### Resolution

Repository authority is normalized as:

- `DP-011` = geometry only

Direct-address capitalization status is normalized as:

- no standalone registered active DP authority exists in the repository for that topic
- repository mentions of the topic survive only in proposed or historical documents

### Recommendation

Do not invent a new rule in this cleanup pass.

If the owner later wants a standalone capitalization decision, create it under a new unused ID after ratification. Do not reuse `DP-011`.

## 2. Authority Classification

| Document | Status | Authority Scope | Notes |
|---|---|---|---|
| [DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md) | `ACTIVE` | Spacing | Live authority for sentence spacing, abbreviation spacing, honorific spacing |
| [DP-011_CANONICAL_GEOMETRY_AUTHORITY.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md) | `ACTIVE` | Geometry | Live authority for margins, tabs, line spacing, continuation |
| [DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md) | `PROPOSED` | Proposed punctuation / garble / paragraph refinements | Not fully binding until ratified |
| [DP-009_HONORIFIC_ABBREVIATION_SPACING.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md) | `HISTORICAL` | Historical spacing record | Consolidated into `DP-010` |
| [DEPO_PRO_FORMATTER_SPEC.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_SPEC.md) | `HISTORICAL` | Legacy architecture proposal | Not current implementation authority |
| [DEPO_PRO_FORMATTER_RULE_ENGINE.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md) | `HISTORICAL` | Legacy rule-engine architecture | Not current geometry authority |
| [abbreviation_registry.json](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/abbreviation_registry.json) | `ACTIVE DATA` | Canonical registry data under `DP-010` | Controlled data, not a peer DP |
| [DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md) | `HISTORICAL NOTE` | Prompt history and implementation guidance | Contains explicit note that no standalone capitalization file exists |
| [CHANGELOG_dp010_incorporation.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/CHANGELOG_dp010_incorporation.md) | `LEGACY CHANGELOG` | Historical note | Contains old `DP-011` capitalization references |
| [CHANGELOG_dp012_qa_review.md](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/CHANGELOG_dp012_qa_review.md) | `LEGACY CHANGELOG` | Historical note | Contains old `DP-011` capitalization references |

## 3. Numbering Control

This cleanup pass establishes a namespace rule:

- `DP-###` = standards
- `ADR-###` = architecture decisions
- `WAVE-##` = architecture-program or implementation-wave records

The canonical registry is recorded in [NUMBERING_REGISTRY.md](/C:/Users/james/projects/depo-pro/NUMBERING_REGISTRY.md).

This directly addresses two failure modes:

- the `DP-011` meaning collision
- the historical `DP-012` architecture-label collision noted in the geometry authority

## 4. Canonical Index Finalization

[CANONICAL_STANDARDS_INDEX.md](/C:/Users/james/projects/depo-pro/CANONICAL_STANDARDS_INDEX.md) is finalized in this pass as the single top-level standards index.

It now provides:

- active standards
- proposed standards
- historical standards
- historical architecture references
- numbering registry pointer
- authority hierarchy
- explicit `DP-011` reference resolution

## 5. Authority Hierarchy

The repository should now be read in this order:

### Level 1

Approved DP standards:

- `DP-010`
- `DP-011`

### Level 2

Canonical registry data:

- `abbreviation_registry.json`

### Level 3

Proposed standards:

- `DP-012`

### Level 4

Historical architecture documents:

- `DEPO_PRO_FORMATTER_SPEC.md`
- `DEPO_PRO_FORMATTER_RULE_ENGINE.md`

### Level 5

Legacy notes and changelogs

## 6. Freeze-Ready Disposition

For pre-CFE implementation planning, the standards set should now be treated as:

- frozen enough to begin implementation against `DP-010` and `DP-011`
- still awaiting owner ratification for `DP-012`
- no longer ambiguous about `DP-011`

The direct-address-capitalization topic is no longer allowed to create authority confusion:

- it is not `DP-011`
- it is not a standalone registered active DP in the current repository
- any future standalone decision on that topic must receive a new unused ID

## Deliverables Produced

1. [STANDARDS_AUTHORITY_CLEANUP.md](/C:/Users/james/projects/depo-pro/docs/audits/STANDARDS_AUTHORITY_CLEANUP.md)
2. [CANONICAL_STANDARDS_INDEX.md](/C:/Users/james/projects/depo-pro/CANONICAL_STANDARDS_INDEX.md)
3. [NUMBERING_REGISTRY.md](/C:/Users/james/projects/depo-pro/NUMBERING_REGISTRY.md)

## Bottom Line

The standards graph is now normalized at the index/registry level:

- one number
- one authority
- one namespace rule

The repository should stop auditing this issue and move next to:

1. owner ratification of `DP-012`
2. standards freeze
3. Canonical Formatting Engine implementation against `DP-010` and `DP-011`
