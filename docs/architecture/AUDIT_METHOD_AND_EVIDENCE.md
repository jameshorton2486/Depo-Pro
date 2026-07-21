# Audit Method and Evidence

**Repository state audited**

- Commit: `9afb41c1f6dc40c240f22a04e624b30277d21f71`
- Branch: `feature/stage3-workspace-core`
- Audit date: 2026-07-20
- Scope: `src/` and `supabase/functions/`; generated/fixture files were not treated as production call sites.

## Reproducible commands

```powershell
# Pin the repository state
git rev-parse HEAD
git branch --show-current

# Find production references to candidate subsystems
rg -n 'structureEngine|formattingEngine|correctionEngines|correctionValidator' src supabase/functions --glob '*.ts' --glob '*.tsx'

# Verify active entity and Q/A ownership
rg -n 'entityRegistry|qaStructureUtils' src supabase/functions --glob '*.ts' --glob '*.tsx'

# Quantify high-change modules
(Get-Content src\lib\transcript\transcriptParagraphs.ts | Measure-Object -Line).Lines
(Get-Content src\lib\transcript\speakerResolutionEngine.ts | Measure-Object -Line).Lines
(Get-Content supabase\functions\transcribe-callback\index.ts | Measure-Object -Line).Lines
```

## Import-island result

```text
structureEngine.ts ─────────────── structureEngine.test.ts

correctionEngines.ts ─┐
                      ├────────── correctionValidator.ts ── formattingEngine.ts
                      └────────── correctionEngines.test.ts    │
correctionValidator.test.ts ───────────────────────────────────┤
formattingEngine.test.ts ──────────────────────────────────────┘
```

No inbound production import or call was found for these four modules at the pinned commit. `formattingEngine.ts` imports only the `ValidationBlock` type from `correctionValidator.ts`; this is an internal island dependency, not production wiring.

## Counter-evidence checked

- `entityRegistry.ts` is imported by `correctionOrchestrator.ts` and `aiSuggestionEngine.ts`; it is not imported by `speakerResolutionEngine.ts`.
- `qaStructureUtils.ts` is imported by `transcriptParagraphs.ts`, so it is an active repair stage.
- The callback imports the active raw/canonical integrity, merge, boundary, and pre-workspace modules directly.

Re-run these commands whenever the commit changes before relying on a single-owner conclusion.