Audit-only run. No source files modified.

# PARTICIPANT_IMPLEMENTATION_AUDIT

## 1. Run header

Audit-only confirmation line: Audit-only run. No source files modified.

- Branch inspected: `feature/stage3-workspace-core`
- Commit inspected: `1e3d7ae`

## 2. Executive summary

Most of the participant directory foundation already exists, but the original anchor map is stale: the live stack now includes `ParticipantsPanel`, `firmService`, `reporterProfileService`, `contacts.details`, `contacts.firm_id`, `firms`, and `reporter_profiles`, while the older `AppearancesPanel` and flat `notes` assumptions are no longer authoritative. The biggest duplication risk is rebuilding participant storage that already exists in three places: `contacts.details` for reusable person data, `firms` for reusable firm blocks, and `CaseRecord` arrays for per-case facts. The second risk is treating the old `src/lib/parsing/keytermExtractor.ts` helper as the live Deepgram path; the live case-side path is deterministic `src/lib/keytermDerivation.ts`, while `keytermExtractor.ts` is only imported by legacy parser helpers. Test coverage is strong for normalization, merge decisions, UFM enrichment, and keyterm derivation, but weak or absent for the service/state/UI seams (`contactService`, `contactStore`, `ParticipantsPanel`, `IntakeContext`). Roughly two-thirds of the target participant model already has a real storage home or downstream consumer today; the remaining gap is mostly missing wiring or missing first-class case structures rather than missing database primitives.

## 3. Per-category tables

### Attorney

| Field | Dir today | Case today | UFM today | DG today | Tx today | Class | Disposition | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| name | `contacts.name` for `type='attorney'` | `attorneys[].name` | `appearances[].name` in `buildUfmMetadata` | `keytermDerivation: record.attorneys[].name` | Appearance page via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts`, `src/lib/keytermDerivation.test.ts` |
| bar_number / SBOT | `contacts.details.bar_number` | `attorneys[].bar_number` | `appearances[].bar_number` | NONE | Appearance page via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts`, `src/validation/intakeValidation.test.ts` |
| firm link | `contacts.firm_id` | `attorneys[].firm` string plus `law_firms[]` | `appearances[].firm`, `law_firms[]` | firm tokens via `attorneys[].firm` / `law_firms[]` | Appearance / firm block via UFM | EXISTS | WIRE/REUSE | `src/lib/directory/mergeDirectoryRecords.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts`, `src/lib/keytermDerivation.test.ts` |
| direct_phone | `contacts.details.direct_phone` and `contacts.phone` | `attorneys[].phone` | `appearances[].phone` | NONE | Appearance page via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts`, `src/validation/intakeValidation.test.ts` |
| extension | `contacts.details.extension` | NONE | NONE | NONE | NONE | PARTIAL | BUILD | `src/types/contact.test.ts` |
| fax | `contacts.details.fax` and firm `firms.fax` | NONE on attorney; firm fax available through linked firm | firm-level `law_firms[].fax` only | NONE | Certificate / service block only when surfaced through firm | PARTIAL | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| email | `contacts.email` | `attorneys[].email` | `appearances[].email` | NONE | Appearance / service block via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/validation/intakeValidation.test.ts` |
| assistant_name | `contacts.details.assistant_name` | NONE | NONE | NONE | NONE | PARTIAL | BUILD | `src/types/contact.test.ts` |
| assistant_email | `contacts.details.assistant_email` | NONE | NONE | NONE | NONE | PARTIAL | BUILD | `src/types/contact.test.ts` |
| preferred_appearance_label | `contacts.details.preferred_appearance_label` | NONE | `appearances[].appearance_label` | NONE | No transcript formatter consumer yet | PARTIAL | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/types/contact.test.ts` |
| representing | NONE in directory by design | `attorneys[].representing` | `appearances[].representing` | NONE | Appearance page via UFM | EXISTS | WIRE/REUSE | `src/validation/intakeValidation.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| function | NONE in directory by design | `attorneys[].role` currently carries this dimension | `appearances[].function` derived from `role` | NONE | Appearance page via UFM | PARTIAL | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| time_used | NONE in directory by design | `attorneys[].time_used` | `appearances[].time_used` | NONE | Package/supporting metadata only | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| address | stored on linked `firms.address`; contact also has flat `contacts.address` | `attorneys[].address` | `appearances[].address`; `law_firms[].address` | address terms derive from case values | Appearance / certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/validation/intakeValidation.test.ts`, `src/lib/keytermDerivation.test.ts` |
| city/state/zip | stored on linked `firms.city/state/zip` | `attorneys[].city/state/zip` | `appearances[]`, `law_firms[]` | city/address terms derive from case values | Appearance / certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/lib/keytermDerivation.test.ts` |

