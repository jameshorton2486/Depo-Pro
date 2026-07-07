DEPO-PRO — STEP 0 RESUME: land INCLUSION-PAGES (core), stop-file `ExportScreen.tsx`
Branch: `feature/stage3-workspace-core`
Freeze: `BETA_FREEZE`
Stack: Vite + React + TypeScript + Supabase Edge Functions (Deno) + PostgreSQL
PowerShell: use `;` not `&&`

PRECONDITION — ENVIRONMENT
- Confirm Vite dev server and any `npm run` processes are stopped.
- Use a fresh PowerShell at repo root, not VS Code's integrated terminal.
- Close VS Code or disable its git integration for this repo.
- Run:
  - `Remove-Item .git\index.lock -ErrorAction SilentlyContinue`
  - `git status`
- If `git status` errors or shows an index lock problem, STOP.

BACKUP
- `stash@{0}` = `step0-backup-20260707-121646`
- Do not touch or drop it.

ALREADY COMMITTED — KEEP
- `820da37` `fix: prevent forced-login redirect loop on editor mount (HTTP 431)`
- `515fd1b` `fix: working-text overflow guard on save path`
- `85c7c13` `fix: keep deepgram auto-seed tracking in memory only`

STEP 1 — RESET THE INDEX ONLY
- `git reset`
- Confirm:
  - nothing staged
  - working tree still dirty as expected

STEP 2 — STAGE INCLUSION-PAGES CORE ONLY
Stage these directly:
- `git add src/lib/transcript/inclusionPages.ts`

Stage inclusion-page hunks only from:
- `src/api/workspaceService.ts`
- `src/context/DocumentContext.tsx`
- `src/context/DocumentContext.test.ts`
- `src/lib/transcriptDownloads.ts`
- `src/lib/transcriptDownloads.test.ts`

Rules:
- Do NOT stage `src/components/ExportScreen/ExportScreen.tsx`
- Do NOT stage `src/components/ExportScreen/ExportScreen.test.tsx`
- Do NOT stage `src/components/TranscriptEditor/TranscriptEditor.tsx` yet
- Do NOT stage any export-activation, tab-stop, or virtualization hunks

After staging:
- run `git diff --cached --stat`
- run `git diff --cached`
- verify only inclusion-page core/data-plumbing hunks are staged

If any non-inclusion hunk appears, unstage it and re-check before proceeding.

STEP 3 — TRY `TranscriptEditor.tsx` FRONT-MATTER RENDER LAST
Attempt `git add -p` for only:
- the `buildInclusionPagesText(...)` memo
- the front-matter render block

If it separates cleanly from tab-stop / virtualization code:
- include it in the commit

If it does NOT separate cleanly:
- do NOT force it
- leave `src/components/TranscriptEditor/TranscriptEditor.tsx` entirely unstaged
- record that the workspace front-matter render remained in the working tree

STEP 4 — COMMIT + GATE
- `git commit -m "feat(w22-2): inclusion-page front matter formatter and core wiring"`
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run build`

If either fails:
- STOP
- report the missing symbol or file
- do not pull shelved code in just to satisfy the compile

STEP 5 — REPORT ONLY (NO SHELVE YET)
Report:
- exactly what landed in the inclusion-pages commit
- exactly what stayed in the working tree:
  - `ExportScreen.tsx` whole
  - `ExportScreen.test.tsx` whole
  - `TranscriptEditor.tsx` whole or partial, depending on split result

Then STOP before the later shelve step.

OPERATING RULE
The win condition is not a perfect split.
The win condition is:
- inclusion-pages formatter and data plumbing committed and building
- export and editor presentation of it left in the working tree if they are scope-entangled
- no mixed commit
