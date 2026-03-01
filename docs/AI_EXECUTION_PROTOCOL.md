# AI Execution Protocol

> **Last Updated:** 2026-03-01
> **Purpose:** Governance rules for running Claude Code, Codex, and Aider on the Depo-Pro codebase
> **Required reading before running ANY AI agent on this project**

---

## 🚫 Rule Zero

**Never run more than one AI agent on the same file simultaneously.**

If Claude Code is working on `app/api/jobs/[id]/route.ts`, Codex and Aider must not touch that file until Claude Code's changes are committed.

---

## Tool Assignment

| Tool | Best For | Phase Assignments |
|------|----------|------------------|
| **Claude Code** | Multi-file architectural changes, pattern migration across many files, new implementations | SEC-01, SEC-03, EXP-01, UI-01, FTR-01, SEC-06 |
| **Codex** | Precise single-file rewrites, function replacement, small additions, file deletion | CRASH-01, CRASH-02, STB-02, STB-03, ONB-01, ONB-02, CLN-01, CLN-05, CLN-06 |
| **Aider** | Repetitive file-by-file edits, adding the same pattern across many files | STB-01, SEC-02, UI-02, UI-03, CLN-02, CLN-03, STB-04–11, TST-01 fixes |
| **Manual** | Dashboard verification, end-to-end testing, performance checks | SEC-04, SEC-05, EXP-02, EXP-03, ONB-03, TST-01–03, SEC-07, DEP-01, DEP-02 |

---

## Execution Sequence

Run in this exact order. Do not skip phases. Do not parallelize across phases.

```
Phase 1 (Crash Prevention)
│  Codex: CRASH-01, CRASH-02, STB-02, STB-03
│  Aider: STB-01
│  → Validate → Commit
│
Phase 2 (Security)
│  Aider: SEC-02
│  Manual: SEC-05
│  Claude Code: SEC-01
│  Claude Code: SEC-03
│  Manual: SEC-04
│  → Validate → Commit
│
Phase 3 (Exports)
│  Manual: EXP-02, EXP-03 (test first — may already work)
│  Claude Code: EXP-01 (only if PDF needs fixing)
│  → Validate → Commit
│
Phase 4 (Review UX)
│  Claude Code: UI-01
│  Aider: UI-02, UI-03
│  → Validate → Commit
│
Phase 5 (Onboarding)
│  Codex: ONB-01, ONB-02
│  → Validate → Commit
│  Manual: ONB-03 (end-to-end test)
│
Phase 6 (Testing)
│  Manual: TST-01 (run tests)
│  Aider: Fix failures from TST-01
│  Manual: TST-02, TST-03
│  → Validate → Commit
│  → RUN BETA LAUNCH CRITERIA
│
────── BETA LAUNCH ──────
│
Phase 7 (Cleanup — during beta)
│  Codex: CLN-01
│  Aider: CLN-02, CLN-03, STB-04–11
│  → Validate → Commit
│
Phase 8 (Hardening — during beta)
│  Claude Code: SEC-06
│  Manual: SEC-07, DEP-01, DEP-02
│  Codex: CLN-05, CLN-06
│  → Validate → Commit
```

---

## Branching Strategy

```
main (production — deployed to Vercel)
  └── beta-stabilization (working branch)
        ├── phase-1-crash-fixes
        ├── phase-2-security
        ├── phase-3-exports
        ├── phase-4-review-ux
        ├── phase-5-onboarding
        └── phase-6-testing
```

**Workflow:**
1. Create `beta-stabilization` branch from `main`
2. For each phase, create a sub-branch (optional — direct commits to `beta-stabilization` also acceptable for single-tool phases)
3. After each phase passes validation → merge to `beta-stabilization`
4. After Phase 6 passes Beta Launch Criteria → merge `beta-stabilization` to `main`
5. Phases 7–8 work directly on `main` during beta

---

## Commit Discipline

### Commit after each tool batch completes:

```bash
# After Codex completes Phase 1 tasks:
npm run typecheck && npm run build && git add -A && git commit -m "phase-1: codex batch — fix crash stubs"

# After Aider completes Phase 1 tasks:
npm run typecheck && npm run build && git add -A && git commit -m "phase-1: aider batch — fix bullmq stubs"
```

### Commit message format:

```
phase-{N}: {tool} batch — {description}

Examples:
phase-1: codex batch — fix production-throwing stubs
phase-2: claude-code batch — migrate 20 routes to withRouteProtection
phase-2: aider batch — add auth to stub routes
phase-4: claude-code — add keyboard navigation to flagged words
```

