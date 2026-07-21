# DEPO-PRO W22-2C

# Transcript Intelligence Consolidation

## Consumer Simplification

Branch: `feature/stage3-workspace-core`

Stack: Vite + React 18 + TypeScript + Supabase Edge Functions (Deno) + PostgreSQL

Mode:

- additive/minimal
- no schema changes
- no dependency changes
- owner runs git manually

Rule:

Before implementing anything, search the repository for an existing implementation of the requested capability. If one exists, extend or consolidate it rather than creating a parallel implementation. If no existing implementation exists, state that explicitly before creating a new subsystem.

Objective:

Turn workspace and export paths into pure consumers of the structured transcript package.

Scope:

1. Reduce `workspacePresentation.ts` to presentation responsibilities only.
2. Reduce `qaFixer.ts` to reusable utilities or retire its semantic ownership if fully absorbed upstream.
3. Reduce `deterministicSpeakerMap.ts` to legacy compatibility only or remove remaining ownership.
4. Ensure Workspace, Export, Copy Transcript, and Stage S consume the same structured transcript package.
5. Remove semantic reconstruction from render-time paths except for explicit legacy fallback.

Non-goals:

- no deterministic lexical correction
- no punctuation engine work
- no AI context work

Validation:

- targeted tests for changed files
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run build`

Stop after:

- single transcript-semantics path
- smaller render pipeline
- updated regression coverage
