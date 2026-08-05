# PR-1D — Canonical Phone Number Migration

## Classification

- Project: DEPO-PRO
- Phase: 1 — Canonical Intake Registry
- PR: 1D
- Mode: implementation
- Scope: Intake phone and fax fields only
- Prerequisite: PR-1C reviewed, merged, and green on the integration branch

## Objective

Migrate every governed Intake phone-number field to the Canonical Field Registry using one approved phone policy. Replace phone transformation at each migrated write boundary without changing any non-phone field or downstream feature.

Do not implement this prompt in parallel with PR-1C.

## Required architecture reading

Before editing, read completely:

1. `AGENTS.md`
2. `docs/architecture/PROJECT_CHARTER.md`
3. `docs/architecture/MASTER_ARCHITECTURE.md`
4. `docs/architecture/DEPO_PRO_SYSTEM_ARCHITECTURE_v1.0.md`
5. `docs/architecture/DOCUMENT_AUTHORITY_REGISTRY.md`
6. `docs/standards/CANONICAL_FIELD_GOVERNANCE.md`
7. `docs/architecture/CANONICAL_FORMATTING_ARCHITECTURE.md`
8. `docs/DATA_FIELD_REFERENCE.md`
9. `ARCHITECTURE_DECISIONS.md`
10. PR-1A through PR-1C implementation and tests

Verify that no ADR changes the phone policy or Phase 1 sequence. If an authority conflicts, PR-1C is not merged, or the phone-path inventory cannot be completed, stop and report. Do not implement.

## Architecture Compliance Gate

### Implements

- One canonical phone policy for all governed Intake phone and fax values.
- Canonicalization at Intake write boundaries before values enter canonical working state.
- Preserved raw evidence, source ownership, confidence, conflicts, confirmation state, and provenance.

### Intentionally does not touch

- Cause Number behavior established by PR-1C.
- Email, names, organizations, courts, addresses, dates, times, or captions.
- Confirmation or conflict policy.
- Deepgram, keyterms, UFM, Workspace, transcript processing, rendering, export, certification, or AI.
- Frozen API contracts or database schemas.
- Removal of dormant duplicate helpers; architecture defers deletion until Phase 4.

If the proposed diff does not fit both lists, stop before editing.

## Mandatory phone-path inventory

Before writing code, produce a repository-backed inventory of every Intake writer and storage path for:

- `law_firms[].phone`
- `law_firms[].fax`
- `attorneys[].phone`
- `witnesses[].phone`
- `interpreters[].phone`
- `videographers[].phone`
- `participants[].phone`
- `reporter.phone`
- directory contact `phone`
- attorney `details.direct_phone`
- attorney `details.fax`
- directory/reporting-firm `main_phone`
- any other Intake phone, office-phone, direct-phone, or fax field discovered by search

Classify each occurrence as raw evidence, writer, canonical storage, presentation, protocol/layout adapter, or test. Every writer must either migrate in this PR or be identified as outside Intake with evidence. An unclassified writer is a stop condition.
If the inventory discovers substantially more writer boundaries, runtime domains, or coupling than anticipated, stop after completing the inventory and propose a smaller sequential PR decomposition. Do not automatically broaden PR-1D to absorb the discovered scope. No migration code may be written until the revised decomposition is reviewed.

## Approved canonical phone policy
### Policy version lock

- Policy identity: governed phone/fax field identity using kind `phone_number`
- Policy version: `1.0.0`

All migrated paths in PR-1D must use this exact version. A later behavior change requires an approved architecture decision and a new policy version; do not silently edit v1.0 behavior.

### NANP base number

- Remove phone punctuation and whitespace for parsing only.
- Ten digits become `(AAA) BBB-CCCC`.
- Eleven digits beginning with `1` drop the country prefix and become `(AAA) BBB-CCCC`.
- Preserve no consumer-specific alternative representation in canonical state.

### Extensions

- Recognize explicit extension markers such as `ext`, `ext.`, `extension`, or `x` followed by digits.
- Canonical output is `(AAA) BBB-CCCC ext. N`.
- Never infer an extension.

### Invalid or incomplete values

- Do not invent missing digits, area codes, country codes, or extensions.
- Do not convert an invalid/incomplete value into an apparently valid NANP number.
- Preserve the raw candidate and return an explicit policy failure suitable for existing validation/review handling.
- Do not silently fall back to the uncanonicalized value at a canonical write boundary.

### International values

`docs/standards/CANONICAL_FIELD_GOVERNANCE.md` requires non-NANP numbers to retain an explicit country code in an E.164-compatible canonical representation. If the existing registry contracts cannot represent this safely without inventing an international parser or changing value types, stop and request an architecture decision. Do not treat every `+` number as NANP.

## Expected behavioral changes

At minimum, the implementation must publish and satisfy a complete table containing every migrated path. The baseline rows include:

