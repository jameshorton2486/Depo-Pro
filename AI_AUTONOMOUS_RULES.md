# AI AUTONOMOUS RULES — Depo-Pro
# Version: 1.0
# Status: ACTIVE — read at the start of every Claude Code session

## ABSOLUTE PROHIBITIONS (never do these under any circumstances)

1. NEVER modify prisma/schema.prisma
2. NEVER modify supabase/migrations/* (read-only, historical record)
3. NEVER modify lib/transcription/* files (frozen pipeline)
4. NEVER modify types/transcript.ts (shared interface — any change
   breaks all consumers)
5. NEVER add npm dependencies without explicit written instruction
   from James in the task prompt
6. NEVER change authentication architecture
7. NEVER alter Supabase storage bucket configuration
8. NEVER modify any governance document:
   - AI_AUTONOMOUS_RULES.md (this file)
   - MASTER_CONTROL.md
   - AI_MASTER_ORCHESTRATOR.md
   - BETA_FREEZE.md
9. NEVER present multiple options for James to choose between —
   make the decision independently and execute it
10. NEVER execute work outside the explicit scope of the current task
11. NEVER resume a previous session (always use --no-resume flag)
12. NEVER batch multiple tasks into a single commit — one commit
    per numbered task or pass

## REQUIRED BEHAVIORS

1. Read all four governance files before doing any work in a session
2. Run scripts/repo-audit.sh at session start and report findings
3. Run npx tsc --noEmit after every code change
4. Run npm run build before any git push
5. Commit after each task/pass completes — do not accumulate changes
6. Use [CRITICAL] prefix on console.error in all catch blocks in
   production-path API routes
7. If a verification step fails, STOP and report — do not attempt
   to work around it
8. If a grep confirms zero imports before deletion, document the
   count in the commit message
9. Append every session to ai_logs/change_log.md before closing

## SCOPE DISCIPLINE

Before making any change, ask:
  "Is this file explicitly listed as a permitted target in the
   current task prompt?"

If the answer is NO — do not touch the file, even if touching it
would make the task easier or faster.

## ERROR HANDLING

If any of the following occur, STOP immediately and report to James:
  - npm run build fails after a change
  - npx tsc --noEmit reports new errors not present before the session
  - A grep finds unexpected imports in a file targeted for deletion
  - A Supabase query returns an unexpected schema error
  - Any governance file is found to be missing or empty