### Court Reporter

| Field | Dir today | Case today | UFM today | DG today | Tx today | Class | Disposition | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| signed-in reporter name | `reporter_profiles.display_name` | `reporter.name` | `csr_name` | `keytermDerivation: record.reporter.name` | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/api/reporterProfileService.ts` |
| signed-in reporter csr_number | `reporter_profiles.csr_number` | `reporter.cert_number` | `csr_license` | NONE | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| signed-in reporter csr_cert_expiration | `reporter_profiles.csr_cert_expiration` | `reporter.license_expiration` | `csr_cert_expiration` | NONE | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| signed-in reporter firm_registration_number | `reporter_profiles.firm_registration_number` | `reporter.firm_registration_number` | `firm_registration` | NONE | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| initials | `reporter_profiles.initials` | NONE | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/reporterProfile.ts`, `src/components/IntakeScreen/UfmPayloadPreview.tsx` |
| realtime_capable | `reporter_profiles.realtime_capable` | NONE | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/reporterProfile.ts` |
| remote_swear_authority | `reporter_profiles.remote_swear_authority` | NONE | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/reporterProfile.ts` |
| notary_commission_expiration | `reporter_profiles.notary_commission_expiration` | case-side analog is `reporter.notary_commission_expiry`, but no profile wiring | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/reporterProfile.ts`, `src/types/case.ts` |
| preferred_signature_block | `reporter_profiles.preferred_signature_block` | NONE | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/reporterProfile.ts` |
| alternate reporter name | `contacts.name` for `type='reporter'` | `reporter.name` when selected | `csr_name` | `record.reporter.name` | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/components/IntakeScreen/ParticipantsPanel.tsx` |
| alternate reporter csr_number | `contacts.details.csr_number` | `reporter.cert_number` when selected | `csr_license` | NONE | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/types/contact.ts` |
| alternate reporter csr_cert_expiration | `contacts.details.csr_cert_expiration` | `reporter.license_expiration` when selected | `csr_cert_expiration` | NONE | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| alternate reporter firm_registration | `contacts.details.firm_registration_number` | `reporter.firm_registration_number` when selected | `firm_registration` | NONE | Certificate via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| alternate reporter phone/email | `contacts.phone` / `contacts.email` | `reporter.phone` / `reporter.email` exist in CaseRecord, but current participant drawer does not populate them | NONE | NONE | NONE today | PARTIAL | WIRE/REUSE | `src/types/case.ts`, `src/components/IntakeScreen/ParticipantsPanel.tsx` |

### Witness / Deponent

