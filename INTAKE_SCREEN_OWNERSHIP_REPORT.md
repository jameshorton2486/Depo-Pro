# Intake Screen Ownership Report

## Scope
This report evaluates the current Intake screen against the requested ownership model:
- Intake collects.
- Transcript Creation generates.
- Workspace owns speaker mapping, transcript editing, AI review, and confidence review.
- Certification owns certificate/signature/read-and-sign finalization.
- Export owns output format and packaging.

The architecture docs broadly support that split, with one documented tension: Stage 1 currently claims “Build keyterm dictionary,” while Stage 2 claims Deepgram configuration and keyterm injection. `docs/architecture/MASTER_ARCHITECTURE.md:66-74`, `docs/architecture/MASTER_ARCHITECTURE.md:78-87`, `docs/architecture/SCREEN_FLOW.md:70-74`

## Ownership Matrix

| Field / control | Current screen | Correct screen | MATCH / MISMATCH | Migration note |
|---|---|---|---|---|
| Case ID / case identity banner | Intake `WorkflowNav` / `CaseStatusBanner`. `src/components/IntakeScreen/IntakeScreen.tsx:86-123`, `src/components/IntakeScreen/IntakeScreen.tsx:127-179` | Intake | MATCH | Case identity is part of assembled case metadata. |
| `caption.case_name` | Intake extracted-fields review. `src/components/ExtractedFieldsTable/fieldProjection.ts:122-128`, `src/components/IntakeScreen/IntakeScreen.tsx:1115-1138` | Intake | MATCH | Keep in `CaseRecord`; future direct-edit UI still belongs to Intake. |
| `caption.case_number` | Intake extracted-fields review. `src/components/ExtractedFieldsTable/fieldProjection.ts:122-128` | Intake | MATCH | This is the current stand-in for “cause number.” |
| Case style / party style | Not separately modeled; closest current field is `caption.case_name`. `src/types/case.ts:57-63` | Intake | MISMATCH | No dedicated field exists. If added later, it belongs in `CaseRecord.caption` and Intake collection. |
| Court name | Intake extracted-fields review. `src/components/ExtractedFieldsTable/fieldProjection.ts:124-126` | Intake | MATCH | Already modeled and reviewed in Intake. |
| County | Not modeled separately in `CaseRecord`; current session data has city/state/ZIP only. `src/types/case.ts:158-167`, `src/types/case.ts:282-317` | Intake | MISMATCH | No dedicated field exists. If Texas/UFM needs county, it should be added as collected case metadata on Intake. |
| Venue | Not modeled separately; nearest current fields are session location and court name. `src/types/case.ts:57-63`, `src/types/case.ts:158-167` | Intake | MISMATCH | No dedicated field exists. Venue should be part of collected case metadata, not generated downstream. |
| `session.deposition_date` | Intake extracted-fields review and Gate 1 summary. `src/components/ExtractedFieldsTable/fieldProjection.ts:130-138`, `src/components/IntakeScreen/IntakeScreen.tsx:1057-1068` | Intake | MATCH | Scheduling metadata belongs to Intake. |
| `session.start_time` / `end_time` | Intake extracted-fields review only. `src/components/ExtractedFieldsTable/fieldProjection.ts:132-134` | Intake | MATCH | Scheduling metadata belongs to Intake. |
| `session.location_address` / `city` / `state` / `zip` | Intake extracted-fields review only. `src/components/ExtractedFieldsTable/fieldProjection.ts:135-138` | Intake | MATCH | Venue/location collection belongs to Intake. |
| `session.is_remote` / `remote_platform` | Not rendered. `src/types/case.ts:166-167`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` | Intake | MISMATCH | Data belongs to Intake, but the screen has no control for it. |
| `proceeding.*` fields | Not rendered. `src/types/case.ts:172-181`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` | Intake | MISMATCH | Ordering-firm / clerk context is collected case-package metadata and should stay on Intake if used. |
| Witness/deponent fields (`witnesses[*].*`) | Intake extracted-fields review only; no direct witness editor. `src/components/ExtractedFieldsTable/fieldProjection.ts:147-154`, `src/store/intakeReducer.ts:441-481` | Intake | MISMATCH | Ownership is correct, but current controls are incomplete. A true Intake witness editor is still missing. |
| Attorney fields (`attorneys[*].*`) | Intake extracted-fields review and static cards. `src/components/ExtractedFieldsTable/fieldProjection.ts:156-164`, `src/components/IntakeScreen/IntakeScreen.tsx:652-705` | Intake | MATCH, with wiring gap | Ownership is correct. The gap is implementation: empty-state add is broken because `ADD_ATTORNEY` is not wired from the picker. `src/components/IntakeScreen/IntakeScreen.tsx:556-592`, `src/components/IntakeScreen/IntakeScreen.tsx:697-702` |
| Interpreter fields (`interpreters[*].*`) | Intake cards and picker. `src/components/IntakeScreen/IntakeScreen.tsx:707-755` | Intake | MATCH | Interpreter collection belongs to Intake. |
| Videographer fields (`videographers[*].*`) | Intake cards and picker. `src/components/IntakeScreen/IntakeScreen.tsx:758-806` | Intake | MATCH | Videographer collection belongs to Intake. |
| Other attendees / participants (`participants[*].*`) | Intake picker only. `src/components/IntakeScreen/IntakeScreen.tsx:809-821` | Intake | MATCH, with wiring gap | Ownership is correct, but current screen does not render existing participants back out for edit/remove. |
| Reporter core fields (`reporter.name`, `cert_number`, `cert_state`, `firm`) | Intake extracted-fields review only. `src/components/ExtractedFieldsTable/fieldProjection.ts:140-145` | Intake | MATCH | Reporter identity is Intake-collected metadata. |
| Reporter contact / notary fields (`reporter.email`, `phone`, `notary_required`, `notary_name`, `notary_commission_expiry`) | Not rendered. `src/types/case.ts:144-153`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` | Intake | MISMATCH | Reporter package metadata belongs to Intake but has no UI. |
| Transcript format fields (`format.*`) | Not rendered. `src/types/case.ts:186-194`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165` | Certification or UFM/Export-adjacent, depending product choice | MISMATCH | Current repo models them inside `CaseRecord`, but they are output/presentation constraints rather than raw collection. If retained, they should not be gathered alongside basic participant intake by default. |
| NOD upload control | Intake `DocumentUploadPanel`. `src/components/IntakeScreen/IntakeScreen.tsx:248-256`, `src/components/IntakeScreen/IntakeScreen.tsx:294-313` | Intake | MATCH | Ownership is correct. Current gap is durability: local-only state. |
| Scheduling notes / job sheet upload control | Intake `DocumentUploadPanel`. `src/components/IntakeScreen/IntakeScreen.tsx:257-264` | Intake | MATCH | Ownership is correct. Current gap is durability. |
| Supporting documents upload control | Intake `DocumentUploadPanel`. `src/components/IntakeScreen/IntakeScreen.tsx:265-272` | Intake | MATCH | Ownership is correct. Current gap is durability. |
| Audio / video upload control | Intake `DocumentUploadPanel`. `src/components/IntakeScreen/IntakeScreen.tsx:273-280` | Intake for collection; Transcript Creation for consumption | MATCH, with missing handoff | The control is on the right screen by the prompt’s rule, but there is no durable handoff contract yet. See special-case ruling below. |
| `CaseRecord.audio` metadata | Not written by Intake. `src/types/case.ts:227-235`, `src/components/IntakeScreen/IntakeScreen.tsx:247-314` | Intake | MISMATCH | The type already places audio metadata in the case package, but the upload control never populates it. |
| Deepgram keyterm manager UI | Intake. `src/components/IntakeScreen/IntakeScreen.tsx:1141-1151`, `src/components/DeepgramKeytermManager/DeepgramKeytermManager.tsx:477-617` | Transcript Creation | MISMATCH | Move the control, plus `KeytermProvider` state or its successor, to Transcript Creation. Non-trivial coupling: keyterms are currently seeded from case/UFM-style metadata and mock notice data in `SEED_KEYTERMS`; that dependency must survive the move as data input, even if the UI moves screens. `src/components/DepoEditor.tsx:22-68`, `src/components/DeepgramKeytermManager/types.ts:9-15` |
| Deepgram request preview / “View Deepgram Request” | Intake footer and keyterm panel. `src/components/IntakeScreen/IntakeScreen.tsx:901-919`, `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:41-90` | Transcript Creation | MISMATCH | This is generation-side request planning. It should move with the keyterm manager and request settings. |
| Deepgram model / language / diarize / `speaker_count` / numerals / request settings | Not editable from Intake `CaseRecord`; preview hardcodes them. `src/types/case.ts:246-257`, `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:27-37` | Transcript Creation | MISMATCH | Current repo does not expose proper controls anywhere. If implemented, they belong with transcript generation, not case assembly. |
| Transcript execution | Not on Intake; Stage 2 is absent in current shell, transcript data loads later through document mocks. `src/components/DepoEditor.tsx:104-131`, `src/context/DocumentContext.tsx:204-268` | Transcript Creation | MATCH in principle | Not implemented as a distinct real screen yet, but it does not belong on Intake. |
| Speaker mapping | Workspace `SpeakerPanel`. `src/components/RightSidebar/RightSidebar.tsx:11-17`, `src/components/RightSidebar/RightSidebar.tsx:45-49` | Workspace | MATCH | Correctly belongs after transcript generation. |
| AI Review | Workspace `SuggestionsPanel`. `src/components/RightSidebar/RightSidebar.tsx:12-16`, `src/components/RightSidebar/RightSidebar.tsx:45-49` | Workspace | MATCH | Correctly belongs after transcript generation. |
| Confidence review | Workspace `ConfidencePanel`. `src/components/RightSidebar/RightSidebar.tsx:13-16`, `src/components/RightSidebar/RightSidebar.tsx:45-49` | Workspace | MATCH | Correctly belongs after transcript generation. |
| Transcript editing / working transcript save | Workspace `DocumentProvider` + editor UI. `src/context/DocumentContext.tsx:24-37`, `src/context/DocumentContext.tsx:255-268` | Workspace | MATCH | Correctly belongs after transcript generation. |
| Certification checklist | Certification screen. `src/components/CertificationScreen/CertificationScreen.tsx:95-117`, `src/components/CertificationScreen/CertificationScreen.tsx:133-173` | Certification | MATCH | Correctly located. |
| Certification statement | Certification screen. `src/components/CertificationScreen/CertificationScreen.tsx:176-190` | Certification | MATCH | Correctly located. |
| Certification date | Certification screen auto-stamps when checklist is complete. `src/components/CertificationScreen/CertificationScreen.tsx:110-116` | Certification | MATCH | Correctly located. |
| Signature data / `signature_hash` | Modeled in `CaseCertification`, not rendered on current certification screen. `src/types/case.ts:212-223`, `src/components/CertificationScreen/CertificationScreen.tsx:176-190` | Certification | MISMATCH | Ownership is correct, but the current screen does not expose it. |
| Export format selection / packaging controls | Export screen. `src/components/ExportScreen/ExportScreen.tsx:103-166` | Export | MATCH | Correctly located. |
| `View UFM Payload` button | Intake footer placeholder. `src/components/IntakeScreen/IntakeScreen.tsx:922-929` | UFM/Certification-adjacent, not Intake | MISMATCH | The button advertises a downstream generated artifact. It should not live as a dead Intake affordance. |
| Intake extracted-fields review table | Intake. `src/components/IntakeScreen/IntakeScreen.tsx:1115-1138` | Intake | MATCH | Human confirmation of collected metadata belongs on Intake. |
| Intake validation summary / readiness banner | Intake. `src/components/IntakeScreen/IntakeScreen.tsx:127-179`, `src/components/IntakeScreen/IntakeScreen.tsx:835-870` | Intake | MATCH | Case-package completeness summary belongs on Intake, though current checks are too weak. |

