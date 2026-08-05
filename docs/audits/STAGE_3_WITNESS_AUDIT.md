## Stage 3 Witness Audit

- Branch inspected: `feature/stage3-workspace-core`
- HEAD inspected: `464fdf35119658437623315242b484fa6708cf04`
- Baseline checks: `npm test` = 43 files / 223 tests passing; `npm run typecheck` = passing

### Summary

Stage 3 is mostly an audit of existing witness data plumbing rather than a safe wiring task. The live case model already has a first-class `witnesses[]` shape, `buildUfmMetadata()` already emits a deponent string from `witnesses[]`, and `keytermDerivation()` already harvests witness/deponent names at high priority. The witness-specific centerpiece from the prompt, the read-and-sign vs. waived certificate branch, does not appear to have a live runtime consumer in the current web app. That makes the remaining gap a missing feature rather than a freeze-safe wire.

### 1. Current witness capture and storage

#### Case model

`src/types/case.ts:Witness`

The live case model already includes witness-specific fields:

- `name`
- `role`
- `title`
- `employer`
- `prefix_suffix`
- `party_affiliation`
- `is_corporate_rep`
- `corporate_entity`
- `read_and_sign`
- `requires_interpreter`
- `requires_videographer`
- `spelling_corrections`
- `email`
- `phone`

`src/types/case.ts:normalizeWitnesses`, `src/types/case.ts:dedupeWitnesses`

The normalizer and load-time self-heal already preserve witnesses as a first-class collection and use a role-bearing composite dedup key that includes:

- `role`
- `title`
- `employer`
- `prefix_suffix`
- `party_affiliation`
- `is_corporate_rep`
- `corporate_entity`
- `read_and_sign`
- `requires_interpreter`
- `requires_videographer`

Classification: `already wired`

#### Reducer / context support

`src/store/intakeReducer.ts:ADD_WITNESS`, `REMOVE_WITNESS`, `UPDATE_WITNESS`
`src/context/IntakeContext.tsx:addWitness`, `removeWitness`, `updateWitness`

The reducer and intake context already expose witness add/update/remove actions.

Classification: `already wired`

#### Live Intake UI status

`src/components/IntakeScreen/ParticipantsPanel.tsx:PanelCategory`
`src/components/IntakeScreen/ParticipantsPanel.tsx:openDrawer`

The mounted shared participant modal does not include a witness category. The live add flows cover:

- attorney
- interpreter
- videographer
- reporter
- scheduler
- paralegal
- legal_assistant
- records_custodian
- corporate_representative
- participant

There is no mounted witness/deponent add/edit form in the current participant workflow.

Classification: `missing-feature`
Risk: low data risk, medium workflow risk. The case model supports witnesses, but the live Intake modal does not currently surface a dedicated witness entry flow.

### 2. Witness -> UFM deponent wiring

`src/lib/ufm/buildUfmMetadata.ts:deponentName`
`src/lib/ufm/buildUfmMetadata.ts:buildUfmMetadata`

Current behavior:

- if `record.witnesses.length > 0`, `deponentName(record)` joins witness names and returns them
- `buildUfmMetadata()` writes that value into `ufm_metadata.deponent`

This means the live UFM deponent field is already populated from `CaseRecord.witnesses[]`.

What is not wired:

- witness `prefix_suffix` does not flow into a separate UFM field
- witness `party_affiliation` does not flow into a separate UFM field
- witness `read_and_sign` does not flow into `buildUfmMetadata()`

Classification:

- deponent name: `already wired`
- richer witness metadata -> UFM: `missing-feature`

Risk: low. No broken path was found for the existing deponent-name output, but there is no additional witness-specific UFM branching beyond the name string.

### 3. Certificate branch: read-and-sign vs. waived

#### Source field exists

`src/types/case.ts:Witness.read_and_sign`
`src/lib/parsing/applyExtraction.ts:mapReadAndSign`
`src/lib/parsing/applyJobSheetExtraction.ts`
`src/components/ExtractedFieldsTable/fieldProjection.ts`
`src/validation/intakeValidation.ts`

The source field exists, is extracted, is projected in the extracted-fields table, and is validated as a witness completeness item.

#### Live certificate-selection consumer

Audit result: no live runtime code path was found in the current web app that reads `witness.read_and_sign` and selects an errata/read-and-sign certificate path versus a signature-waived path.

Not found in any active live consumer:

- `src/lib/ufm/buildUfmMetadata.ts`
- `src/components/CertificationScreen/CertificationScreen.tsx`
- `src/components/ExportScreen/ExportScreen.tsx`
- `src/components/DepoEditor.tsx`

The architecture docs describe this requirement, but the current app code does not appear to implement a live certificate branch selector from the witness field.

Classification: `missing-feature`
Risk: high for Stage 3 scope, because this is the witness-specific acceptance criterion from the prompt and it is not just a small wire. The source field exists, but the runtime consumer/branch is absent.

### 4. Witness keyterm harvest

`src/lib/keytermDerivation.ts:deriveKeyterms`

Current behavior:

- witness/deponent names are already harvested at the highest people tier
- the witness set includes the deponent honorific variants added earlier
- expert employers already flow as company terms when present

Classification: `already wired`
Risk: low

### 5. Gap classification

| Area | Current state | Classification | Recommended action |
|---|---|---|---|
| Witness case model | First-class `witnesses[]` shape, reducer actions, normalizer | `already wired` | none |
| Live witness entry form | No mounted witness/deponent modal in `ParticipantsPanel` | `missing-feature` | dedicated witness entry stage later |
| Witness -> UFM deponent name | Already populated via `deponentName(record)` | `already wired` | add regression test only if touched later |
| Witness -> richer UFM metadata | No separate witness-driven fields beyond deponent string | `missing-feature` | design explicitly before implementation |
| Signature-status certificate branch | No live runtime consumer selecting errata vs. waiver from `read_and_sign` | `missing-feature` | dedicated certificate feature task, not freeze-safe wiring |
| Witness keyterm harvest | Already present in `keytermDerivation()` | `already wired` | none |

### 6. Stage 3 verdict

No remaining gap found in this audit qualifies as a clean `freeze-safe wire`.

What is already true today:

- witness/deponent names are stored in `CaseRecord.witnesses[]`
- witness/deponent names already populate `ufm_metadata.deponent`
- witness/deponent names already survive into deterministic Deepgram keyterms

What is not already true today:

- there is no live mounted witness entry form in the participant modal flow
- there is no live certificate-branch selector that turns `read_and_sign` into errata vs. signature-waived output

Because the centerpiece Stage 3 behavior is absent rather than partially wired, the correct action under the prompt is to stop at the audit and report it rather than build new certificate behavior during the active freeze.

### Carry-forward reminders

- Attorney `function: OTHER` remains a must-fix-before-RC item.
- `appearance_label` still feeds UFM appearances only, not transcript speaker labels.
- `Role In This Proceeding` still lacks an authoritative constrained set in live code.
- Records Custodian / Corporate Representative still do not have first-class dedicated forms.
- `reporter_profiles` still lacks firm / phone / email storage for signed-in profile autofill.
