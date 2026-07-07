DEPO-PRO — STEP 0 (continued): full worktree triage + commit plan
Branch: `feature/stage3-workspace-core`
Mode: READ-ONLY

Confirmed:
- The Scope A / Scope B classification of the three shared files is correct.
- Do NOT execute Task 2 yet.

TASK 1b — CLASSIFY THE REMAINING TREE
- Inspect every remaining modified tracked file and every untracked file.
- Group changes by SCOPE, not by file.
- Expected scopes already identified:
  - `SAVE-PATH-HARDENING`
  - `INCLUSION-PAGES (W22-2)`
  - `EXPORT-ACTIVATION`
  - `TAB-STOPS`
  - `VIRTUALIZATION`
- Add any additional scopes you find.
- For each file or hunk, report:
  - file path
  - hunk location if needed
  - scope
  - one-line description
- Flag any file that contains multiple scopes and will require `git add -p`.
- Flag any untracked file that is:
  - real source/docs/tests to preserve
  - artifact/temp/stray file to remove or ignore later
- Compare against recent session work where relevant:
  - remount-loop fix
  - working-text overflow guard
  - inclusion pages
  - export activation
  - tab stops
  - virtualization

TASK 1c — PROPOSE THE PLAN
For each scope, propose one of:
- `LAND`
- `SHELVE` to branch `wip/pre-w22-features`

For each scope include:
- recommended action
- why
- whether it builds/tests in isolation
- exact proposed commit message if `LAND`

Current policy guidance:
- likely `LAND`:
  - `SAVE-PATH-HARDENING`
  - `INCLUSION-PAGES (W22-2)`
- likely `SHELVE`:
  - `EXPORT-ACTIVATION`
  - `TAB-STOPS`
  - `VIRTUALIZATION`
Unless inspection shows one of those is already entangled with a beta-critical fix.

CONSTRAINTS
- Read-only only.
- No code changes.
- No staging.
- No commit.
- No branch creation.
- No stash operations.
- Nothing may be discarded.
- STOP after presenting the full classification and the proposed `LAND` / `SHELVE` plan.
