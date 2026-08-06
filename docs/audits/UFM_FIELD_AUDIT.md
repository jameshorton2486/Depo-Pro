# UFM Field Audit

Date: 2026-06-06

Scope:
- Audit only
- No code changes
- Focus: why UFM preview fields remain blank or manual/profile-sourced

Primary source:
- [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:1)

## Summary

There are three different reasons a UFM field may appear "not populated":

1. The field is already populated in `ufm_metadata`, but still shows `confirmed: false` because extraction intentionally leaves values unconfirmed until a human confirms them.
2. The field is derivable from already-extracted Notice data, but the current UFM builder does not map that data into the UFM field yet.
3. The field is intentionally profile-only or genuinely manual under the current data model.

The `field_sources` block is metadata about provenance, not the payload value itself. The real payload values are in `ufm_metadata`.

---

## A. AUTO-POPULATE NOW

These are derivable from already-extracted Notice / scheduling data and can safely flow through the existing:

`extract -> unconfirmed -> human confirm`

pipeline.

They should be populated with Notice/Job Sheet provenance and `confirmed: false`. They must **not** auto-confirm.

### 1. `ufmRequestingParty`

- Current builder behavior:
  - hardcoded `requesting_party: null`
  - hardcoded `field_sources.ufmRequestingParty = "manual"`
- Current lines:
  - value: [src/lib/ufm/buildUfmMetadata.ts:285](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:285)
  - source: [src/lib/ufm/buildUfmMetadata.ts:315](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:315)
  - confirmation: [src/lib/ufm/buildUfmMetadata.ts:340](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:340)
- Existing extracted candidates already on record:
  - `record.scheduling.noticing_party`
  - `record.parties[*].role`
  - `record.attorneys[*].representing`
- Best current source:
  - `record.scheduling.noticing_party`
- Why this is safe:
  - the extractor already writes `scheduling.noticing_party`
  - UFM builder already reads it for `ufmNoticingParty`
  - this is a builder omission, not a parser gap
- Proposed minimal change:
  - map `requesting_party` from `record.scheduling.noticing_party.value`
  - set `field_sources.ufmRequestingParty` from provenance on `scheduling.noticing_party`
  - set `field_confirmations.ufmRequestingParty` from `record.scheduling.noticing_party.confirmed`

### 2. `ufmCustodialAttorney`

- Current builder behavior:
  - value comes from `record.proceeding.ordering_contact`
  - source is hardcoded `"manual"`
  - confirmation is hardcoded `false`
- Current lines:
  - value: [src/lib/ufm/buildUfmMetadata.ts:284](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:284)
  - source: [src/lib/ufm/buildUfmMetadata.ts:314](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:314)
  - confirmation: [src/lib/ufm/buildUfmMetadata.ts:339](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:339)
- Existing extracted candidates already on record:
  - `record.scheduling.ordered_by`
  - `record.scheduling.scheduler`
  - `record.scheduling.scheduling_contact`
- Existing extraction coverage:
  - `scheduling.ordered_by`: [src/lib/parsing/applyExtraction.ts:179](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:179)
  - `scheduling.scheduler`: [src/lib/parsing/applyExtraction.ts:180](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:180)
  - `scheduling.scheduling_contact`: [src/lib/parsing/applyExtraction.ts:181](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:181)
- Best current source:
  - first non-empty of:
    - `record.proceeding.ordering_contact`
    - `record.scheduling.ordered_by`
    - `record.scheduling.scheduler`
    - `record.scheduling.scheduling_contact`
- Why this is safe:
  - those scheduling fields are already extracted and persisted
  - the current blank is a builder-source decision, not a missing parsing seam
- Proposed minimal change:
  - fallback `custodial_attorney` to those extracted scheduling fields
  - set source from the first field actually used
  - set confirmation from that field’s `confirmed`

### 3. `ufmServiceType` (conditional)

- Current builder behavior:
  - mapped from `record.scheduling.service_type`
