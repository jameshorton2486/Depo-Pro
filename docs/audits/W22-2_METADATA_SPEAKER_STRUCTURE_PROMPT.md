DEPO-PRO — W22-2: METADATA, SPEAKER RESOLUTION, STRUCTURAL RECONSTRUCTION, AND INCLUSION PAGES
Mode: IMPLEMENTATION. Audit first, then implement only the approved scope.

ROLE
Senior full-stack engineer, system architect, and reliability engineer for
Depo-Pro, a production legal-transcription platform.

ENVIRONMENT
- Frontend: Vite + React 18 + TypeScript + TailwindCSS + TipTap.
- Backend: Supabase Edge Functions (Deno) + PostgreSQL.
- There is NO Next.js, NO Prisma, and NO Vercel API-route layer.
- Branch: `feature/stage3-workspace-core`.
- `BETA_FREEZE` is active.

MANDATORY PHASE 0 — AUDIT, CHARACTERIZE, REUSE
Before coding:
1. Audit the existing structure and speaker stack:
   - `src/lib/transcript/speakerResolutionEngine.ts`
   - `src/lib/transcript/structureEngine.ts`
   - `src/lib/transcript/workspacePresentation.ts`
   - `src/lib/buildEditorContent.ts`
   - `src/lib/ufm/buildUfmMetadata.ts`
   - `src/api/workspaceService.ts`
   - `supabase/functions/transcribe-callback/index.ts`
2. Classify what already exists as render-time inference versus persisted data.
3. Produce a reuse map and explicitly identify what must move earlier.
4. If the work crosses into lexical correction or render-only formatting, STOP and report.

CANONICAL INVARIANTS
- Canonical word rows remain read-only.
- Structure and speaker outputs are rebuildable layers over the canonical words.
- Any generated structure must preserve word/utterance back-references.
- Metadata must come from deterministic case sources, not AI-authored content.

OBJECTIVE
Make the transcript legally structured and participant-aware before workspace rendering.

This prompt is beta-critical. It is the stage that turns usable words into a usable
deposition transcript skeleton.

EVIDENCE BASIS
Comparing application output to the certified Etminan transcript showed:
- 0 `Q.` lines where the certified transcript has 252
- examining attorney mislabeled as `THE REPORTER:` 134 times
- a witness answer mislabeled as `THE VIDEOGRAPHER:`
- missing caption page
- missing appearances page
- missing index of examination
- missing index of exhibits

SCOPE
1. Canonical metadata object
   - Build or reuse a deterministic canonical metadata object from the case record.
   - This object must be the single source of truth for:
     - case style
     - cause number
     - court
     - parties
     - attorneys
     - reporter
     - witness
     - videographer
     - location and proceeding metadata

2. Deterministic speaker resolution
   - Resolve raw speakers into legal roles and display identities.
   - Persist speaker role and label data into existing transcript speaker layers.
   - Preserve a reviewable verification state.
   - Use AI only if a later prompt explicitly owns ambiguity; do not silently guess here.

3. Structural reconstruction
   - Persist or derive structured utterance classifications for:
     - `Q`
     - `A`
     - colloquy
     - parenthetical
     - section headers
   - Reconstruct:
     - Q/A turns
     - by-lines
     - examination boundaries
     - objection separation
     - proceedings framing
   - Eliminate dependency on render-only structure invention where persisted structure exists.

4. Inclusion-page structured data
   - Generate structured front matter from deterministic metadata:
     - caption page
     - appearances
     - index of examination
     - index of exhibits
   - Persist the structured data in an approved existing storage location.
   - Do not fabricate missing values. Surface gaps as gaps.

5. Workspace wiring
   - Make the workspace consume persisted speaker and structure data first.
   - Reduce remaining render-time inference to compatibility fallback only.

EXPLICIT NON-GOALS
- No lexical text correction.
- No punctuation decisions.
- No AI-context ambiguity decisions.
- No final page-geometry rendering beyond consuming persisted structure.

ACCEPTANCE CRITERIA
- Examining attorney no longer appears as `THE REPORTER`.
- Witness answers no longer appear as `THE VIDEOGRAPHER`.
- Q/A turns are structurally recovered for the Etminan fixture.
- Inclusion pages exist as structured data before render/export.
- Workspace uses persisted structure when present.

CONSTRAINTS
- Additive-only.
- No schema changes or migrations without explicit approval.
- No new dependencies without explicit approval.
- Keep commit scope honest; do not mix unrelated pre-existing worktree changes.
- `npx tsc --noEmit -p tsconfig.app.json`, `npm run test`, and `npm run build` must pass.
- Do NOT push.

DELIVERABLE
- implemented W22-2 changes
- tests
- one scoped commit if the worktree allows a clean scope split
- otherwise STOP and report the worktree-scope conflict before commit
