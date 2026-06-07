# Participant Field Matrix

Date: 2026-06-07

Scope:
- Phase 0 verify
- Phase 0B downstream-consumer gate
- No code changes in this phase

## Phase 0 Verify

### Current contactService / ContactPicker create-form fields

Current directory storage is still the flat `contacts` model:

- `type`
- `name`
- `organization`
- `phone`
- `email`
- `address`
- `notes`

Current inline create flow in Intake only prompts for:

- `name`
- `organization`
- `phone`
- `email`

That create form currently lives inside `ContactPicker` in `IntakeScreen.tsx`, not in a reusable participant-directory module.

### Current `ContactType` union

Current union in `src/types/contact.ts`:

- `attorney`
- `interpreter`
- `videographer`
- `participant`
- `firm`

### Current `reporter_profiles` shape

Current profile shape from `src/types/reporterProfile.ts` and `supabase/migrations/20260607020754_reporter_profiles.sql`:

- `owner_user_id`
- `display_name`
- `csr_number`
- `csr_cert_expiration`
- `firm_registration_number`
- `created_at`
- `updated_at`

### Keyterm derivation check

Current deterministic keyterm derivation already reads `CaseRecord` collections, not parser output:

- `record.witnesses`
- `record.reporter`
- `record.attorneys`
- `record.interpreters`
- `record.videographers`
- `record.law_firms`
- `record.caption.county`
- `record.parties` / caption fallback

Conclusion:
- attorney, witness, interpreter, videographer, and reporter names already have a deterministic case-record path
- firm names already flow from `record.law_firms`
- no keyterm architecture change is needed for person collections
- Phase 4 is only needed if the new firm directory introduces names that do not make it into `record.law_firms`

## Phase 0B — Downstream Consumer Matrix

Legend:

- Home: `Directory` = person row in `contacts`, `Firms` = firm row, `CaseRecord` = per-case only, `Profile` = signed-in reporter profile
- UFM field: exact existing field or section in `buildUfmMetadata`; `—` means no direct UFM field
- Keyterm source: `Yes` means this field should feed deterministic keyterm derivation
- Transcript pkg use: transcript formatting / appearance page / certificate / export package consumer
- Scheduling use: intake scheduling / correspondence / booking consumer

