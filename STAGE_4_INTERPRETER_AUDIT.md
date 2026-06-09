## Stage 4 Interpreter Audit

- Branch inspected: `feature/stage3-workspace-core`
- HEAD inspected: `d07835278c7fd30ea2b0034b2c51dac37a494433`
- Baseline checks: `npm test` = 43 files / 223 tests passing; `npm run typecheck` = passing

### Verdict

Interpreter is a `REUSE` stage, not a `BUILD` stage.

The live app already has:

- a first-class interpreter case shape
- a mounted interpreter add flow in the shared participant modal
- directory-backed interpreter details in `contacts.details`
- live UFM appearance mapping for interpreter fields
- live deterministic keyterm harvest for interpreter names

No meaningful remaining gap was found that requires a safe Phase 2 wiring change. The only notable limitation is that interpreter oath status is consumed in UFM appearances but does not appear to drive any separate transcript/certificate branch today. That is a product/consumer decision, not a missing reuse wire.

### 1. Model

#### Case model

`src/types/case.ts:Interpreter`

The live case record already includes a first-class interpreter shape with:

- `name`
- `language_from`
- `language_to`
- `oath_administered`
- `certified`
- `cert_number`
- `agency`
- `email`
- `phone`

`src/types/case.ts:normalizeInterpreterFromUnknown`
`src/types/case.ts:dedupeInterpreters`

Interpreter normalization and load-time repair are already present. Dedup uses a role-bearing composite key including:

- `language_from`
- `language_to`
- `oath_administered`
- `certified`
- `cert_number`
- `agency`

Classification: `already wired`

#### Directory model

`src/types/contact.ts:InterpreterContactDetails`

The reusable directory side already exists under `contacts.details` with:

- `certified`
- `cert_number`
- `certification_authority`
- `certification_expiration`
- `remote_capable`
- `agency`
- `agency_contact`
- `default_languages`

Classification: `already wired`

### 2. Entry UI

`src/components/IntakeScreen/ParticipantsPanel.tsx:PanelCategory`
`src/components/IntakeScreen/ParticipantsPanel.tsx:INTERPRETER_DIRECTORY_FIELDS`
`src/components/IntakeScreen/ParticipantsPanel.tsx:INTERPRETER_CASE_FIELDS`
`src/components/IntakeScreen/ParticipantsPanel.tsx:handleSave`

Unlike Witness, Interpreter has a live mounted form in the shared participant modal:

- directory fields:
  - name
  - phone
  - email
  - certified
  - certification number
  - certification authority
  - certification expiration
  - remote capable
  - agency
  - agency contact
  - default languages
- case fields:
  - oath administered
  - language from
  - language to

On save, the mounted interpreter flow:

- persists reusable interpreter details to the directory contact when creating a new entry
- adds a case interpreter entry through `addInterpreter(...)`

Classification: `already wired`

### 3. Reducer / context wiring

`src/context/IntakeContext.tsx:addInterpreter`, `removeInterpreter`, `updateInterpreter`
`src/store/intakeReducer.ts:ADD_INTERPRETER`, `REMOVE_INTERPRETER`, `UPDATE_INTERPRETER`

Interpreter add/update/remove are already first-class reducer and context actions.

Classification: `already wired`

### 4. UFM flow

`src/lib/ufm/buildUfmMetadata.ts:buildAppearances`

Interpreter data already flows into UFM appearances. The builder emits:

- `category: "interpreter"`
- `name`
- `certified`
- `cert_number`
- `certification_authority`
- `certification_expiration`
- `agency`
- `agency_contact`
- `language_from`
- `language_to`
- `oath_administered`
- `phone`
- `email`

Important detail:

- some interpreter fields come from the case record directly (`name`, `language_from`, `language_to`, `oath_administered`, `phone`, `email`)
- some enrich from the directory contact by name match (`certification_authority`, `certification_expiration`, `agency_contact`, and fallback certificate fields)

`src/lib/ufm/buildUfmMetadata.test.ts:enriches appearance and law firm metadata from participant directory records`

There is already test coverage asserting interpreter UFM appearance output, including:

- `cert_number`
- `certification_authority`
- `agency_contact`
- `language_from`
- `language_to`
- `oath_administered`

Classification: `already wired`

### 5. Interpreter-specific oath / sworn status

#### Source field

`src/types/case.ts:Interpreter.oath_administered`
`src/components/IntakeScreen/ParticipantsPanel.tsx:INTERPRETER_CASE_FIELDS`

The live app already captures interpreter oath/sworn status as `oath_administered`.

#### Live consumer

`src/lib/ufm/buildUfmMetadata.ts:buildAppearances`

There is a live runtime consumer: `oath_administered` is carried into UFM appearances.

What was not found:

- no separate transcript-formatting branch consuming interpreter oath status
- no separate certificate/jurat branch consuming interpreter oath status
- no editor/runtime behavior beyond the UFM appearance payload

This is not the Witness problem. The field is not captured-and-orphaned; it does have a live consumer in UFM. It is simply not used for any additional certificate/formatter branching today.

Classification:

- oath field itself: `already wired`
- any future transcript/certificate oath feature: `missing-feature`

### 6. Keyterms

`src/lib/keytermDerivation.ts:deriveKeyterms`

Interpreter names already flow into deterministic keyterms. Interpreter agencies also feed the organization/company harvest.

This is already covered in existing keyterm tests and by the live derivation path.

Classification: `already wired`

### 7. Gap classification

| Area | Current state | Classification | Action |
|---|---|---|---|
| Interpreter case shape | Present in `CaseRecord` with normalization + dedup | `already wired` | none |
| Interpreter directory details | Present in `contacts.details` | `already wired` | none |
| Mounted interpreter form | Present in `ParticipantsPanel` shared modal | `already wired` | none |
| Interpreter -> UFM | Present in `buildUfmMetadata()` appearances | `already wired` | none |
| Interpreter oath status | Captured and emitted in UFM appearances | `already wired` | none |
| Interpreter oath -> transcript/certificate branch | No separate live consumer found | `missing-feature` | defer |
| Interpreter keyterms | Present in `keytermDerivation()` | `already wired` | none |

### 8. Stage 4 decision

Interpreter is `REUSE`, but no meaningful freeze-safe wiring gap remains to implement in this stage.

That means:

- this is not a Witness-style build stage
- but it also does not justify Phase 2 changes under the active freeze, because the live reuse paths are already in place and already tested

So the correct action for this run is to stop at the audit and report Stage 4 as effectively already satisfied by existing implementation.

### Carry-forward reminders

- Witness remains a build-stage feature batch, deferred.
- Attorney `function: OTHER` remains a must-fix-before-RC item.
- `appearance_label` still feeds UFM appearances only, not transcript speaker labels.
- `Role In This Proceeding` still lacks an authoritative constrained set in live code.
- Records Custodian / Corporate Representative still lack first-class dedicated forms.
- `reporter_profiles` still lacks firm / phone / email storage for signed-in profile autofill.
