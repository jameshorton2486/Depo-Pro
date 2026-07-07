DEPO-PRO — W22-6: WORKSPACE, STAGE S, AND EXPORT ALIGNMENT
Mode: IMPLEMENTATION. Audit first, then implement only the approved scope.

ROLE
Senior full-stack engineer, system architect, and reliability engineer for
Depo-Pro.

ENVIRONMENT
- Vite + React + TypeScript
- Supabase Edge Functions + PostgreSQL
- No Next.js / Prisma / Vercel API routes
- `BETA_FREEZE` active

MANDATORY PHASE 0
Audit every render/export consumer that still owns intelligence it should not own:
- `src/lib/buildEditorContent.ts`
- `src/lib/transcript/workspacePresentation.ts`
- `src/lib/transcriptDownloads.ts`
- workspace/editor rendering components
- export screens and helpers
- any Stage S or formatting-alignment paths

OBJECTIVE
Make workspace and export layers render already-decided transcript structure and content,
not invent or correct them at render time.

SCOPE
1. Prefer persisted `line_type`, `speaker_label`, and inclusion-page data
2. Render examination / exhibit index structures from data
3. Keep workspace, TXT, Word, PDF, and package outputs aligned
4. Retain editability and audit trail while reducing render-time inference to fallback only

EXPLICIT NON-GOALS
- no new correction logic
- no new speaker resolution logic
- no canonical mutation
- no duplication of upstream engines

ACCEPTANCE CRITERIA
- workspace and export front matter match the same persisted source
- persisted structure is preferred over ad hoc inference
- render-time transcript shape logic is reduced or retired where upstream data exists
- export outputs stay consistent across channels

CONSTRAINTS
- additive-only
- no schema changes without approval
- one scoped commit
- typecheck/test/build required
- do not push

DELIVERABLE
- implemented consumer alignment changes
- regression tests
- short note identifying any remaining render-time fallback logic that still needs retirement