| Field | Home | UFM field (exact) | Keyterm source? | Transcript pkg use | Scheduling use |
| --- | --- | --- | --- | --- | --- |
| Attorney `name` | Directory | `appearances[].name` | Yes | Appearance page / attorney listing | Yes |
| Attorney `bar_number` (SBOT) | Directory | `appearances[].bar_number` | No | Appearance page / package metadata | No |
| Attorney `firm_id` | Directory | via `appearances[].firm` and `law_firms[]` | Indirect via firm | Appearance page / firm block | Yes |
| Attorney `direct_phone` | Directory | `appearances[].phone` | No | Appearance page when emitted | Yes |
| Attorney `extension` | Directory | — | No | No direct transcript package field | Yes |
| Attorney `fax` | Directory | via `law_firms[].fax` or service/certificate correspondence block | No | Certificate / service correspondence block | Yes |
| Attorney `email` | Directory | `appearances[].email` | No | Appearance / service block | Yes |
| Attorney `assistant_name` | Directory | — | No | No direct UFM field | Yes |
| Attorney `assistant_email` | Directory | — | No | No direct UFM field | Yes |
| Attorney `preferred_appearance_label` | Directory | — | No | Speaker-label / transcript formatting consumer | No |
| Attorney per-case `representing` | CaseRecord | `appearances[].representing` | No | Appearance page / indexing | Yes |
| Attorney per-case `function` | CaseRecord | indirect appearance role text | No | Appearance page / transcript package role labeling | No |
| Attorney per-case `time_used` | CaseRecord | — | No | Transcript package / billing support only | No |
| Reporter `display_name` | Profile or case override | `csr_name` | Yes | Certificate / appearance context | Yes |
| Reporter `csr_number` | Profile or case override | `csr_license` | No | Certificate | Yes |
| Reporter `csr_cert_expiration` | Profile or case override | `csr_cert_expiration` | No | Certificate | Yes |
| Reporter `firm_registration_number` | Profile or case override | `firm_registration` | No | Certificate | Yes |
| Reporter `initials` | Profile | — | No | Transcript formatting / signature conventions | No |
| Reporter `realtime_capable` | Profile | — | No | No printed UFM field | Yes |
| Reporter `remote_swear_authority` | Profile | — | No | Certificate / remote-proceeding compliance support | Yes |
| Reporter `notary_commission_expiration` | Profile | — | No | Certificate / compliance support | Yes |
| Reporter `preferred_signature_block` | Profile | — | No | Certificate signature block | No |
| Alternate reporter `name` | Directory (`reporter`-type contact details) | `csr_name` when selected as case reporter | Yes | Certificate / appearance context | Yes |
| Alternate reporter `csr_number` | Directory (`reporter`-type contact details) | `csr_license` when selected as case reporter | No | Certificate | Yes |
| Alternate reporter `csr_cert_expiration` | Directory (`reporter`-type contact details) | `csr_cert_expiration` when selected as case reporter | No | Certificate | Yes |
| Alternate reporter `firm_registration` | Directory (`reporter`-type contact details) | `firm_registration` when selected as case reporter | No | Certificate | Yes |
| Alternate reporter `phone` | Directory (`reporter`-type contact details) | — | No | Certificate correspondence block | Yes |
| Alternate reporter `email` | Directory (`reporter`-type contact details) | — | No | Certificate correspondence block | Yes |
| Interpreter `name` | Directory | appearance / interpreter section | Yes | Appearance page / certificate | Yes |
| Interpreter `certified` | Directory | — | No | Certificate / interpreter block | Yes |
| Interpreter `cert_number` | Directory | — | No | Certificate / interpreter block | Yes |
| Interpreter `certification_authority` | Directory | — | No | Certificate / interpreter credentials | Yes |
| Interpreter `certification_expiration` | Directory | — | No | Certificate / interpreter credentials | Yes |
| Interpreter `remote_capable` | Directory | — | No | No direct transcript package field | Yes |
| Interpreter `agency` | Directory | appearance / company context | No | Appearance page | Yes |
| Interpreter `agency_contact` | Directory | — | No | No direct transcript package field | Yes |
| Interpreter `default_languages` | Directory | — | No | Prefill only | Yes |
| Interpreter `phone` | Directory | — | No | Appearance / service context | Yes |
| Interpreter `email` | Directory | — | No | Appearance / service context | Yes |
| Interpreter per-case `oath_administered` | CaseRecord | certificate / interpreter oath content | No | Certificate | No |
| Interpreter per-case `language_from` | CaseRecord | interpreter language pair | No | Certificate | Yes |
| Interpreter per-case `language_to` | CaseRecord | interpreter language pair | No | Certificate | Yes |
| Videographer `name` | Directory | appearance / videographer listing | Yes | Appearance page | Yes |
| Videographer `firm_id` | Directory | via firm block if surfaced | Indirect via firm | Appearance page / package metadata | Yes |
| Videographer `cert_number` | Directory | — | No | Appearance / credential block | No |
| Videographer `role_title` | Directory | — | No | Appearance page | No |
| Videographer `phone` | Directory | — | No | Appearance / correspondence | Yes |
| Videographer `email` | Directory | — | No | Appearance / correspondence | Yes |
| Scheduler `name` | Directory | `custodial_attorney` or scheduling contact context only when explicitly selected | No | No direct transcript package field | Yes |
| Scheduler `organization` / `firm_id` | Directory | — | No | No direct transcript package field | Yes |
| Scheduler `phone` | Directory | — | No | No direct transcript package field | Yes |
| Scheduler `email` | Directory | `service_emails` only if explicitly reused | No | Service / correspondence | Yes |
| Scheduler `notes` | Directory | — | No | No package consumer | Yes |
| Scheduler per-case `role_in_this_proceeding` | CaseRecord | — | No | No package consumer | Yes |
| Paralegal `name` | Directory | appearance attendee context if surfaced | No | Appearance/supporting attendee listing | Yes |
| Paralegal `organization` / `firm_id` | Directory | — | No | Appearance context | Yes |
| Paralegal `phone` | Directory | — | No | No package consumer | Yes |
| Paralegal `email` | Directory | `service_emails` only if explicitly reused | No | Service / correspondence | Yes |
| Paralegal `notes` | Directory | — | No | No package consumer | Yes |
| Paralegal per-case `role_in_this_proceeding` | CaseRecord | — | No | Appearance/supporting attendee labeling | Yes |
| Legal assistant `name` | Directory | appearance attendee context if surfaced | No | Appearance/supporting attendee listing | Yes |
| Legal assistant `organization` / `firm_id` | Directory | — | No | Appearance context | Yes |
| Legal assistant `phone` | Directory | — | No | No package consumer | Yes |
| Legal assistant `email` | Directory | `service_emails` only if explicitly reused | No | Service / correspondence | Yes |
| Legal assistant `notes` | Directory | — | No | No package consumer | Yes |
| Legal assistant per-case `role_in_this_proceeding` | CaseRecord | — | No | Appearance/supporting attendee labeling | Yes |
| Records custodian `name` | Directory | may feed `custodial_attorney`-adjacent scheduling metadata only if actually the selected role | Yes | Appearance/supporting attendee listing | Yes |
| Records custodian `organization` / `firm_id` | Directory | — | No | Appearance context | Yes |
| Records custodian `phone` | Directory | — | No | No package consumer | Yes |
| Records custodian `email` | Directory | service / correspondence only if reused | No | Service / correspondence | Yes |
| Records custodian `notes` | Directory | — | No | No package consumer | Yes |
| Records custodian per-case `role_in_this_proceeding` | CaseRecord | — | No | Appearance/supporting attendee labeling | Yes |
| Corporate representative `name` | Directory | appearance / participant context | Yes | Appearance page / witness-adjacent context | Yes |
| Corporate representative `organization` / `firm_id` | Directory | `parties[]` or appearance context depending usage | Indirect via party token | Appearance page / party context | Yes |
| Corporate representative `phone` | Directory | — | No | No package consumer | Yes |
| Corporate representative `email` | Directory | service / correspondence only if reused | No | Service / correspondence | Yes |
| Corporate representative `notes` | Directory | — | No | No package consumer | Yes |
| Corporate representative per-case `role_in_this_proceeding` | CaseRecord | — | No | Appearance/supporting attendee labeling | Yes |
| Firm `name` | Firms | `law_firms[].name` / `appearances[].firm` | Yes | Appearance page / certificate firm block | Yes |
| Firm `address` | Firms | `law_firms[].address` | No | Certificate / appearance block | Yes |
| Firm `city` | Firms | `law_firms[].city` | No | Certificate / appearance block | Yes |
| Firm `state` | Firms | `law_firms[].state` | No | Certificate / appearance block | Yes |
| Firm `zip` | Firms | `law_firms[].zip` | No | Certificate / appearance block | Yes |
| Firm `main_phone` | Firms | `law_firms[].phone` | No | Certificate / appearance block | Yes |
| Firm `fax` | Firms | `law_firms[].fax` | No | Certificate / service block | Yes |

