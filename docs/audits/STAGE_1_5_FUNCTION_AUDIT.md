## Stage 1.5 Attorney Function Audit

- Branch inspected: `feature/stage3-workspace-core`
- HEAD inspected: `68c6c2a1f311d69424eaecc65f032fd4ef24847e`
- Baseline checks: `npm test` = 43 files / 223 tests passing; `npm run typecheck` = passing

### Verdict

This change is `freeze-safe` from a storage perspective.

Attorney function data is stored inside the existing `cases.payload` JSONB document, not in a fixed relational column. That means multi-select can be implemented without a schema migration, as long as the change is handled inside the local case model, normalizer, reducer payloads, and UFM builder.

This is still a high-risk behavior change because it intersects:

- role-preserving dedup
- legacy `function: "OTHER"` data
- UFM appearance emission

So the Stage 0.5 pattern still applies: tests first, then build, then re-verify the guard.

### 1. Where attorney `function` is defined, defaulted, and written today

#### Type definition

`src/types/case.ts:Attorney`

Current shape:

- `role: ExtractedField<AttorneyRole>`
- `function?: ExtractedField<AttorneyRole>`
- `representing: ExtractedField<string | null>`

The current function type is single-value and uses the legacy `AttorneyRole` enum:

- `EXAMINING`
- `OPPOSING`
- `CO_COUNSEL`
- `OTHER`

#### Default

`src/types/case.ts:emptyAttorney`

New attorneys currently default to:

- `role = "OTHER"`
- `function = "OTHER"`

#### Normalization

`src/types/case.ts:normalizeAttorneyRole`
`src/types/case.ts:normalizeAttorneyFromUnknown`

Current normalization is single-value only. It normalizes both `role` and `function` through the same single-value role parser and also falls back one to the other:

- `role: normalizeAttorneyRole(source?.role ?? source?.function, ...)`
- `function: normalizeAttorneyRole(source?.function ?? source?.role, ...)`

This is why legacy data survives today, but it is also why current semantics are still basically “one value shared across two fields.”

#### Write path

`src/components/IntakeScreen/ParticipantsPanel.tsx:ATTORNEY_CASE_FIELDS`
`src/components/IntakeScreen/ParticipantsPanel.tsx:defaultDraft`
`src/components/IntakeScreen/ParticipantsPanel.tsx:handleSave`

The current mounted attorney form exposes a single `Function` select. The draft defaults to:

- `attorneyFunction: "OTHER"`

When saving a new attorney, the same selected value is written into both:

- `role: manualField(draft.attorneyFunction)`
- `function: manualField(draft.attorneyFunction)`

Classification: current storage/write model is single-value and behaviorally coupled.

### 2. Can multi-select be stored without schema change?

#### Database storage

`supabase/migrations/20260603210000_create_core_schema.sql`
`src/api/caseService.ts:saveCase`

Case data is persisted as:

- `cases.payload jsonb`

`saveCase()` upserts the entire `CaseRecord` as the payload, and `loadCase()` runs it back through `normalizeCaseRecord()`.

That means attorney function can be widened inside the local case payload shape without any relational migration.

#### Audit conclusion

No DB schema change is required.

What *is* required:

- widening the local `Attorney.function` value shape
- teaching `normalizeCaseRecord()` to load both legacy single values and new multi values
- updating dedup comparison so multi-function attorneys remain role-preserved

Classification: `freeze-safe`

### 3. How `function` flows into UFM today

`src/lib/ufm/buildUfmMetadata.ts:UfmAppearance`
`src/lib/ufm/buildUfmMetadata.ts:buildAppearances`

Current UFM appearance output is single-value:

- `function?: string | null`

For attorneys, current emission is:

- `function: normalizeValue(attorney.function?.value ?? attorney.role.value)`

So UFM currently receives one function string per attorney appearance, using `function` first and `role` as legacy fallback.

#### Downstream consumer surface

What was found:

- the UFM preview renders the envelope as raw JSON in `src/components/IntakeScreen/UfmPayloadPreview.tsx`
- tests assert single string outputs like `"EXAMINING"`

What was **not** found in the live web app:

- no transcript/editor consumer reading `appearances[].function`
- no export/certification screen consumer reading `appearances[].function`
- no live web formatter or by-line generator consuming that field yet

Audit conclusion:

- live web UFM output currently carries one string
- there is no stronger in-app single-function consumer beyond the payload itself
- multi-value output can be introduced in the payload if documented and tested, because no live web formatter path would break from a type expectation here

### 4. Representation is already separate

`src/types/case.ts:Attorney.representing`
`src/components/IntakeScreen/ParticipantsPanel.tsx:buildRepresentingValue`
`src/components/IntakeScreen/ParticipantsPanel.tsx:handleSave`
`src/lib/ufm/buildUfmMetadata.ts:buildAppearances`

Representation is already stored separately from function:

- `representing` is built from the preset + party flow
- it is written independently from `role/function`
- UFM emits it independently as `representing`

This separation must be preserved. There is no need to merge or infer one from the other.

Classification: `already independent`

### 5. Legacy `OTHER` values

#### Where they live

`src/types/case.ts:Attorney.function`
`src/types/case.ts:normalizeAttorneyRole`
`src/types/case.rolePreservation.test.ts`

Legacy `OTHER` values already exist in saved case payloads and in role-preservation tests. They currently survive load because the normalizer explicitly accepts `"OTHER"`.

#### UI implications

The current UI defaults new attorneys to `OTHER`, and older saved attorneys may already carry `function: "OTHER"` in the payload. Any multi-select implementation must:

- continue loading those records safely
- avoid silently rewriting or dropping `OTHER`
- define a read/display behavior for legacy `OTHER`

Classification: `must preserve`

### 6. Role-preservation impact

`src/types/case.ts:dedupeAttorneys`
`src/types/case.rolePreservation.test.ts`

Today, attorney dedup uses a composite key that includes:

- `representing`
- `function ?? role`
- `firm`

This is the exact hot zone for this change. If `function` becomes multi-select, the dedup key and comparable-value normalization must treat the function set deterministically so:

- `["EXAMINING_ATTORNEY", "CUSTODIAL_ATTORNEY"]` is distinct from `["EXAMINING_ATTORNEY"]`
- set ordering does not create false duplicates or false distinctions
- legacy `OTHER` stays preserved

Classification: `high-risk but fixable without schema`

### 7. Stage 1.5 decision

Proceed.

This does **not** need schema, migrations, or new dependencies. The correct implementation path is:

1. pin current behavior with characterization tests
2. widen attorney-function storage inside the existing case payload
3. update UFM emission and role-preservation handling together
4. re-run the role-preservation guard

### 8. Carry-forward notes for the build phase

- No `docs/archive/status/PRE_RC_CHECKLIST.md` file was found in the repo root during this audit, so there is nothing to update there yet.
- The current mounted attorney form still writes the same single value into both `role` and `function`.
- Live UFM currently emits one function string per appearance; the Stage 1.5 build must document whether it emits an array of canonical functions or a primary mapping plus preserved full set.
