# PR-1A — Install the Canonical Registry

## Classification

- Project: DEPO-PRO
- Phase: 1 — Canonical Intake Registry
- PR: 1A
- Mode: implementation
- Scope: infrastructure only; no consumers

## Objective

Install the typed Canonical Field Registry infrastructure under `src/lib/canonical/`.

Nothing in the existing application may import, call, execute, or depend on the registry in this PR. The registry may only be referenced by tests created within this PR.

This PR installs a foundation. It does not change formatting or application behavior.

## Required architecture reading

Before editing, read completely:

1. `AGENTS.md`
2. `docs/architecture/PROJECT_CHARTER.md`
3. `docs/architecture/MASTER_ARCHITECTURE.md`
4. `docs/architecture/DEPO_PRO_SYSTEM_ARCHITECTURE_v1.0.md`
5. `docs/DATA_FIELD_REFERENCE.md`
6. `docs/DATA_STRUCTURES_REFERENCE.md`
7. Applicable ADRs discovered for Intake field ownership or contract boundaries

When authorities conflict, stop and report the conflict. Do not resolve it by inventing a new architecture.

## Architecture Freeze Verification

After completing the required reading and before writing code, verify:

- Architecture v1.0 remains the current implementation target, whether its status is DRAFT, REVIEW, or RATIFIED.
- No ADR supersedes or materially changes the Canonical Intake Registry decision.
- No competing canonical field registry implementation exists in the current tree.
- No abandoned or in-progress registry implementation exists on another discoverable branch that would create duplicate ownership or require reconciliation.

If any check fails or cannot be established with repository evidence, stop and report the finding. Do not implement, reconcile, or select an authority without explicit direction.
## Architecture Compliance Gate

Before writing code, report:

### Principles implemented

- Canonical data has one owner.
- Canonical Intake uses one field-policy registry.
- Architecture is installed incrementally behind unchanged behavior.
- Standards are enforceable through typed boundaries and tests.

### Principles intentionally not touched

- Transcript recognition, canonicalization, corrections, and Workspace behavior
- Deepgram requests, callbacks, keyterms, and transcription
- Rendering, pagination, formatting, and export
- AI Review, TIE, CorrectionObjects, and suggestion handling
- Certification and transcript immutability
- Confirmation thresholds or auto-confirm behavior
- UFM behavior or output
- Existing Intake consumer behavior

Confirm explicitly that the planned diff fits those statements. If it does not, stop before editing.

## Canonical Registry Definition

The Canonical Field Registry is not a formatter, parser, validator, persistence layer, projection layer, or UI service.

It is a typed policy registry that owns contracts for:

- field identity and kind;
- normalization behavior;
- validation hooks;
- display-adapter hooks;
- confirmation eligibility;
- downstream-consumer metadata.

PR-1A defines infrastructure and contracts only. It must not implement, select, or change normalization, validation, display formatting, confirmation, or downstream behavior.

## Consumer Prohibition

No production code outside src/lib/canonical/ may import, instantiate, reference, or execute this registry or its contracts. The registry may only be referenced by tests created within this PR under src/lib/canonical/.

Any additional import or reference is a failed PR-1A scope gate and must be removed, not justified as incidental wiring.

## Runtime Invariants

Application startup and runtime behavior must remain identical. Do not add providers, hooks, reducers, dependency-injection bindings, global singletons, service registration, initialization calls, or runtime side effects.

## API Stability

The public contracts must be minimal, strongly typed, concise, and extensible by later phases without breaking existing callers or changing registry internals for each new policy. Do not expose speculative consumer APIs.

If the required design cannot support the planned PR-1B through PR-1E work without a breaking contract change, stop and report the conflict before implementation.

## Explicit Non-Goals

PR-1A does not:

- normalize or format values;
- implement confirmation logic;
- change projections or persistence;
- change extraction or parsers;
- change Deepgram or keyterms;
- change transcript processing;
- change UFM;
- change exports;
- change rendering;
- change Workspace;
- change any UI.
## Allowed production files

Create only:

```text
src/lib/canonical/FieldPolicy.ts
src/lib/canonical/FieldRegistry.ts
src/lib/canonical/FieldKinds.ts
src/lib/canonical/FieldResult.ts
src/lib/canonical/CanonicalFormatter.ts
```

## Allowed test files

Create focused colocated tests only under:

```text
src/lib/canonical/*.test.ts
```

Prefer the smallest test-file set that clearly covers the infrastructure.

If another production, test, configuration, contract, documentation, or dependency file appears necessary, stop and report why. Do not expand scope automatically.

## Forbidden files and changes

Do not modify:

- any existing file under `src/`;
- `src/api/types.ts` or any frozen contract;
- Intake components, parsers, extraction, persistence, projection, validation, or normalization code;
- Deepgram, keyterm, transcript, Workspace, formatting, rendering, certification, UFM, or export code;
- Supabase functions, migrations, policies, or generated database types;
- `package.json`, lockfiles, TypeScript configuration, Vite/Vitest configuration, or dependencies;
- `AGENTS.md`, the Project Charter, architecture, standards, ADRs, or cleanup/governance documents;
- mocks or existing fixtures;
- `reference/wave8/`;
- legacy AI code.

Do not create a barrel `index.ts` unless separately approved. No existing consumer needs an import path in PR-1A.

## Required infrastructure

Implement a minimal, strictly typed foundation for these canonical field kinds:

- Cause Number
- Phone Number
- Email
- Person Name
- Organization
- Court
- Address
- Date
- Time
- Caption

