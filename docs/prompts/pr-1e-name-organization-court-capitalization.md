# PR-1E — Canonical Name, Organization, and Court Capitalization

## Classification

- Project: DEPO-PRO
- Phase: 1 — Canonical Intake Registry
- PR: 1E
- Mode: implementation
- Scope: person names, organization names, and court names only
- Prerequisite: PR-1D reviewed, merged, and green on the integration branch

## Objective

Migrate approved capitalization behavior for `person_name`, `organization`, and `court` fields into the Canonical Field Registry. No other field family or body-text domain may change.

Do not implement this prompt in parallel with PR-1C or PR-1D.

## Required architecture reading

Read completely:

1. `AGENTS.md`
2. `docs/architecture/PROJECT_CHARTER.md`
3. `docs/architecture/MASTER_ARCHITECTURE.md`
4. `docs/architecture/DEPO_PRO_SYSTEM_ARCHITECTURE_v1.0.md`
5. `docs/architecture/DOCUMENT_AUTHORITY_REGISTRY.md`
6. `docs/standards/CANONICAL_FIELD_GOVERNANCE.md`
7. `docs/architecture/CANONICAL_FORMATTING_ARCHITECTURE.md`
8. `docs/DATA_FIELD_REFERENCE.md`
9. `ARCHITECTURE_DECISIONS.md`
10. PR-1A through PR-1D implementation and tests

Verify that no ADR changes these policies or the Phase 1 sequence. If an authority conflicts, a prerequisite PR is unmerged, or the field inventory is incomplete, stop and report.

## Architecture Compliance Gate

### Implements

- Conservative canonical capitalization for governed Intake person names.
- Registered-spelling-aware organization normalization.
- Legal-aware court-name capitalization.
- Canonicalization before governed values enter or change working `CaseRecord` state.

### Intentionally does not touch

- Cause Number or phone behavior.
- Email, address, date, time, caption body, or legal-term policies.
- Deepgram, keyterms, Workspace, transcript content, speaker labels, rendering, UFM, export, certification, confirmation, or AI.
- Frozen contracts or database schemas.
- Broad title-casing utilities or body-text formatting.

If the planned diff does not fit both lists, stop before editing.

## Mandatory field inventory

Before writing code, enumerate every Intake writer and canonical storage path for:

### Person names

- parties
- witnesses
- attorneys
- interpreters
- videographers
- other participants
- reporter
- scheduler/contact and directory person records
- any other Intake person-name path found by search

### Organizations

- law firms and reporting firms
- attorney firm values
- witness employer/corporate entity
- participant organization
- interpreter agency
- videographer firm/company
- directory contact organization
- any other Intake organization path found by search

### Courts

- `caption.court_name`
- any Intake court-name import, extraction, manual-edit, hydration, or conflict-resolution writer

Classify each occurrence as raw evidence, writer, canonical storage, presentation, transcript/keyterm consumer, or test. Every governed Intake writer must migrate or be explicitly excluded with evidence. An unclassified writer is a stop condition.

## Approved person-name policy
### Policy version lock

- Policy kind: `person_name`
- Policy version: `1.0.0`

Every migrated person-name path must use this exact version. Later behavior changes require an approved architecture decision and a new policy version.

1. Trim outer whitespace and collapse repeated internal whitespace.
2. Canonicalize safely recognizable all-uppercase or all-lowercase simple names to conventional name case.
3. Preserve initials and their punctuation.
4. Preserve recognized suffixes such as `Jr.`, `Sr.`, `II`, `III`, and `IV`.
5. Preserve or explicitly defer uncertain particles, apostrophes, hyphenation, mixed-case brands/names, unfamiliar constructions, and ambiguous tokens rather than applying naive title case.
6. Never change identity, spelling, ordering, honorific meaning, or role.

Baseline example:

| Field | Previous | New |
|---|---|---|
| `witnesses[].name` | `DELIA GARZA` | `Delia Garza` |

Use synthetic names in tests; the example describes behavior and must not be copied as client data.

## Approved organization policy
### Policy version lock

- Policy kind: `organization`
- Policy version: `1.0.0`

Organization policy governs registered or identifying organization names. It must not be reused for courts merely because both values contain capitalized words. Every migrated organization path must use this exact version.

1. Trim outer whitespace and collapse repeated internal whitespace.
2. Convert safely recognizable all-uppercase/all-lowercase ordinary words to conventional organization case.
3. Preserve registered spelling when the source is already mixed case.
4. Preserve punctuation and entity suffixes, including `LLC`, `PLLC`, `P.C.`, `LLP`, `L.L.P.`, `Inc.`, and equivalent governed forms.
5. Preserve acronyms and mixed-case brands; do not silently recase uncertain organization tokens.
6. Do not infer or append a missing entity suffix.

Baseline example:

| Field | Previous | New |
|---|---|---|
| `law_firms[].name` | `FALCON, REED & VALE, P.C.` | `Falcon, Reed & Vale, P.C.` |

## Approved court policy
### Policy version lock

- Policy kind: `court`
- Policy version: `1.0.0`

Court policy is a distinct legal-name policy, not an organization-policy alias or shared generic title-case helper. It governs court and jurisdiction wording under its own tests and must remain independently versioned.

