# Intake UFM Gap Analysis

## Scope And Limitation
- The repo does not contain a Texas UFM specification. The only explicit UFM requirements document in-repo is California-specific and says so directly. `docs/architecture/UFM_DATA_DICTIONARY.md:6-10`, `docs/architecture/UFM_DATA_DICTIONARY.md:143-147`
- Because no Texas legal requirements source exists in the repository, this report cannot determine Texas compliance conclusively. It can only identify what Intake currently captures, what California-oriented assumptions are baked in, and what gaps prevent Intake from serving as a Texas-ready case-assembly source of truth.

## What Intake Already Models That A Texas Workflow Would Likely Need
- Case caption basics. `src/types/case.ts:57-63`
- Deponent/witness, attorney, interpreter, videographer, participant, and reporter entities. `src/types/case.ts:82-153`
- Session/date/location metadata. `src/types/case.ts:158-167`
- Transcript-format metadata, even though Intake does not render it. `src/types/case.ts:186-194`
- Certification/notary fields, even though Intake does not render them. `src/types/case.ts:144-153`, `src/types/case.ts:212-223`

## Current UFM Validation Is Not A Texas Legal Gate
- The only real validation code checks a narrow set of generic required fields plus the existence of an examining attorney. `src/store/intakeReducer.ts:674-717`
- It does not validate transcript format, notary/certification fields, uploaded source documents, durable audio state, or any jurisdiction-specific legal output text. `src/store/intakeReducer.ts:687-717`, `src/components/IntakeScreen/IntakeScreen.tsx:247-314`
- The visible “Ready to proceed” indicator is weaker still because it ignores unconfirmed fields. `src/components/IntakeScreen/IntakeScreen.tsx:135-176`

## Texas-Relevant Gaps Confirmable From Repo Evidence

### 1. No Texas rule source
- There is no Texas UFM dictionary, no Texas validation matrix, and no Texas payload generator in the repo. The only detailed UFM dictionary is California-specific. `docs/architecture/UFM_DATA_DICTIONARY.md:8-10`, `docs/architecture/UFM_DATA_DICTIONARY.md:145-147`

### 2. Intake does not expose many fields that any jurisdiction-specific review would likely need
- `proceeding.*`, `format.*`, reporter notary fields, `audio`, `exhibits`, `certification`, and `notes` are all in the model but not rendered on the current Intake screen. `src/types/case.ts:172-235`, `src/types/case.ts:312-316`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165`

### 3. Transcript-format compliance is modeled but not enforced
- The California dictionary explicitly requires `lines_per_page = 25` and `chars_per_line = 58` for California compliance unless variance is documented. `docs/architecture/UFM_DATA_DICTIONARY.md:134-140`
- `CaseRecord.format` has those fields and defaults, but Intake provides no UI and no validation for them. `src/types/case.ts:186-194`, `src/types/case.ts:326-336`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165`
- For Texas specifically, the correct legal values are unknown from repo evidence. That uncertainty is itself a gap.

### 4. UFM output generation is not implemented on Intake
- The architecture assigns appearance-page, certificate, caption, attorney-list, and exhibit-index generation to Stage 5 UFM Insertions. `docs/architecture/MASTER_ARCHITECTURE.md:103-112`
- Intake’s `View UFM Payload` button is a placeholder only. `src/components/IntakeScreen/IntakeScreen.tsx:922-929`
- Therefore Intake cannot currently prove Texas-ready assembled output, even if the metadata were present.

### 5. Source-document durability gap
- The case storage spec expects uploaded intake docs and audio to be part of the case package. `docs/architecture/CASE_STORAGE_SPEC.md:17-30`
- Intake’s actual uploads are local-only component state and disappear on reload. `src/components/IntakeScreen/IntakeScreen.tsx:247-314`
- That means Intake cannot currently preserve the documentary basis that a jurisdiction-specific review would likely depend on.

## California-Oriented Assumptions In Current Repo State
- The UFM dictionary is explicitly California-specific. `docs/architecture/UFM_DATA_DICTIONARY.md:8-10`, `docs/architecture/UFM_DATA_DICTIONARY.md:145-147`
- `mockCaseRecord` seeds California court, California location, California cert state, and California-style CSR examples. `src/components/ExtractedFieldsTable/mockRecord.ts:21-62`
- The default transcript format matches the California UFM document’s defaults. `src/types/case.ts:326-336`, `docs/architecture/UFM_DATA_DICTIONARY.md:86-97`

## Intake As Texas-Ready Case Assembly Engine: What Is Missing
- A Texas requirements source inside the repo.
- Jurisdiction-aware validation rules rather than the current generic required-field subset. `src/store/intakeReducer.ts:674-717`
- Visible collection/editing for currently hidden proceeding, format, reporter-notary, and certification fields. `src/types/case.ts:172-223`, `src/components/IntakeScreen/IntakeScreen.tsx:960-1165`
- Durable ownership of notice/job-sheet/audio artifacts inside the assembled case package. `docs/architecture/CASE_STORAGE_SPEC.md:17-30`, `src/components/IntakeScreen/IntakeScreen.tsx:247-314`
- A real UFM payload generator and preview. `src/components/IntakeScreen/IntakeScreen.tsx:922-929`, `docs/architecture/MASTER_ARCHITECTURE.md:103-112`

## Bottom Line
- There is not enough in-repo evidence to say the current Intake screen satisfies Texas UFM legal requirements because the repo never defines those requirements. `docs/architecture/UFM_DATA_DICTIONARY.md:145-147`
- What the code does show is that Intake already models much of the likely metadata surface, but validates only a narrow subset, exposes too little of that model, does not durably own uploaded source artifacts, and has no real UFM output path yet. `src/types/case.ts:282-317`, `src/store/intakeReducer.ts:674-717`, `src/components/IntakeScreen/IntakeScreen.tsx:247-314`, `src/components/IntakeScreen/IntakeScreen.tsx:922-929`

