# PR-1C — Migrate `caption.case_number` to the Canonical Registry

## Classification

- Project: DEPO-PRO
- Phase: 1 — Canonical Intake Registry
- PR: 1C
- Mode: implementation
- Scope: one field, one production consumer

## Objective

Wire only the extracted Intake field `caption.case_number` through the Canonical Field Registry before it enters the working `CaseRecord`.

PR-1C is the first intentional Canonical Intake behavior change. It must implement the approved Cause Number policy and nothing else.

## Required architecture reading

Before editing, read completely:

1. `AGENTS.md`
2. `docs/architecture/PROJECT_CHARTER.md`
3. `docs/architecture/MASTER_ARCHITECTURE.md`
4. `docs/architecture/DEPO_PRO_SYSTEM_ARCHITECTURE_v1.0.md`
5. `docs/standards/CANONICAL_FIELD_GOVERNANCE.md`
6. `docs/architecture/CANONICAL_FORMATTING_ARCHITECTURE.md`
7. `docs/DATA_FIELD_REFERENCE.md`
8. `ARCHITECTURE_DECISIONS.md`
9. PR-1A registry implementation under `src/lib/canonical/`
10. PR-1B characterization test `src/lib/parsing/canonicalIntakeCharacterization.test.ts`

If an authority conflicts with this prompt, stop and report the conflict. Do not resolve it by expanding the implementation.

## Architecture Compliance Gate

Before writing code, report:

### Implements

- One canonical owner for Cause Number normalization.
- `caption.case_number` as the only PR-1C field.
- Canonical normalization before an extracted Cause Number enters `CaseRecord`.
- Preserved source ownership, confidence, conflict handling, and provenance.

### Intentionally does not touch

- Phone, email, names, organizations, courts, addresses, dates, times, or captions as a whole.
- Confirmation thresholds, auto-confirmation, or conflict policy.
- Deepgram, keyterms, UFM, Workspace, transcript processing, rendering, export, or certification.
- Manual entry, profile import, directory import, legacy hydration, or other future registry consumers.
- Frozen API contracts or database schemas.

If the planned diff does not fit both lists, stop before editing.

## Actual integration boundary

The existing active path is:

```text
Provider result
  -> Supabase extract-nod normalizeFields()
  -> applyExtraction()
  -> Intake reducer / CaseRecord
  -> Intake UI
  -> persistence
```

PR-1C changes only the Cause Number portion to:

```text
normalizeFields().cause_number
  -> Canonical Field Registry
  -> applyExtraction() field update
  -> Intake reducer / CaseRecord
  -> Intake UI
  -> persistence
```

Do not import the browser TypeScript registry into `supabase/functions/extract-nod/normalization.js`. That would create a cross-runtime dependency and exceed the one-consumer scope. The PR-1B tests for `normalizeFields()` remain an upstream characterization baseline and should continue to pass unchanged.

## Approved Cause Number policy

For policy identity `caption.case_number` and kind `cause_number`:

1. Trim leading and trailing whitespace.
2. Convert ASCII letters to uppercase using deterministic JavaScript `toUpperCase()` behavior.
3. Preserve digits and existing internal separators exactly.
4. Do not insert, remove, or replace hyphens, colons, spaces, prefixes, or jurisdiction-specific segments.
5. Do not parse the value as a number.
6. Do not infer a missing value.
7. Do not change confidence, source ownership, confirmation, conflict, or provenance metadata.

This is the complete PR-1C policy. Any additional Cause Number rule requires architecture review before implementation.

## Expected behavior changes

Only the value crossing from `applyExtraction()` into `caption.case_number` may intentionally change:

| Input candidate | Previous CaseRecord value | New CaseRecord value |
|---|---|---|
| `25-cv-00598-olg` | `25-cv-00598-olg` | `25-CV-00598-OLG` |
| `25-CV-00598-OLG` | `25-CV-00598-OLG` | `25-CV-00598-OLG` |
| `  syn-2026-001  ` | `syn-2026-001` after upstream trimming | `SYN-2026-001` |
| `2025CI11923` | `2025CI11923` | `2025CI11923` |
| `C-1628-25-E` | `C-1628-25-E` | `C-1628-25-E` |
| empty or missing | no Cause Number update | no Cause Number update |

Everything not listed must remain unchanged. In particular, upstream `normalizeFields()` may continue returning the characterized casing because canonicalization occurs at the `applyExtraction()` boundary.

## Required implementation

1. Define one versioned Cause Number `FieldPolicy` under `src/lib/canonical/`.
2. Register it through an explicit, deterministic registry construction path with no global mutable singleton and no import-time registration side effects.
3. In `applyExtraction()`, execute that exact policy only for `fields.cause_number` before queueing `caption.case_number`.
4. Preserve the incoming confidence score in the resulting `ExtractionFieldUpdate` or conflict.
5. Preserve the existing raw extraction envelope; do not overwrite or mutate `fields.cause_number`.
6. Pass the canonical value through the existing reducer, UI, extraction audit/persistence, and save paths without adding consumer-specific formatting.
7. Handle missing-policy or policy-failure results explicitly. Do not silently fall back to the uncanonicalized value. If the existing architecture cannot support safe explicit handling without broadening scope, stop and report.

