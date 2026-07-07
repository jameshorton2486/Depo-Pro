# DEPO-PRO — Wave 22 Runbook
Date: 2026-07-07
Branch: `feature/stage3-workspace-core`

## Purpose
This runbook defines the executable order for Wave 22.

It separates:
- what can run now
- what is gated on earlier results
- what must pause for operator feedback
- what is strictly post-beta and must not be run inline

## Real Stack
- Vite + React + TypeScript
- Supabase Edge Functions (Deno) + PostgreSQL
- No Next.js
- No Prisma
- No Vercel API routes

## Run Now

### Step 0A — Full Worktree Triage
Run the Step 0 Task 1b/1c prompt now.

This step is read-only and safe to execute immediately.

It must:
- classify all remaining modified tracked files
- classify all untracked files
- group changes into named scopes
- propose `LAND` vs `SHELVE`
- stop for approval

Do not run any staging, commit, stash, branch, or code-edit prompt before this returns.

## Gated Execution Order

### Step 0B — Approve LAND / SHELVE
After Step 0A returns:
- review the full-tree classification
- approve which scopes land now
- approve which scopes shelve to `wip/pre-w22-features`

This decision cannot be made honestly before Step 0A finishes.

### Step 0C — Split, Commit, and Shelve
Run the Step 0 execution prompt only after the approved LAND/SHELVE plan exists.

Gate to advance:
- `git status` clean
- expected commits present
- shelved scopes preserved

### Step 1 — W22-1 Canonical Intake Pipeline
Run only on the clean worktree.

Gate to advance:
- integrity gate catches the Etminan duplicate-opening fixture
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run test`
- `npm run build`
- completed job finalizes without duplicated opening

### Step 2 — W22-2 Metadata, Speaker, Structure, Inclusion Pages
Run only after W22-1 is green.

Gate to advance:
- Q/A structure materially restored
- speaker labels materially corrected
- inclusion pages persisted and consumed
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run test`
- `npm run build`

## Beta Checkpoint

### STOP After W22-2
Before running W22-3, put one real deposition in front of Miah.

Required review questions:
- Is the transcript materially more reviewable now?
- Are Q/A turns trustworthy enough to edit against?
- Are speaker labels usable enough to proceed?
- What is the next highest-friction issue in real review?

If Miah’s feedback changes priorities, re-scope W22-3 onward before implementation.

## Continue Only After Miah Feedback

### Step 3 — W22-3 Deterministic Correction Engine
Run only after the checkpoint above.

Hard guard:
- no case-specific proper nouns, party names, attorney names, reporter names, or company names in the global deterministic registry
- those must route through case metadata / confirmed spelling paths

### Step 4 — W22-4 Canonical Punctuation Engine
Audit first, then implement.

### Step 5 — W22-5 AI Context Engine + Validation
Audit first, then implement.

### Step 6 — W22-6 Workspace / Stage S / Export Alignment
Audit first, then implement.

## Post-Beta Only

### Recovery Prompt
The post-beta recovery prompt is not part of the inline Wave 22 execution sequence.

Do not run it during the current beta path.

Use it later, after beta, to inventory and selectively restore shelved scopes from:
- `wip/pre-w22-features`

## Operating Rule
- If the worktree is dirty, do not start the next implementation step.
- If a prompt’s assumptions diverge from the code on disk, stop and re-audit.
- If a scope cannot be separated cleanly, stop and ask rather than forcing a mixed commit.
- When LAND and SHELVE scopes share a file at the type level, separate and commit the LAND hunks first while all code is still present; shelve the remaining hunks only after the LAND set builds cleanly.
- Treat unsplittable shared files as stop points. If a file cannot be separated without contaminating the commit, leave that file with its dominant deferred scope and land only the cleanly separable core wiring.