1. Trim outer whitespace and collapse repeated internal whitespace.
2. Apply legal-aware title casing to safely recognizable uppercase/lowercase court names.
3. Preserve jurisdiction wording, ordinals, court numbers, punctuation, acronyms, and proper names.
4. Lowercase ordinary connecting words such as `for`, `the`, and `of` when grammatically internal, consistent with the governing example.
5. Do not add, remove, abbreviate, expand, or reorder jurisdiction text.
6. Preserve or defer an uncertain construction rather than destructively title-casing it.

Baseline example:

| Field | Previous | New |
|---|---|---|
| `caption.court_name` | `UNITED STATES DISTRICT COURT FOR THE WESTERN DISTRICT OF TEXAS` | `United States District Court for the Western District of Texas` |

## Expected behavioral changes

Before implementation, expand the three baseline tables into one exhaustive table covering every migrated path and every expectation intentionally changed from PR-1B or existing tests.

If a value changes and its field/path and before/after value are not listed, treat it as a regression until proven otherwise. The table is evidence, not permission to broaden policy.
The final Behavioral Delta Report must use:

| Field/path | Policy/version | Previous | New | Behavior changed | Architecture section | ADR | Characterization test |
|---|---|---|---|---|---|---|---|

`Behavior changed` must be `YES` or `NO`. Use `None` for ADR only when frozen architecture directly authorizes the cited change. Every `YES` row must cite the characterization test that established the prior behavior.

## Consumer matrix

Complete this matrix before implementation and return the verified final version:

| Consumer/domain | Before | After PR-1E |
|---|---|---|
| Intake person-name writers | Behavior identified by inventory | Person-name policy v1.0 |
| Intake organization writers | Behavior identified by inventory | Organization policy v1.0 |
| Intake court-name writers | Behavior identified by inventory | Court policy v1.0 |
| Intake presentation | Existing behavior identified by inventory | Reads canonical values without recasing |
| Deepgram/keyterms | Existing behavior | Unchanged |
| UFM/export | Existing behavior | Unchanged |
| Workspace/transcript/speaker labels | Existing behavior | Unchanged |
| Rendering/certification | Existing behavior | Unchanged |

Any unexpected `After` change outside the four Intake rows is a regression or architecture conflict.

## Required implementation

1. Add one versioned policy for each of `person_name`, `organization`, and `court` to the existing registry construction path.
2. Route only inventoried Intake writers for those families through their corresponding policy.
3. Preserve raw evidence and do not mutate extraction/import inputs.
4. Preserve source ownership, confidence, provenance, conflicts, and confirmation state.
5. Stop migrated Intake presentation code from independently recasing canonical values.
6. Do not modify transcript, keyterm, UFM, rendering, or export capitalization.
7. Keep dormant duplicate helpers if removing them would broaden scope; deletion remains deferred until Phase 4.

## Allowed production scope

- The three policy definitions/registrations under `src/lib/canonical/`.
- Existing governed Intake writer boundaries identified by the mandatory inventory.
- Minimum Intake presentation changes required to prevent recasing an already canonical value.

Any other production file requires stop-and-report justification before editing.

## Explicitly out of scope

- Legal terminology outside governed Intake fields.
- Transcript body content and AI corrections.
- Speaker labels and transcript entity aliases.
- Deepgram keyterms or request payloads.
- UFM wording or template typography.
- Export, rendering, certification, or Workspace behavior.
- Phone, Cause Number, email, address, date, time, or caption-body policies.
- Confirmation thresholds, source hierarchy, or conflict resolution.
- General-purpose `titleCase` refactors.
- Contract, schema, migration, dependency, or environment changes.

Only characterization expectations directly listed in the final behavior table may change.

## Required tests

Prove at minimum:

1. Simple uppercase and lowercase person names canonicalize as approved.
2. Initials, suffixes, apostrophes, hyphens, particles, and mixed-case names are preserved or explicitly deferred according to policy.
3. Simple uppercase/lowercase organization names canonicalize as approved.
4. Entity suffixes, punctuation, acronyms, and mixed-case brands are preserved.
5. Court names follow the approved legal-aware capitalization without wording changes.
6. Court ordinals, numbers, acronyms, punctuation, and jurisdiction phrases remain intact.
7. Empty/null values do not produce invented names.
8. Every inventoried Intake writer invokes exactly its assigned policy.
9. Raw inputs are not mutated.
10. Confidence, provenance, source, conflicts, and confirmation semantics are preserved.
11. Manual entry, extraction, directory/profile import, hydration, persistence, round-trip, and UI paths agree where those paths exist.
12. Every changed characterization expectation appears in the exhaustive behavior table.
13. PR-1C Cause Number and PR-1D phone tests remain unchanged and green.
14. No transcript, keyterm, UFM, rendering, export, Workspace, or certification output changes.
15. Repository search proves no migrated Intake writer retains independent capitalization.

## Verification

Run focused policy, writer, reducer, persistence, hydration, round-trip, and UI tests, then:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

## Exit criteria

- Every inventoried governed Intake person, organization, and court writer uses the registry.
- Only the three approved policy families change behavior.
- Uncertain names/organizations/courts are preserved or explicitly deferred rather than destructively recased.
- No legal terminology, transcript content, speaker label, keyterm, or downstream output changes.
- Every intentional change appears in the final behavior table.
- Focused and full verification pass.

## Final report

Return the architecture gate, complete field/writer inventory, exact files changed, three policy identities/version locks, Behavioral Delta Report, completed Consumer Matrix, uncertainty-handling evidence, metadata/provenance evidence, duplicate-search evidence, focused/full verification, and regression checklist.

Do not commit, push, open a PR, or merge unless separately authorized after architecture review.

