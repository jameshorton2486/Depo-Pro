## Executive Summary

The Notice extraction system was expanded without changing the core architecture. The live path remains:

- `DocumentUploadPanel` -> `aiExtract(...)`
- Supabase `extract-nod` Edge Function
- `normalization.js`
- `applyExtraction.ts`
- `applyAndPersistExtraction(...)`
- provenance/conflict persistence

The change is additive:

- the extractor schema is larger
- `CaseRecord` now carries more UFM-ready metadata
- the same conflict rules still protect confirmed/manual values
- the Intake extracted-fields surface now exposes the new metadata for confirmation
- the UFM metadata envelope now consumes the richer structure

## New Fields

### Caption
- `caption.judicial_district`
- `caption.division`
- `caption.state`
- `caption.jurisdiction_type`

### Parties
- `parties[].name`
- `parties[].role`
- `parties[].role_modifier`
- `parties[].entity_type`
- `parties[].fka_or_dba`

### Law firms
- `law_firms[].name`
- `law_firms[].address`
- `law_firms[].city`
- `law_firms[].state`
- `law_firms[].zip`
- `law_firms[].phone`
- `law_firms[].fax`
- `law_firms[].email`
- `law_firms[].represented_party`

### Witness metadata
- `witnesses[0].role`
- `witnesses[0].read_and_sign`
- `witnesses[0].requires_interpreter`
- `witnesses[0].requires_videographer`

### Session / scheduling
- `session.location_type`
- `session.remote_platform`
- `scheduling.proceeding_type`
- `scheduling.remote_platform`
- `scheduling.noticing_party`
- `scheduling.ordered_by`
- `scheduling.scheduler`
- `scheduling.scheduling_contact`
- `scheduling.service_type`
- `scheduling.time_zone`
- `scheduling.remote_location`

### Service
- `service.certificate_of_service`
- `service.service_date`
- `service.served_parties`
- `service.service_emails`

### Court reporter requests
- `reporter_requests.certified_reporter_required`
- `reporter_requests.stenographic_recording`
- `reporter_requests.audiovisual_recording`
- `reporter_requests.realtime_requested`
- `reporter_requests.expedited_delivery`
- `reporter_requests.rush_delivery`
- `reporter_requests.daily_copy`
- `reporter_requests.rough_draft`

## Field Mapping Table

### Edge-function schema -> `CaseRecord`

| Extracted field | Case payload target |
| --- | --- |
| `cause_number` | `caption.case_number` |
| `case_style` | `caption.case_style`, conditional `caption.case_name` |
| `court_name` | `caption.court_name` |
| `district` | `caption.judicial_district` |
| `division` | `caption.division`, composed `caption.court_name`, `caption.venue` |
| `county` | `caption.county`, `session.location_county`, composed `caption.venue` |
| `state` | `caption.state`, location fallback |
| `jurisdiction_type` | `caption.jurisdiction_type` |
| `deposition_date` | `session.deposition_date` |
| `start_time` | `session.start_time` |
| `end_time` | `session.end_time` |
| `location.*` | `session.location_*` |
| `remote.*` | `session.location_type`, `session.remote_platform` |
| `reporting_method` | `session.reporting_method` |
| `witness.*` | `witnesses[0].*` |
| `parties[]` | `parties[]` add / patch |
| `attorneys[]` | `attorneys[]` add / patch |
| `law_firms[]` | `law_firms[]` add / patch |
| `scheduling.*` | `scheduling.*` |
| `service.*` | `service.*` |
| `reporter_requests.*` | `reporter_requests.*` |

### `CaseRecord` -> UFM metadata envelope

The envelope builder now auto-populates these additional UFM-facing keys:

- `judicial_district`
- `division`
- `jurisdiction_type`
- `location_type`
- `remote_platform`
- `noticing_party`
- `service_type`
- `parties`
- `law_firms`
- `service_date`
- `served_parties`
- `service_emails`
- `reporter_requests`

## Intake Surface Expansion

The extracted-fields projection now includes:

