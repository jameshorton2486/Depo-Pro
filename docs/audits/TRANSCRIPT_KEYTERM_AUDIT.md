# Transcript + Keyterm/UFM Audit

**Date / HEAD:** 2026-06-09 / `b650db6` on actual branch `release/stage3-rc` (prompt expected `feature/stage3-workspace-core`)  
**Baseline:** `npm run test` 228/228 passed · `npm run typecheck` passed · git clean `yes`

## 1. Transcript subsystem inventory

| Subsystem | Status | Evidence |
| --- | --- | --- |
| Stage-2 screen registration | Wired | `StageContext` defines `"creation"` as stage 2 and `"workspace"` as stage 3 (`src/context/StageContext.tsx:5`, `src/context/StageContext.tsx:20`, `src/context/StageContext.tsx:28`). `DepoEditor` routes `stage === "creation"` to `TranscriptCreationScreen` and everything else after that into the workspace/editor shell (`src/components/DepoEditor.tsx:79`, `src/components/DepoEditor.tsx:92`, `src/components/DepoEditor.tsx:96`). |
| TranscriptCreationScreen reachability | Wired, not gated off | The screen is always rendered when stage is `"creation"`; `isMockMode()` only changes the provider copy in the sidebar (`src/components/TranscriptCreationScreen.tsx:13`, `src/components/TranscriptCreationScreen.tsx:223`). |
| Stage-2 screen behavior | Wired | On mount it loads latest case audio and transcription jobs, polls active jobs every 5s, starts transcription with `startTranscription(caseId)`, and auto-advances to workspace when a job completes (`src/components/TranscriptCreationScreen.tsx:23`, `src/components/TranscriptCreationScreen.tsx:56`, `src/components/TranscriptCreationScreen.tsx:89`, `src/components/TranscriptCreationScreen.tsx:112`). |
| Real transcription start path | Wired | Non-mock `startTranscription()` invokes Supabase Edge Function `transcribe-start` (`src/api/transcriptionService.ts:122`, `src/api/transcriptionService.ts:142`). `transcribe-start` loads case payload and audio, trims keyterms to budget, builds a Deepgram request preview, uploads the request artifact, and performs a real `fetch()` to Deepgram (`supabase/functions/transcribe-start/index.ts:83`, `supabase/functions/transcribe-start/index.ts:90`, `supabase/functions/transcribe-start/index.ts:99`, `supabase/functions/transcribe-start/index.ts:135`, `supabase/functions/transcribe-start/index.ts:145`). |
| Real callback/ingest path | Wired | `transcribe-start` appends a callback URL to the Deepgram request (`supabase/functions/transcribe-start/index.ts:115`, `supabase/functions/transcribe-start/index.ts:117`). `transcribe-callback` validates token, stores the raw Deepgram JSON, normalizes it, inserts transcript/speaker/utterance/word rows, and marks the job complete (`supabase/functions/transcribe-callback/index.ts:83`, `supabase/functions/transcribe-callback/index.ts:93`, `supabase/functions/transcribe-callback/index.ts:99`, `supabase/functions/transcribe-callback/index.ts:107`, `supabase/functions/transcribe-callback/index.ts:120`). |
| Mock transcription path | Wired mock fallback | In mock mode, the client creates an in-memory job, attaches an offline Deepgram-shaped fixture, and completes it on a timer via `scheduleMockCompletion()` (`src/api/transcriptionService.ts:54`, `src/api/transcriptionService.ts:97`, `src/api/transcriptionService.ts:123`, `src/api/transcriptionService.ts:136`). |
| Transcript normalizer | Wired | Canonical transcript data is built from `results.utterances` when present, with fallback utterance assembly only if utterances are missing; words retain `raw_text`, timestamps, confidence, filler markers, and stable derived IDs (`src/lib/transcript/normalize.ts:79`, `src/lib/transcript/normalize.ts:125`, `src/lib/transcript/normalize.ts:128`, `src/lib/transcript/normalize.ts:148`, `src/lib/transcript/normalize.ts:175`). |
| Transcript persistence model | Wired | Raw callback JSON is uploaded to storage, transcript metadata goes to `transcripts`, speakers to `transcript_speakers`, utterances to `transcript_utterances`, words to `transcript_words`, and ingest audit to `transcript_audit_log` (`supabase/functions/transcribe-callback/index.ts:94`, `supabase/functions/transcribe-callback/index.ts:193`, `supabase/functions/transcribe-callback/index.ts:227`, `supabase/functions/transcribe-callback/index.ts:249`, `supabase/functions/transcribe-callback/index.ts:272`, `supabase/functions/transcribe-callback/index.ts:302`). |
| Workspace document loading | Wired | `DocumentContext.loadDocument()` calls `workspaceApi.getDocument()`, which loads the latest completed transcript snapshot from Supabase in non-real-API mode or through the contract API in real-API mode (`src/context/DocumentContext.tsx:247`, `src/api/workspaceService.ts:126`, `src/api/workspaceService.ts:543`, `src/api/workspaceService.ts:553`, `src/api/workspaceService.ts:566`). |
| Editor/audio sync | Wired | Clicking a transcript word seeks and plays audio (`src/components/TranscriptEditor/TranscriptEditor.tsx:174`, `src/components/TranscriptEditor/TranscriptEditor.tsx:190`). A `requestAnimationFrame` loop binary-searches current time to word id and toggles `.word-playing` directly in the DOM (`src/components/TranscriptEditor/TranscriptEditor.tsx:203`, `src/components/TranscriptEditor/TranscriptEditor.tsx:206`, `src/components/TranscriptEditor/TranscriptEditor.tsx:231`). `AudioPlayer` registers absolute seek/play/pause controls with shared audio context (`src/components/AudioPlayer/AudioPlayer.tsx:164`, `src/components/AudioPlayer/AudioPlayer.tsx:167`). |
| Speaker mapping surface | Wired | `SpeakerPanel` edits speaker labels/roles, persists them through `workspaceApi.saveSpeakers()`, and can reassign the active utterance speaker across utterance and word rows (`src/components/SpeakerPanel/SpeakerPanel.tsx:86`, `src/components/SpeakerPanel/SpeakerPanel.tsx:97`, `src/components/SpeakerPanel/SpeakerPanel.tsx:363`, `src/api/workspaceService.ts:403`, `src/api/workspaceService.ts:450`). |
| Confidence review surface | Wired | `ConfidencePanel` reads low-confidence queue state from the ProseMirror plugin, seeks audio to a word, persists reviewed/unreviewed word ids, and exposes a completion UI (`src/components/ConfidencePanel/ConfidencePanel.tsx:28`, `src/components/ConfidencePanel/ConfidencePanel.tsx:56`, `src/components/ConfidencePanel/ConfidencePanel.tsx:81`, `src/api/workspaceService.ts:334`). |

