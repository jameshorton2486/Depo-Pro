# Canonical Intake Field Governance

---
authority_tier: T3
status: DRAFT
owner: Intake
scope: canonical-intake-field-governance
supersedes: null
superseded_by: null
approved_by: null
version: 1.0.0
effective_date: null
ratified_date: null
last_reviewed: 2026-08-05
next_review: null
ratification: REVIEW
implementation_status: NOT_STARTED
---

Status: proposed constitutional specification  
Project: Canonical Intake Architecture  
Applies to: Stage 1 Intake metadata and every downstream consumer of that metadata  
Audit basis: `docs/audits/INTAKE_FORMATTING_AUDIT.md` and companion reports dated 2026-08-01

## 1. Authority and purpose

This document defines the representation, ownership, normalization, conflict, and confirmation rules for Intake fields. It is subordinate to `docs/architecture/MASTER_ARCHITECTURE.md`, `AGENTS.md`, the source-ownership rules in `docs/DATA_FIELD_REFERENCE.md`, and the frozen API contract in `src/api/types.ts`.

Every Intake writer and consumer SHALL follow this specification. A parser, screen, projection, Deepgram builder, UFM builder, transcript adapter, or export adapter SHALL NOT create an alternative canonical representation.

This policy governs metadata confidence and confirmation. It does not make AI a certifying authority. Final transcript review and certification remain human responsibilities under the master architecture.

## 2. The three immutable boundaries

```text
RAW
  -> canonical normalization
  -> conflict detection
  -> canonical confirmation policy
  -> CANONICAL
  -> PRESENTATION
```

### 2.1 Raw

Raw is exactly what a source supplied. It SHALL never be modified in place.

Raw evidence includes:

- extracted source text and evidence span;
- the extraction provider's returned value;
- confidence and inferred status;
- source document, source type, model, and version;
- imported profile or directory value;
- manual input before canonical normalization;
- timestamp and provenance identity.

Corrections create a new canonical decision or provenance event. They do not rewrite historical raw evidence.

### 2.2 Canonical

Canonical is the single source of truth used by the application. Every Intake value SHALL pass through the same field-policy registry before it enters or changes the working `CaseRecord`.

Canonical values SHALL be:

- deterministic for identical field, raw value, policy version, and context;
- stable across reloads;
- independent of the screen or downstream consumer;
- conservative, preserving legally meaningful spelling, punctuation, initials, suffixes, and entity designations;
- traceable to raw evidence and a normalization-policy version.

Deepgram keyterm derivation, UFM, Transcript Creation, Workspace metadata, and all exports SHALL read canonical values. Protocol encoding, token budgeting, or document layout may occur later, but those operations SHALL NOT repair or redefine canonical data.

### 2.3 Presentation

Presentation is cosmetic and SHALL never mutate canonical or raw data.

Allowed presentation behavior includes:

- labels and badge colors;
- column widths, icons, and status chips;
- locale-aware date display derived from a canonical ISO date;
- friendly enum labels such as `in_person` -> `In Person`;
- document typography, indentation, and pagination;
- temporary input masking that commits through the canonical policy.

Presentation SHALL NOT title-case names, repair phone numbers, lowercase emails, rewrite cause numbers, select a conflict winner, or change confirmation state.

## 3. Field-policy contract

Each governed field SHALL have exactly one registered policy defining:

1. accepted source types and source owner;
2. raw type;
3. canonical type and representation;
4. normalization algorithm and policy version;
5. validation and rejection rules;
6. semantic equality used for conflict detection;
7. auto-confirm eligibility;
8. permitted presentation adapters;
9. permitted output-specific mappings.

Normalization SHALL run for AI extraction, deterministic fallback extraction, job sheets, reporter profiles, directory imports, manual edits, conflict resolutions, and legacy hydration. The registry SHALL be the same implementation for all routes.

## 4. Canonical field specifications

The examples below are synthetic. “Preserve” means collapse accidental surrounding/repeated whitespace while retaining meaningful spelling and punctuation.

### 4.1 Case and court

