# PROMPT 3C REPORT

## Status

Completed in scope. No migrations. No `src/api/types.ts` changes. No Notice parser changes. No autosave work. No session-model work.

## Tasks and Commits

- Task 1 — `44f7bcc` `docs: adopt canonical field, component, and data-structure references`
- Task 2 — `844a157` `feat: job sheet extraction whitelist per field reference`
- Task 3 — `e9b5bde` `feat: extract from job sheet via reporterNotesParser`
- Task 3.5 — `df0868e` `feat: extract-as chooser on supporting documents slot`
- Task 4 — `a190224` `fix: empty fields can never default to confirmed status`
- Task 5 — `15200c9` `test: job sheet extraction acceptance steps`

## Parser Output Shape and Adapter Mapping

`reporterNotesParser` returns:

- `reporter`
- `jobDetails`
- `billing`
- `deepgramKeyterms`

Source: [src/lib/parsing/reporterNotesParser.ts](/C:/Users/james/projects/depo-pro/src/lib/parsing/reporterNotesParser.ts:11)

Key parser outputs consumed by the adapter:

- `jobDetails.date` → `session.deposition_date`
- `jobDetails.scheduledStartTime` → `session.start_time`
- `jobDetails.location` → `session.location_address`, `session.location_city`, `session.location_state`, `session.location_zip`, `session.reporting_method`
- `jobDetails.readAndSign` / `jobDetails.signatureWaived` → `witnesses[0].read_and_sign`
- `billing.orderingAttorney`, `billing.orderingFirm`, `billing.orderingAddress`, `billing.orderingPhone`, `billing.orderingEmail` → ordering attorney add/patch flow
- `billing.copyOrders[]` → copy attorney add/patch flow
- `deepgramKeyterms[]` → intake keyterm additions with Job Sheet provenance note

Parser extraction points:

- date/time/location: [reporterNotesParser.ts](/C:/Users/james/projects/depo-pro/src/lib/parsing/reporterNotesParser.ts:80)
- billing/ordering attorney and copy attorney parsing: [reporterNotesParser.ts](/C:/Users/james/projects/depo-pro/src/lib/parsing/reporterNotesParser.ts:135)

Adapter behavior:

- normalizes date to ISO and time to 24-hour storage format
- derives Zoom-aware location text and reporting method
- routes all writes through the existing extraction application object
- preserves confirmed-field protection by turning collisions into conflicts rather than overwrites

Adapter source: [src/lib/parsing/applyJobSheetExtraction.ts](/C:/Users/james/projects/depo-pro/src/lib/parsing/applyJobSheetExtraction.ts:292)

## Whitelist and Reference Mapping

Whitelist source: [src/lib/parsing/jobSheetFields.ts](/C:/Users/james/projects/depo-pro/src/lib/parsing/jobSheetFields.ts:1)

Reference authority: `docs/DATA_FIELD_REFERENCE.md` §2.1 and §2.3D / §2.3I.

Exact repo field paths allowed for Job Sheet writes:

- `session.deposition_date`
  - shared `NOD/JOB` ownership for deposition date: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:257)
- `session.start_time`
  - JOB-owned scheduled start: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:267)
- `session.location_address`
- `session.location_city`
- `session.location_state`
- `session.location_zip`
  - used only as scheduling/location hints; the UFM authority still treats actual situs as RECORD-owned: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:282)
- `session.reporting_method`
  - derived from job-sheet remote/in-person context as a scheduling hint
- `session.is_remote`
- `session.remote_platform`
  - local UI hints only; not contract changes
- `witnesses[0].read_and_sign`
  - shared `NOD/JOB/RECORD` ownership: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:312)
- `attorneys[n].name`
- `attorneys[n].firm`
- `attorneys[n].address`
- `attorneys[n].city`
- `attorneys[n].state`
- `attorneys[n].zip`
- `attorneys[n].phone`
- `attorneys[n].email`
  - attorney paper-contact fields come from NOD/JOB-side intake sources: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:173)

Explicitly excluded by test and adapter design:

- `reporter.firm_registration_number`
- `reporter.firm_address`
  - PROFILE-only: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:369)
- certificate, charges, and execution metadata
  - POST / JOB / certificate-phase data, not job-sheet parse targets here: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:466)
- cause number, court, county, parties, witness identity
  - NOD-owned, not JOB-owned: [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:89), [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:131), [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/projects/depo-pro/docs/DATA_FIELD_REFERENCE.md:317)

## Supporting Slot and Scheduling Slot Wiring

Scheduling Notes / Job Sheet slot now extracts through the existing reporter-notes parser and shared persistence path:

- job-sheet extract path: [src/components/IntakeScreen/DocumentUploadPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:460)
- persisted provenance source label set to `Job Sheet`: [src/components/IntakeScreen/DocumentUploadPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:465)

Supporting Documents now requires explicit user choice and never auto-detects document type:

- chooser copy and buttons: [src/components/IntakeScreen/DocumentUploadPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:561)

## Task 4 Root Cause and Sweep Findings

Root cause:

- `makeRow()` could surface `Confirmed` from the stored `confirmed` flag even when the rendered value was empty.
- `session.is_remote` and `session.remote_platform` were also being projected as effectively confirmed defaults in the row builder layer rather than from persisted user action.

Fixed chokepoint:

- empty optional value now renders `Needs Confirmation`, never `Confirmed`: [src/components/ExtractedFieldsTable/fieldProjection.ts](/C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/fieldProjection.ts:66)
- `session.is_remote` and `session.remote_platform` now project with `confirmed = false`: [fieldProjection.ts](/C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/fieldProjection.ts:148)

Regression coverage:

- zero confirmed fields on a brand-new case
- clearing a previously confirmed field does not leave it confirmed

Tests: [src/components/ExtractedFieldsTable/fieldProjection.test.ts](/C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/fieldProjection.test.ts:1)

Sweep findings:

- the bad default was centralized in `makeRow()`, so the fix covered every projected field row using that path
- the only additional field-specific offenders found were `session.is_remote` and `session.remote_platform` in the projector, which were corrected in-scope

## Dropped-Field Accounting

The adapter logs dropped job-sheet fields at runtime via:

- `console.info(... droppedCount, droppedPaths ...)`: [src/components/IntakeScreen/DocumentUploadPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:476)

Current dropped-path set from the adapter:

- `billing.delivery`
- `billing.rushDue`
- `jobDetails.serviceType`
- `billing.orderedBy`

Source: [src/lib/parsing/applyJobSheetExtraction.ts](/C:/Users/james/projects/depo-pro/src/lib/parsing/applyJobSheetExtraction.ts:415)

No browser extraction was executed as part of this coding prompt, so this report records the exact dropped-path vocabulary and leaves the live `droppedCount` to the Task 5 verification pass.

## Verification

Per-task verification completed:

- `npm run typecheck`
- `npm run test`

Prompt 3C browser verification steps appended to:

- [scripts/verify-persistence.md](/C:/Users/james/projects/depo-pro/scripts/verify-persistence.md:53)

## Boundary Log

None.