## 2. Keyterm/UFM subsystem inventory

### Actual keyterm pipeline today

1. `CaseRecord` is the durable source. `saveCase()` persists the entire record into `cases.payload` JSONB (`src/api/caseService.ts:47`, `src/api/caseService.ts:74`, `supabase/migrations/20260603210000_create_core_schema.sql:38`).
2. When a case shell mounts, `DepoEditor` seeds `KeytermProvider` with `buildManagedKeyterms({ record, provenance })` (`src/components/DepoEditor.tsx:187`, `src/components/DepoEditor.tsx:192`).
3. `buildManagedKeyterms()` combines two sources:
   - harvested suggestions from `harvestKeyterms(record, provenance)` (`src/lib/keyterms/managedKeyterms.ts:91`, `src/lib/keyterms/managedKeyterms.ts:95`)
   - already-saved `record.deepgram.keyterms` (`src/lib/keyterms/managedKeyterms.ts:115`)
4. Intake also merges parser-derived harvest suggestions during document extraction via `DocumentUploadPanel.mergeHarvestedSuggestions()` (`src/components/IntakeScreen/DocumentUploadPanel.tsx:489`, `src/components/IntakeScreen/DocumentUploadPanel.tsx:494`, `src/components/IntakeScreen/DocumentUploadPanel.tsx:500`).
5. The UI can also generate derived terms directly from case data with `deriveKeytermsWithBudget(record)` inside `DeepgramKeytermManager.applyDerivedKeyterms()` (`src/components/DeepgramKeytermManager/DeepgramKeytermManager.tsx:546`).
6. `keytermStore` ranks and prunes terms automatically using `rankKeyterms()` and `pruneToLimits()` (`src/components/DeepgramKeytermManager/keytermStore.tsx:51`, `src/components/DeepgramKeytermManager/keytermStore.tsx:82`, `src/components/DeepgramKeytermManager/keytermStore.tsx:97`, `src/components/DeepgramKeytermManager/keytermStore.tsx:129`).
7. Intake serializes managed UI state back into storage-layer `DeepgramKeyterm[]` with `serializeManagedKeyterms()` and writes it into `record.deepgram.keyterms` (`src/components/IntakeScreen/IntakeScreen.tsx:1466`, `src/components/IntakeScreen/IntakeScreen.tsx:1470`, `src/lib/keyterms/managedKeyterms.ts:171`).
8. `saveCase()` then persists those stored keyterms in `cases.payload` (`src/api/caseService.ts:74`).
9. At transcription start, the Edge Function reads `record.deepgram.keyterms` back out of stored payload, enforces request budget with `fitStoredKeytermsToRequestBudget()`, then builds the request with `buildDeepgramRequestFromStoredKeyterms()` (`supabase/functions/transcribe-start/index.ts:89`, `supabase/functions/transcribe-start/index.ts:90`, `supabase/functions/transcribe-start/index.ts:99`).
10. The wire request uses repeated `keyterm=` query params with plain strings, not `term:boost` syntax (`src/lib/deepgram/buildDeepgramRequest.ts:111`, `src/lib/deepgram/buildDeepgramRequest.ts:115`, `src/lib/deepgram/buildDeepgramRequest.ts:140`).