## Special-Case Rulings

### Read & Sign
- I found no dedicated `read_and_sign`, `read_sign`, or equivalent field in `CaseRecord`, `CertificationScreen`, or the current Intake UI. The current certification model contains `certification_date`, `certification_statement`, `checklist`, and `signature_hash`, but nothing that captures the witness’s election on the record. `src/types/case.ts:212-223`, `src/types/case.ts:282-317`, `src/components/CertificationScreen/CertificationScreen.tsx:8-18`, `src/components/CertificationScreen/CertificationScreen.tsx:176-190`
- Ruling: split the concept.
  - Intake should collect the witness’s stated election on the record as case metadata because that is a factual deposition-package input.
  - Certification should finalize the legal consequence of that election, including whether read-and-sign was completed, waived, or expired.
- Migration note: there is no current field to move; the split would require new case-model fields. That is a modeling gap, not a screen-move issue.

### Audio handoff
- Current state:
  - Intake visually collects audio/video through `DocumentUploadPanel`, but keeps the `File` only in local `slots` state. `src/components/IntakeScreen/IntakeScreen.tsx:247-314`
  - `CaseRecord` already has `audio: CaseAudio | null`, and the database already has `case_audio`, but Intake never writes either. `src/types/case.ts:227-235`, `supabase/migrations/20260603210000_create_core_schema.sql:67-91`
  - Transcript state later lives in `DocumentProvider` and is loaded independently as an `EditorDocument`; no Intake-side transcript-generated flag exists. `src/context/DocumentContext.tsx:24-37`, `src/context/DocumentContext.tsx:204-268`