| Field | Raw example | Canonical representation | Presentation/output rule |
|---|---|---|---|
| Cause number | ` 25-cv-00598-olg ` | `25-CV-00598-OLG` | Same everywhere unless a court-specific policy explicitly preserves a different authoritative form |
| Cause-number label | `cause no.` | `CAUSE NO.` | Same in legal templates; UI label may say `Case Number` |
| Case name | `Garza v. Example Retail, LLC` | Preserve authoritative party spelling and legal punctuation | Same; no UI title-casing |
| Case style/caption | extracted caption text | Preserve party/entity spelling; normalize whitespace; preserve meaningful `v.`, `D/B/A`, `F/K/A`, initials, suffixes, and entity designators | UFM layout may arrange lines but SHALL NOT change canonical tokens |
| Court name | `UNITED STATES DISTRICT COURT FOR THE WESTERN DISTRICT OF TEXAS` | `United States District Court for the Western District of Texas` | Same; template typography may render uppercase without writing it back |
| Judicial district | `western district of texas` | `Western District of Texas` | Same |
| Division | `san antonio division` | `San Antonio Division` | Same |
| County | `bexar county` | `Bexar County` | An export that requires the county name without `County` may derive it without changing canonical data |
| State | `texas` | `Texas` | Export may map to `TX` only when its schema requires a postal code |
| Jurisdiction type | `Texas state` | Canonical enum such as `texas_state` | UI/export maps enum to required label |
| Venue/department | source value | Preserve proper names; normalize whitespace | Same |
| Judge name | `HON. ANA M. LOPEZ` | `Ana M. Lopez` with honorific represented separately when the schema supports it | UI/template may add `Hon.` without changing the name |

Case-number casing SHALL be governed by a jurisdiction-aware policy. The example above is the default alphanumeric policy, not permission to overwrite a court's authoritative punctuation or unusual casing.

### 4.2 People, roles, and organizations

| Field | Raw example | Canonical representation | Presentation/output rule |
|---|---|---|---|
| Person name | `DELIA  GARZA` | `Delia Garza` after conservative person-name normalization | Same; no consumer title-casing |
| Initials/suffix | `JOHN Q PUBLIC, JR.` | `John Q. Public, Jr.` when unambiguous | Preserve source if ambiguity exists; require review rather than guessing |
| Witness professional title | `m.d.` | Registered title form such as `M.D.` | Same |
| Witness employer | source organization | Organization policy | Same |
| Party role | `Plaintiff` | Canonical enum such as `plaintiff` | UI/template maps to `Plaintiff` or required uppercase styling |
| Role modifier | `individually and as next friend of` | Preserve legal phrase using registered legal-term casing | Same |
| F/K/A or D/B/A | source phrase | Registered legal abbreviation plus preserved entity/name | Same |
| Attorney name | source name | Person-name policy | Deepgram, UFM, Workspace, and export use this spelling |
| Attorney function | source role | Canonical function enum/array | Presentation supplies legal label |
| Represented party | source party name/side | Canonical party reference or stable enum when possible | Templates may render uppercase cosmetically |
| Bar number | `TX 24012345` | Jurisdiction and identifier in the registered form; never numeric coercion | Same |
| Firm name | `BROTHERS, ALVARADO, PIAZZA & COZORT, P.C.` | `Brothers, Alvarado, Piazza & Cozort, P.C.` | Same everywhere |
| Organization name | source name | Preserve registered spelling, acronyms, punctuation, and entity suffix | Same |
| Interpreter language | `Spanish` / `English` | ISO language identifiers where the domain field requires them | UI/template displays language names |

Automated name casing SHALL use an exception-aware policy and SHALL never silently change an uncertain name. Names containing particles, apostrophes, mixed-case brands, initials, or unfamiliar constructions require preservation or confirmation rather than naive title case.

### 4.3 Contact and address

| Field | Raw example | Canonical representation | Presentation/output rule |
|---|---|---|---|
| North American phone | `210.999.5033` | `(210) 999-5033` | Same everywhere |
| Phone with extension | `210-999-5033 ext 42` | `(210) 999-5033 ext. 42` | Same everywhere |
| Non-NANP phone | international source | Valid E.164-compatible canonical representation with explicit country code | Presentation may add readable grouping through the same phone policy |
| Fax | phone-like source | Same policy as phone | Same |
| Email | `Counsel@Example.COM` | `counsel@example.com` | Same; comparison is case-insensitive |
| Website | `HTTPS://Example.COM/` | Normalized absolute URL under URL policy | UI may shorten visible label while retaining canonical target |
| Street address | source address | Preserve named components and unit punctuation; normalize whitespace | Same |
| City | `SAN ANTONIO` | `San Antonio` | Same |
| Address state | `Texas` | `Texas` in metadata | Export may derive `TX` when required |
| ZIP | `78230-1234` | `78230-1234` | Same; never numeric coercion |