### Where the current graph breaks or diverges

- `normalizeDeepgramKeyterms()` exists, but the production transcription path does not call it. The only live request builder in the real path is `buildDeepgramRequestFromStoredKeyterms()` inside `transcribe-start` (`src/api/transcriptionService.ts:71`, `supabase/functions/transcribe-start/index.ts:99`).
- `keytermExtractor.ts` contains unusual-spelling and phonetic logic, but it is attached to legacy/fallback parsers (`nodParser.ts`, `reporterNotesParser.ts`), not to the active Stage-2 request path or current ranking/pruning path (`src/lib/parsing/nodParser.ts:9`, `src/lib/parsing/reporterNotesParser.ts:52`, `src/lib/parsing/keytermExtractor.ts:82`, `src/lib/parsing/keytermExtractor.ts:84`).

### Caps and correctness

| Item | Current implementation | Notes |
| --- | --- | --- |
| Hard caps | `MAX_TERMS = 100`, `MAX_TOKENS = 500` in pruner (`src/lib/keytermPruner.ts:14`) and `DEEPGRAM_KEYTERM_HARD_TERM_CAP = 100`, `DEEPGRAM_KEYTERM_HARD_TOKEN_CAP = 500` in derivation (`src/lib/keytermDerivation.ts:7`) | Matches the Nova-3 assumptions encoded by the codebase. |
| Soft caps | `90` terms / `400` tokens for derivation and request fitting (`src/lib/keytermDerivation.ts:9`, `src/lib/deepgram/requestBudget.ts:27`) | Conservative buffer below the hard cap. |
| Wire format | Repeated `keyterm=<plain string>` params (`src/lib/deepgram/buildDeepgramRequest.ts:115`) | No Nova-2 `term:boost` string is sent. |
| Legacy Nova-2 artifacts | Local preview envelope still carries `boost` metadata for UI/preview only (`src/lib/deepgram/buildDeepgramRequest.ts:126`) | Informational only; not used on wire. |
| `keywords` param usage | Not found in the live request path (`src/lib/deepgram/buildDeepgramRequest.ts:104`) | Good: no `keywords` param in active send path. |

