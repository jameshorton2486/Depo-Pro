## Stage 5 Videographer Audit

- Branch inspected: `feature/stage3-workspace-core`
- HEAD inspected: `50029ccc843546727c5d37b2acd670d74e33e86c`
- Baseline checks: `npm test` = 43 files / 223 tests passing; `npm run typecheck` = passing

### Verdict

Videographer is a `REUSE` stage, not a `BUILD` stage.

The live app already has:

- a first-class videographer case shape
- a mounted videographer add flow in the shared participant modal
- reusable videographer directory details in `contacts.details`
- live UFM appearance mapping for videographer fields
- live deterministic keyterm harvest for videographer names and firms

No meaningful remaining freeze-safe wiring gap was found. Like Interpreter, Stage 5 appears to be effectively already satisfied by current implementation.

### 1. Model

#### Case model

`src/types/case.ts:Videographer`

The live case record already includes a first-class videographer shape with:

- `name`
- `firm`
- `role_title`
- `cert_number`
- `email`
- `phone`

`src/types/case.ts:normalizeVideographerFromUnknown`
`src/types/case.ts:dedupeVideographers`

Videographer normalization and load-time repair are already present. Dedup uses a composite key including:

- `firm`
- `role_title`
- `cert_number`

Classification: `already wired`

#### Directory model

`src/types/contact.ts:VideographerContactDetails`

Reusable videographer directory storage already exists under `contacts.details` with:

- `cert_number`
- `role_title`

Firm linking is also already available via `contacts.firm_id`.

Classification: `already wired`

### 2. Entry UI

`src/components/IntakeScreen/ParticipantsPanel.tsx:PanelCategory`
`src/components/IntakeScreen/ParticipantsPanel.tsx:VIDEOGRAPHER_DIRECTORY_FIELDS`
`src/components/IntakeScreen/ParticipantsPanel.tsx:handleSave`

The mounted shared participant modal already includes a live videographer add flow.

Directory fields exposed today:

- name
- phone
- email
- certification number
- role title
- firm linking via the shared firm block

Case-specific fields exposed today:

- none beyond the chosen directory/contact + firm-linked data

On save, the mounted flow:

- persists reusable videographer details to the directory contact when creating a new entry
- adds a case videographer entry through `addVideographer(...)`

Classification: `already wired`

### 3. Reducer / context wiring

`src/context/IntakeContext.tsx:addVideographer`, `removeVideographer`, `updateVideographer`
`src/store/intakeReducer.ts:ADD_VIDEOGRAPHER`, `REMOVE_VIDEOGRAPHER`, `UPDATE_VIDEOGRAPHER`

Videographer add/update/remove are already first-class reducer and context actions.

Classification: `already wired`

### 4. UFM flow

`src/lib/ufm/buildUfmMetadata.ts:buildAppearances`
`src/lib/ufm/buildUfmMetadata.ts:buildLawFirms`

Videographer data already flows into UFM in two places:

#### UFM appearances

The builder emits videographer appearance entries with:

- `category: "videographer"`
- `name`
- `firm`
- `cert_number`
- `role_title`
- `phone`
- `email`

Directory contact details are used as fallback enrichment where the case entry is sparse.

#### UFM law firms

Videographer firm names are also folded into `law_firms` via the derived firm pass, with directory-firm enrichment for:

- firm name
- address
- city
- state
- zip
- phone
- fax

Classification: `already wired`

### 5. Videographer-specific landmine: video statements / media log

#### What exists

The live codebase contains:

- witness-side `requires_videographer`
- reporter-request-side `audiovisual_recording`
- videographer participant model and UFM appearance output

#### What was not found

No live runtime field or consumer was found for:

- videographer “going on/off the record” statements
- media/exhibit/video log entries
- equipment/media notes specific to the videographer

Those concepts do not appear as first-class case fields on `Videographer`, and no live formatter/editor/UFM branch was found that consumes them.

This is not a broken wire in existing behavior. It is simply beyond the current implemented scope.

Classification:

- existing videographer participant data: `already wired`
- richer video-log / on-off-record workflow: `missing-feature`

### 6. Keyterms

`src/lib/keytermDerivation.ts:deriveKeyterms`

Videographer data already flows into deterministic keyterms:

- videographer names are harvested as proper names
- videographer firms are harvested as organization/company terms

Existing tests also cover videographer-derived firm tokens in the live deterministic path.

Classification: `already wired`

### 7. Gap classification

| Area | Current state | Classification | Action |
|---|---|---|---|
| Videographer case shape | Present in `CaseRecord` with normalization + dedup | `already wired` | none |
| Videographer directory details | Present in `contacts.details` with `firm_id` support | `already wired` | none |
| Mounted videographer form | Present in `ParticipantsPanel` shared modal | `already wired` | none |
| Videographer -> UFM appearances | Present in `buildUfmMetadata()` | `already wired` | none |
| Videographer firm -> UFM law firms | Present in derived firm pass | `already wired` | none |
| Videographer keyterms | Present in `keytermDerivation()` | `already wired` | none |
| Video statements / media log workflow | No live first-class field or consumer found | `missing-feature` | defer |

### 8. Stage 5 decision

Videographer is `REUSE`, but no meaningful freeze-safe wiring gap remains to implement in this stage.

That means the participant roadmap is now fully mapped:

#### REUSE-done / already wired

- Attorney
- Reporter
- Interpreter
- Videographer

#### BUILD-deferred

- Witness / Deponent
- richer videographer media-log / on-off-record workflow
- first-class Corporate Representative forms
- first-class Records Custodian forms

So the correct action for this run is to stop at the audit and report Stage 5 as effectively already satisfied by existing implementation.

### Carry-forward reminders

- Witness remains deferred as a build stage.
- Interpreter is reuse and already done.
- Attorney `function: OTHER` remains a must-fix-before-RC item.
- `appearance_label` still feeds UFM appearances only, not transcript speaker labels.
- `Role In This Proceeding` still lacks an authoritative constrained set in live code.
- Records Custodian / Corporate Representative still lack first-class dedicated forms.
- `reporter_profiles` still lacks firm / phone / email storage for signed-in profile autofill.