## Drops

No proposed field is dropped from scope.

Reason:
- every listed field has at least one downstream consumer in UFM, keyterms, transcript formatting/package output, or scheduling/correspondence
- several fields have no direct UFM slot, but they still have legitimate transcript-package or scheduling consumers, so they are not orphans under this prompt’s rule

## UFM Gaps

These fields have valid downstream consumers but no dedicated existing UFM field in the current builder/template shape:

- attorney `extension`
- attorney `assistant_name`
- attorney `assistant_email`
- reporter `initials`
- reporter `realtime_capable`
- reporter `remote_swear_authority`
- reporter `notary_commission_expiration`
- reporter `preferred_signature_block`
- interpreter `certified`
- interpreter `cert_number`
- interpreter `certification_authority`
- interpreter `certification_expiration`
- interpreter `remote_capable`
- interpreter `agency_contact`
- videographer `cert_number`
- videographer `role_title`
- participant-type per-case `role_in_this_proceeding`

These stay in scope because they still have transcript-package or scheduling consumers. No new UFM fields should be invented for them.

## Field-home decisions

- Firm address, city, state, zip, phone, fax belong to a first-class `firms` table, not to per-person contacts
- Per-person reusable credentials and correspondence data belong to `contacts.details`
- Case-specific facts stay in `CaseRecord`:
  - attorney `representing`
  - attorney `function`
  - attorney `time_used`
  - interpreter `oath_administered`
  - interpreter `language_from`
  - interpreter `language_to`
  - generic participant `role_in_this_proceeding`