### Deepgram request construction vs. current case defaults

`buildDeepgramRequest()` hardcodes:

- `model=nova-3`
- `punctuate=true`
- `paragraphs=true`
- `diarize=true`
- `diarize_model=latest`
- `filler_words=true`
- `utterances=true`
- `smart_format=true`

Evidence: `src/lib/deepgram/buildDeepgramRequest.ts:48`

Alignment and drift:

- Aligned with defaults on `model`, `diarize`, and `smart_format` per the test guarding that subset (`src/lib/deepgram/buildDeepgramRequest.test.ts:103`).
- `DeepgramConfig` also defines `language`, `speaker_count`, and `numerals`, but `buildDeepgramRequest()` does not send them (`src/types/case.ts:347`, `src/types/case.ts:445`, `src/lib/deepgram/buildDeepgramRequest.ts:48`).
- No `mip_opt_out` param is sent anywhere in the request builder (`src/lib/deepgram/buildDeepgramRequest.ts:48`).

### Is a Deepgram keyterm JSON file produced anywhere?

No standalone keyterm JSON artifact was found.

- Durable keyterms live inside `cases.payload.deepgram.keyterms` (`src/api/caseService.ts:47`, `src/components/IntakeScreen/IntakeScreen.tsx:1466`).
- The Edge Function uploads a Deepgram request artifact JSON and a raw Deepgram response JSON, but not a dedicated `keyterms.json` file (`supabase/functions/transcribe-start/index.ts:119`, `supabase/functions/transcribe-start/index.ts:135`, `supabase/functions/transcribe-callback/index.ts:94`).
- The UI can preview/copy a structured request envelope, but that is generated on demand in memory (`src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:64`, `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:71`, `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:167`).

## 3. UFM source of truth + field list + UFM->keyterm mapping table

### Real UFM source of truth

There is no standalone `ufm` or `ufm_metadata` table in the schema I inspected.

- `cases` stores a `payload jsonb` column (`supabase/migrations/20260603210000_create_core_schema.sql:38`).
- `saveCase()` writes the full `CaseRecord` into that payload (`src/api/caseService.ts:47`, `src/api/caseService.ts:74`).
- `buildUfmMetadata()` derives a runtime `UfmMetadataEnvelope` from the current `CaseRecord`, provenance, optional reporter profile, and optional directory data; it does not persist that envelope itself (`src/lib/ufm/buildUfmMetadata.ts:71`, `src/lib/ufm/buildUfmMetadata.ts:487`, `src/components/IntakeScreen/UfmPayloadPreview.tsx:98`).

Conclusion: the authoritative UFM inputs live in `cases.payload` plus directory/profile lookups; the UFM envelope is a derived runtime structure, not a dedicated table.

### Actual UFM field list emitted by `buildUfmMetadata()`

`ufm_metadata` contains these keys (`src/lib/ufm/buildUfmMetadata.ts:510`):

