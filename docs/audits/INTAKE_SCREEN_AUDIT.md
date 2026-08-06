# Intake Screen Audit

## Scope
This report treats Intake as a Case Assembly Engine, not as a form. The question is what Intake currently assembles, persists, validates, and hands off before transcription begins. Intake mounts only for `stage === "intake"` inside `StageRouter`, under `IntakeProvider`, `ConflictProvider`, and `KeytermProvider`. `src/components/DepoEditor.tsx:104-149`

## Executive Summary
- Intake is the only screen in this repo that reads and writes a real Supabase case package through `cases.payload`, plus real `contacts` rows and real `field_provenance` events. `src/components/IntakeScreen/IntakeScreen.tsx:1001-1007`, `src/components/IntakeScreen/IntakeScreen.tsx:1073-1087`, `src/api/caseService.ts:12-40`, `src/api/contactService.ts:4-97`, `src/components/conflict/conflictStore.tsx:123-178`
- Intake’s visible extracted-field state in this repo is still mock-seeded from `mockCaseRecord`, not parsed from uploaded documents. `src/components/IntakeScreen/IntakeScreen.tsx:1020-1034`, `src/components/ExtractedFieldsTable/mockRecord.ts:14-115`
- The screen collects some case-package data well enough to persist it, but large parts of the `CaseRecord` schema are still not rendered or not wired. `src/types/case.ts:282-317`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165`
- Audio upload state and transcript-generation state are not tracked as separate durable Intake states. `CaseRecord` has `audio: CaseAudio | null`, but Intake never writes it, and there is no Intake-side transcript-generated flag at all. Transcript state lives later in `DocumentProvider`, outside Intake. `src/types/case.ts:227-235`, `src/types/case.ts:304`, `src/components/IntakeScreen/IntakeScreen.tsx:247-314`, `src/context/DocumentContext.tsx:24-37`, `src/context/DocumentContext.tsx:204-268`
- The human-in-the-loop extraction requirement does not fully hold in current visible repo state because several `source: "extracted"` mock values are already `confirmed: true` before any user action. `src/components/ExtractedFieldsTable/mockRecord.ts:21-24`, `src/components/ExtractedFieldsTable/mockRecord.ts:29-37`

## Field Inventory
Unless noted otherwise, “included in saved payload” is `Yes` because `saveCase(record)` persists the entire `CaseRecord` as `payload`. `src/api/caseService.ts:12-29`

| Field path | Defined where | Rendered where / not rendered | Editable? | Wired to reducer action? | Included in saved payload? | Populated by mock, manual entry, or extraction? |
|---|---|---|---|---|---|---|
| `version`, `created_at`, `updated_at`, `case_id` | `src/types/case.ts:282-286` | Not editable; `jobId` appears in `WorkflowNav`. `src/components/IntakeScreen/IntakeScreen.tsx:86-123` | No | Only lifecycle actions hydrate/init the record. `src/store/intakeReducer.ts:287-302` | Yes | Factory, persisted row, or mock fallback. `src/types/case.ts:365-370`, `src/components/IntakeScreen/IntakeScreen.tsx:999-1038` |
| `proceeding_type` | `src/types/case.ts:288` | Not rendered | No | `SET_PROCEEDING_TYPE` exists, but no Intake UI calls it. `src/store/intakeReducer.ts:304-315`, `src/context/IntakeContext.tsx:117-119` | Yes | Factory, persisted row, or mock fallback |
| `caption.*` | `src/types/case.ts:57-63` | Extracted Fields table only. `src/components/ExtractedFieldsTable/fieldProjection.ts:122-128`, `src/components/IntakeScreen/IntakeScreen.tsx:1115-1138` | Indirect only: confirm/resolve, no direct text inputs | `CONFIRM_FIELD`, `CONFIRM_ALL`, `RESOLVE_CONFLICT` reachable; generic `UPDATE_FIELD` has no UI entry point. `src/components/IntakeScreen/IntakeScreen.tsx:1125-1138`, `src/store/intakeReducer.ts:345-393` | Yes | Mock extracted/manual in this repo. `src/components/ExtractedFieldsTable/mockRecord.ts:21-27` |
| `session.deposition_date`, `start_time`, `end_time`, `location_address`, `location_city`, `location_state`, `location_zip` | `src/types/case.ts:158-167` | Extracted Fields table only. `src/components/ExtractedFieldsTable/fieldProjection.ts:130-138` | Indirect only | Same confirm/resolve wiring as caption fields | Yes | Mock extracted/manual in this repo. `src/components/ExtractedFieldsTable/mockRecord.ts:29-40` |
| `session.is_remote`, `session.remote_platform` | `src/types/case.ts:166-167` | Not rendered | No | No UI action | Yes | Factory/persisted/mock row |
| `proceeding.*` | `src/types/case.ts:172-181` | Not rendered | No | No Intake UI action | Yes | Mock/persisted row. `src/components/ExtractedFieldsTable/mockRecord.ts:42-50` |
| `reporter.name`, `cert_number`, `cert_state`, `firm` | `src/types/case.ts:144-153` | Extracted Fields table only. `src/components/ExtractedFieldsTable/fieldProjection.ts:140-145` | Indirect only | Confirm/resolve only | Yes | Mock imported/manual in this repo. `src/components/ExtractedFieldsTable/mockRecord.ts:52-62` |
| `reporter.email`, `phone`, `notary_required`, `notary_name`, `notary_commission_expiry` | `src/types/case.ts:149-153` | Not rendered | No | No UI action | Yes | Mock/persisted row |
| `format.*` | `src/types/case.ts:186-194` | Not rendered | No | No reducer/UI action | Yes | Factory defaults or persisted row. `src/types/case.ts:326-336` |
| `witnesses[*].name`, `role`, `title`, `employer` | `src/types/case.ts:95-103` | Extracted Fields table only. `src/components/ExtractedFieldsTable/fieldProjection.ts:147-154` | Indirect only | Confirm/resolve only; no add/edit/remove witness UI | Yes | Mock extracted in this repo. `src/components/ExtractedFieldsTable/mockRecord.ts:66-76` |
| `witnesses[*].email`, `phone` | `src/types/case.ts:101-102` | Not rendered | No | No Intake UI action | Yes | Mock/persisted row |
| `attorneys[*].name`, `firm`, `role`, `representing`, `bar_number` | `src/types/case.ts:82-91` | Extracted Fields table and static cards in Appearances. `src/components/ExtractedFieldsTable/fieldProjection.ts:156-164`, `src/components/IntakeScreen/IntakeScreen.tsx:652-705` | Existing-card replace/remove only | `UPDATE_ATTORNEY` and `REMOVE_ATTORNEY` are reachable when cards already exist; `ADD_ATTORNEY` is not effectively wired because `handleSelect` has no `attorney` branch. `src/components/IntakeScreen/IntakeScreen.tsx:556-592`, `src/components/IntakeScreen/IntakeScreen.tsx:594-608`, `src/components/IntakeScreen/IntakeScreen.tsx:697-702`, `src/store/intakeReducer.ts:397-437` | Yes | Mock extracted in this repo or manual replacement |
| `attorneys[*].email`, `phone` | `src/types/case.ts:89-90` | Not rendered on cards | Indirectly replaceable from contact picker | `UPDATE_ATTORNEY` only | Yes | Mock nulls or manual replacement. `src/components/IntakeScreen/IntakeScreen.tsx:601-606` |
| `interpreters[*].name` | `src/types/case.ts:107-117` | Extracted Fields table and static cards. `src/components/ExtractedFieldsTable/fieldProjection.ts:166-170`, `src/components/IntakeScreen/IntakeScreen.tsx:707-755` | Yes | `ADD_INTERPRETER`, `UPDATE_INTERPRETER`, `REMOVE_INTERPRETER` reachable | Yes | Manual contact create/select/replace |
| `interpreters[*].language_from`, `language_to`, `certified`, `cert_number`, `agency`, `email`, `phone` | `src/types/case.ts:109-116` | Not rendered except name-only card | Partly, through contact-backed add/replace for `agency/email/phone`; no UI for language/certification | Add/update actions write these values, but UI does not expose most of them. `src/components/IntakeScreen/IntakeScreen.tsx:558-567`, `src/components/IntakeScreen/IntakeScreen.tsx:617-622` | Yes | Manual contact selection/create plus hardcoded defaults |
| `videographers[*].name`, `firm` | `src/types/case.ts:121-128` | Extracted Fields table and static cards. `src/components/ExtractedFieldsTable/fieldProjection.ts:172-177`, `src/components/IntakeScreen/IntakeScreen.tsx:758-806` | Yes | `ADD_VIDEOGRAPHER`, `UPDATE_VIDEOGRAPHER`, `REMOVE_VIDEOGRAPHER` reachable | Yes | Manual contact create/select/replace |
| `videographers[*].cert_number`, `email`, `phone` | `src/types/case.ts:125-127` | Not rendered except name-only card | Partly, through contact-backed add/replace for `email/phone`; not `cert_number` | Same action coverage as above | Yes | Manual contact selection/create; `cert_number` stays null by current UI |
| `participants[*].name`, `role`, `organization`, `email`, `phone`, `notes` | `src/types/case.ts:132-140` | Only picker shown; existing participants are not rendered back to the user. `src/components/IntakeScreen/IntakeScreen.tsx:809-821` | Add only from visible UI | `ADD_PARTICIPANT` reachable; `UPDATE_PARTICIPANT`/`REMOVE_PARTICIPANT` unreachable from current screen | Yes | Manual contact create/select |
| `audio` | `src/types/case.ts:227-235`, `src/types/case.ts:304` | Upload panel visually collects an audio file, but not from `record.audio`. `src/components/IntakeScreen/IntakeScreen.tsx:247-314` | No durable edit path | No reducer action | Yes if already present in loaded record, but Intake never writes it | Missing durability: local `File` only |
| `exhibits[*]` | `src/types/case.ts:198-207`, `src/types/case.ts:305` | Not rendered on Intake | No | Reducer actions exist, but no Intake UI | Yes | Factory empty / persisted row |
| `deepgram.*` including `speaker_count` and `keyterms` | `src/types/case.ts:246-257`, `src/types/case.ts:306` | Not edited from `record.deepgram`; Intake instead renders `DeepgramKeytermManager` and `DeepgramPayloadPreview`. `src/components/IntakeScreen/IntakeScreen.tsx:901-919`, `src/components/IntakeScreen/IntakeScreen.tsx:1141-1151` | Keyterm UI yes, `CaseRecord.deepgram` no | No reducer/UI wiring updates `record.deepgram` | Yes, but only whatever is already on the record | Factory defaults in record plus separate seeded keyterm store. `src/types/case.ts:338-351`, `src/components/DepoEditor.tsx:22-68` |
| `stage`, `stage_completion.*` | `src/types/case.ts:261-277`, `src/types/case.ts:309-310` | Current stage shown from `StageContext`, not `record.stage`; stage completion not rendered. `src/context/StageContext.tsx:17-33`, `src/components/IntakeScreen/IntakeScreen.tsx:86-123` | No visible Intake editing | `SET_STAGE`/`SET_STAGE_COMPLETE` exist but are not used by this screen’s navigation | Yes | Factory/persisted/mock row |
| `certification` | `src/types/case.ts:212-223`, `src/types/case.ts:313` | Not rendered | No | No Intake UI action | Yes | Factory null / persisted row |
| `notes` | `src/types/case.ts:315-316` | Not rendered | No | `SET_NOTES` exists, but no UI calls it | Yes | Factory, persisted row, or mock fallback |

## Reducer Action Coverage

| Reducer action | Reachable from current UI? | Evidence |
|---|---|---|
| `INIT_NEW_CASE`, `LOAD_CASE` | Yes | Hydration calls `loadCase(...)`, DEV mock fallback `loadCase(fallbackRecord)`, or `initNewCase(caseId)`. `src/components/IntakeScreen/IntakeScreen.tsx:994-1038` |
| `SET_PROCEEDING_TYPE` | No | Action exists, but no Intake control calls it. `src/context/IntakeContext.tsx:117-119`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` |
| `SET_STAGE`, `SET_STAGE_COMPLETE` | No from Intake UI | Navigation uses `StageContext.setStage("creation")`, not `IntakeContext.setStage`; no UI calls `setStageComplete`. `src/context/StageContext.tsx:31-57`, `src/components/IntakeScreen/IntakeScreen.tsx:1089-1092`, `src/context/IntakeContext.tsx:121-127` |
| `SET_NOTES` | No | Context exposes it, Intake renders no notes field. `src/context/IntakeContext.tsx:129-131`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` |
| `UPDATE_FIELD` | No | Intake wires only confirm/resolve callbacks; there is no direct field-edit UI. `src/context/IntakeContext.tsx:135-149`, `src/components/IntakeScreen/IntakeScreen.tsx:1125-1138` |
| `RESOLVE_CONFLICT`, `CONFIRM_FIELD`, `CONFIRM_ALL` | Yes | `ExtractedFieldsTable` callbacks dispatch them. `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:432-447`, `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:561-569`, `src/components/IntakeScreen/IntakeScreen.tsx:1125-1138` |
| `ADD_ATTORNEY` | No in practice | Empty-state picker routes to `handleSelect("attorney", ...)`, but `handleSelect` has no attorney branch. `src/components/IntakeScreen/IntakeScreen.tsx:556-592`, `src/components/IntakeScreen/IntakeScreen.tsx:697-702` |
| `UPDATE_ATTORNEY`, `REMOVE_ATTORNEY` | Yes, only when cards already exist | Existing attorney cards have `Replace` and `Remove`. `src/components/IntakeScreen/IntakeScreen.tsx:594-608`, `src/components/IntakeScreen/IntakeScreen.tsx:677-693` |
| `ADD_WITNESS`, `UPDATE_WITNESS`, `REMOVE_WITNESS` | No | No witness editor exists on Intake. `src/store/intakeReducer.ts:441-481`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` |
| `ADD_INTERPRETER`, `UPDATE_INTERPRETER`, `REMOVE_INTERPRETER` | Yes | Picker, create-new flow, replace, and remove are wired. `src/components/IntakeScreen/IntakeScreen.tsx:357-379`, `src/components/IntakeScreen/IntakeScreen.tsx:556-568`, `src/components/IntakeScreen/IntakeScreen.tsx:610-624`, `src/components/IntakeScreen/IntakeScreen.tsx:737-749` |
| `ADD_VIDEOGRAPHER`, `UPDATE_VIDEOGRAPHER`, `REMOVE_VIDEOGRAPHER` | Yes | Picker, create-new flow, replace, and remove are wired. `src/components/IntakeScreen/IntakeScreen.tsx:357-379`, `src/components/IntakeScreen/IntakeScreen.tsx:571-579`, `src/components/IntakeScreen/IntakeScreen.tsx:626-640`, `src/components/IntakeScreen/IntakeScreen.tsx:788-800` |
| `ADD_PARTICIPANT` | Yes | Other Participants picker dispatches add. `src/components/IntakeScreen/IntakeScreen.tsx:582-590`, `src/components/IntakeScreen/IntakeScreen.tsx:815-820` |
| `UPDATE_PARTICIPANT`, `REMOVE_PARTICIPANT` | No | Existing participants are never rendered, so no edit/remove controls exist. `src/store/intakeReducer.ts:588-613`, `src/components/IntakeScreen/IntakeScreen.tsx:809-821` |
| `ADD_EXHIBIT`, `UPDATE_EXHIBIT`, `REMOVE_EXHIBIT` | No | No exhibit UI exists on Intake. `src/store/intakeReducer.ts:617-657`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` |

## Deepgram Configuration Fields
- `CaseRecord.deepgram` defines `model`, `language`, `punctuate`, `utterances`, `diarize`, `diarize_version`, `speaker_count`, `smart_format`, `numerals`, and `keyterms`. `src/types/case.ts:246-257`
- Intake does not edit those fields through the reducer. No Intake callback calls `updateField` for `deepgram.*`, and there are no specialized deepgram reducer actions. `src/context/IntakeContext.tsx:47-91`, `src/store/intakeReducer.ts:71-208`
- Intake does render a Deepgram-focused UI: `DeepgramKeytermManager` and `DeepgramPayloadPreview`. `src/components/IntakeScreen/IntakeScreen.tsx:901-919`, `src/components/IntakeScreen/IntakeScreen.tsx:1141-1151`
- That UI is powered by `KeytermProvider`, not by `CaseRecord.deepgram`. `KeytermProvider` stores `terms`, `view`, `search`, `lastPruned`, and `showPayload` in its own reducer state. `src/components/DeepgramKeytermManager/keytermStore.tsx:18-24`, `src/components/DeepgramKeytermManager/keytermStore.tsx:167-216`
- The request preview uses hardcoded `BASE_PARAMS` plus provider-selected terms. It does not read `record.deepgram`. `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:27-37`, `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:41-90`
- Under the prompt’s Collect-vs-Generate rule, that is evidence of generation-oriented functionality living on Intake rather than on Transcript Creation. The ownership ruling is in Report 2. Evidence here is only that the code exists on Intake and is not persisted into the saved case payload through reducer state. `src/components/IntakeScreen/IntakeScreen.tsx:1141-1151`, `src/api/caseService.ts:12-29`

## File Upload Workflow

| Upload slot | Defined where | Where the file object goes now | Survives reload? | Persists into CaseRecord / Storage / Supabase? |
|---|---|---|---|---|
| Notice of Deposition | `src/components/IntakeScreen/IntakeScreen.tsx:248-256` | Local `slots` state only via `setSlots`. `src/components/IntakeScreen/IntakeScreen.tsx:283-289` | No | No |
| Scheduling Notes / Job Sheet | `src/components/IntakeScreen/IntakeScreen.tsx:257-264` | Local `slots` state only | No | No |
| Supporting Documents | `src/components/IntakeScreen/IntakeScreen.tsx:265-272` | Local `slots` state only | No | No |
| Audio / Video Recording | `src/components/IntakeScreen/IntakeScreen.tsx:273-280` | Local `slots` state only | No | No |

- No upload slot writes to `CaseRecord.audio`, `CaseRecord.exhibits`, Supabase `case_audio`, or any API route. `src/components/IntakeScreen/IntakeScreen.tsx:247-314`, `src/api/caseService.ts:12-29`, `src/types/database.ts:42-91`
- The architecture expects Stage 1 outputs to include uploaded intake documents and `case.json`, while the case storage spec expects `intake/` and `audio/` artifacts inside the case package. Current Intake does not meet that storage behavior in this repo. `docs/architecture/MASTER_ARCHITECTURE.md:61-75`, `docs/architecture/CASE_STORAGE_SPEC.md:17-30`

## Audio State vs. Transcript State

### What exists
- `CaseRecord` has `audio: CaseAudio | null`. `src/types/case.ts:227-235`, `src/types/case.ts:304`
- `CaseRecord` does not have any transcript-generated flag, transcript-request status, Deepgram-job status, or raw/working transcript reference. `src/types/case.ts:282-317`
- Intake’s readiness checklist includes an “Audio file uploaded” line, but `hasAudio` is hardcoded `false` and does not read either the upload panel or `record.audio`. `src/components/IntakeScreen/IntakeScreen.tsx:1055-1068`
- Transcript state exists later in `DocumentProvider` as `document`, `loading`, `dirty`, `saving`, `workingTexts`, and `wordMap`, loaded via `api.getDocument(jobId)`. That state is outside Intake and outside `CaseRecord`. `src/context/DocumentContext.tsx:24-37`, `src/context/DocumentContext.tsx:204-268`

### Audit finding
- “Audio uploaded” and “transcript generated” are not tracked as separate, durable Intake states anywhere in the current Intake subsystem. Audio is modeled in the type but unwired; transcript generation is not modeled in the Intake case package at all. `src/types/case.ts:227-235`, `src/types/case.ts:282-317`, `src/components/IntakeScreen/IntakeScreen.tsx:247-314`, `src/components/IntakeScreen/IntakeScreen.tsx:1055-1068`
- There is no code path in Intake where audio presence implies transcript generation, but there is also no reliable positive state for either one. The checklist line exists, but it is not truthful because it is permanently false. `src/components/IntakeScreen/IntakeScreen.tsx:1055-1068`

## Validation Logic
- Reducer-level validation checks only the required caption, session/location, reporter fields, plus at least one examining attorney. `src/store/intakeReducer.ts:674-717`
- It ignores uploaded files, `record.audio`, transcript-generation state, proceeding details, format, certification fields, participants, interpreters, videographers, and exhibits. `src/store/intakeReducer.ts:687-717`, `src/types/case.ts:172-235`
- The banner’s “Ready to proceed” chip is green when `conflictCount === 0 && missingCount === 0`. It ignores unconfirmed fields. `src/components/IntakeScreen/IntakeScreen.tsx:135-176`
- Gate 1 requires only: case name present, at least one witness, no unresolved conflicts, and `validation.missing.length === 0`. Deposition date and audio are marked optional. `src/components/IntakeScreen/IntakeScreen.tsx:1055-1071`

### Green indicators and whether they tell the truth
- `Ready to proceed` banner: partially truthful only. It truthfully means “no active conflicts and no missing reducer-required fields,” but it does not truthfully mean “case package is fully human-confirmed” because unconfirmed fields are ignored. `src/components/IntakeScreen/IntakeScreen.tsx:165-176`, `src/store/intakeReducer.ts:667-717`
- `Required fields complete`: partially truthful only. It truthfully means the reducer’s limited required-path set is populated, not that the assembled deposition package is complete. `src/store/intakeReducer.ts:674-717`, `src/components/IntakeScreen/IntakeScreen.tsx:1062-1071`
- `Audio file uploaded`: not truthful as a live status indicator. It is hardcoded false and not connected to either upload state or persisted case state. `src/components/IntakeScreen/IntakeScreen.tsx:1055-1068`
- `Case record created`: not truthful as a persistence indicator. It is implemented as `!!record.caption.case_name.value`, not as “row exists in `cases`.” `src/components/IntakeScreen/IntakeScreen.tsx:1057-1064`, `src/api/caseService.ts:12-29`

## Hydration And Save Lifecycle
- Intake hydration flow is: guard unsaved local state; try `loadPersistedCase(caseId)`; if no row and `import.meta.env.DEV`, load a `mockCaseRecord` fallback; otherwise `initNewCase(caseId)`. `src/components/IntakeScreen/IntakeScreen.tsx:986-1046`
- The screen keeps current state in `recordRef`, `dirtyRef`, and `recordCaseIdRef`, and `shouldAbortHydration()` aborts after awaits if unsaved changes now exist for the same case. `src/components/IntakeScreen/IntakeScreen.tsx:974-984`, `src/components/IntakeScreen/IntakeScreen.tsx:989-1038`
- Save reads `recordRef.current` at click time and persists that via `saveCase(currentRecord)`, which avoids the stale-closure bug previously diagnosed. `src/components/IntakeScreen/IntakeScreen.tsx:1073-1087`
- I did not find another IntakeScreen callback that both (1) closes over mutable intake state and (2) performs async persistence using that closed-over snapshot. `handleProceed` still closes over `canProceed`, but it only performs synchronous stage navigation. `src/components/IntakeScreen/IntakeScreen.tsx:1089-1092`

## Human-In-The-Loop Verification

### Acceptable user-driven confirmation paths
- Single-field confirmation requires the user to click `Confirm`; the table then calls `recordConfirm(...)` for provenance and `onConfirm?.(row.id)` for reducer dispatch. `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:432-436`
- Bulk confirmation is user-initiated through “Confirm All Visible.” `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:438-447`
- Conflict resolution is user-initiated through the modal and then dispatches `RESOLVE_CONFLICT`. `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:561-569`, `src/store/intakeReducer.ts:360-373`

### Violation found
- The current visible repo state can start with extracted values already confirmed before any human review because `mockCaseRecord` seeds several extracted fields with `confirmed: true`, for example `caption.case_name`, `session.deposition_date`, `session.location_city`, `session.location_state`, `witnesses[0].role`, `attorneys[0].name`, `attorneys[0].firm`, and `attorneys[0].role`. `src/components/ExtractedFieldsTable/mockRecord.ts:21-24`, `src/components/ExtractedFieldsTable/mockRecord.ts:29-37`, `src/components/ExtractedFieldsTable/mockRecord.ts:68-72`, `src/components/ExtractedFieldsTable/mockRecord.ts:80-85`
- That is not an automatic runtime acceptance path in the reducer; it is a mock-seeded initial state. But under the prompt’s extract → confidence → human confirms rule, it is still a violation because the visible Intake state presents extracted fields as already confirmed without a user action in this repo. `src/store/intakeReducer.ts:375-393`, `src/components/ExtractedFieldsTable/mockRecord.ts:21-24`
- `manualField(...)` also returns `confirmed: true`, but that path is for manual contact-backed entries, not extracted ones, so it does not violate the extraction rule. `src/components/IntakeScreen/IntakeScreen.tsx:43-50`

## Duplicates And Dead Fields
- `StageContext.stage` and `CaseRecord.stage` duplicate the notion of current workflow stage. Visible routing uses `StageContext`, while the saved payload contains `record.stage`. Intake’s Proceed button changes only `StageContext`. `src/context/StageContext.tsx:31-57`, `src/types/case.ts:309-310`, `src/components/IntakeScreen/IntakeScreen.tsx:1089-1092`
- Deepgram/keyterm intent is duplicated between `CaseRecord.deepgram`, `KeytermProvider` state, and hardcoded preview defaults. Only the provider/default path is live in the UI. `src/types/case.ts:246-257`, `src/components/DeepgramKeytermManager/keytermStore.tsx:18-24`, `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:27-37`
- `ADD_ATTORNEY` is dead from the visible screen because the attorney picker’s empty-state branch never dispatches it. `src/components/IntakeScreen/IntakeScreen.tsx:556-592`, `src/components/IntakeScreen/IntakeScreen.tsx:697-702`
- `UPDATE_PARTICIPANT` and `REMOVE_PARTICIPANT` are dead from the visible screen because participant entries are never rendered back out. `src/store/intakeReducer.ts:588-613`, `src/components/IntakeScreen/IntakeScreen.tsx:809-821`
- Many typed fields are not rendered anywhere on Intake: `proceeding.*`, `format.*`, reporter notary fields, `audio`, `exhibits`, `certification`, and `notes`. `src/types/case.ts:172-235`, `src/types/case.ts:312-316`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165`

## AI Extraction Seams In This Repo
- In this repo, extracted values originate from `mockCaseRecord`, not from uploaded files or a parser service. `src/components/ExtractedFieldsTable/mockRecord.ts:14-115`
- The field-review UI consumes `CaseRecord` through `projectFieldRows(record, conflictAlternates)`. That projection file defines the exact dot-paths a future parser would need to populate. `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:372-375`, `src/components/ExtractedFieldsTable/fieldProjection.ts:110-179`
- The reducer integration seams for a future parser are `updateField(...)`, `resolveConflict(...)`, and the `CaseRecord` paths behind `resolveExtractedPath(...)`. `src/context/IntakeContext.tsx:48-61`, `src/store/intakeReducer.ts:236-265`, `src/store/intakeReducer.ts:345-373`
- Provenance/audit seams already exist in `ConflictProvider`: `recordExtraction(...)`, `detectConflict(...)`, `recordConfirm(...)`, `resolveConflict(...)`, and `loadHistory(...)`. `src/components/conflict/conflictStore.tsx:185-222`, `src/components/conflict/conflictStore.tsx:234-370`

