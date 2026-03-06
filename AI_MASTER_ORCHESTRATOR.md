# AI MASTER ORCHESTRATOR — Depo-Pro
# Version: 1.0
# Status: ACTIVE

## Purpose

This document tells Claude Code how to behave as an autonomous agent
on the Depo-Pro codebase. Read it at the start of every session.

## Session Protocol

Every Claude Code session on this project follows this exact sequence:

  1. Read AI_AUTONOMOUS_RULES.md
  2. Read MASTER_CONTROL.md
  3. Read AI_MASTER_ORCHESTRATOR.md (this file)
  4. Read BETA_FREEZE.md
  5. Run bash scripts/repo-audit.sh
  6. Output confirmation:
     "Bootstrap complete. Constraints loaded. Beta freeze active.
      Ready for task."
  7. Read the task prompt provided by James
  8. Execute the task within the defined scope
  9. Append session log to ai_logs/change_log.md
  10. Output the task's final status block

## Decision-Making Rules

James has explicitly instructed: make decisions independently.
Do NOT present multiple options and ask James to choose.
Pick the safest, most production-conservative approach and execute it.

Exception: if a decision involves deleting production data,
dropping database tables, or changing RLS policies in a way that
could lock users out — STOP and ask James before proceeding.

## Commit Discipline

- One commit per numbered task or pass
- Commit message format: "type: description (scope)"
  Examples:
    "fix: enforce firm_id filter on export routes (app/exports/*)"
    "feat: add ExportButton component to review page"
    "test: add flagged word correction tests"
    "chore: delete old-prisma-backup dead code (~2,000 lines)"
    "docs: add beta readiness gate report"
- Run npm run build before every push
- Run npx tsc --noEmit after every file change

## Change Log Protocol

At the end of every session, append to ai_logs/change_log.md:

  ### Task [N] — [Task Name]
  Date: [DATE]
  Tool: Claude Code

  Files created: [list]
  Files modified: [list]
  Files deleted: [list]
  Files NOT touched: [list frozen files confirmed untouched]
  Commits: [list commit hashes]
  Final build: [PASS | FAIL]
  Beta freeze still active: YES

## Runaway Prevention

Claude Code must NOT:
  - Execute work it decides would be "helpful" beyond the task scope
  - Modify files not listed in the task's PERMITTED CHANGES section
  - Combine multiple tasks into one session without explicit instruction
  - Create new branches (work on main unless James says otherwise)
  - Install packages not already in package.json

If Claude Code finds a bug outside the task scope:
  Document it in the session log as a deferred item.
  Do NOT fix it in the current session.

## Windows Path Note

James works on Windows 11. File downloads go to:
  C:/Users/james/Downloads/

When James references a file path, interpret it as a Windows path.
When Claude Code runs shell commands, use forward slashes or PowerShell
syntax as appropriate for the environment.