| Field | Dir today | Case today | UFM today | DG today | Tx today | Class | Disposition | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| name | NONE in directory | `witnesses[].name` | `deponent` | `keytermDerivation: record.witnesses[].name` | Deponent / certificate via UFM | EXISTS | WIRE/REUSE | `src/types/case.test.ts`, `src/lib/keytermDerivation.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| deponent role / flag | NONE in directory | `witnesses[].role` | indirect `deponent` only | NONE | No direct formatter consumer today | PARTIAL | WIRE/REUSE | `src/types/case.ts`, `src/components/ExtractedFieldsTable/fieldProjection.ts` |
| title | NONE in directory | `witnesses[].title` | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/case.ts`, `src/components/ExtractedFieldsTable/fieldProjection.ts` |
| employer / expert affiliation | NONE in directory | `witnesses[].employer` | NONE | `keytermDerivation` uses employer for `role='EXPERT'` | NONE today | PARTIAL | WIRE/REUSE | `src/lib/keytermDerivation.ts`, `src/types/case.ts` |
| party_affiliation | NONE in directory | `witnesses[].party_affiliation` | NONE | NONE | NONE today | EXISTS | WIRE/REUSE | `src/validation/intakeValidation.test.ts`, `src/components/ExtractedFieldsTable/fieldProjection.ts` |
| read_and_sign / waived | NONE in directory | `witnesses[].read_and_sign` | no direct UFM field, but certificate branch input | NONE | Certificate branch support | EXISTS | WIRE/REUSE | `src/validation/intakeValidation.test.ts`, `src/components/ExtractedFieldsTable/fieldProjection.ts` |
| interpreter required | NONE in directory | `witnesses[].requires_interpreter` | NONE | NONE | oath/certificate support only | EXISTS | WIRE/REUSE | `src/components/ExtractedFieldsTable/fieldProjection.ts` |
| videographer required | NONE in directory | `witnesses[].requires_videographer` | NONE | NONE | certificate / attendance support only | EXISTS | WIRE/REUSE | `src/components/ExtractedFieldsTable/fieldProjection.ts` |
| corporate representative flag | NONE in directory | `witnesses[].is_corporate_rep` | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/case.ts` |
| corporate entity | NONE in directory | `witnesses[].corporate_entity` | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/case.ts` |
| prefix_suffix | NONE in directory | `witnesses[].prefix_suffix` | NONE | NONE | NONE today | PARTIAL | BUILD | `src/validation/intakeValidation.test.ts`, `src/types/case.ts` |
| email / phone | NONE in directory | `witnesses[].email` / `witnesses[].phone` | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/case.ts` |

### Interpreter

| Field | Dir today | Case today | UFM today | DG today | Tx today | Class | Disposition | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| name | `contacts.name` for `type='interpreter'` | `interpreters[].name` | `appearances[].name` | `keytermDerivation: record.interpreters[].name` | Appearance / interpreter block via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts`, `src/lib/keytermDerivation.test.ts` |
| certified | `contacts.details.certified` | `interpreters[].certified` | `appearances[].certified` | NONE | Interpreter block via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| cert_number | `contacts.details.cert_number` | `interpreters[].cert_number` | `appearances[].cert_number` | NONE | Interpreter block via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| certification_authority | `contacts.details.certification_authority` | NONE | `appearances[].certification_authority` | NONE | Interpreter block via UFM | PARTIAL | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| certification_expiration | `contacts.details.certification_expiration` | NONE | `appearances[].certification_expiration` | NONE | Interpreter block via UFM | PARTIAL | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| remote_capable | `contacts.details.remote_capable` | NONE | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/contact.test.ts` |
| agency | `contacts.details.agency` and `contacts.organization` | `interpreters[].agency` | `appearances[].agency` | NONE | Appearance / interpreter block via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| agency_contact | `contacts.details.agency_contact` | NONE | `appearances[].agency_contact` | NONE | Appearance/support block via UFM | PARTIAL | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| default_languages | `contacts.details.default_languages` | NONE | NONE | NONE | Prefill only | PARTIAL | WIRE/REUSE | `src/types/contact.test.ts` |
| phone / email | `contacts.phone` / `contacts.email` | `interpreters[].phone` / `interpreters[].email` | `appearances[].phone` / `appearances[].email` | NONE | Appearance / correspondence via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| oath_administered | NONE in directory | `interpreters[].oath_administered` | `appearances[].oath_administered` | NONE | Oath / interpreter block via UFM | EXISTS | WIRE/REUSE | `src/validation/intakeValidation.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| language_from / language_to | NONE in directory; defaults in contact details only | `interpreters[].language_from` / `language_to` | `appearances[].language_from` / `language_to` | NONE | Oath / interpreter block via UFM | EXISTS | WIRE/REUSE | `src/validation/intakeValidation.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |

### Videographer

| Field | Dir today | Case today | UFM today | DG today | Tx today | Class | Disposition | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| name | `contacts.name` for `type='videographer'` | `videographers[].name` | `appearances[].name` | `keytermDerivation: record.videographers[].name` | Appearance page via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts`, `src/lib/keytermDerivation.test.ts` |
| firm link | `contacts.firm_id` | `videographers[].firm` | `appearances[].firm`, `law_firms[]` fallback enrichment | firm tokens via `videographers[].firm` | Appearance / firm block via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts`, `src/lib/keytermDerivation.test.ts` |
| cert_number | `contacts.details.cert_number` | `videographers[].cert_number` | `appearances[].cert_number` | NONE | Appearance/support block via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| role_title | `contacts.details.role_title` | `videographers[].role_title` | `appearances[].role_title` | NONE | Appearance/support block via UFM | EXISTS | WIRE/REUSE | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts`, `src/validation/intakeValidation.test.ts` |
| phone / email | `contacts.phone` / `contacts.email` | `videographers[].phone` / `videographers[].email` | `appearances[].phone` / `appearances[].email` | NONE | Appearance / correspondence via UFM | EXISTS | WIRE/REUSE | `src/lib/ufm/buildUfmMetadata.test.ts` |
| remote-capable / lead / other scheduling traits | NONE | NONE | NONE | NONE | NONE today | MISSING | BUILD | NONE |

