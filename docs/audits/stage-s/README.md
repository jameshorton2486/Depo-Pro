# Stage S — Validation & Repair Burden Measurement (PR #19)

Stage S is the system's **objective quality gate**. It observes the completed
transcript production pipeline and answers one question with evidence:

> Given the compiled pipeline, how much manual repair remains to produce a
> certified transcript — and which owner is responsible for each repair?

## What it does

- **Consumes, never mutates** the upstream owner outputs: Structured Transcript
  Package → Geometry → Unified Rendering → Editorial → Export Contract. The
  richest single input, `UnifiedRenderModel`, is the primary validation surface.
- **Validates** structure and presentation (paragraph continuity, Q/A integrity,
  examination boundaries, colloquy transitions, objection & parenthetical
  placement, speaker-label continuity, section transitions, geometry tab/indent/
  margin/overflow) and **cross-checks** render parity, residual editorial
  corrections, and the export contract gate.
- **Measures** the remaining repair burden, classified `CRITICAL / MAJOR /
  MINOR / COSMETIC`, aggregated by category and by responsible owner, with
  density and percentage.
- **Applies only** deterministic, semantics-preserving, Stage-S-owned
  presentation repairs (blank-line/whitespace normalization on the TXT layer).

Source: [`src/lib/stageS/`](../../../src/lib/stageS). Public surface:
`src/lib/stageS/index.ts`.

## Generated artifacts (this folder)

| File | Purpose |
| --- | --- |
| `STAGE_S_VALIDATION_REPORT.md` | Per-fixture validation results and findings |
| `REPAIR_BURDEN_REPORT.md` | Repair burden by severity / category / owner |
| `stage-s-metrics.json` | Machine-readable metrics + **RC regression baseline** |

These files are **generated**, not hand-edited. A test
(`src/lib/stageS/artifacts.test.ts`) fails if they drift from the engine output.

## Running

```bash
npm run stage:validate          # run the Stage S suite (fixtures + regression + artifact gate)
```

Regenerate the artifacts after an intentional engine or fixture change:

```bash
STAGE_S_WRITE=1 npx vitest run src/lib/stageS/artifacts.test.ts
# PowerShell:
#   $env:STAGE_S_WRITE=1; npx vitest run src/lib/stageS/artifacts.test.ts; Remove-Item Env:STAGE_S_WRITE
```

## Ownership boundary

Stage S owns validation, quality measurement, repair-burden metrics, final
presentation validation, and deterministic Stage-S presentation repairs. It does
**not** own and must **never** modify the Compiler, Structured Transcript
Package, Geometry, Unified Rendering, Editorial, Export Contract, or Formatter
Service. Owner attribution in the reports is measurement only.
