## Intake Lifecycle Integrity Audit

Branch: `feature/stage3-workspace-core`  
HEAD inspected: `98d5b34f83826b22311b2b0336ea9f3ab9e72e3c`  
Baseline: `npm run test` = `43` files / `228` tests passing; `npm run typecheck` = passing  
Scope: report-only. No `src/**` changes.

### Verdict

**PASS-WITH-RISKS**

The core case payload round-trip is largely sound: extraction writes into `CaseRecord`, `saveCase()` persists that payload without reshaping, `loadCase()` rehydrates through `normalizeCaseRecord()`, and `buildUfmMetadata()` consumes that normalized record directly. The new attorney multi-function array **does survive save/reload** by code path. The main integrity risks are not the primary payload save itself; they are side channels and joins around it:

1. conflict persistence depends on asynchronous provenance writes that are not transactionally coupled to case saves
2. attorney `appearance_label` is not persisted in `CaseRecord` at all and is rejoined later from directory contacts
3. attorney function arrays are membership-stable but load-time normalization canonicalizes array order

---

## 1. NOD extraction -> case record

### Current behavior

Notice extraction is applied through `applyExtraction()` in [src/lib/parsing/applyExtraction.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:1), which does **not** mutate the record directly. It returns an `ExtractionApplication` containing:

- `fieldUpdates`
- `attorneyAdds` / `attorneyPatches`
- `witnessAdds` / `witnessPatches`
- `partyAdds` / `partyPatches`
- `lawFirmAdds` / `lawFirmPatches`
- `conflicts`
- `keyterms`

The live Notice path is `DocumentUploadPanel.runNoticeExtraction()` in [src/components/IntakeScreen/DocumentUploadPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:1). It:

1. parses the document
2. builds `application = applyExtraction(extraction.fields, record)`
3. previews the next record with `previewExtractionState()`
4. applies the extraction into Intake state with `applyParsedExtraction`
5. saves the preview record via `applyAndPersistExtraction(..., recordToSave: nextState.record, ...)`

The reducer-side write happens in `intakeReducer` case `"APPLY_EXTRACTION"` in [src/store/intakeReducer.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.ts:1). That reducer writes extracted field leaves as `source: "extracted"`, `confirmed: false`, `conflict: false`, then appends or patches structured collections.

### Fields observed

`applyExtraction()` writes caption/session/scheduling/service/reporter-request fields and structured participant collections. Examples:

- caption/session/scheduling/service via repeated `queueField(...)`
- witness via `applyWitnessExtraction()`
- attorneys via `applyAttorneyExtraction()`
- parties via `applyPartyExtraction()`
- law firms via `applyLawFirmExtraction()`

### Integrity assessment

The extraction-to-record step is structurally safe. The write target is the same `CaseRecord` shape later saved and later consumed by UFM. The main risk at this stage is not shape loss; it is that provenance persistence is separate from record persistence, which shows up later in the conflict lifecycle.

---

## 2. Attorney / witness auto-mapping

### Attorney mapping

Attorney extraction lives in `applyAttorneyExtraction()` in [src/lib/parsing/applyExtraction.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:1).

Observed behavior:

- extracted party names are explicitly filtered out of attorney adds using `extractedPartyNames`
- existing attorneys are matched by normalized name
- extracted attorney patches may populate:
  - `firm`
  - `representing`
  - `bar_number`
  - address/city/state/zip
  - email/phone
  - `role`

What it does **not** do:

- it does **not** write or infer the new attorney `function` multi-select array

That means attorney mapping preserves representation independently, but extracted NOD mapping currently has no function inference. That is consistent with the current product: function selection is manual Stage 1.5 behavior, not extracted NOD behavior.

### Witness mapping

Witness extraction lives in `applyWitnessExtraction()` in [src/lib/parsing/applyExtraction.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:1).

Observed behavior:

- writes/patches only `witnesses[0]`
- captures:
  - `name`
  - `role`
  - `party_affiliation`
  - `read_and_sign`
  - `requires_interpreter`
  - `requires_videographer`

This is limited and matches the earlier witness audit: witness remains a build-stage feature area, not a complete live participant workflow.

### Integrity assessment

- Attorney mapping preserves `representing` independently of `role` and does not overwrite the new function array.
- Witness mapping is intentionally limited. No data-loss bug is evident here; the limitation is functional coverage, not payload corruption.

---

## 3. Conflict resolution

### Detection path

Conflicts are surfaced through two paths:

- extraction-time detection/persistence in `applyAndPersistExtraction()` in [src/components/IntakeScreen/extractionPersistence.ts](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/extractionPersistence.ts:1)
- UI-side conflict registration in `ExtractedFieldsTable` using `detectConflict()` from `useConflict()` in [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:1)

Open conflicts on reload are reconstructed **from provenance rows**, not from the case payload, via `buildStateFromProvenance()` and `deriveOpenConflicts()` in:

