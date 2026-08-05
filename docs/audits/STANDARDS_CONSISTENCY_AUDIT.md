# Standards Consistency Audit

## 1. Summary

- Sources read: **31** standards-bearing sources across the canonical standards folder, root standards docs, wave8 reference docs/code, and the frozen API contract (`Canonical Standards Folder`, `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`, `CANONICAL_STANDARDS_INDEX.md`, `reference/wave8/docs`, `reference/wave8/backend`, `docs`, `src/api/types.ts`).
- Corpus gaps: **1** expected authority remains absent from the working tree: the certified Etminan deposition PDF (Cause No. C-5722-24-L).
- Numbering collisions: **0** active DP-series collisions remain after the former `DP-012` migration report was renamed into the WAVE series (`Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md`, `CANONICAL_STANDARDS_INDEX.md`).
- Geometry conflicts: **0 active unresolved authority conflicts** remain inside the present corpus after `DP-011` and the reconciliation note locked the geometry hierarchy; **1 residual verification item** remains for parenthetical placement on the certified PDF (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`, `CANONICAL_STANDARDS_INDEX.md`).
- Duplicate-rule clusters: **6** drift-risk duplicate clusters remain, mainly because consuming prompts, changelogs, legacy component docs, and code still restate or diverge from the registered standards (`Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md`, `docs/COMPONENT_SPECIFICATION.md:527`, `docs/COMPONENT_SPECIFICATION.md:530`, `reference/wave8/backend/corrections/patterns.py:100`, `reference/wave8/backend/transcript/export_render.py:125`).
- Spec-vs-code divergences: **5** confirmed divergences remain, including registry non-consumption, vestigial tab-stop geometry, space-based continuation rendering, retired “hanging indent” terminology in code, and stale spacing prose in component docs (`Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `reference/wave8/backend/geometry/engine.py:135`, `reference/wave8/backend/export/docx_writer.py:35-47`, `reference/wave8/backend/transcript/export_render.py:125`, `docs/COMPONENT_SPECIFICATION.md:530`).
- Unimplemented standards / missing authorities: **1** item remains incomplete: the missing certified Etminan PDF.
- Verdict: **PARTIAL**. The standards corpus is now self-consistent on registered geometry authority, but it is not complete until the certified Etminan PDF is added or its residual checks are explicitly deferred as the final baseline practice (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `CANONICAL_STANDARDS_INDEX.md`).

## 2. Corpus Manifest