- Current lines:
  - value: [src/lib/ufm/buildUfmMetadata.ts:264](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:264)
  - source: [src/lib/ufm/buildUfmMetadata.ts:309](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:309)
  - confirmation: [src/lib/ufm/buildUfmMetadata.ts:334](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:334)
- Existing extraction coverage:
  - `scheduling.service_type`: [src/lib/parsing/applyExtraction.ts:182](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:182)
- Conclusion:
  - this field is **already builder-wired**
  - if blank, the problem is upstream: extractor did not produce `scheduling.service_type` for that notice
  - this is **not** a builder change item unless we want additional computed fallback logic

### 4. `ufmRemotePlatform` (conditional)

- Current builder behavior:
  - uses `record.scheduling.remote_platform`
  - falls back to `record.session.remote_platform`
- Current line:
  - [src/lib/ufm/buildUfmMetadata.ts:262](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:262)
- Existing extraction coverage:
  - `scheduling.remote_platform`: [src/lib/parsing/applyExtraction.ts:177](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:177)
  - `session.remote_platform`: [src/lib/parsing/applyExtraction.ts:171](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:171)
- Conclusion:
  - already builder-wired
  - blank means upstream extraction gap or missing document evidence, not a UFM builder omission

### 5. `ufmNoticingParty` (conditional)

- Current builder behavior:
  - mapped from `record.scheduling.noticing_party`
- Current line:
  - [src/lib/ufm/buildUfmMetadata.ts:263](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:263)
- Existing extraction coverage:
  - `scheduling.noticing_party`: [src/lib/parsing/applyExtraction.ts:178](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:178)
- Conclusion:
  - already builder-wired
  - blank means extractor did not populate it for that notice

### Bucket A implementation scope

Safe immediate code change candidates:
- `ufmRequestingParty`
- `ufmCustodialAttorney`

Those are the only two clear builder-only omissions in the current UFM map.

---

## B. REPORTER PROFILE

These fields are intentionally treated as profile-owned in the current builder:

- `ufmCsrName`
- `ufmCsrLicense`
- `ufmFirmRegistration`
- `ufmCsrCertExpiration`

Current builder lines:
- value mapping:
  - `csr_name`: [buildUfmMetadata.ts:280](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:280)
  - `csr_license`: [buildUfmMetadata.ts:281](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:281)
  - `firm_registration`: [buildUfmMetadata.ts:282](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:282)
  - `csr_cert_expiration`: [buildUfmMetadata.ts:283](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:283)
- source mapping:
  - `ufmCsrName`: [buildUfmMetadata.ts:310](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:310)
  - `ufmCsrLicense`: [buildUfmMetadata.ts:311](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:311)
  - `ufmFirmRegistration`: [buildUfmMetadata.ts:312](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:312)
  - `ufmCsrCertExpiration`: [buildUfmMetadata.ts:313](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:313)

### Does durable per-user reporter profile storage already exist?

No clear durable per-user reporter profile storage exists in this repo today.

What exists:
- reporter fields live inside each case record:
  - `record.reporter.*` in [src/types/case.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.ts:202)
- those fields can be `imported`, but there is no obvious dedicated reporter-profile table or service layer
- there is a generic `contacts` system, but the current search did not reveal a dedicated reporter-profile persistence seam for:
  - CSR number
  - CSR expiration
  - firm registration number
  - default firm office

Supporting docs also say profile-owned, not parser-owned:
- [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/Projects/Depo-Pro/docs/DATA_FIELD_REFERENCE.md:596)
- [docs/DATA_FIELD_REFERENCE.md](/C:/Users/james/Projects/Depo-Pro/docs/DATA_FIELD_REFERENCE.md:604)

### Minimal proposed design

Do not implement yet.

#### Option

Add a dedicated per-user reporter profile table.

#### Minimal shape

Table: `reporter_profiles`

