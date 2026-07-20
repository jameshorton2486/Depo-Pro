# Wave 0 Engineering Operations Standard

## Purpose

This document defines the engineering-operations standard for DEPO-PRO.

Wave 0 exists to ensure the repository itself is the primary communication
surface for project state, sprint execution, architecture health, and benchmark
status.

This standard governs engineering operations across all later waves.

## Principle

The repository is the primary communication tool for the project.

DEPO-PRO has three operating participants:

- Product Owner
- Chief Architect
- Implementation Engineer

The repository dashboard is the common language between them.

## Required Dashboard

The project must maintain a dashboard under:

- `docs/dashboard/`

The required dashboard artifacts are:

- `CURRENT_STATUS.md`
- `CURRENT_SPRINT.md`
- `ARCHITECTURE_HEALTH.md`
- `WAVE_STATUS.md`
- `BENCHMARK_STATUS.md`
- `SEMANTIC_SCORECARD.md`
- `TECHNICAL_DEBT.md`
- `PROJECT_HEALTH.md`
- `PIPELINE_STATUS.md`
- `CURRENT_FIXTURE.md`
- `OPEN_DECISIONS.md`
- `CHANGELOG_ARCHITECTURE.md`

## Dashboard Authority

The dashboard is not a replacement for architecture standards, sprint reports,
or benchmark reports.

It is the primary operational summary of those artifacts.

When the dashboard conflicts with the underlying architectural authority, the
architectural authority wins.

## Canonical Status Vocabulary

All status reporting — dashboards, waves, sprints, benchmarks, deployments,
systems, documentation — uses one vocabulary, defined in:

- `docs/architecture/W0_STATUS_VOCABULARY.md`

The six canonical states are `Unknown`, `Planned`, `Active`, `Operational`,
`Verified`, and `Blocked`. `Verified` is a strict, earned state (operational,
all gates passed, and independently validated against an external authority).
No dashboard may introduce a status word outside this vocabulary. Engineering
gates (`build`, `tests`, `typecheck`) remain a separate `PASS` / `FAIL` axis.

## Governance Rules

### Prompt–Architecture Ownership Rule

No new prompt module may be created without a corresponding architectural owner
(a wave or a named producer). Every rule has exactly one architectural owner; if
a rule appears in more than one module, it is moved, not duplicated. This keeps
the prompt library (`docs/prompts/transcript-compiler/`) synchronized with the
codebase permanently.

### Architecture Document Layer Rule

Every new architecture document must identify, at its top, the layer it governs
(e.g. Wave 21 Recognition, Wave 22 Semantics, Wave 23 Production, TP-5 Geometry,
or Wave 0 Engineering Operations). A document that governs no identified layer is
not an architecture document. This prevents architectural overlap and keeps every
standard attributable to exactly one owner.

## Generation Rule

Dashboard content must be generated from repository state whenever possible.

Examples of fields that should be derived automatically where feasible:

- current branch
- current date
- changed file count
- changed file list
- latest sprint report
- validation status

Fields that cannot yet be derived automatically may be sourced from a committed
dashboard state file.

## Definition of Done Rule

No sprint is complete until all of the following are true:

### Engineering

1. tests pass,
2. TypeScript passes,
3. build passes.

### Operations

4. dashboard is updated,
5. dashboard is archived,
6. sprint report is archived,
7. wave status is updated.

### Architecture

8. no architecture drift is introduced,
9. open decisions are recorded.

Dashboard update is therefore a mandatory part of Definition of Done.

## Required Sprint Sequence

Every sprint ends in this order:

1. code
2. tests
3. typecheck
4. build
5. sprint report
6. dashboard update
7. dashboard archive
8. sprint archive
9. architecture review
10. next sprint

## Dashboard Update Mechanism

The repository should provide a repeatable update mechanism for dashboard
artifacts.

Current dashboard generation is performed by:

- `scripts/update-dashboard.mjs`

Current sprint completion automation is performed by:

- `scripts/sprint-complete.mjs`

The source of manually maintained operational values is:

- `docs/dashboard/dashboard.state.json`
- `docs/dashboard/dashboard.schema.json`

## Dashboard History

Dashboard updates must archive:

- `CURRENT_STATUS.md`

under:

- `docs/dashboard/history/`

Dashboard history is append-only and must not overwrite prior snapshots.

## Operational Objective

A project participant should be able to understand project state in under one
minute by reading:

- `docs/dashboard/CURRENT_STATUS.md`

and expand into deeper operational detail by reading the other dashboard files.

## Relationship to Later Waves

Wave 0 supports:

- Wave 21 recognition quality benchmarking
- Wave 22 semantic runtime governance
- Wave 23 deposition production execution
- all later correction, punctuation, AI, and release work

It is therefore cross-cutting engineering infrastructure, not a feature wave.

## Freeze Policy

Wave 0 is the engineering operating system of DEPO-PRO.

Once Wave 0 governance is complete, it is frozen.

No new Wave 0 features may be added unless a later architectural decision
demonstrates that the project itself requires a governance change.

## Freeze Record

Wave 0 Engineering Operations was **frozen at sprint W0.2C on 2026-07-13** and is
marked `Verified`. From this point, Wave 0 governs how later waves are executed
and is not itself extended. The canonical status vocabulary
(`W0_STATUS_VOCABULARY.md`, v1.0.0) is frozen alongside it.
