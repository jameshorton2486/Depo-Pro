# Wave 0 Canonical Status Vocabulary

**Governs:** Wave 0 (Engineering Operations)
**Version:** 1.0.0 — **FROZEN**

## Purpose

This document defines the **single status vocabulary** for DEPO-PRO. Every
dashboard, report, wave, sprint, benchmark, deployment, and system uses these
states and only these states.

This vocabulary is a Wave 0 governance artifact. Once frozen, it does not change
unless a later architectural decision demonstrates the project itself requires a
governance change.

## The six states

| Status | Meaning | Color |
|--------|---------|-------|
| ⚪ **Unknown** | Not yet audited, or not enough information to assign a state | Gray |
| 🔵 **Planned** | Designed and approved; work not started | Blue |
| 🟡 **Active** | Currently being implemented or audited | Yellow |
| 🟢 **Operational** | Working correctly and in use | Green |
| 🟣 **Verified** | Operational **and** independently validated against an external authority | Purple |
| 🔴 **Blocked** | Cannot proceed until an external dependency or issue is resolved | Red |

## Definition of "Verified" (strict)

`Verified` is a meaningful, earned state. A component is `Verified` only if **all
three** hold:

1. It is **Operational**.
2. It has passed **all engineering gates** (tests, typecheck, build, dashboard).
3. It has been **independently validated** — and validation takes one of two
   forms depending on what the component is:

**Pipeline / product components** — validated against an authoritative external
reference:

- a certified transcript (e.g. the *Etminan* certified transcript)
- an independent human review (e.g. a Miah review)
- the benchmark corpus (beating a defined baseline)
- a production deployment verified in production
- an external audit

**Integrations / systems** — the integration is **verified working against
DEPO-PRO's requirements in the actual environment.** `Verified` here does *not*
mean the vendor was audited; it means the integration has been exercised and
confirmed. Examples:

- GitHub: repository connected; branches, pushes, and pulls all exercised and
  working — `Verified`.
- Supabase: connected; auth, storage, RLS, and edge functions exercised, with
  in-repo audits (`AUTH_RLS_AUDIT.md`) — `Verified`.
- Vercel: not yet audited in-environment — `Unknown` until the W0.2A
  dashboard-side audit confirms deployment behavior.

`Operational` ≠ `Verified`. "Working" and "proven" are different milestones.
`Operational` means it works; `Verified` means it has been *confirmed* to work
against DEPO-PRO's requirements or an external authority. Wave 22, for example,
is `Operational` on implementation and only becomes `Verified` after the Etminan
transcript and independent review.

## Allowed transitions

The lifecycle is linear:

```
Unknown → Planned → Active → Operational → Verified
```

`Blocked` is the only exception: a component may enter `Blocked` from **any**
state, and returns to the state it can next make progress in once the blocker
clears. No other backward transitions are implied by this document; a regression
is recorded as an explicit architectural decision.

This makes the status system deterministic: given evidence, exactly one state
applies.

## Scope of application

One vocabulary, everywhere:

- Waves (`WAVE_STATUS.md`)
- Sprints (`CURRENT_SPRINT.md`)
- Project health (`PROJECT_HEALTH.md`)
- Architecture health (`ARCHITECTURE_HEALTH.md`)
- Benchmarks (`BENCHMARK_STATUS.md`)
- Semantic scorecard (`SEMANTIC_SCORECARD.md`)
- Deployment health (`PROJECT_HEALTH.md` → Deployment Health)
- Pipeline (`PIPELINE_STATUS.md`)
- Systems and documentation

### Not covered by this vocabulary

Engineering **gates** are a pass/fail axis, not a lifecycle: `build`, `tests`,
and `typecheck` use `PASS` / `FAIL`, not these six states. Freshness fields
(`Current` / `Stale`) are likewise a separate axis.

## Single source of truth

The badge rendering (emoji per state) is implemented once in
`scripts/update-dashboard.mjs` (`STATUS_BADGE`). State files store the bare
canonical word (e.g. `"Operational"`); the generator decorates it. Do not
hand-write emoji into `dashboard.state.json`.

## Freeze

**This vocabulary is frozen.** New status values may not be introduced. If
additional nuance is required, add metadata (a `basis` note, a completion
percentage, a linked report) — **do not create new status words.**

The failure mode this prevents: someone later invents `Stable`, `Complete`,
`Ready`, `Integrated`, `Validated`, or `Healthy`, and the dashboard slowly dies
as every surface drifts to its own dialect. There is one vocabulary, and it does
not grow. Changing it requires an explicit Wave 0 governance decision that
supersedes this document by version.