| UFM field | Shape | Built from |
| --- | --- | --- |
| `cause_number` | `string \| null` | `record.caption.case_number` |
| `caption` | `string \| null` | `case_style` fallback `case_name` |
| `court` | `string \| null` | `record.caption.court_name` |
| `judicial_district` | `string \| null` | `record.caption.judicial_district` |
| `division` | `string \| null` | `record.caption.division` |
| `county` | `string \| null` | `record.caption.county` |
| `state` | `string \| null` | caption state, else session state, else `"Texas"` |
| `jurisdiction_type` | `string \| null` | `record.caption.jurisdiction_type` |
| `deponent` | `string \| null` | witness names or caption fallback |
| `deposition_date` | `string \| null` | `record.session.deposition_date` |
| `start_time` | `string \| null` | `record.session.start_time` |
| `end_time` | `string \| null` | `record.session.end_time` |
| `address` | `string \| null` | joined session address/city/state/zip |
| `location_type` | `string \| null` | `record.session.location_type` |
| `remote_platform` | `string \| null` | scheduling remote platform, else session remote platform |
| `noticing_party` | `string \| null` | `record.scheduling.noticing_party` |
| `service_type` | `string \| null` | `record.scheduling.service_type` |
| `parties` | array of `{ name, role, role_modifier, entity_type, fka_or_dba }` | `record.parties` |
| `law_firms` | array of `{ name, address, city, state, zip, phone, fax, email, represented_party }` | explicit `record.law_firms` plus derived attorney/videographer firm data |
| `service_date` | `string \| null` | `record.service.service_date` |
| `served_parties` | `string[]` | `record.service.served_parties` |
| `service_emails` | `string[]` | `record.service.service_emails` |
| `reporter_requests` | object with `certified_reporter_required`, `stenographic_recording`, `audiovisual_recording`, `realtime_requested`, `expedited_delivery`, `rush_delivery`, `daily_copy`, `rough_draft` | `record.reporter_requests` |
| `csr_name` | `string \| null` | reporter profile fallback to `record.reporter.name` |
| `csr_license` | `string \| null` | reporter profile fallback to `record.reporter.cert_number` |
| `firm_registration` | `string \| null` | reporter profile fallback to `record.reporter.firm_registration_number` |
| `csr_cert_expiration` | `string \| null` | reporter profile fallback to `record.reporter.license_expiration` |
| `custodial_attorney` | `string \| null` | first populated of `ordered_by`, `scheduler`, `scheduling_contact` |
| `requesting_party` | `string \| null` | `record.scheduling.noticing_party` |
| `appearances` | array of appearance objects across attorneys, interpreters, videographers, participants | `buildAppearances()` |
| `volume` | `string` | hardcoded `"1"` |
| `proceedings_month` | `string \| null` | derived from deposition date |
| `proceedings_day` | `string \| null` | derived from deposition date |
| `proceedings_year` | `string \| null` | derived from deposition date |

### UFM field -> currently harvested as keyterm?

This answers whether the current active keyterm pipeline (`harvestKeyterms()` and `deriveKeytermsWithBudget()`) already pulls the same underlying data, not whether it reads the built UFM envelope object directly.