- Ruling:
  - Intake owns collection and durable storage of the uploaded file reference plus media metadata.
  - Transcript Creation owns consumption of that stored media and creation of transcript-generation state.
- Handoff contract:
  - Shared durable state should distinguish at least two independent statuses:
    - `audio uploaded` / media available for transcription
    - `transcript generated` / raw transcript exists
  - Those states should not imply each other.
- Current repo gap:
  - `audio uploaded` is not durably tracked at all by Intake.
  - `transcript generated` is not modeled in the Intake case package at all.

### Attorney “Time Used”
- I found no `time_used` or equivalent attorney-time field in `CaseRecord`, the Intake UI, or the Certification screen. `src/types/case.ts:82-91`, `src/types/case.ts:282-317`, `src/components/IntakeScreen/IntakeScreen.tsx:652-705`, `src/components/CertificationScreen/CertificationScreen.tsx:44-229`
- Ruling:
  - This should not be collected on Intake because the prompt correctly notes it is only knowable after the deposition.
  - It belongs in a post-transcript or certification-era workflow, depending whether it is treated as factual appearance-page metadata or certificate-supporting metadata.
- Recommendation:
  - Workspace or a later UFM/Certification step should edit it after the record exists.
  - Intake may own only the attorney identities; downstream stages can annotate what occurred.