Incomplete or invalid phone/email values SHALL be retained as raw evidence, marked invalid or needs confirmation, and SHALL NOT be fabricated into a canonical valid value.

### 4.4 Session, location, scheduling, and service

| Field | Raw example | Canonical representation | Presentation/output rule |
|---|---|---|---|
| Deposition/service date | `April 30, 2026` | ISO `2026-04-30` | UI may display `April 30, 2026`; UFM derives required parts |
| Start/end time | `10:03 a.m.` | ISO local time such as `10:03:00` plus applicable time-zone context | UI/UFM format from canonical time |
| Time zone | `Central` | IANA zone when known, such as `America/Chicago` | UI may display `Central Time` |
| Location type | `In person` | Enum `in_person` | UI `In Person`; export maps as required |
| Reporting method | source phrase | Canonical enum | Template label derived from enum |
| Remote platform | `zoom video` | Registered platform name `Zoom` | Same |
| Location address components | source components | Address policies above | UFM may join components without modifying them |
| Proceeding type | source phrase | Canonical proceeding enum | UI/template label only |
| Noticing/ordering party | source name/side | Canonical party reference where possible | Same |
| Scheduler/contact | source person/contact | Person/contact policies | Same |
| Service type | source value | Canonical service enum or registered term | Presentation label only |
| Served parties | source list | Ordered, deduplicated canonical party references | UI joins cosmetically |
| Service emails | source list | Ordered, case-insensitively deduplicated canonical emails | UI joins cosmetically |

Scheduled values owned by `JOB` and actual on-record values owned by `RECORD` SHALL remain distinct concepts. Normalization SHALL NOT allow one source to overwrite a field it does not own.

### 4.5 Reporter and certification metadata

| Field | Raw example | Canonical representation | Presentation/output rule |
|---|---|---|---|
| Reporter name | source/profile name | Person-name policy | Same |
| CSR/certification number | source identifier | Preserved string under jurisdiction policy | Same; never numeric coercion |
| Certification state | `Texas` | `TX` because the current field contract explicitly requires a two-letter code | UI may display `Texas` |
| License expiration | source date | ISO date | UI/template formats from ISO |
| Reporting firm | source/profile firm | Organization policy | Same |
| Firm registration number | source identifier | Preserved string | Same |
| Reporter/firm phone/email/address | source/profile fields | Contact/address policies | Same |
| Reporter request flags | source yes/no | Boolean or null | UI labels only |
| Certification/post fields | operator/post source | Typed canonical date, boolean, amount, or identifier | Certification templates format without rewriting |

Profile data SHALL not silently replace a conflicting confirmed record value. Profile selection is a source decision governed by conflict policy, not a UFM-builder formatting decision.

### 4.6 Deepgram keyterms and legal terms

| Field | Raw example | Canonical representation | Presentation/output rule |
|---|---|---|---|
| Proper-name keyterm | canonical attorney/witness name | Exact canonical spelling | Deepgram wire encoding may trim protocol whitespace only |
| Organization keyterm | canonical firm/company | Exact canonical spelling | Token budgeting may select/drop terms but not recase them |
| Legal/medical/technical term | reviewed source term | Approved canonical spelling | Case-insensitive deduplication may identify duplicates while preserving canonical spelling |
| Cause-number keyterm | canonical cause number | Exact canonical cause number | Same |

Keyterm derivation may create full-name and surname candidates. It SHALL not become an alternate spelling authority. A user-entered correction creates or selects a canonical keyterm spelling through the registry.

### 4.7 Computed and presentation-only values

Stable identifiers, hashes, timestamps, page/line references, counts, file metadata, score values, and workflow flags SHALL retain their typed semantic values. Formatting them for display SHALL never write a formatted string back into the canonical record.

Caption display strings, joined addresses, date parts, speaker labels, page labels, and UFM template text are computed outputs. Their source components remain canonical and independently addressable.

## 5. Canonical confirmation policy

Confirmation belongs to the canonical decision pipeline:

```text
raw candidate
  -> normalize using the registered field policy
  -> validate
  -> compare canonically with current value
  -> enforce source ownership
  -> detect conflict
  -> apply confirmation policy
  -> persist canonical value + provenance decision
```