| UFM field | Harvested today? | Where |
| --- | --- | --- |
| `cause_number` | Yes | `harvestKeyterms()` adds `record.caption.case_number` (`src/lib/keyterms/harvestKeyterms.ts:221`) |
| `caption` | Yes | `harvestKeyterms()` free-text scans `case_style` / `case_name`; `deriveKeytermsWithBudget()` uses party-group fallback to caption fields (`src/lib/keyterms/harvestKeyterms.ts:269`, `src/lib/keytermDerivation.ts:212`) |
| `court` | Yes | `harvestKeyterms()` adds `record.caption.court_name` (`src/lib/keyterms/harvestKeyterms.ts:233`) |
| `judicial_district` | No | Not referenced in active derivation/harvest files |
| `division` | No | Not referenced in active derivation/harvest files |
| `county` | Yes | `harvestKeyterms()` adds county; `deriveKeytermsWithBudget()` generates county variants (`src/lib/keyterms/harvestKeyterms.ts:227`, `src/lib/keytermDerivation.ts:418`) |
| `state` | No | Not referenced in active derivation/harvest files |
| `jurisdiction_type` | No | Not referenced in active derivation/harvest files |
| `deponent` | Yes | Witness names feed both harvest and derive (`src/lib/keyterms/harvestKeyterms.ts:195`, `src/lib/keytermDerivation.ts:363`) |
| `deposition_date` | No | Not referenced |
| `start_time` | No | Not referenced |
| `end_time` | No | Not referenced |
| `address` | Yes | Address/location terms are derived from session and contact address fields (`src/lib/keytermDerivation.ts:427`) |
| `location_type` | No | Not referenced |
| `remote_platform` | No | Not referenced |
| `noticing_party` | No | Not referenced in active derivation/harvest |
| `service_type` | No | Not referenced |
| `parties` | Yes | Party names are derived into party groups/tokens (`src/lib/keytermDerivation.ts:207`, `src/lib/keytermDerivation.ts:261`) |
| `law_firms` | Yes | Law-firm/organization phrases and tokens are derived from `record.law_firms` and attorney firm fields (`src/lib/keytermDerivation.ts:390`, `src/lib/keytermDerivation.ts:405`) |
| `service_date` | No | Not referenced |
| `served_parties` | No | Not referenced |
| `service_emails` | No | Not referenced |
| `reporter_requests` | No | Not referenced |
| `csr_name` | Yes | `harvestKeyterms()` adds reporter name; derivation also includes reporter person group (`src/lib/keyterms/harvestKeyterms.ts:245`, `src/lib/keytermDerivation.ts:370`) |
| `csr_license` | No | Not referenced |
| `firm_registration` | No | Not referenced |
| `csr_cert_expiration` | No | Not referenced |
| `custodial_attorney` | No | Current active derivation does not use `ordered_by` / `scheduler` / `scheduling_contact`; only legacy notice/job-sheet extractors touched related fields (`src/lib/parsing/applyExtraction.ts:724`, `src/lib/parsing/applyJobSheetExtraction.ts:450`) |
| `requesting_party` | No | Not referenced |
| `appearances` | Indirect only | The active pipeline reads the underlying record arrays for attorneys/interpreters/videographers/participants, not `ufm_metadata.appearances` itself (`src/lib/keytermDerivation.ts:375`, `src/lib/keytermDerivation.ts:380`, `src/lib/keytermDerivation.ts:385`, `src/lib/keytermDerivation.ts:319`) |
| `volume` | No | Hardcoded UFM value only (`src/lib/ufm/buildUfmMetadata.ts:552`) |
| `proceedings_month` | No | Derived UFM presentation field only (`src/lib/ufm/buildUfmMetadata.ts:553`) |
| `proceedings_day` | No | Derived UFM presentation field only (`src/lib/ufm/buildUfmMetadata.ts:554`) |
| `proceedings_year` | No | Derived UFM presentation field only (`src/lib/ufm/buildUfmMetadata.ts:555`) |

## 4. Difficulty-extraction gap

### Does current code score phonetic/orthographic difficulty?

Not in the active ranking/pruning/transcription path.

- `computePriority()` scores by category, source, boost, pinned state, and confidence only. There is no phonetic or spelling-difficulty factor (`src/lib/keytermRanker.ts:41`, `src/lib/keytermRanker.ts:44`, `src/lib/keytermRanker.ts:50`).
- `deriveKeytermsWithBudget()` prioritizes record-role groups and budget order, not pronunciation/spelling difficulty (`src/lib/keytermDerivation.ts:360`, `src/lib/keytermDerivation.ts:488`, `src/lib/keytermDerivation.ts:501`).
- `keytermExtractor.ts` does have `isUnusualSpelling()` and `buildPhoneticMappings()`, but those outputs live in the legacy parser path and are not consumed by `computePriority()`, `pruneToLimits()`, `buildManagedKeyterms()`, or `transcribe-start` (`src/lib/parsing/keytermExtractor.ts:82`, `src/lib/parsing/keytermExtractor.ts:121`, `src/lib/parsing/keytermExtractor.ts:144`).