- [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:1)
- [src/lib/conflicts/deriveOpenConflicts.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/conflicts/deriveOpenConflicts.ts:1)

### Resolution path

When a user resolves a conflict:

- `ConflictResolutionModal` calls `useConflict().resolveConflict(...)`
- `ExtractedFieldsTable` forwards `onResolved` to Intake `onResolveConflict`
- Intake calls `resolveConflict(rowId, value, source)` from `IntakeContext`
- reducer case `"RESOLVE_CONFLICT"` rewrites the field in `CaseRecord` to:
  - accepted value
  - accepted source
  - `confirmed: true`
  - `conflict: false`

This is split across:

- [src/components/conflict/ConflictResolutionModal.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/ConflictResolutionModal.tsx:1)
- [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:1)
- [src/context/IntakeContext.tsx](/C:/Users/james/Projects/Depo-Pro/src/context/IntakeContext.tsx:1)
- [src/store/intakeReducer.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.ts:1)

### Persistence result

**Case-side resolution does persist through save/reload** because the resolved field value/source/confirmed/conflict flags are written back into `CaseRecord`, then saved as payload.

### Prime risk

**Conflict UI state depends on provenance persistence, and provenance writes are fire-and-forget.**

`persistEntry()` in [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:1) catches and logs Supabase errors but does not fail the user action. That means:

- case payload can save successfully
- provenance `conflict_resolved` write can fail silently
- reload can reconstruct an open conflict from stale provenance even though the case payload shows a resolved value

This is the highest-confidence lifecycle drift risk in the current Intake architecture.

### Secondary risk

`applyAndPersistExtraction()` records extraction/conflict provenance entries before the case save result is known. If case save fails, provenance rows may already exist for changes that never actually persisted in the case payload.

---

## 4. UFM payload build

### Current behavior

UFM is built from the normalized case record by `buildUfmMetadata()` in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:1). The preview uses that builder directly in [src/components/IntakeScreen/UfmPayloadPreview.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/UfmPayloadPreview.tsx:1).

Observed relevant outputs:

- attorney `function` survives into `ufm_metadata.appearances[].function`
- `representing` remains separate in `ufm_metadata.appearances[].representing`
- reporter certificate fields populate:
  - `csr_name`
  - `csr_license`
  - `csr_cert_expiration`
  - `firm_registration`
- `appearance_label` is populated into `appearances[].appearance_label`

### Important nuance: `appearance_label`

Attorney `appearance_label` is **not read from the case payload**. It is rejoined from the directory contact:

- attorney drawer stores `preferred_appearance_label` into `contacts.details` in [src/components/IntakeScreen/ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:1)
- `buildUfmMetadata()` looks it up from `directoryContacts` in `buildAppearances()`

So UFM appearance-label correctness depends on a successful directory-contact join by attorney name, not on case save/reload alone.

### Integrity assessment

The UFM builder itself is structurally consistent with the current case shape. The risk is not in the build function; it is in upstream provenance drift and the directory join for appearance labels.

---

## 5. SAVE

### Current behavior

`saveCase()` in [src/api/caseService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/caseService.ts:1) persists:

- `case_id`
- `proceeding_type`
- `stage`
- `notes`
- `payload: record`

There is no lossy transform before persistence. The full `CaseRecord` object is written as `payload`.

In the Intake shell, `persistCase()` in [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/IntakeScreen.tsx:1) adds only `_saveMeta` and `updated_at` before calling `saveCase()`.

### Integrity assessment

The save step is payload-preserving by design. The strongest evidence is the absence of any field-by-field serialization layer: the whole `CaseRecord` is upserted as `payload`.

---

## 6. RELOAD -> round-trip equality

### Current behavior

Reload is:

1. `loadCase(caseId)` -> `cases.payload`
2. `normalizeCaseRecord(data.payload)`
3. `loadCaseBundle(caseId)` adds files/audio/transcripts/provenance

Relevant files:

- [src/api/caseService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/caseService.ts:1)
- [src/api/caseLoadService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/caseLoadService.ts:1)
- [src/lib/normalizeCaseRecord.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/normalizeCaseRecord.ts:1)
- [src/types/case.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.ts:1)

### Field-by-field round-trip findings

#### Attorney `function` array

**Yes, it survives save/reload.**

Evidence:

- new writes store the array directly in `attorneys[].function`
- `saveCase()` persists the entire record payload unchanged
- `normalizeAttorneyFunction()` in [src/types/case.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.ts:1) explicitly accepts `AttorneyFunction[]`
- the role-preservation suite verifies normalized multi-function arrays in [src/types/case.rolePreservation.test.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.rolePreservation.test.ts:1)

Important nuance:

- reload canonicalizes function-array order through `normalizeAttorneyFunctionArray()`
- membership survives
- original click order does not

This is not a drop/flatten bug, but it is a mutation of ordering.

#### `representing`

