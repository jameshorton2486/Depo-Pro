# Intake Formatting Audit

Audit date: 2026-08-01  
Classification: read-only architecture audit  
Canonical integration branch inspected: `feature/stage3-workspace-core`

## Repository verification

| Item | Result |
|---|---|
| Active branch | `feature/stage3-workspace-core` |
| HEAD | `49d32c4eacfc6b2cf667b0d6a1050dacd90835b4` |
| Upstream | `origin/feature/stage3-workspace-core` |
| Local/upstream tree | Identical at audit time |
| GitHub default branch | `origin/main` |
| Active integration branch | `feature/stage3-workspace-core` is the working integration branch, but it is not the GitHub default branch |
| Pre-existing untracked files | `docs/archive/reports/repository/REPOSITORY_BRANCH_CENSUS.md`; `scripts/compare_utt_split.py` |
| Build | TypeScript and module transformation passed; Vite failed during HTML emission with a Windows path reported as an invalid output file name (`../../../../../james/Projects/Depo-Pro/index.html`) |

No source, test, dependency, migration, or configuration file was changed by this audit.

## Executive finding

There is no single formatting authority today. The closest thing to a working-model authority is `src/lib/parsing/applyExtraction.ts`, but it covers only selected fields and only the extraction boundary. At least **eight independently acting formatting or normalization layers** can affect Intake values or their downstream representations:

1. Active AI extraction instructions and response shaping (`supabase/functions/extract-nod/index.ts`).
2. Extraction-to-record mapping and semantic cleanup (`src/lib/parsing/applyExtraction.ts`, plus job-sheet application).
3. Case-record load/coercion normalization (`src/types/case.ts`, `src/lib/normalizeCaseRecord.ts`).
4. Intake field projection/display conversion (`fieldProjection.ts`).
5. Reporter-specific phone/date display and parsing (`reporterFieldFormatting.ts`).
6. Keyterm derivation, sanitization, deduplication, and Deepgram wire normalization.
7. UFM construction and directory enrichment (`buildUfmMetadata.ts`).
8. Export/transcript adapters that read record values directly or build their own payloads.

A ninth implementation, `src/lib/parsing/nodParser.ts`, contains regex, title-case, capitalization, phone, and caption logic but is expressly a fallback/reference implementation. It is not the normal upload extraction path. It remains a regression risk because a fix made there does not fix active AI extraction.

The stop condition is met: architecture consolidation should precede any new cause-number, phone, capitalization, or auto-confirm formatting change.

## Current authority by concern

| Concern | Effective authority today | Result |
|---|---|---|
| Extraction values | `extract-nod` response plus `applyExtraction` | Executed; partial normalization |
| Working values | `CaseRecord` `ExtractedField.value` leaves, mutated through `intakeReducer` | Executed; no uniform field policy |
| Case load | `normalizeCaseRecord` / `normalizeCaseRecordShape` | Executed; structural coercion, not canonical legal formatting |
| Intake display | `projectCaseRecordToRows` | Executed; generally stringifies stored values, with selected display conversions |
| Reporter phone/date | `reporterFieldFormatting.ts` | Executed only in reporter UI paths |
| Deepgram terms | `keytermDerivation`, managed keyterms, `buildDeepgramRequest` | Executed; independent whitespace/case-insensitive dedupe |
| UFM | `buildUfmMetadata` | Executed; trims/collapses whitespace and enriches independently |
| Export | Export screen/adapters | Executed; some paths read `CaseRecord` directly rather than UFM |
| Legacy NOD formatting | `nodParser.ts` | Fallback/reference; not authoritative for active uploads |

## Field findings