---

## Validation Protocol

### After EVERY tool batch (before committing):

```bash
npm run typecheck     # Must pass — zero errors
npm run build         # Must pass — zero errors
npm run lint          # No new warnings
```

### After EVERY phase (before starting next phase):

Run the Phase Completion Criteria in [Remaining Tasks](./REMAINING_TASKS_ANALYSIS.md).
Each phase has a specific checklist. All items must be checked.

### After Phase 6 (before beta launch):

Run the full [Beta Launch Criteria](./BETA_LAUNCH_CRITERIA.md).
Every item must pass.

---

## Rollback Strategy

### If a tool batch breaks the build:

```bash
# Option 1: Undo the entire batch
git stash    # or git reset --hard HEAD

# Option 2: Selectively revert
git diff --stat HEAD  # See what changed
git checkout HEAD -- path/to/broken/file.ts  # Revert specific files
```

### If a merged phase causes production issues:

```bash
# Revert the merge commit
git revert -m 1 {merge-commit-hash}
git push
# Vercel will auto-deploy the revert
```

### If the situation is unclear:

1. Stop all AI agents immediately
2. Run `npm run build` to identify the break
3. Check git log to find which commit introduced the issue
4. Revert that specific commit
5. Resume from the last known-good state

---

## AI Agent Prompt Templates

### For Codex (precise single-file rewrites):

```
Read docs/REMAINING_TASKS_ANALYSIS.md task {TASK-ID}.

Rules:
- Only modify the file listed in the task
- Keep all function signatures unchanged
- Keep all existing imports
- Do NOT introduce new dependencies
- Do NOT add TODO comments
- Run: npm run typecheck && npm run build after changes

Execute the Action section exactly as specified.
```

### For Aider (repetitive file-by-file edits):

```
Read docs/REMAINING_TASKS_ANALYSIS.md task {TASK-ID}.
Read docs/ARCHITECTURE_OVERVIEW.md section "Frozen Layer" and "Refactor Constraints".

Rules:
- Only modify files listed in the task
- Apply the same pattern to each file
- Do NOT restructure, rename, or refactor beyond the task scope
- Verify npm run build passes after all changes

Execute the Action section for each file listed.
```

### For Claude Code (multi-file architectural changes):

```
Read these files first:
- docs/ARCHITECTURE_OVERVIEW.md (especially Frozen Layer and Refactor Constraints)
- docs/REMAINING_TASKS_ANALYSIS.md task {TASK-ID}

Context:
- This is a Next.js 15 App Router project
- Auth standard: lib/middleware/withRouteProtection.ts
- Template for route migration: app/api/jobs/[id]/lock/route.ts
- Database: Supabase (not Prisma) — do NOT generate migrations

Rules:
- Only modify files listed in the task
- Do NOT touch files in the Frozen Layer
- Do NOT expand scope beyond the task description
- Do NOT introduce new npm dependencies unless the task explicitly names them
- All changes must pass: npm run typecheck && npm run build

Execute the Action section. Stop when the Validation section criteria are met.
```

---

## Conflict Prevention

| Scenario | Prevention |
|----------|-----------|
| Two tools editing same file | Never allowed — assign each file to one tool only |
| Tool refactors frozen file | Include Frozen Layer in every prompt |
| Tool adds Phase 2 features | Include Scope Lock in every prompt |
| Tool renames API routes | Include "Do NOT rename API routes" in every prompt |
| Tool introduces new dependency | Only allowed if task explicitly names the package |
| Tool creates new migration | Never allowed during pre-beta stabilization |

---

## Emergency Stop Conditions

Stop all AI agents immediately if:

1. `npm run build` fails after a tool batch
2. A tool modifies a file in the Frozen Layer
3. A tool introduces database schema changes
4. A tool creates files outside the task's scope
5. Production (app.depo-pro.com) shows errors after a deploy
6. Two agents have uncommitted changes in the same directory

**After emergency stop:** Run rollback protocol above, then resume from last commit.

---

## Daily Execution Rhythm

```
Morning:
  1. Pull latest from beta-stabilization
  2. Run npm run build (confirm clean state)
  3. Identify today's phase and tasks
  4. Run first tool batch

Mid-day:
  5. Validate + commit first batch
  6. Run second tool batch (if applicable)
  7. Validate + commit second batch

End of day:
  8. Run npm run build + npm run typecheck (final check)
  9. Push all commits
  10. Update task checkboxes in REMAINING_TASKS_ANALYSIS.md
  11. Note any issues for tomorrow
```
