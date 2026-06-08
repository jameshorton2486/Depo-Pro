# Stage 2 Reporter Wiring Audit

Audit baseline:
- Branch: `feature/stage3-workspace-core`
- Head inspected: `d041501`
- Baseline gates: `npm test` = 43 files / 221 tests passing; `npm run typecheck` passing

## Scope

This audit confirms what reporter wiring already exists before Stage 2 changes. It focuses on:
- signed-in reporter profile flow
- alternate reporter directory flow
- `CaseRecord.reporter` population
- `buildUfmMetadata` certificate population
- canonical format handling

## 1. Signed-in reporter profile flow

### Current wiring

- The signed-in profile is read through `getMyProfile()` in [src/api/reporterProfileService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/reporterProfileService.ts:30).
- `ParticipantsPanel.handleUseMyProfile()` writes profile values into the case through `updateField(...)` in [src/components/IntakeScreen/ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:647).
- Today that button populates:
  - `reporter.name`
  - `reporter.cert_number`
  - `reporter.license_expiration`
  - `reporter.firm_registration_number`
- It does **not** populate:
  - `reporter.firm`
  - `reporter.phone`
  - `reporter.email`

### Storage availability

- `reporter_profiles` currently stores:
  - `display_name`
  - `csr_number`
  - `csr_cert_expiration`
  - `firm_registration_number`
  - plus profile-only formatting/support fields
  in [src/types/reporterProfile.ts](/C:/Users/james/Projects/Depo-Pro/src/types/reporterProfile.ts:1).
- There is no profile field for firm name, phone, or email in the current storage shape.

### Classification

- Existing profile -> case certificate-field wiring: **already wired**
- Profile -> `reporter.firm` / `reporter.phone` / `reporter.email`: **needs-schema** under the current storage model

## 2. Alternate reporter directory flow

### Current wiring

- Reporter directory picks use the same `useContactStore().search(...)` path as the other participant drawers in [src/components/IntakeScreen/ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:489).
- Picked reporter contacts are applied through `applyReporterFromDirectory(...)` in [src/components/IntakeScreen/ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:638).
- Today that helper populates:
  - `reporter.name`
  - `reporter.cert_number`
  - `reporter.license_expiration`
  - `reporter.firm_registration_number`
  - `reporter.firm`
- It does **not** populate:
  - `reporter.phone`
  - `reporter.email`
  - `reporter.firm_address`

### Source detail availability

- Alternate reporter contacts already store:
  - top-level `phone`
  - top-level `email`
  - top-level `organization`
  - reporter details `csr_number`
  - reporter details `csr_cert_expiration`
  - reporter details `firm_registration_number`
  in [src/types/contact.ts](/C:/Users/james/Projects/Depo-Pro/src/types/contact.ts:14) and [src/components/IntakeScreen/ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:345).

### Classification

- Alternate reporter -> core certificate fields: **already wired**
- Alternate reporter -> `reporter.phone` / `reporter.email`: **freeze-safe wire**
- Alternate reporter -> `reporter.firm_address`: **freeze-safe wire** if sourced from the linked `Firm`

## 3. UFM certificate population

### Current wiring

- `buildUfmMetadata()` resolves the effective reporter source through `resolveReporterProfileUsage(...)` in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:233).
- The UFM certificate fields currently emitted are:
  - `csr_name`
  - `csr_license`
  - `firm_registration`
  - `csr_cert_expiration`
  in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:535).
- Existing tests already prove:
  - signed-in profile fills those fields when applicable
  - a case-selected alternate reporter overrides profile sourcing
  in [src/lib/ufm/buildUfmMetadata.test.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.test.ts:341) and [src/lib/ufm/buildUfmMetadata.test.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.test.ts:496).

### Classification

- Reporter -> UFM certificate field population: **already wired**
- No schema or builder gap found for the four certificate fields in scope

## 4. Canonical format discipline

### Current wiring

- Reporter drawer formatting helpers already enforce:
  - digits-only CSR
  - digits-only firm registration
  - `MM/DD/YYYY` display with ISO storage for expiration
  - `(###) ###-####` display for phone
  through [src/components/IntakeScreen/reporterFieldFormatting.ts](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/reporterFieldFormatting.ts:1).
- Reporter contact creation already stores canonical values through `buildContactInsert(...)` in [src/components/IntakeScreen/ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:406).

### Classification

- Canonical formatting layer: **already wired**
- Stage 2 must preserve, not redesign, this behavior

## 5. Gap summary

### Freeze-safe wire

- Alternate reporter selection should also populate:
  - `reporter.phone`
  - `reporter.email`
  - `reporter.firm_address` when a linked firm is present
- Reporter selection should avoid silently overwriting a non-empty manually typed case value when filling these fields.

### Already wired

- Signed-in profile -> case certificate core:
  - name
  - CSR number
  - CSR expiration
  - firm registration
- Alternate reporter -> case certificate core:
  - name
  - CSR number
  - CSR expiration
  - firm registration
  - firm name
- `buildUfmMetadata` -> UFM certificate:
  - `csr_name`
  - `csr_license`
  - `firm_registration`
  - `csr_cert_expiration`

### Needs-schema / do not build in Stage 2

- Signed-in profile -> `reporter.firm`
- Signed-in profile -> `reporter.phone`
- Signed-in profile -> `reporter.email`

Those fields do not exist in `reporter_profiles` today, so wiring them would require storage changes that are out of scope under the active freeze.

## 6. Carry-forward reminder

Stage 1.5 remains a must-fix-before-RC item:
- attorney `function` still resolving to `OTHER` in some flows must be corrected before release candidate