| Field family | Parsed/extracted | Stored | Downstream behavior | Principal inconsistency |
|---|---|---|---|---|
| Cause number | AI field `cause_number`; fallback regex also exists | `caption.case_number` | Intake displays stored value; auto-seed may send it to Deepgram; UFM trims it; export reads it directly | No canonical case-number policy; fixes in fallback parser do not govern AI extraction or manual edits |
| Phone | AI attorney/firm fields; directory/profile/manual sources | Entity/detail fields vary | Reporter UI formats one phone path; UFM only whitespace-normalizes phones | Multiple shapes and no common `(210) 999-5033` authority |
| Caption | AI `case_style`; mapper also uses it as `case_name` fallback | Caption leaves | Display mostly direct; UFM trims; export reads direct | Parser casing can persist; consumer-specific presentation differs |
| Court | AI court fields; fallback parser hard-codes uppercase forms | Caption court leaves | Display direct; UFM trims | No court-name capitalization policy at working-model boundary |
| Witness/attorney/firm names | AI arrays; directory/manual sources | Entity leaves | Keyterms sanitize independently; UFM may directory-match using lowercase punctuation-stripped identity | Display spelling and matching identity are mixed concerns |
| Location | AI location plus job-sheet metadata | Session/scheduling leaves | Mapper normalizes selected county/state/date/time values; projection formats location type; UFM joins address components | Formatting split across mapper, projection, and UFM |
| Legal terms | Extracted text and derived keyterms | Keyterm store / transcript | Keyterm tools sanitize, rank, dedupe, and preserve entered casing | Not governed by Intake field normalization |
| Reporter | Profile/import/manual extraction | Reporter leaves | Reporter UI has dedicated date/phone helpers; UFM can replace with profile values and marks profile values confirmed | Profile and record authorities can differ |
| Scheduling | AI and job-sheet fields | Scheduling/session leaves | Mostly direct display; UFM selects a subset and trims | Two source classes mapped to one generic `extracted` source in `CaseRecord` |

## Cause-number conclusion

Current path: upload -> `aiExtract` -> `extract-nod` -> `applyExtraction` -> `caption.case_number` -> reducer -> field projection. `deriveAutoSeedKeytermsFromCaseRecord` may add the stored value to Deepgram. `buildUfmMetadata` independently applies `normalizeValue`. Export code can read `record.caption.case_number.value` directly.

Expected behavior should be defined once as a field policy, preserving the source text as evidence while writing one canonical working value. No current function owns all entry routes (AI extraction, job sheet, manual edit, load, import), so current behavior cannot guarantee permanence.

## Phone conclusion

The desired display is `(210) 999-5033`. The repository has a reporter display formatter, extraction regex/logic in the fallback parser, AI-extracted phone strings, directory phone strings, and UFM whitespace normalization. These are not one pipeline. At minimum, phone recognition/validation and phone display should be separate pure policies, invoked at the canonical working-model boundary for every phone field. UFM, Intake, Deepgram, and export should not invent alternate phone formatting.

## Deepgram and UFM conclusions

Deepgram request formatting does not share an Intake canonical formatter. It trims/collapses keyterm whitespace and deduplicates case-insensitively. Derived keyterms separately sanitize names and organizations. The request itself correctly uses `nova-3`, `paragraphs=true`, `diarize=true`, `utterances=true`, and `utt_split=1.0` on this branch.

UFM does not merely serialize the working record. It trims/collapses whitespace, joins locations, selects/falls back among values, resolves directory contacts and firms through an identity normalizer, and can substitute reporter-profile data. It does not canonicalize phones to the desired display format and does not intentionally change capitalization, but directory selection can change which spelling reaches the envelope.

## Answers to the final questions

1. **Where is the formatting authority today?** It is distributed. `applyExtraction` is the strongest extraction-boundary authority; `CaseRecord` is the effective data authority; projections, keyterms, UFM, and export still act independently.
2. **How many competing implementations exist?** Eight executed layers affect Intake/downstream representations, plus one material fallback/legacy parser implementation.
3. **Which code is actually executed?** `aiExtract`/`extract-nod`, `applyExtraction` and reducer, case normalization on load, field projection, selected reporter helpers, keyterm/Deepgram builders, UFM builder, and export adapters.
4. **Which code is obsolete?** `nodParser.ts` is documented as fallback/reference and is not the normal AI extraction path. It should not be treated as the formatting authority. Branch-only implementations not present in the canonical tree are likewise non-executing until merged.
5. **What should become permanent authority?** A field-policy registry in a single canonical normalization module, applied at every write into the working `CaseRecord` and nowhere else for canonical value formatting.
6. **Why did fixes regress?** They were placed in non-authoritative parsers or UI/builder-specific layers, bypassed by other entry routes, overwritten by later projections/builders, or left on divergent branches.
7. **Implementation order:** freeze behavior with characterization tests; define raw evidence and field policies; introduce canonical normalization; route extraction/import/manual/load writes through it; migrate consumers to canonical values; remove consumer formatting; centralize confirmation; then delete/quarantine legacy duplicates.