## Target UI Map

### Section 1 — Case Information
- Home:
  - `caption.case_name`
  - `caption.case_number`
  - `caption.court_name`
  - `caption.department`
  - `caption.judge_name`
  - `session.deposition_date`
  - `session.start_time`
  - `session.end_time`
  - `session.location_address`
  - `session.location_city`
  - `session.location_state`
  - `session.location_zip`
  - `session.is_remote`
  - `session.remote_platform`
  - `proceeding.*`
- No current home gap:
  - County and venue have no dedicated current fields.

### Section 2 — Participants
- Attorneys tab:
  - Current attorney cards and attorney extracted rows belong here. `src/components/IntakeScreen/IntakeScreen.tsx:652-705`, `src/components/ExtractedFieldsTable/fieldProjection.ts:156-164`
- Witnesses tab:
  - Current witness extracted rows belong here, but there is no dedicated witness editor today. `src/components/ExtractedFieldsTable/fieldProjection.ts:147-154`
- Interpreter tab:
  - Current interpreter picker/cards belong here. `src/components/IntakeScreen/IntakeScreen.tsx:707-755`
- Videographer tab:
  - Current videographer picker/cards belong here. `src/components/IntakeScreen/IntakeScreen.tsx:758-806`
- Other Attendees tab:
  - Current participant picker belongs here, but there is no existing participant list UI. `src/components/IntakeScreen/IntakeScreen.tsx:809-821`