| Source path | Type | Status |
| --- | --- | --- |
| `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md` | standard-doc | INCLUDED |
| `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | standard-doc | INCLUDED |
| `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | standard-doc | INCLUDED |
| `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | standard-doc | INCLUDED |
| `Canonical Standards Folder/TRANSCRIPT_GEOMETRY_STANDARD.md` | legacy standard-doc | INCLUDED |
| `Canonical Standards Folder/DEPO_PRO_FORMATTER_SPEC.md` | legacy standard-doc | INCLUDED |
| `Canonical Standards Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md` | legacy standard-doc | INCLUDED |
| `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md` | architecture record | INCLUDED |
| `Canonical Standards Folder/abbreviation_registry.json` | data | INCLUDED |
| `Canonical Standards Folder/abbreviation_registry.docx` | data / reference | INCLUDED |
| `Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md` | prompt | INCLUDED |
| `Canonical Standards Folder/PROMPT_WORKSPACE_DOCX_TAB_STOPS.md` | prompt | INCLUDED |
| `Canonical Standards Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md` | prompt / index | INCLUDED |
| `Canonical Standards Folder/CHANGELOG_dp010_incorporation.md` | changelog | INCLUDED |
| `Canonical Standards Folder/CHANGELOG_dp012_qa_review.md` | changelog | INCLUDED |
| `Canonical Standards Folder/CHANGELOG_three_tab_paragraph_rule.md` | changelog | INCLUDED |
| `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md` | decision note | INCLUDED |
| `CANONICAL_STANDARDS_INDEX.md` | registry / index | INCLUDED |
| `reference/wave8/docs/ACTIVE_SPEC_REGISTRY.md` | standard-doc / registry | INCLUDED |
| `reference/wave8/docs/knowledge/UFM_RULES_REFERENCE_2026-05-31.md` | standard-doc | INCLUDED |
| `reference/wave8/docs/wave19_ufm_layout.md` | standard-doc | INCLUDED |
| `reference/wave8/docs/DEPO-PRO_UFM_Data_Dictionary_v2.md` | standard-doc | INCLUDED |
| `reference/wave8/docs/BLOCKERS.md` | standard-doc / blockers | INCLUDED |
| `docs/DATA_STRUCTURES_REFERENCE.md` | standard-doc | INCLUDED |
| `docs/COMPONENT_SPECIFICATION.md` | standard-doc | INCLUDED |
| `reference/wave8/backend/geometry/profile.py` | code / implemented geometry | INCLUDED |
| `reference/wave8/backend/geometry/engine.py` | code / implemented geometry | INCLUDED |
| `reference/wave8/backend/transcript/export_render.py` | code / implemented formatter | INCLUDED |
| `reference/wave8/backend/export/docx_writer.py` | code / implemented DOCX writer | INCLUDED |
| `reference/wave8/backend/export/pdf_writer.py` | code / implemented PDF writer | INCLUDED |
| `src/api/types.ts` | code / frozen contract | INCLUDED |

### Expected-corpus allowlist presence check

| Expected authority | Presence | Notes |
| --- | --- | --- |
| `DP-009_HONORIFIC_ABBREVIATION_SPACING.md` | PRESENT | Canonical folder copy present. |
| `DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | PRESENT | Canonical folder copy present. |
| `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | PRESENT | Canonical folder copy now present. |
| `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | PRESENT | Canonical folder copy present. |
| `abbreviation_registry.json` | PRESENT | Canonical folder copy present. |
| `DEPO_PRO_FORMATTER_SPEC.md` | PRESENT | Canonical-folder copy present with DP-011 supersession banner. |
| `DEPO_PRO_FORMATTER_RULE_ENGINE.md` | PRESENT | Canonical-folder copy present with DP-011 supersession banner. |
| `TRANSCRIPT_GEOMETRY_STANDARD.md` | PRESENT | Canonical-folder copy present with DP-011 supersession banner. |
| Certified Etminan deposition PDF (Cause No. C-5722-24-L) | MISSING | Still absent; DP-011 leaves two residuals pending certified-PDF verification (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `CANONICAL_STANDARDS_INDEX.md`). |

## 3. Numbering & Identity Registry