### Smallest seam where difficulty scoring would attach

Best single seam: enrich managed/derived candidates before ranking, then feed that signal into `computePriority()`.

- `computePriority()` is the single place that converts keyterm attributes into pruning/display order (`src/lib/keytermRanker.ts:41`).
- A second viable seam is candidate generation in `deriveKeytermsWithBudget()` / `harvestKeyterms()`, but that is upstream and would still need the ranking/pruning path to honor the score (`src/lib/keytermDerivation.ts:482`, `src/lib/keyterms/harvestKeyterms.ts:188`).

### Risk note

Any difficulty-based auto-inclusion must still pass through the existing caps and pruning path.

- The current code treats `100` terms / `500` tokens as hard limits and prunes/filters selected terms accordingly (`src/lib/keytermPruner.ts:14`, `src/lib/keytermDerivation.ts:7`, `src/lib/deepgram/requestBudget.ts:15`).
- Bypassing that would create a second budgeting system and diverge from the existing Deepgram request builder.

## 5. Direct answers to the three questions

### 1. Does a transcript/keyterm system already exist?

Yes. A substantial system already exists, and much of it is wired:

- Transcript Creation is a live Stage-2 screen reached through stage routing, not a dead route (`src/components/DepoEditor.tsx:92`, `src/components/TranscriptCreationScreen.tsx:13`).
- Real transcription happens in Supabase Edge Functions: `transcribe-start` makes the Deepgram call and `transcribe-callback` ingests the results (`supabase/functions/transcribe-start/index.ts:145`, `supabase/functions/transcribe-callback/index.ts:107`).
- A mock/offline fallback also exists in the client for dev mode (`src/api/transcriptionService.ts:123`).
- The editor, audio sync, speaker mapping, and confidence review surfaces are already live (`src/components/TranscriptEditor/TranscriptEditor.tsx:174`, `src/components/AudioPlayer/AudioPlayer.tsx:164`, `src/components/SpeakerPanel/SpeakerPanel.tsx:86`, `src/components/ConfidencePanel/ConfidencePanel.tsx:81`).
- The keyterm system also exists: harvested suggestions, derived terms, ranking, pruning, a UI manager, request preview, and persisted `record.deepgram.keyterms` storage are all present (`src/lib/keyterms/harvestKeyterms.ts:188`, `src/lib/keytermDerivation.ts:482`, `src/lib/keytermRanker.ts:41`, `src/lib/keytermPruner.ts:28`, `src/components/DeepgramKeytermManager/DeepgramKeytermManager.tsx:533`, `src/components/IntakeScreen/IntakeScreen.tsx:1466`).

The main missing pieces are not “build transcript/keyterms from scratch”; they are narrower:

- `normalizeDeepgramKeyterms()` is not the production send path.
- No standalone keyterm JSON artifact exists.
- Difficulty-based spelling/pronunciation scoring is not wired into the active pipeline.

### 2. What are the UFM fields, and what is their real source of truth?

The emitted UFM fields are the `ufm_metadata` keys listed in section 3: case caption/cause/court/jurisdiction values; deponent/session/location values; scheduling values; party/law-firm/service structures; reporter/reporter-request values; `custodial_attorney`, `requesting_party`, `appearances`, `volume`, and date-part helpers (`src/lib/ufm/buildUfmMetadata.ts:510`).

Their real source of truth is not a standalone UFM table. The authoritative persisted data lives in `cases.payload` JSONB, and `buildUfmMetadata()` derives the UFM envelope at runtime from that case payload plus provenance/profile/directory inputs (`supabase/migrations/20260603210000_create_core_schema.sql:45`, `src/api/caseService.ts:53`, `src/lib/ufm/buildUfmMetadata.ts:487`).

### 3. What is the smallest gap between today’s code and “UFM -> difficulty-filtered keyterm JSON uploaded to Deepgram on the Transcripts screen”?

