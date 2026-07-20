# Dead Code / Unwired Implementation Report

**Method:** production import and call-site search on 2026-07-20. “Unwired” is stronger evidence than naming alone; it is not a deletion authorization.

| Module or plan | Evidence | Classification | Safe action now |
|---|---|---|---|
| `structureEngine.ts` | Search found tests but no production import/call | Unused production subsystem | Preserve; decide integration versus retirement after parity audit |
| `formattingEngine.ts` | Search found tests but no production import/call | Unused production subsystem | Preserve; do not add a second geometry path |
| `correctionEngines.ts` | Search found tests but no production import/call | Unused production subsystem | Preserve pending correction-ownership decision |
| `correctionValidator.ts` | Search found tests and `formattingEngine.ts` type dependency, but no production call | Unused production subsystem | Preserve; do not claim validation gate exists |
| planned `speakerResolution.ts` | No file; active equivalent is `speakerResolutionEngine.ts` | Obsolete plan | Do not recreate |
| planned `preWorkspaceOrchestrator.ts` | No file; active equivalent is `preWorkspaceStructure.ts` | Obsolete plan | Do not recreate |
| historical `workspacePresentation.ts` / `qaFixer.ts` | Not present; current alternatives are active engine utilities | Obsolete plan references | Remove from future roadmap language only |

No repository evidence supports deleting any of the unused modules during this audit. They may encode tested behavior that needs deliberate migration or an explicit retirement decision.