Columns:
- `id uuid primary key`
- `owner_user_id uuid not null`
- `reporter_name text not null`
- `reporter_csr_number text not null`
- `reporter_csr_expiration date null`
- `firm_registration_number text null`
- `firm_name text null`
- `firm_address text null`
- `firm_city text null`
- `firm_state text null`
- `firm_zip text null`
- `is_default boolean not null default true`
- timestamps

Rationale:
- this is additive
- consistent with existing owner-scoped RLS model
- matches the field-reference notion of saved reporter / firm profile
- creates a natural home for future per-reporter defaults, including formatting preferences

#### How Intake/UFM would read it

- on sign-in / case open, load the current user’s default `reporter_profiles` row
- hydrate `record.reporter.*` as imported/profile-owned fields if the case has no explicit overrides
- UFM builder stays simple: it continues to read `record.reporter.*`
- provenance should mark these as `"Reporter Profile"` / `profile`

#### Migration need

Yes, this would require an additive migration.

It should **not** be bundled into a small UFM builder patch. It deserves its own short design/implementation prompt.

---

## C. GENUINELY MANUAL

These are correctly manual under the current model, or blank unless a human supplies them.

### 1. `ufmEndTime`

- Current source path: `session.end_time`
- Reason:
  - most Notices give a start time, not an actual end time
  - an end time is usually only known after proceedings conclude or from separate notes

### 2. `ufmServiceType`

- Current source path: `scheduling.service_type`
- Reason:
  - this can sometimes be extracted from a cover sheet or worksheet, but not reliably from the operative Notice itself
  - if blank for a given notice, that is correct unless another source explicitly states it

### 3. `ufmCsrName`

- Reason:
  - this is a reporter/profile-owned field, not a Notice-owned field
  - must not be fabricated from NOD content

### 4. `ufmCsrLicense`

- Reason:
  - reporter/profile-owned
  - never a Notice parsing target

### 5. `ufmFirmRegistration`

- Reason:
  - firm profile-owned
  - field reference explicitly says this comes from saved firm profile, not the Notice

### 6. `ufmCsrCertExpiration`

- Reason:
  - reporter/profile-owned
  - not parser-owned

### 7. `ufmCustodialAttorney`

- Current behavior is manual.
- Reason:
  - under the current builder this is manual because there is no settled mapping yet
  - however, this is also in Bucket A because existing extracted scheduling fields can safely supply it as an unconfirmed best-available value

### 8. `ufmRequestingParty`

- Current behavior is manual/null.
- Reason:
  - under the current builder it is manual because no mapping exists yet
  - however, this is also in Bucket A because `scheduling.noticing_party` can safely populate it unconfirmed

---

## Recommended next step

Small safe patch for immediate approval:
- implement Bucket A only:
  - populate `ufmRequestingParty`
  - populate `ufmCustodialAttorney`
  - preserve source/provenance semantics
  - never auto-confirm

Separate follow-up design:
- reporter profile storage for Bucket B

## Implementation Notes

Implemented after review:

- Phase 1
  - `ufmRequestingParty` now derives from `scheduling.noticing_party`
  - `ufmCustodialAttorney` now derives from the first populated extracted scheduling source:
    - `scheduling.ordered_by`
    - `scheduling.scheduler`
    - `scheduling.scheduling_contact`
  - both stay unconfirmed until their underlying extracted source field is confirmed

- Phase 2
  - added additive migration `supabase/migrations/20260607020754_reporter_profiles.sql`
  - added durable owner-scoped reporter profile storage through `reporter_profiles`
  - `buildUfmMetadata()` now accepts an optional `reporterProfile` argument and reads:
    - `ufmCsrName`
    - `ufmCsrLicense`
    - `ufmFirmRegistration`
    - `ufmCsrCertExpiration`
    from that profile when present
  - profile-sourced UFM fields emit `field_sources: "profile"` and `field_confirmations: true`
  - mock mode uses a fixture profile only behind the existing `isMockMode()` condition