**Survives independently.**

It is stored separately on `Attorney.representing`, saved in payload, normalized as its own extracted field, and emitted separately in UFM. No coupling to function storage exists in save/load.

#### Reporter certificate fields

**Survive.**

These are case-payload fields on `record.reporter`:

- `name`
- `cert_number`
- `license_expiration`
- `firm_registration_number`

They are written into the case record via `updateField(...)` in `ParticipantsPanel`, saved as payload, then consumed directly by `buildUfmMetadata()`.

#### Resolved conflicts

**Case-side resolution survives; provenance-side resolution is at risk.**

- the resolved case field survives because reducer `"RESOLVE_CONFLICT"` rewrites the field in the case payload
- the open/closed conflict UI state on reload depends on provenance rows in `field_provenance`
- async provenance failure can cause re-flagging on reload

#### `field_sources` / `field_confirmations`

**The built UFM envelope versions do not round-trip because they are not persisted artifacts.**

What survives is the source material they are recomputed from:

- `field_confirmations` are recomputed from `ExtractedField.confirmed` values stored in the case payload
- `field_sources` are recomputed from `ExtractedField.source` plus provenance-derived source lookups

This is safe when case payload and provenance stay in sync. It is risky when provenance writes fail independently.

#### `appearance_label`

**No, not as case-payload data.**

It survives only if the directory contact survives and can be rejoined by name at UFM-build time. Reloading the case alone does not reconstruct it because it is not part of `CaseRecord`.

### Round-trip equality conclusion

The saved shape is close to a semantic round-trip, not a byte-for-byte round-trip:

- payload fields mostly survive
- some data is recomputed rather than persisted (`field_sources`, `field_confirmations`, open conflicts)
- attorney function arrays are canonicalized on load
- appearance labels depend on an external directory join

---

## Integrity risks found

### 1. High — conflict provenance and case payload can drift

**Risk:** resolved conflicts can reappear after reload, or extracted/conflict provenance can exist for changes that never saved.

**Why:** provenance writes in `conflictStore.persistEntry()` are fire-and-forget and non-transactional relative to `saveCase()`.

**Affected data:** conflict open/closed state, field history accuracy, trust in review/audit trail.

### 2. High — attorney `appearance_label` is not part of the case round-trip

**Risk:** UFM appearance labels can disappear or change if the directory contact is missing, renamed, not loaded, or fails to match by normalized name.

**Why:** `appearance_label` is sourced from `contacts.details.preferred_appearance_label`, not from `CaseRecord`.

**Affected data:** UFM appearances page labels.

### 3. Medium — attorney function arrays reorder on reload

**Risk:** the original selection order is not preserved.

**Why:** `normalizeAttorneyFunctionArray()` canonicalizes order on load.

**Affected data:** ordering of the function array only. Membership survives.

### 4. Medium — UFM field source metadata is recomputed, not persisted

**Risk:** if provenance rows drift from case payload, `field_sources` can differ across rebuilds even when the visible case values look stable.

**Why:** `buildUfmMetadata()` recomputes source/confirmation metadata each time.

**Affected data:** UFM audit metadata, not the primary case values.

### 5. Low — witness lifecycle remains structurally incomplete

**Risk:** witness-specific lifecycle expectations can be over-assumed.

**Why:** witness extraction exists, but live witness workflow and certificate branching remain deferred feature work.

**Affected data:** witness feature completeness, not proven payload corruption.

---

## Recommended scoped fixes

### Fix 1 — Transactionalize or reconcile provenance writes with case saves

Scope:

- make provenance persistence fail visibly when it would desync lifecycle state, or
- add a reconciliation pass so reload cannot reopen already-resolved case fields from stale provenance alone

### Fix 2 — Decide whether `appearance_label` is case data or directory data, then wire accordingly

Scope:

- either persist the UFM-facing appearance label onto the case record at selection time
- or explicitly accept directory-join dependence and add characterization coverage for that join

### Fix 3 — Add an explicit save/load round-trip test for the attorney function array

Scope:

- dedicated `saveCase()` / `loadCase()` test proving:
  - array survives
  - legacy `OTHER` survives
  - representation stays independent
  - canonical reload order is documented intentionally

### Fix 4 — Add a provenance/case drift characterization test

Scope:

- simulate:
  - case save success + provenance failure
  - provenance success + case save failure
- document current reload behavior so future fixes are deliberate

### Fix 5 — Add a characterization test for `appearance_label` join dependence

Scope:

- prove what happens when the case reloads without matching directory contacts
- treat it as intentional or fix it later with a dedicated prompt

---

## Explicit callout: does the new multi-function attorney array survive save/reload?

**Yes, with one caveat.**

It survives as an array through the persisted `cases.payload` and reload normalization path. It is **not** flattened to a string or dropped. The caveat is that load normalization canonicalizes array order, so the original selection order is not preserved verbatim.