| Field/path | Previous value | New value |
|---|---|---|
| `law_firms[].phone` | `2105550101` | `(210) 555-0101` |
| `attorneys[].phone` | `210-555-0101` | `(210) 555-0101` |
| `reporter.phone` | `210.555.0101` | `(210) 555-0101` |
| directory contact `phone` | `(210) 555-0101` or stored digits | `(210) 555-0101` |
| attorney `details.direct_phone` | `210 555 0101` | `(210) 555-0101` |
| reporting-firm `main_phone` | `+1 2105550101` | `(210) 555-0101` |
| governed fax field | `210-555-0199` | `(210) 555-0199` |
| phone with extension | `210-555-0101 ext 42` | `(210) 555-0101 ext. 42` |
| null/empty | null/empty | unchanged; no invented value |

Use synthetic `555-01xx` values only. If behavior changes and the field/path is not listed in the final table, treat it as a regression until proven otherwise.
The final Behavioral Delta Report must add these columns for every row:

| Field/path | Previous | New | Behavior changed | Architecture section | ADR | Characterization test |
|---|---|---|---|---|---|---|

`Behavior changed` must be `YES` or `NO`. Use `None` for ADR only when the change is already directly authorized by the cited frozen architecture. Every `YES` row must cite the characterization test that established the previous behavior.

## Consumer matrix

Complete this matrix before implementation and return the verified final version:

| Consumer/domain | Before | After PR-1D |
|---|---|---|
| Intake phone writers | Local/passthrough behavior identified by inventory | Canonical phone policy v1.0 |
| Intake phone display | Existing behavior identified by inventory | Reads canonical value without redefining it |
| UFM | Existing behavior | Unchanged |
| Export | Existing behavior | Unchanged |
| Deepgram/keyterms | Existing behavior | Unchanged |
| Workspace/transcript | Existing behavior | Unchanged |
| Rendering/certification | Existing behavior | Unchanged |

Any unexpected `After` change outside the two Intake rows is a regression or architecture conflict.

## Required implementation

1. Add one versioned `phone_number` policy to the existing canonical registry construction path.
2. Route every inventoried Intake phone/fax writer through that policy.
3. Preserve raw candidates and existing metadata before canonicalization.
4. Preserve field source ownership and existing conflict/confirmation decisions.
5. Remove phone transformation from migrated consumers so they do not reformat canonical values.
6. Keep dormant duplicate helpers in place if deletion would broaden scope; do not leave a migrated writer calling them.
7. Do not make UFM, export, Deepgram, Workspace, or other downstream consumers part of this PR.

## Allowed production scope

- Phone policy/registration under `src/lib/canonical/`.
- Existing Intake writer boundaries identified by the mandatory inventory.
- The minimum existing Intake display adapter needed to stop reformatting an already canonical phone value.

Any production file outside the inventory requires stop-and-report justification before editing.

## Forbidden changes

Do not modify:

- Cause Number policy or PR-1C expectations.
- Person, organization, court, email, address, date, time, or caption behavior.
- Broad capitalization or legal terminology.
- Confirmation thresholds or status derivation.
- Deepgram, keyterms, UFM, Workspace, transcript, rendering, export, certification, or AI behavior.
- Frozen contract shapes, migrations, schema, dependencies, or environment configuration.
- PR-1B characterization unrelated to intentional phone changes.

Do not delete phone helpers merely because migrated writers no longer use them. Duplicate cleanup is a later architecture phase.

## Required tests

Prove at minimum:

1. Each supported NANP input form maps to the same canonical output.
2. A leading `+1`/`1` is handled only for a valid eleven-digit NANP number.
3. Extensions use canonical `ext. N` form.
4. Invalid and incomplete inputs do not produce fabricated canonical numbers.
5. Null and empty values remain absent.
6. Every inventoried Intake phone/fax writer invokes the registry.
7. No non-phone policy is invoked.
8. Raw input objects are not mutated.
9. Confidence, source, provenance, conflict, and confirmation semantics are preserved.
10. Manual entry, extraction, directory/profile import, and hydration/round-trip paths store the same canonical representation where those paths exist.
11. UI displays canonical phone values without a second transformation.
12. Intentional PR-1B phone expectations are updated and all non-phone characterization remains unchanged.
13. PR-1C Cause Number tests remain unchanged and green.
14. Repository search proves no migrated writer retains local phone formatting.
15. Repository search proves no non-Intake production consumer was added.

## Verification

Run focused policy, writer, reducer, persistence, hydration, round-trip, and UI tests, then:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

## Exit criteria

- Every inventoried Intake phone/fax writer uses the canonical registry.
- Canonical NANP output is `(AAA) BBB-CCCC`, with governed extension handling.
- Invalid values are never fabricated into valid numbers.
- No migrated writer contains independent phone formatting.
- Dormant duplicate helpers are not deleted prematurely.
- No non-phone behavior changes.
- Every intentional behavior change appears in the final before/after table.
- Focused and full verification pass.

## Final report

Return the architecture gate, complete phone-path inventory, exact files changed, policy/version lock, Behavioral Delta Report, completed Consumer Matrix, metadata/provenance evidence, duplicate-search evidence, focused/full verification, and regression checklist.

Do not commit, push, open a PR, or merge unless separately authorized after architecture review.