Smallest named gaps:

1. **No standalone keyterm artifact.** Today keyterms persist in `cases.payload.deepgram.keyterms`; there is no dedicated exported `keyterms.json` file (`src/api/caseService.ts:53`, `supabase/functions/transcribe-start/index.ts:119`).
2. **UFM envelope is not the active keyterm source.** Current keyterm derivation reads `CaseRecord` directly, not `buildUfmMetadata()` output (`src/lib/keytermDerivation.ts:360`, `src/lib/keyterms/harvestKeyterms.ts:188`).
3. **Difficulty scoring is absent from the active ranking path.** `computePriority()` has no phonetic/orthographic factor (`src/lib/keytermRanker.ts:41`).
4. **The production Deepgram send path bypasses `normalizeDeepgramKeyterms()`.** Real transcription uses `fitStoredKeytermsToRequestBudget()` + `buildDeepgramRequestFromStoredKeyterms()` inside `transcribe-start` (`supabase/functions/transcribe-start/index.ts:90`, `supabase/functions/transcribe-start/index.ts:99`).
5. **Stage-2 UI does not currently expose a distinct “UFM-derived difficulty file” concept.** The existing Transcript Creation screen starts jobs and shows job state; keyterm management currently lives on Intake (`src/components/TranscriptCreationScreen.tsx:170`, `src/components/IntakeScreen/IntakeScreen.tsx:1725`).

## Appendix — files inspected

- `AGENTS.md`
- `docs/architecture/MASTER_ARCHITECTURE.md`
- `src/context/StageContext.tsx`
- `src/components/DepoEditor.tsx`
- `src/components/TranscriptCreationScreen.tsx`
- `src/api/transcriptionService.ts`
- `src/lib/transcriptionJobs.ts`
- `supabase/functions/transcribe-start/index.ts`
- `supabase/functions/transcribe-callback/index.ts`
- `src/lib/deepgram/buildDeepgramRequest.ts`
- `src/lib/deepgram/requestBudget.ts`
- `src/lib/transcript/types.ts`
- `src/lib/transcript/normalize.ts`
- `src/lib/transcript/offlineFixture.ts`
- `src/api/transcriptRepository.ts`
- `src/context/DocumentContext.tsx`
- `src/api/workspaceService.ts`
- `src/components/TranscriptEditor/TranscriptEditor.tsx`
- `src/components/AudioPlayer/AudioPlayer.tsx`
- `src/components/SpeakerPanel/SpeakerPanel.tsx`
- `src/components/ConfidencePanel/ConfidencePanel.tsx`
- `src/lib/keyterms/harvestKeyterms.ts`
- `src/lib/keyterms/managedKeyterms.ts`
- `src/lib/keyterms/manualKeytermHint.ts`
- `src/lib/keytermDerivation.ts`
- `src/lib/keytermRanker.ts`
- `src/lib/keytermPruner.ts`
- `src/lib/parsing/keytermExtractor.ts`
- `src/lib/parsing/nodParser.ts`
- `src/lib/parsing/reporterNotesParser.ts`
- `src/lib/parsing/applyExtraction.ts`
- `src/lib/parsing/applyJobSheetExtraction.ts`
- `src/components/DeepgramKeytermManager/DeepgramKeytermManager.tsx`
- `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx`
- `src/components/DeepgramKeytermManager/keytermStore.tsx`
- `src/components/DeepgramKeytermManager/types.ts`
- `src/components/IntakeScreen/IntakeScreen.tsx`
- `src/components/IntakeScreen/DocumentUploadPanel.tsx`
- `src/components/IntakeScreen/UfmPayloadPreview.tsx`
- `src/lib/ufm/buildUfmMetadata.ts`
- `src/types/case.ts`
- `src/api/caseService.ts`
- `supabase/migrations/20260603210000_create_core_schema.sql`
