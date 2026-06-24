# Standards Folder Normalization

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: documentation-only normalization

## Purpose

Normalize the Canonical Standards Folder so the repository distinguishes between:

- active authority
- historical records
- future-design reference documents

This pass is governance cleanup only. No runtime code, schema, migration, or test behavior was changed.

## Findings

1. `Canonical Standards Folder/NUMBERING_REGISTRY.md` existed as a zero-byte duplicate and was not a usable registry.
2. Several prompt/design documents still cited `DP-011` as a capitalization authority even though the active registry defines `DP-011` as geometry only and houses direct-address capitalization in `DP-012`.
3. `WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md` still contained an obsolete factual statement that `abbreviation_registry.json` was absent from the repo, even though the file now exists and is imported by live code.
4. Future-design prompt/architecture documents sat too close to active authority documents without a consistent non-authoritative banner.
5. Historical records were mostly already classified correctly, but a small amount of explicit historical labeling was added for clarity.

## Changes Made

### 1. Duplicate Registry Disposition

`Canonical Standards Folder/NUMBERING_REGISTRY.md` was replaced with a pointer to the authoritative root registry:

- `NUMBERING_REGISTRY.md`

This resolves the zero-byte duplicate without creating a second active registry.

### 2. DP-011 Citation Cleanup

Corrected stale references in future-design prompt documents so that:

- `DP-011` = geometry authority
- `DP-012` = direct-address capitalization authority where applicable

This pass corrected citations only. It did not change rule content.

### 3. Wave 21 Reality Check

Updated `WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md` to record that its older assumption about `abbreviation_registry.json` being absent is now superseded.

The document now notes current repo reality:

- `Canonical Standards Folder/abbreviation_registry.json` exists
- live code imports it through `src/lib/format/abbreviationRegistry.ts`
- current formatting paths already consume the shared registry

### 4. Future-Design Banners

Added a standardized `REFERENCE DESIGN ONLY` banner to:

- `Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`
- `Canonical Standards Folder/PROMPT_WORKSPACE_DOCX_TAB_STOPS.md`
- `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md`
- `Canonical Standards Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md`

These banners explicitly defer active authority to:

- `DP-010`
- `DP-011`
- `DP-012`
- `CANONICAL_STANDARDS_INDEX.md`

### 5. Historical Classification Clarifications

Added explicit historical/reference-only classification notes to:

- `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md`
- `Canonical Standards Folder/DEPO_PRO_FORMATTER_SPEC.md`
- `Canonical Standards Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md`

## Files Changed

- `Canonical Standards Folder/NUMBERING_REGISTRY.md`
- `Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`
- `Canonical Standards Folder/PROMPT_WORKSPACE_DOCX_TAB_STOPS.md`
- `Canonical Standards Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md`
- `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md`
- `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md`
- `Canonical Standards Folder/DEPO_PRO_FORMATTER_SPEC.md`
- `Canonical Standards Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md`
- `docs/audits/STANDARDS_FOLDER_NORMALIZATION.md`

## Remaining Open Issues

1. Historical changelog files still contain older wording about `DP-011` because they are preserved as historical records rather than rewritten as current authority.
2. This pass does not change any runtime/export implementation status; DOCX/PDF and Wave 21 remain future-design topics.
3. The controlled Etminan retranscription remains the next product decision gate after governance cleanup.

## Verdict

`PASS` for the scoped governance cleanup.

The Canonical Standards Folder now more clearly separates:

- active authority
- historical record
- future-design reference material