- Signed-in default reporter data belongs to `reporter_profiles`

## Keyterm conclusions

- Existing derivation already covers:
  - witness names
  - reporter name
  - attorney names
  - interpreter names
  - videographer names
  - `record.law_firms[].name`
- Therefore Phase 4 is only needed if the participants/firms implementation does not reliably project selected directory firms into `record.law_firms`
- If Phase 2/3 preserves that projection, no separate keyterm change is required

## Spacing standard note

The platform-wide spacing standard belongs in transcript formatting/package behavior, not in a reporter preference:

- one space after honorific periods
- two spaces after sentence-ending `.`, `?`, and after speaker-label colons
- no double space inside numeric colons such as `10:30`

This field matrix treats that as a transcript-formatting consumer only. No reporter-level punctuation override should be added.

## Implementation Notes

- Phase 1 additive migrations:
  - `20260607135049_firms_table.sql`
  - `20260607135049_contacts_details_and_firm_id.sql`
  - `20260607135049_reporter_profiles_participant_fields.sql`
- Phase 3 UFM mapping extends the pure builder with optional normalized directory inputs so participant credentials and firm blocks can populate without adding case-payload fields.
- Phase 4 keyterm derivation now treats firm names already stored on attorney and videographer case entries as valid law-firm-priority sources, so directory-selected firms still seed Deepgram keyterms even when `record.law_firms` is empty.

## Live Verification Script

1. Start real mode and sign in with a normal owner-scoped user.
2. Create Case 1.
3. In Participants, add an attorney with:
   - name
   - SBOT / bar number
   - a new firm with address, city, state, zip, phone, and fax
4. Save the case.
5. Open UFM preview.
   - Confirm `appearances[]` includes the attorney with `bar_number`, `firm`, `representing`, and `function`.
   - Confirm `law_firms[]` includes the new firm block with address and fax.
6. Open Deepgram preview.
   - Confirm firm tokens from the selected firm appear in the deterministic keyterm payload.
7. Create Case 2.
8. Re-open Participants and pick the same attorney from the directory.
   - Confirm person fields auto-fill from `contacts`.
   - Confirm the linked firm block auto-fills from `firms`.
9. Save Case 2 and reopen UFM preview.
   - Confirm SBOT and firm block are still present without re-entry.
10. In Supabase Dashboard, verify:
    - one `firms` row exists for the new firm
    - the attorney `contacts` row has populated `details` JSON and `firm_id`
    - `reporter_profiles` exposes the new participant-task columns
11. Repeat the same participant flow in mock mode.
    - Confirm add/select/save remains functional without Supabase.