### Corporate Representative

| Field | Dir today | Case today | UFM today | DG today | Tx today | Class | Disposition | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| name | `contacts.name` for `type='corporate_representative'` | only generic `participants[].name` | only generic `appearances[].name` / participant block | `keytermDerivation` sees `participants[].name` | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| organization / firm link | `contacts.organization` / `contacts.firm_id` | only generic `participants[].organization` | only generic `appearances[].organization` | participant organization can derive company terms | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/types/contact.test.ts`, `src/lib/keytermDerivation.test.ts` |
| phone / email | `contacts.phone` / `contacts.email` | generic `participants[].phone` / `email` | generic `appearances[].phone` / `email` | NONE | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/lib/ufm/buildUfmMetadata.test.ts` |
| notes | `contacts.notes` | generic `participants[].notes` | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/contact.test.ts` |
| role_in_this_proceeding | NONE in directory by design | generic `participants[].role_in_this_proceeding` | generic `appearances[].role_in_this_proceeding` | NONE | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/lib/ufm/buildUfmMetadata.test.ts` |
| first-class case structure | NONE | no `corporate_representatives[]` array | NONE | NONE | NONE | MISSING | BUILD | NONE |

### Records Custodian

| Field | Dir today | Case today | UFM today | DG today | Tx today | Class | Disposition | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| name | `contacts.name` for `type='records_custodian'` | only generic `participants[].name` | only generic `appearances[].name` / participant block | `keytermDerivation` sees `participants[].name` | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/types/contact.test.ts`, `src/lib/ufm/buildUfmMetadata.test.ts` |
| organization / firm link | `contacts.organization` / `contacts.firm_id` | only generic `participants[].organization` | only generic `appearances[].organization` | participant organization can derive company terms | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/types/contact.test.ts`, `src/lib/keytermDerivation.test.ts` |
| phone / email | `contacts.phone` / `contacts.email` | generic `participants[].phone` / `email` | generic `appearances[].phone` / `email` | NONE | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/lib/ufm/buildUfmMetadata.test.ts` |
| notes | `contacts.notes` | generic `participants[].notes` | NONE | NONE | NONE today | PARTIAL | BUILD | `src/types/contact.test.ts` |
| role_in_this_proceeding | NONE in directory by design | generic `participants[].role_in_this_proceeding` | generic `appearances[].role_in_this_proceeding` | NONE | Appearance/support attendee via UFM | PARTIAL | BUILD | `src/lib/ufm/buildUfmMetadata.test.ts` |
| first-class case structure | NONE | no `records_custodians[]` array | NONE | NONE | NONE | MISSING | BUILD | NONE |

## 4. Cross-cutting infrastructure findings

- `contacts.type` enum breadth vs target categories:
  - The original migration only allowed `attorney`, `interpreter`, `videographer`, `participant`, `firm`.
  - The live `src/types/contact.ts` union and `20260607135051_contacts_details_and_firm_id.sql` now add `reporter`, `scheduler`, `paralegal`, `legal_assistant`, `records_custodian`, and `corporate_representative`.
  - Witness is still intentionally not a `ContactType`; witness/deponent remains case-local.

- `notes` blob: is anything parsing it into structured values?
  - No. `contacts.notes` is still a plain string (`src/types/contact.ts`, `src/api/contactService.ts`, `src/lib/directory/mergeDirectoryRecords.ts`).
  - It is copied into generic participant case entries (`src/components/IntakeScreen/ParticipantsPanel.tsx`) but never parsed into typed fields.
  - The earlier “notes blob carries certifications/languages/bar numbers” assumption is no longer accurate for the typed participant stack; those now live in `contacts.details`.

- `reporter_profiles`: exists or absent?
  - Exists.
  - Storage: `supabase/migrations/20260607020754_reporter_profiles.sql` plus `20260607135052_reporter_profiles_participant_fields.sql`.
  - Type/service: `src/types/reporterProfile.ts`, `src/api/reporterProfileService.ts`.
  - It is already consumed by `UfmPayloadPreview` and `buildUfmMetadata`.

- Corporate Rep / Records Custodian: first-class structures present or absent?
  - Directory type support exists in `contacts.type` and `ParticipantsPanel`.
  - Case-side first-class structures are absent; both currently collapse into generic `participants[]` with `ParticipantRole="OTHER"`.
  - That makes them build-heavy if the goal is a truly first-class category instead of a thin participant alias.

- `field_provenance` coverage of participant paths:
  - The table is path-agnostic and can store any `field_path`.
  - Extracted participant-adjacent wrapper paths are represented in `fieldProjection.ts` and consumed by `buildUfmMetadata` provenance lookups.
  - However, participant drawer adds/removes through `ADD_*` reducer actions do not themselves append provenance rows; directory-backed manual case-entry is therefore only partially covered today.

- Role-preserving dedup: where is participant dedup done today, and does it risk collapsing roles?
  - Directory dedup is same-type only in `src/lib/directory/mergeDirectoryRecords.ts`, which is role-preserving across contact types.
  - Extraction dedup is collection-scoped in `src/lib/parsing/applyExtraction.ts`.
  - Load-time self-heal dedup is in `normalizeCaseRecord()` (`src/types/case.ts`) and is collection-scoped, but it merges same-name records within a collection without a full metadata-conflict workflow. That is safe for obvious duplicate corruption repair but would be risky to generalize into a broader participant-role merger.

- Anchor drift from the prompt’s starting map:
  - `IntakeScreen.tsx` is no longer the only participant form seam; the live participant UI is `src/components/IntakeScreen/ParticipantsPanel.tsx`.
  - `src/lib/parsing/keytermExtractor.ts` is not the live case-side Deepgram path; it is imported only by legacy parser helpers (`nodParser.ts`, `reporterNotesParser.ts`).
  - The live participant/UFM/keyterm stack is `ParticipantsPanel` + `buildUfmMetadata` + `keytermDerivation`.

## 5. Test-coverage gap report

- `src/types/contact.ts`
  - Existing coverage: `src/types/contact.test.ts`
  - Gaps: none on JSON normalization basics; missing coverage for reporter/videographer detail variants beyond smoke-level normalization.
  - Characterization tests needed before refactor: reporter detail round-trip, videographer detail round-trip, generic participant detail normalization for each new contact type.

- `src/api/contactService.ts`
  - Existing coverage: `NONE`
  - Gaps: no characterization of query filtering, upsert conflict behavior at the service seam, phone normalization on write, or `firm_id` persistence.
  - Characterization tests needed before refactor: mocked Supabase-client tests for `listContacts(type)`, `searchContacts(type)`, `upsertDirectoryContact()`, `incrementUsage()` fallback path.

- `src/store/contactStore.ts`
  - Existing coverage: `NONE`
  - Gaps: no reducer/async state characterization for search/load/upsert/useContact.
  - Characterization tests needed before refactor: `FETCH_SUCCESS`, `UPSERT`, `INCREMENT_USAGE`, and async search/load error handling.

- `src/context/IntakeContext.tsx`
  - Existing coverage: indirect only through reducer tests and case-load tests
  - Gaps: no direct tests for participant add/remove/update callbacks or extraction dispatch wiring.
  - Characterization tests needed before refactor: provider-level tests confirming `addAttorney`, `addInterpreter`, `addVideographer`, `addParticipant`, and `applyExtraction` dispatch expected payloads.

- `src/components/IntakeScreen/IntakeScreen.tsx` / `ParticipantsPanel.tsx`
  - Existing coverage: `NONE`
  - Gaps: no UI tests for reporter profile fill, directory pick/create, firm auto-fill, or category-specific drawer fields.
  - Characterization tests needed before refactor: category drawer smoke tests, “Use My Reporter Profile”, attorney directory reuse with firm lookup, generic participant role-in-proceeding persistence.

- `src/types/case.ts` normalizers
  - Existing coverage: `src/types/case.test.ts`, `src/api/caseLoadService.test.ts`
  - Gaps: no focused coverage for all participant categories, only witness/legacy payload and duplicate-repair seams.
  - Characterization tests needed before refactor: reporter, attorney, interpreter, videographer, and generic participant legacy payload normalization snapshots.

- `src/components/ExtractedFieldsTable/fieldProjection.ts`
  - Existing coverage: `src/components/ExtractedFieldsTable/fieldProjection.test.ts`
  - Gaps: tests are narrow and mostly crash-resistance; they do not characterize the full participant row inventory.
  - Characterization tests needed before refactor: row presence/order tests for parties, attorneys, interpreters, videographers, reporter fields, and law firms.

- `src/lib/parsing/keytermExtractor.ts`
  - Existing coverage: `NONE`
  - Gaps: entire module untested, but more importantly it is not the live participant-derived Deepgram path.
  - Characterization tests needed before refactor: either add legacy parser tests if that code remains supported, or mark it legacy and stop treating it as the participant-directory keyterm source of truth.

## 6. Per-category risk & effort

### Attorney
- Current State: Reusable directory storage, firm linkage, case-side arrays, validation, UFM enrichment, and deterministic keyterm flow already exist.
- Missing Fields:
  - extension consumer
  - assistant_name consumer
  - assistant_email consumer
  - preferred_appearance_label transcript-side consumer
  - two-dimension separation for representing vs function is only partial because `function` still rides `attorneys[].role`
- Implementation Risk: Medium — the storage homes exist, but changing attorney role semantics risks touching extraction, validation, UFM, and editor-adjacent display assumptions.
- Estimated Effort: M — 3–5 commits, roughly 6–10 hours, mostly reuse-heavy.

### Court Reporter
- Current State: Durable `reporter_profiles` exists, alternate reporter contact type exists, and UFM already prefers profile values when appropriate.
- Missing Fields:
  - initials consumer
  - realtime_capable consumer
  - remote_swear_authority consumer
  - notary_commission_expiration wiring into case/UFM
  - preferred_signature_block consumer
  - alternate reporter phone/email not fully pushed into `CaseRecord`
- Implementation Risk: Low to Medium — storage exists, but certificate/export consumers are still sparse.
- Estimated Effort: M — 2–4 commits, roughly 4–8 hours, reuse-heavy.

### Witness / Deponent
- Current State: Witness is already strongly modeled per case, with extracted wrappers, validation, UFM deponent mapping, and deterministic keyterm support.
- Missing Fields:
  - no directory home by design
  - title/employer downstream usage is partial
  - corporate rep fields are present but thinly consumed
  - email/phone are stored but unused
- Implementation Risk: Medium — witness touches certificate logic and transcript semantics, so even “just wiring” has downstream blast radius.
- Estimated Effort: M — 3–4 commits, roughly 6–8 hours, mixed reuse/build.

### Interpreter
- Current State: Strong directory + case + UFM shape already exists, including credential fields and per-case oath/language fields.
- Missing Fields:
  - remote_capable consumer
  - agency_contact consumer outside UFM payload
  - default_languages are prefill-only, not fully exercised in UI/state tests
- Implementation Risk: Low — most of the structure already exists and is typed.
- Estimated Effort: S — 2–3 commits, roughly 3–5 hours, reuse-heavy.

### Videographer
- Current State: Directory details, linked firm, case-side fields, UFM appearance fields, and keyterm harvesting already exist.
- Missing Fields:
  - remote-capable / lead / other scheduling traits have no storage home
  - transcript package consumer is still limited to appearance metadata
- Implementation Risk: Low — current model is simple and already wired end to end for core fields.
- Estimated Effort: S — 2–3 commits, roughly 2–4 hours, reuse-heavy.

### Corporate Representative
- Current State: Directory type exists and generic participant flow can capture it, but there is no first-class case structure or category-specific UFM semantics.
- Missing Fields:
  - first-class case array / type
  - category-specific UFM semantics
  - dedicated transcript/scheduling behavior beyond generic participant
- Implementation Risk: Medium — generic participant reuse is easy, but making it truly first-class means touching types, UFM, and possibly witness/corporate-entity logic.
- Estimated Effort: M — 3–5 commits, roughly 5–8 hours, build-heavy.

### Records Custodian
- Current State: Directory type exists and generic participant flow can capture it, but it is not first-class anywhere beyond the generic participant list.
- Missing Fields:
  - first-class case array / type
  - dedicated UFM/scheduling semantics
  - dedicated transcript package consumer
- Implementation Risk: Medium — same generic-to-first-class problem as corporate representative, but with even less current downstream behavior.
- Estimated Effort: M — 3–5 commits, roughly 5–8 hours, build-heavy.

## 7. Recommended stage sequence

Confirmed sequence, with one revision: Attorney, Court Reporter, Interpreter, and Videographer are clearly reuse-heavy; Witness is mixed; Corporate Representative and Records Custodian remain build-heavy because they are still generic-participant aliases today.

```
Stage 0.5  Characterization tests for the contacts stack (no behavior change)
Stage 1    Attorney
Stage 2    Court Reporter
Stage 3    Witness
Stage 4    Interpreter
Stage 5    Videographer
Stage 6    Everything else
```

- Stage 0.5 — REUSE-heavy
  - Rationale: the largest gap in the current stack is not storage, it is missing characterization around `contactService`, `contactStore`, and `ParticipantsPanel`.

- Stage 1 — Attorney — REUSE-heavy
  - Rationale: attorney directory details, firm linkage, case fields, UFM enrichment, and keyterm flow already exist; the remaining work is mostly wiring and clarifying function semantics.

- Stage 2 — Court Reporter — REUSE-heavy
  - Rationale: `reporter_profiles` already exists, the alternate reporter contact type exists, and UFM builder support is already present; no new storage table is needed.

- Stage 3 — Witness — mixed REUSE-heavy / BUILD-heavy
  - Rationale: witness case structures already exist, but corporate-rep and certificate-branch behavior are only partially surfaced.

- Stage 4 — Interpreter — REUSE-heavy
  - Rationale: interpreter directory details, per-case fields, and UFM mapping already exist; most remaining work is UI/state polish and transcript-package consumption.

- Stage 5 — Videographer — REUSE-heavy
  - Rationale: videographer already has directory details, case storage, UFM appearance mapping, and firm linkage; remaining work is thin.

- Stage 6 — Everything else — BUILD-heavy
  - Rationale: Corporate Representative and Records Custodian are still generic-participant aliases rather than first-class category models.

## 8. Explicit "do not duplicate" list

- Do not rebuild the `contacts.details` typed JSON structure in `src/types/contact.ts`.
- Do not rebuild the `contacts.firm_id` linkage or the `firms` table.
- Do not rebuild `reporter_profiles`; it already exists with the participant-task columns.
- Do not rebuild directory merge logic; `src/lib/directory/mergeDirectoryRecords.ts` already provides same-type, non-destructive merge decisions.
- Do not rebuild participant category UI from scratch outside `ParticipantsPanel`; that drawer/config pattern already exists.
- Do not rebuild attorney / interpreter / videographer / generic participant case arrays; `src/types/case.ts` already owns them.
- Do not rebuild participant-derived UFM appearance and law-firm enrichment; `src/lib/ufm/buildUfmMetadata.ts` already does it.
- Do not rebuild deterministic participant keyterm derivation; `src/lib/keytermDerivation.ts` is the live path.
- Do not rebuild duplicate-repair logic for corrupted participant payloads; `normalizeCaseRecord()` already includes collection-scoped self-heal.
- Do not rebuild provenance storage; `field_provenance` already exists as the append-only audit table, even though participant drawer coverage is only partial.
