# Formatting Pipeline Map

## Executed pipeline

```text
Document upload
  -> document text extraction
  -> aiExtract.ts
  -> Supabase extract-nod Edge Function
  -> ExtractedNODFields (value + confidence + inferred)
  -> applyExtraction.ts / applyJobSheetExtraction.ts
  -> ExtractionApplication (updates, entity adds/patches, conflicts)
  -> intakeReducer.ts
  -> CaseRecord ExtractedField leaves
  -> caseService persistence / normalizeCaseRecord on load
  -> consumers
       |- fieldProjection -> Extracted Fields Review
       |- keytermDerivation / autoSeedKeyterms -> managed keyterms
       |    -> buildDeepgramRequest -> transcribe-start
       |- buildUfmMetadata -> UFM preview / UFM consumers
       |- transcript adapters / entity registry -> creation and workspace
       `- ExportScreen / export adapters -> export
```

`nodParser.ts` is a parallel fallback/reference path, not the normal upload path.

## Lifecycle by field family

| Family | Extraction | Mapping/normalization | Working field | Review | Deepgram | UFM | Export/workspace |
|---|---|---|---|---|---|---|---|
| Cause number | `cause_number` | Queued mostly as received | `caption.case_number` | Direct string display | Auto-seed candidate; request trims whitespace | `normalizeValue` | Export reads value directly; case/transcript metadata may consume it |
| Phone | Attorney/firm structured fields; profiles/directories/manual | No universal formatter | Entity/detail phone properties | Reporter path may call `formatPhoneDisplay`; other paths direct | Not normally a term | Picks record/directory value and whitespace-normalizes | Adapter-dependent; no global format |
| Caption | `case_style` | Also used as `case_name` fallback | `caption.case_style`, `case_name` | Direct string display | Derivation may use caption fallback for party terms | Whitespace-normalized | Export reads case name/number directly |
| Court | `court_name`, district/division/county/state | County/state/jurisdiction selected normalization | Caption court fields | Direct display | Not a default auto-seed term | Whitespace-normalized | Consumed through metadata/export paths |
| Witness | Witness objects | Matching, add/patch logic | `witnesses[]` | Direct display | Confirmed names can trigger derivation; auto-seed adds full name/surname | Whitespace-normalized | Entity registry and transcript speaker tooling consume names |
| Attorney | Attorney objects | Matching, add/patch, role mapping | `attorneys[]` | Direct display | Confirmed names can trigger derivation; auto-seed adds names | Directory enrichment and identity matching | Transcript/entity/export paths consume names/roles |
| Firm | Firm and attorney fields | Add/patch and cleanup | `law_firms[]`, attorney firm | Direct display | Organization candidates sanitized/deduped | Record plus directory merging | Export/UFM consume selected result |
| Location | Location and remote structures; job sheet | ISO date/time, county/state, enum mappings | Session/scheduling leaves | Location type converted to friendly label | No direct request field | Components joined into address | Export-specific metadata |
| Legal terms | Source text/keyterm harvest | Keyterm-specific sanitization and ranking | Deepgram keyterm store | Keyterm manager | Independent whitespace normalization and case-insensitive dedupe | Not a general UFM field | Transcript recognition only |
| Reporter | Extraction/profile/manual | Profile import and UI parsing | Reporter leaves | Reporter date/phone display helpers | Reporter name auto-seed candidate | Profile can supersede record; marked confirmed | Certification/export consume reporter metadata |
| Scheduling | Extracted notice/job sheet | Mostly direct; date/time selected normalization | Scheduling/session leaves | Direct display | No direct formatting sharing | Subset whitespace-normalized | Workflow/export consumers |

## Consumer behavior matrix

| Consumer | Reads | Formats? | Capitalizes? | Phone-formats? | Title-cases? |
|---|---|---:|---:|---:|---:|
| Working `CaseRecord` | Stored `ExtractedField.value` | No inherent policy | No | No | No |
| `normalizeCaseRecord` | Persisted payload | Structural coercion only | No | No | No |
| Field projection | Working values | String conversion, list joins, enum label | No general rule | No | No |
| Extracted Fields Review | Projection rows | UI editing/presentation | No general rule | Reporter-only path elsewhere | No general rule |
| Keyterm derivation | Working values | Sanitizes phrases/tokens, strips some suffixes | Preserves candidate spelling | No | No |
| Deepgram builder | Stored keyterms | Trim/collapse whitespace, dedupe/sort | Case-insensitive identity, preserves selected spelling | No | No |
| UFM builder | Working values + directories/profile | Trim/collapse, joins, fallbacks, identity matching | No display-case transform | No; whitespace only | No |
| UFM preview | UFM envelope | JSON presentation only | No | No | No |
| Transcript creation/workspace | Case metadata/entity registry plus transcript | Separate transcript formatting systems | Speaker/entity dependent | No | No general Intake rule |
| Export | Transcript + record metadata | Adapter/protocol formatting | Adapter-dependent | No shared policy | Adapter-dependent |

## Cause-number conflict

The same stored cause number is sent through three different downstream behaviors: direct display/export, whitespace-normalized UFM, and keyterm normalization. None owns canonical cause-number casing or punctuation. Therefore matching visual output everywhere is accidental rather than guaranteed.

## Phone conflict

The reporter editor produces `(###) ###-####` progressively, while attorney, firm, directory, participant, interpreter, and videographer values can remain in source form. UFM only trims spaces. A phone may therefore display differently depending on which entity and consumer supplies it.

