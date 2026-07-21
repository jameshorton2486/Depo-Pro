# Sprint W0.2C — Wave 0 Freeze

**Wave:** Wave 0 — Engineering Operations
**Owner:** Engineering Operations
**Date:** 2026-07-13
**Status:** COMPLETE
**Review status:** PENDING

## Objective

Accept the final canonical status vocabulary, add dashboard versioning, and
**freeze Wave 0 permanently**. Wave 0 becomes `Verified` and, from this point,
only governs how later waves are executed.

## What changed

### 1. Verified redefined for integrations (Change #1)

`Verified` now has two validation modes
(`docs/architecture/W0_STATUS_VOCABULARY.md`):

- **Pipeline / product** — validated against an authoritative external reference
  (certified transcript, benchmark, independent review, production, audit).
- **Integrations / systems** — the integration is verified working against
  DEPO-PRO's requirements in the actual environment (exercised, not merely
  configured). "Verified" does not mean the vendor was audited.

Reclassified accordingly:

- **GitHub → 🟣 Verified** — connected; branches, pushes, pulls exercised.
- **Supabase → 🟣 Verified** — auth, storage, RLS, edge functions exercised,
  with in-repo audits (`AUTH_RLS_AUDIT.md`).
- **Vercel → ⚪ Unknown** — unchanged; awaits the W0.2A dashboard-side audit.

### 2. Vocabulary frozen forever (Change #2)

`W0_STATUS_VOCABULARY.md` (v1.0.0) now carries an explicit freeze clause: no new
status words may be introduced; nuance is added via metadata, not vocabulary.

### 3. Dashboard versioning (Change #3)

`dashboard.state.json` records `dashboardVersion` (1.0.0) and
`statusVocabularyVersion` (1.0.0); `PROJECT_HEALTH.md` shows a version footer.

### 4. New dashboard — CURRENT_FIXTURE.md

Surfaces the transcript fixture currently driving development (001 Etminan).

### 5. New governance rule — Architecture Document Layer Rule

Every new architecture document must identify the layer it governs. Added to
`W0_ENGINEERING_OPERATIONS_STANDARD.md` alongside the Prompt–Architecture
Ownership Rule.

### 6. Wave 0 frozen

Wave 0 is marked `Verified` and frozen (Freeze Record in the W0 standard). The
required dashboard set now includes `PIPELINE_STATUS.md` and `CURRENT_FIXTURE.md`.

## Deferred / recorded (not done here)

- **Wave renumbering** (insert Wave 24 Reporter Productivity, shifting
  Deterministic/Punctuation/AI to 25/26/27) — recorded as a High-impact **open
  decision**. Not applied: it conflicts with the just-frozen compiler library
  (W24 Deterministic, W25 Punctuation, W26 AI Context). Needs an explicit
  decision before any renumbering.
- **TypeScript producer header comments** (Owner/Purpose/Inputs/Outputs/
  Consumers in the code) — deferred to a Wave 2x sprint, per review ("eventually").

## Validation

Run via `npm run sprint:complete` (tests, typecheck, build, dashboard update,
report archive, Definition of Done verification).

## Exit criteria

- [x] Canonical status vocabulary frozen (v1.0.0).
- [x] Dashboard and vocabulary versions recorded in state.
- [x] CURRENT_FIXTURE dashboard exists.
- [x] Wave 0 marked Verified and frozen.
- [x] SPRINT_W0.2C_REPORT.md archived.

## After this sprint

Wave 0 is not extended again. Focus returns to the product waves:
Wave 21 (Recognition) · Wave 22 (Semantics) · Wave 23 (Production) · and the
correction/punctuation/AI refinement waves.