### 5.1 Deterministic rules

1. Invalid candidates SHALL not be auto-confirmed.
2. A source-ownership violation SHALL be rejected and audited.
3. Canonically equal values SHALL not create a conflict; the additional provenance SHALL be recorded.
4. Different values from competing permitted sources SHALL follow the source hierarchy and conflict rules in `docs/DATA_FIELD_REFERENCE.md`.
5. Any unresolved conflict SHALL remain unconfirmed regardless of confidence.
6. An eligible explicit extracted value with confidence `>= 0.95`, `inferred=false`, valid canonical form, and no conflict MAY be auto-confirmed.
7. Inferred values SHALL not auto-confirm; the extraction contract caps them at `0.6`.
8. Fields with legal ambiguity, identity ambiguity, or policy-specific human-review requirements SHALL not auto-confirm even at high confidence.
9. Manual confirmation and conflict resolution SHALL be explicit, auditable actions.
10. Auto-confirmation SHALL record the threshold, policy version, source, confidence, and method.

The threshold SHALL be configuration, not UI logic. The default proposed threshold is `0.95`. A field-policy `autoConfirmEligible` flag controls whether the general threshold applies.

### 5.2 Status derivation

The canonical layer SHALL persist or deterministically derive one status:

| Condition | Status |
|---|---|
| Required and no canonical value | Missing |
| Invalid candidate only | Needs Confirmation with validation reason |
| Unresolved competing values | Conflict |
| Valid, conflict-free, below threshold or ineligible | Needs Confirmation |
| Valid and explicitly confirmed | Confirmed — Manual |
| Valid, eligible, conflict-free, at/above threshold | Confirmed — Automatic |
| Accepted through explicit conflict resolution | Confirmed — Conflict Resolution |
| Trusted imported profile selected under policy | Confirmed — Profile, only if the profile policy permits it |

Projection SHALL display this decision. It SHALL not independently infer it from value presence or confidence.

## 6. Consumer obligations

| Consumer | Permitted behavior | Prohibited behavior |
|---|---|---|
| Extracted Fields Review | Display canonical value, raw evidence, status, confidence, and conflict choices | Recase, repair, or assign confirmation |
| Case/field projection | Select labels and cosmetic enum/date adapters | Create a different data value |
| Working Case | Hold canonical values and decision metadata | Discard raw provenance |
| Deepgram builder | Select terms, enforce protocol caps, URL-encode | Normalize Intake spelling independently |
| UFM builder | Map canonical fields, derive computed template values | Repair casing/phone/email or silently substitute conflicts |
| UFM preview | Display the exact UFM envelope | Transform values |
| Transcript Creation | Read canonical keyterms/entities | Rewrite Intake metadata |
| Transcript Workspace | Read canonical entity names and roles | Become Intake formatting authority |
| Export | Apply document layout and schema-required mappings | Repair canonical metadata |

## 7. Change governance

A canonical field-policy change SHALL include:

- the field paths affected;
- old and new policy versions;
- synthetic before/after examples;
- source-ownership analysis;
- semantic-equality and conflict impact;
- auto-confirm eligibility impact;
- legacy-data migration or compatibility behavior;
- characterization tests for every writer and consumer;
- confirmation that frozen API contract types were not renamed or reshaped;
- a `CONTRACT_NOTES.md` entry when separate local metadata is introduced.

No new formatter may be added to a parser, projection, component, Deepgram builder, UFM builder, or export adapter. A consumer needing a representation not covered here SHALL request a registry policy or a clearly presentation-only adapter.

## 8. Implementation boundaries

This specification supports four reviewable pull requests:

1. **Canonical Field Registry** — types, policy definitions, characterization tests; no consumers changed.
2. **Writer Consolidation** — move extraction, import, manual-edit, conflict-resolution, and hydration normalization to the registry; no intentional UI redesign.
3. **Canonical Confirmation Policy** — conflict-first deterministic status and configurable auto-confirmation, with audit metadata.
4. **Consumer Cleanup** — remove duplicate Intake formatting from projection, reporter controls, Deepgram, UFM, and export; retain only protocol/layout adapters.

Deletion of duplicates occurs only after parity tests prove every writer and consumer uses the canonical authority.

## 9. Constitutional rule

For every Intake field:

> Raw evidence is preserved. Canonical value is decided once. Presentation never changes data.

Any implementation that creates a second canonical representation violates this governance document.
