# DEPO-PRO W22-2B

# Transcript Intelligence Consolidation

## Pipeline Wiring

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

Route transcript intelligence through the canonical owner chain instead of render-time inference.

Required path:

Canonical Transcript
-> `speakerResolutionEngine.ts`
-> `structureEngine.ts`
-> `preWorkspaceStructure.ts`
-> `workspaceService.ts`
-> `buildEditorContent.ts`
-> Workspace

Scope:

1. Wire `workspaceService.ts` and `DocumentContext.tsx` to consume resolved speaker labels, roles, and persisted `line_type`.
2. Update `buildEditorContent.ts` and transcript-editor consumers to use structured data as the primary source.
3. Keep legacy inference only as fallback for older rows lacking `line_type` or equivalent structured state.
4. Do not infer transcript structure during normal rendering when structured data is present.

Non-goals:

- no Stage S simplification
- no formatting redesign
- no punctuation or lexical correction work

Validation:

- targeted tests for changed files
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run build`

Stop after:

- canonical speaker/structure data reaches workspace as first-class input
- legacy inference remains fallback-only