| ID | Title / meaning found in corpus | Status in corpus | Defining file(s) | Finding |
| --- | --- | --- | --- | --- |
| `DP-002b` | Prior decision referenced only as untouched | DANGLING REFERENCE | None found in corpus | Still cited, not defined (`Canonical Standards Folder/CHANGELOG_dp010_incorporation.md:23`). |
| `DP-005b` | “Paragraphs within testimony” / former prompt label | DANGLING REFERENCE / HISTORICAL PROMPT LABEL | None found in corpus | Still cited, not defined (`Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md:213`). |
| `DP-008` | Number/date formatting gate | DANGLING REFERENCE | None found in corpus | Still cited, not defined (`Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:11`). |
| `DP-009` | Honorific and abbreviation spacing | APPROVED but CONSOLIDATED / HISTORICAL | `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md` | Consistently treated as consolidated into DP-010. |
| `DP-010` | Sentence-boundary abbreviation spacing | APPROVED / ACTIVE | `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | Live spacing authority. |
| `DP-011` | Canonical geometry authority | APPROVED / ACTIVE | `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | Former dangling reference resolved. |
| `DP-012` | Quotation punctuation, date reconciliation, inline garble flags | PROPOSED / ACTIVE DRAFT | `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | Retains the DP-012 slot after WAVE-21 rename. |
| `WAVE-21` | Canonical export architecture | PROPOSED | `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md` | Architecture record correctly moved out of DP series. |

### Identity findings

| Finding type | Evidence | Finding |
| --- | --- | --- |
| COLLISION CHECK | `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md`, `CANONICAL_STANDARDS_INDEX.md` | The former `DP-012` architecture collision is resolved on disk; no active DP-number collision remains. |
| SUPERSESSION CONSISTENCY | `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`, `CANONICAL_STANDARDS_INDEX.md` | DP-009 is consistently historical/consolidated; no contrary live citation was found. |
| DANGLING REFERENCES | `CANONICAL_STANDARDS_INDEX.md`, `Canonical Standards Folder/CHANGELOG_dp010_incorporation.md:23`, `Canonical Standards Folder/CHANGELOG_dp012_qa_review.md:14` | DP-001 to DP-008 remain partially undefined in the working-tree corpus and still require source confirmation or formal retirement. |

## 4. Geometry Conflict Matrix

`DP-011` now resolves the active geometry-authority competition inside the corpus. The table below records the authority state after reconciliation, not the pre-DP-011 dispute.

| Geometry parameter | Locked authority | Competing source state | Current audit state |
| --- | --- | --- | --- |
| Right margin | `0.75"` / 1080 (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | wave8 code already matches; older “1.0 inch others” note is superseded by DP-011 (`docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`) | RESOLVED |
| Text area / format box | `6.5"` / 9360 (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | wave8 code/doc data match 6.5" box (`reference/wave8/backend/geometry/profile.py:41-44`, `docs/DATA_STRUCTURES_REFERENCE.md:563`) | RESOLVED |
| Q./A. designation tab | `720` / 0.5" (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | wave8 code still states `360`, identified as units bug (`reference/wave8/backend/geometry/profile.py:61`, `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`) | RESOLVED AS AUTHORITY; CODE DIVERGES |
| Q/A text tab | `1440` / 1.0" (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | wave8 code still states `900`, identified as units bug (`reference/wave8/backend/geometry/profile.py:61`, `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`) | RESOLVED AS AUTHORITY; CODE DIVERGES |
| Speaker / new-paragraph tab | `2160` / 1.5" (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | DP-012 and prompts align (`Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:120`) | RESOLVED |
| Parenthetical tab | Provisional `2880` / 2.0" (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | Certified PDF still absent; DOCX working copy centered them (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | RESIDUAL (NOT COUNTED AS ACTIVE CONFLICT) |
| Line spacing | `28pt exact` (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | wave8 code matches 28pt; competing 480/double language is superseded (`reference/wave8/backend/geometry/profile.py:53`, `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`) | RESOLVED |
| Continuation mechanism | Return-To-Margin with explicit tabs and `left_indent = 0` (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`) | `export_render.py` still uses spaces and the retired “hanging indent” term (`reference/wave8/backend/transcript/export_render.py:125`) | RESOLVED AS AUTHORITY; CODE DIVERGES |

## 5. Duplicate Rules

| Rule | Locations | Agreement status | Single authority that should own it |
| --- | --- | --- | --- |
| Honorific / abbreviation period spacing | `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`, `docs/COMPONENT_SPECIFICATION.md:527`, `docs/COMPONENT_SPECIFICATION.md:530`, `reference/wave8/backend/corrections/patterns.py:100` | **DRIFT**. DP-010 requires one-space abbreviation handling; component spec still contains contradictory prose and code still contains private lists. | `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` + `Canonical Standards Folder/abbreviation_registry.json` |
| `No.` carve-out | `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/abbreviation_registry.json`, `reference/wave8/backend/corrections/patterns.py:100` | **DRIFT-RISK**. Central rule exists, but code still does not consume the registry. | `Canonical Standards Folder/abbreviation_registry.json` |
| Return-To-Margin terminology and mechanism | `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `reference/wave8/backend/transcript/export_render.py:125` | **DRIFT**. Standards retire “hanging indent”; code still uses it. | `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` + `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` |
| Paragraph/tab rule inside testimony | `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md`, `Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`, `Canonical Standards Folder/CHANGELOG_dp012_qa_review.md`, `Canonical Standards Folder/CHANGELOG_three_tab_paragraph_rule.md` | **DRIFT**. History of the earlier one-paragraph rule remains in changelogs. | `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` once ratified |
| Geometry supersession language | `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`, `CANONICAL_STANDARDS_INDEX.md` | **AGREEING DUPLICATE**. Same disposition appears in two documents for indexing and rationale. | `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` as authority; index/reconciliation as supporting records |
| Architecture-series boundary | `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md`, `CANONICAL_STANDARDS_INDEX.md`, `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md` | **AGREEING DUPLICATE**. All three state that DP numbers are reserved for standards and WAVE-21 is architecture. | `CANONICAL_STANDARDS_INDEX.md` |

## 6. Spec-vs-Code Divergence

| Standard says | Code does | Result |
| --- | --- | --- |
| DP-010: every consumer reads `abbreviation_registry.json` and does not hardcode lists (`Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`) | No repository code references `abbreviation_registry`; code keeps local lists/regexes (`reference/wave8/backend/corrections/patterns.py:100`, `reference/wave8/backend/corrections/patterns.py:113`, `reference/wave8/backend/services/speaker_mapping.py:88`) | **DIVERGE** |
| DP-011: Q./A. tabs are `720/1440` and wave8 `360/900` is overruled (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | `profile.py` still exposes `(360, 900, 1440, 2160, 2880)` (`reference/wave8/backend/geometry/profile.py:61`) | **DIVERGE** |
| Canonical tab-stop standard expects explicit applied stops, not dormant geometry values (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `Canonical Standards Folder/PROMPT_WORKSPACE_DOCX_TAB_STOPS.md`) | `geometry/engine.py` computes `tab_stops_pt`, but `docx_writer.py` does not apply tab stops (`reference/wave8/backend/geometry/engine.py:135`, `reference/wave8/backend/export/docx_writer.py:35-47`) | **DIVERGE** |
| DP-010/DP-011 require Return-To-Margin with explicit tabs and `left_indent = 0` (`Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`) | `export_render.py` emits leading spaces and calls the wrap a “hanging indent” (`reference/wave8/backend/transcript/export_render.py:61-62`, `reference/wave8/backend/transcript/export_render.py:125`, `reference/wave8/backend/transcript/export_render.py:148-155`) | **DIVERGE** |
| DP-009/DP-010 purge two-space-after-honorific wording (`Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md`, `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`) | `docs/COMPONENT_SPECIFICATION.md` still says “Double space after honorific period” (`docs/COMPONENT_SPECIFICATION.md:530`) | **DIVERGE** |

## 7. DP-011 Requirements List

The original pre-DP-011 requirements list is no longer the active handoff. It has been replaced by a smaller residual list:

1. Verify `DP-011 §E1`: exact 25-line rendered output against the certified PDF (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `CANONICAL_STANDARDS_INDEX.md`).
2. Verify `DP-011 §E2`: parenthetical placement at `2880` versus the working-copy DOCX centered behavior (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `CANONICAL_STANDARDS_INDEX.md`).
3. Confirm or retire referenced-but-undefined DP-001 to DP-008 records (`CANONICAL_STANDARDS_INDEX.md`).

## 8. Open Questions

1. When the certified Etminan PDF becomes available, does it confirm DP-011’s parenthetical placement at `2880`, or require a narrow correction to the residual?
2. Should the remaining stale prose in `docs/COMPONENT_SPECIFICATION.md` and the wave8 reference code be corrected now, or intentionally left as historical implementation drift until engine work begins?

## 9. Corpus Completeness Statement

**Verdict: PARTIAL.**

The corpus is now internally consistent on registered geometry authority: `DP-011` exists, the former `DP-012` architecture collision has been removed, the three legacy geometry specs are present with DP-011 supersession banners, and `CANONICAL_STANDARDS_INDEX.md` defines the active standards registry. It remains **PARTIAL** because the certified Etminan deposition PDF (Cause No. C-5722-24-L) is still absent, leaving DP-011’s residual verification items open (`Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`, `CANONICAL_STANDARDS_INDEX.md`).
