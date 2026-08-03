# Formatting Function Inventory

This inventory distinguishes structural normalization from canonical field formatting. “Authoritative” means authoritative only in the current limited scope, not a repository-wide authority.

| File | Function/area | Purpose | Current consumer | Duplicate/dead | Authority |
|---|---|---|---|---|---|
| `supabase/functions/extract-nod/index.ts` | extraction prompt/schema | Produces structured values and confidence | `aiExtract` | Competes with fallback parser assumptions | Active extraction, not canonical formatting |
| `src/lib/parsing/applyExtraction.ts` | `applyExtraction`, cleanup/normalize helpers | Maps extraction to field paths; ISO date/time, county/state, jurisdiction, location and entity cleanup | Intake extraction | Overlaps job-sheet/fallback/UFM cleanup | Active partial normalization |
| `src/lib/parsing/applyJobSheetExtraction.ts` | job-sheet mapping helpers | Maps scheduling/session data | Intake extraction | Parallel source mapper | Active for job sheets |
| `src/lib/parsing/nodParser.ts` | `titleCase`, `capitalize`, regex parsing, phone extraction | Deterministic NOD fallback/reference | Tests/fallback uses only | Material duplicate; normal AI path does not call it | Non-authoritative legacy/reference |
| `src/lib/parsing/reporterNotesParser.ts` | parser cleanup | Parses reporter notes | Reporter intake path | Source-specific | Active only for reporter notes |
| `src/types/case.ts` | `normalize*` case-shape functions | Coerces persisted unknown data into frozen domain shape | case load/tests | Name suggests formatting but mostly structural | Authoritative shape coercion |
| `src/lib/normalizeCaseRecord.ts` | `normalizeCaseRecord` | Delegates case-shape normalization | `caseService.loadCase` | Thin wrapper | Active load boundary |
| `src/store/intakeReducer.ts` | `applyFieldUpdate`, location derivation | Updates working fields and detects confirmed-source conflicts | `IntakeContext` | No value formatter | Authoritative mutation/conflict path |
| `src/components/ExtractedFieldsTable/fieldProjection.ts` | `makeRow`, `formatLocationType`, projection | Converts working fields to review rows/status | Extracted Fields Review | Presentation layer duplicates selected semantic labels | Active display projection |
| `src/components/IntakeScreen/reporterFieldFormatting.ts` | `digitsOnly`, `formatPhoneDisplay`, date helpers | Reporter-specific UI formatting/parsing | Intake reporter controls | Phone policy not reused by other phone fields | Active narrow formatter |
| `src/lib/keytermDerivation.ts` | whitespace/token/name/org sanitizers | Derives bounded case keyterms | Deepgram keyterm store | Independent canonicalization | Active keyterm authority only |
| `src/lib/keyterms/autoSeedKeyterms.ts` | `normalizeTerm`, name/surname seeding | Auto-seeds case terms | Keyterm workflow | Duplicates whitespace/dedupe logic | Active auto-seed authority |
| `src/lib/parsing/keytermExtractor.ts` | `extractKeyterms` and normalizers | Extracts transcript-oriented terms and phonetic mappings | Keyterm workflow | Parallel to case derivation | Active specialized path |
| `src/lib/keyterms/managedKeyterms.ts` | metadata parsing/normalization | Stores selection/source metadata | Keyterm manager/request builder | Specialized | Active |
| `src/lib/deepgram/buildDeepgramRequest.ts` | `normalizeWhitespace`, selected-term normalization | Builds final request URL and keyterm list | transcription service/preview | Repeats whitespace and case-insensitive dedupe | Authoritative wire request only |
| `src/lib/ufm/buildUfmMetadata.ts` | `normalizeValue`, `normalizeIdentity`, join/fallback helpers | Builds UFM envelope and enriches directory/profile data | UFM preview/downstream | Re-normalizes working values; can select alternate spelling | Authoritative UFM envelope only |
| `src/components/UfmPayloadPreview.tsx` | JSON presentation | Displays builder output | Intake preview | No independent formatter | Active, not authority |
| `src/components/ExportScreen/ExportScreen.tsx` | export metadata assembly | Sends transcript and direct case metadata to export | Export | Bypasses UFM for some values | Active consumer |
| `src/lib/export/exportAdapter.ts` and Edge export adapters | protocol mapping | Produces export requests/files | Export | Separate output rules | Active output authority |
| `src/adapters/caseToEditorDocument.ts` | case-to-editor mapping | Supplies case entities/metadata to transcript editor | Transcript creation/workspace | Consumer-specific transformation | Active adapter |
| `src/lib/transcript/entityRegistry.ts` | identity normalization/matching | Builds transcript entity registry | Workspace intelligence | Separate from Intake display formatting | Active transcript authority |
| `src/lib/format/*` | transcript/editor formatting helpers | CFE/editor fragments/honorifics | Transcript formatting | Different domain; must not become Intake formatter | Active transcript-only |

## Search classification

Repository searches for `toUpperCase`, `toLowerCase`, `titleCase`, `capitalize`, `normalize`, `formatPhone`, `formatCase`, `prettyPrint`, `displayValue`, `projection`, and `formatter` also find many transcript-only and infrastructure functions. Those are not competing Intake canonical formatters merely because they normalize internal data. The table includes functions that can alter an Intake value, choose its representation, or select which representation a downstream consumer receives.

## Capitalization inventory

- Active AI extraction largely preserves/model-selects source capitalization; no post-response global proper-case policy exists.
- `nodParser.ts` title-cases/capitalizes selected fields and hard-codes some courts uppercase, but is not the normal path.
- Keyterm logic compares case-insensitively while generally preserving selected term spelling.
- UFM identity matching removes periods and lowercases lookup keys, but output normally retains the selected record/directory spelling.
- Enum/status UI labels use deliberate display capitalization and should remain presentation-only.
- Transcript formatters own legal transcript capitalization and are a separate domain from Intake metadata normalization.

There is no reliable sentence-case, title-case, proper-noun, or legal-term policy shared by all Intake entry paths.