### Section 3 — Reporter
- Home:
  - `reporter.name`
  - `reporter.cert_number`
  - `reporter.cert_state`
  - `reporter.firm`
  - `reporter.email`
  - `reporter.phone`
  - `reporter.notary_required`
  - `reporter.notary_name`
  - `reporter.notary_commission_expiry`
- Section gap:
  - Only the first four appear anywhere today, and only in the extracted-fields table. `src/components/ExtractedFieldsTable/fieldProjection.ts:140-145`

### Section 4 — Documents
- Home:
  - Notice of Deposition upload
  - Scheduling notes / Job Sheet upload
  - Supporting documents upload
- Current controls:
  - `DocumentUploadPanel` slots `notice`, `scheduling`, `supporting`. `src/components/IntakeScreen/IntakeScreen.tsx:248-272`

### Section 5 — Audio
- Home:
  - Audio / video upload control
  - `CaseRecord.audio` metadata such as filename, duration, mime type, size, uploaded status
- Current controls:
  - Upload slot exists. `src/components/IntakeScreen/IntakeScreen.tsx:273-280`
- Section gap:
  - No current UI shows duration, format, or durable upload status even though `CaseAudio` models them. `src/types/case.ts:227-235`

### Section 6 — AI Extraction Review
- Home:
  - Current `ExtractedFieldsTable`
  - Conflict resolution modal/provenance viewer
- Current controls:
  - All already live on Intake. `src/components/IntakeScreen/IntakeScreen.tsx:1115-1138`, `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:354-570`

### Section 7 — Validation Summary
- Home:
  - Current `CaseStatusBanner`
  - Current `GateStatusCard`
  - Save / Proceed footer actions
- Current controls:
  - Already live on Intake. `src/components/IntakeScreen/IntakeScreen.tsx:127-179`, `src/components/IntakeScreen/IntakeScreen.tsx:835-870`, `src/components/IntakeScreen/IntakeScreen.tsx:873-955`

## Current controls with no home in the target layout
- `DeepgramKeytermManager`
- `DeepgramPayloadPreview`
- Footer `View Deepgram Request`
- Placeholder `View UFM Payload`

Those controls have no home in the target Intake layout because they are generation/output-adjacent, not case-package collection controls. `src/components/IntakeScreen/IntakeScreen.tsx:901-929`, `src/components/IntakeScreen/IntakeScreen.tsx:1141-1151`

## Target sections with no current controls
- Section 1 lacks dedicated direct editors for several modeled case-information fields beyond extracted review.
- Section 3 lacks a true reporter form.
- Section 5 lacks durable audio metadata/status controls.

## Bottom Line
- Most collection-oriented metadata already belongs to Intake by model and by workflow intent, even when the current UI is incomplete.
- The biggest ownership mismatch is the Deepgram/keyterm/request-planning UI living on Intake instead of Transcript Creation.
- The biggest collection gap is that uploaded case-package artifacts and some core metadata fields still are not durably assembled by Intake even though the type system and architecture say they should be.