The implementation must provide:

1. A closed typed vocabulary for the supported field kinds.
2. A typed `FieldPolicy` contract describing a policy without coupling it to React, Supabase, CaseRecord, UFM, Deepgram, Workspace, or export types.
3. A typed `FieldResult` contract that can represent successful canonical output and an explicit failure without throwing away the original input or policy identity.
4. A registry capable of registering and retrieving policies deterministically.
5. Explicit duplicate-registration behavior; duplicates must not silently replace an existing policy.
6. Explicit missing-policy behavior; missing lookups must not fall through to an unrelated formatter.
7. A small `CanonicalFormatter` execution boundary that accepts an explicitly supplied registry/policy context and returns a typed result.
8. Definitions/catalog entries for the ten field kinds without application wiring.

The registry and formatter may be invoked by unit tests. They must not be invoked by existing production code.

## Design constraints

- TypeScript strict mode; no `any`.
- No external dependencies.
- No global mutable singleton required by application startup.
- No React, browser, storage, network, Supabase, or environment-variable dependencies.
- No persistence.
- No side effects at module import time.
- Deterministic behavior for identical inputs and policy versions.
- Do not encode speculative consumer requirements.
- Do not copy existing formatter implementations into the new directory.
- Do not decide final Cause Number, phone, name, court, address, date, time, or caption transformation behavior in this PR.
- Test-only sample policies may demonstrate infrastructure, but must not be presented as ratified production formatting rules.
- Preserve raw input in the result contract.
- Keep modules small and independently testable.
- Add concise architecture comments to exported contracts where they explain the non-obvious boundary or ownership intent; otherwise default to no comments.
- No TODOs, placeholders, dead branches, or half-finished adapters.

## Unit-test requirements

Add focused tests proving at least:

1. All ten field kinds are represented by the closed vocabulary/catalog.
2. A policy can be registered and retrieved by its stable identity.
3. Registration order does not alter lookup results.
4. Duplicate identity registration is rejected explicitly.
5. A missing policy produces the declared missing-policy behavior.
6. A test-only policy can return a typed success result preserving raw input and policy identity.
7. A test-only policy can return a typed failure result preserving raw input, policy identity, and reason.
8. Two registries remain isolated; tests do not depend on shared global state.
9. Importing the new modules causes no application behavior or side effects.
10. A new test-only field policy can be accepted without modifying registry implementation code.

Use synthetic values only. Do not add real names, firms, courts, case numbers, phone numbers, addresses, or client artifacts.

## Mandatory regression checklist

Verify and report:

- [ ] No existing production file imports `src/lib/canonical/`.
- [ ] No existing behavior changes.
- [ ] No UI changes.
- [ ] No Intake consumer changes.
- [ ] No confirmation changes.
- [ ] No Deepgram changes.
- [ ] No keyterm changes.
- [ ] No UFM changes.
- [ ] No transcript changes.
- [ ] No Workspace changes.
- [ ] No rendering or formatting changes.
- [ ] No export changes.
- [ ] No certification changes.
- [ ] No migration or schema changes.
- [ ] No frozen contract changes.
- [ ] Only registry infrastructure and its isolated tests were added.

Use a repository search to prove the no-consumer condition rather than relying only on visual inspection.

## Required verification

Run:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Also run the narrow registry tests directly if useful for iteration. The complete test suite must pass; do not substitute a focused run for the full gate.

## Exit criteria

PR-1A is complete only when:

- the five allowed production modules exist;
- only allowed isolated tests were added;
- the registry infrastructure is strictly typed and deterministic;
- the ten required field kinds are defined but not connected to consumers;
- duplicate and missing policy behavior is explicit and tested;
- typed success and failure results are tested;
- repository search proves no existing production consumer imports the registry;
- all pre-existing tests plus new tests pass;
- typecheck, lint, and build pass;
- the diff contains no unrelated changes.

## Architectural Success Condition

The registry must be removable immediately after PR-1A with no change to runtime behavior, application output, startup, or user experience. If removing the new directory would require editing existing production code, PR-1A has introduced a consumer and has failed.
## Review checklist

### Scope

- Did the diff remain entirely inside the allowed new directory/files?
- Did it avoid consumer wiring and behavior changes?

### Architecture

- Does the infrastructure support one canonical owner without declaring speculative formatting policy?
- Did it preserve frozen contracts, provenance, and deterministic boundaries?

### Ownership

- Did the PR avoid copying or creating a second active formatter implementation?
- Are duplicate and missing registrations explicit rather than silently resolved?

### Regression

- Is there evidence—not assumption—that existing behavior is unchanged?
- Did the full gate pass?

### Future readiness

- Can PR-1B characterize current behavior without changing this infrastructure?
- Can PR-1C wire only `caption.case_number` without redesigning the registry?

## Final report format

Return:

1. Architecture Compliance Gate answer.
2. Exact files created.
3. Public types and responsibilities of each module.
4. Tests added and what each proves.
5. No-consumer search evidence.
6. Verification commands and results.
7. Regression checklist.
8. Any conflict, assumption, or follow-up explicitly deferred to PR-1B or later.

The final verification report must explicitly confirm:

- [ ] No production behavior changed.
- [ ] No production runtime import or reference was added.
- [ ] No UI, parser, formatter, or consumer changed.
- [ ] Existing tests remained unchanged.
- [ ] New isolated tests and the full test suite pass.
- [ ] The Architecture Compliance Gate and Architecture Freeze Verification are satisfied.
Do not commit, push, open a PR, or merge unless separately requested.