Use the smallest file set consistent with these requirements. A new policy/catalog module under `src/lib/canonical/` is permitted. Do not create a barrel file or general-purpose Intake service.

## Allowed production scope

- Cause Number policy/registration code under `src/lib/canonical/`.
- The single extraction consumer boundary in `src/lib/parsing/applyExtraction.ts`.

No other production file may change without a stop-and-report explaining why the required round-trip proof cannot be achieved through tests.

## Allowed test scope

Add or update focused tests only where needed to prove:

- Cause Number policy behavior.
- `applyExtraction()` canonicalizes only `caption.case_number`.
- confidence and conflict provenance remain unchanged.
- Intake reducer applies the canonical value without changing confirmation state.
- extraction persistence/audit receives the canonical value and original confidence.
- a saved and reloaded `CaseRecord` preserves the canonical value.
- the Intake UI displays the canonical value without formatting it again.
- all PR-1B non-Cause-Number characterization remains unchanged.

Prefer existing test files and helpers. Use synthetic data only.

## Forbidden changes

Do not:

- modify `supabase/functions/extract-nod/normalization.js`;
- change any phone, name, organization, court, address, date, time, or caption policy;
- route a second field through the registry;
- modify UFM, Deepgram, keyterm, Workspace, transcript, rendering, export, confirmation, certification, or AI code;
- reshape `src/api/types.ts` or any frozen contract;
- add dependencies, migrations, environment variables, feature flags, providers, hooks, reducers, or global registration;
- reformat unrelated code;
- delete or weaken PR-1A or PR-1B tests;
- add TODOs or speculative future APIs.

## Required tests

At minimum, prove:

1. Lowercase letters become uppercase.
2. Already-uppercase values remain unchanged.
3. Surrounding whitespace is removed.
4. Existing internal separators remain byte-for-byte unchanged.
5. Digits-only values remain unchanged.
6. Empty or missing extraction values do not create a field update.
7. Only the `caption.case_number` update differs from the PR-1B baseline.
8. The input extraction object is not mutated.
9. Confidence is preserved.
10. Existing conflict behavior is preserved, with the incoming conflict value canonicalized.
11. Reducer state stores the canonical value with `source: "extracted"`, `confirmed: false`, and unchanged confidence.
12. Persistence/audit receives the canonical value.
13. Save/load round-trip preserves the canonical value.
14. UI output displays the canonical value without another transformation.
15. No other production module imports or invokes the registry.

Do not update an expectation merely to make a failing test pass. Every changed expectation must map directly to the Expected Behavior Changes table.

## Regression checklist

- [ ] Only `caption.case_number` uses the registry.
- [ ] No second production registry consumer exists.
- [ ] `normalizeFields()` behavior is unchanged.
- [ ] No phone behavior changed.
- [ ] No person, organization, or court behavior changed.
- [ ] No UI layout or interaction changed.
- [ ] No confirmation or conflict policy changed.
- [ ] No Deepgram, UFM, keyterm, transcript, Workspace, rendering, export, or certification behavior changed.
- [ ] No schema, migration, dependency, or frozen contract changed.
- [ ] Raw extraction input and confidence/provenance remain intact.
- [ ] Every intentional expectation change is listed in this prompt.

Use repository searches and the final diff to prove these statements.

## Required verification

Run:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Also run the focused canonical policy, `applyExtraction`, reducer, persistence, hydration/round-trip, and UI tests used by the implementation.

## Exit criteria

PR-1C is complete only when:

- one Cause Number policy is registered under `caption.case_number`;
- only the extracted `caption.case_number` path invokes it;
- the Expected Behavior Changes table is exactly satisfied;
- confidence, provenance, conflict handling, confirmation state, persistence, UI display, and round-trip behavior are proven;
- the PR-1B upstream characterization remains green;
- no unrelated production or test behavior changes;
- all focused and complete verification gates pass;
- the diff is independently reviewable as one field and one consumer.

## Final report format

Return:

1. Architecture Compliance Gate answer.
2. Exact files changed and why each was necessary.
3. Cause Number policy identity, version, and transformation rules.
4. Before/after results for every Expected Behavior Changes row.
5. Evidence that extraction input, confidence, provenance, conflict behavior, confirmation, persistence, UI, and round-trip semantics are preserved.
6. Repository-search evidence proving there is only one production registry consumer.
7. Focused and full verification results.
8. Regression checklist.
9. Any conflict or scope expansion that stopped implementation.

Do not commit, push, open a PR, or merge unless separately authorized after architecture review.