- `Party`
- `Law Firm`
- `Scheduling`
- `Service`
- `Court Reporter`

All new extracted-field-backed rows retain:

- confidence
- source
- confirmation state
- conflict state

through the existing `fieldUpdates` / conflict queue / provenance path.

## Conflict Behavior

Conflict rules were not changed.

Confirmed or manually corrected values still do not get overwritten. New Notice values for the expanded field set route through the same conflict-safe `queueField(...)` logic used by the original caption/session fields.

## Fixture Coverage

Added fixture-backed tests for:

- Federal NOD
- Texas State NOD
- Zoom / non-Zoom remote platform
- Multi-party caption

Fixture coverage lives in:

- `src/lib/parsing/__fixtures__/ufmNoticeFixtures.ts`
- `src/lib/parsing/ufmExtractionExpansion.test.ts`

These tests verify the mapper and UFM envelope against realistic extraction payload shapes without rewriting the extraction system.

## Field Coverage Before / After

### Before

The live Notice mapper populated roughly:

- basic caption
- deposition date / time
- location basics
- one witness name / party affiliation
- attorneys

This was enough for intake assistance, but not enough for a near-complete UFM package.

### After

The live Notice mapper now covers:

- detailed caption routing
- structured parties
- structured law firms
- expanded witness metadata
- remote / platform / scheduling metadata
- service metadata
- court reporter request metadata
- richer UFM envelope fields

### Coverage improvement

At the mapper level, direct Notice-driven `CaseRecord` field coverage increased from a narrow core set to the full NOD-owned field surface currently modeled in the app.

Practical effect:

- a standard Texas Notice can now auto-populate most NOD-owned UFM metadata
- remaining gaps are mainly fields that the field-reference marks as:
  - `JOB`
  - `RECORD`
  - `PROFILE`
  - `COMPUTED`
  - `POST`

For the standard Texas Notice fixture used in the new tests, the current modeled NOD-owned surface is now above the target threshold of 80% structured UFM population. The remaining missing fields are not NOD-owned in the reference model, so they should remain manual or later-stage by design.

## UFM Fields Auto-Populated

Now auto-populated from Notice extraction when present:

- cause number
- caption
- court
- judicial district
- division
- county
- state
- jurisdiction type
- deponent
- deposition date
- start / end time
- address
- location type
- remote platform
- noticing party
- service type
- appearances
- structured parties
- structured law firms
- service date
- served parties
- service emails
- reporter request flags

## Remaining Manual Fields

Still manual or later-stage by design:

### PROFILE-owned
- reporter CSR / firm profile details
- firm registration number
- firm office address when sourced from a saved profile

### JOB-owned
- scheduled-start refinements when the Notice is vague
- explicit service type when only the job sheet states it
- custodial attorney / cost party when they only appear in scheduling paperwork

### RECORD-owned
- actual start / end times
- actual appearances
- actual situs if different from the Notice
- witness sworn status
- interpreter oath / language pair
- exhibit events

### COMPUTED / POST
- page references
- volume / certification execution blocks
- charges / billing metadata

## Files Changed

- `src/types/case.ts`
- `src/lib/parsing/aiExtractionTypes.ts`
- `supabase/functions/extract-nod/index.ts`
- `supabase/functions/extract-nod/normalization.js`
- `src/lib/parsing/applyExtraction.ts`
- `src/store/intakeReducer.ts`
- `src/context/IntakeContext.tsx`
- `src/components/IntakeScreen/DocumentUploadPanel.tsx`
- `src/components/IntakeScreen/extractionPersistence.ts`
- `src/components/ExtractedFieldsTable/fieldProjection.ts`
- `src/lib/ufm/buildUfmMetadata.ts`
- supporting tests and fixtures

## Verification

Passed:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- changed-file `eslint`

## Boundary Notes

- No architecture rewrite
- No editor API contract change
- No persistence redesign
- No destructive schema/database change

The expansion stays inside the existing extraction -> apply -> provenance -> review -> UFM builder architecture.
