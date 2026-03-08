# BETA FREEZE — Depo-Pro
# Version: 1.0
# STATUS: ACTIVE ← Claude Code checks this field at session start

## Effective Date

2026-03-06

## Duration

Active until beta feedback is collected (minimum 2 weeks after
beta invitations are sent). James will manually update STATUS
to LIFTED when the freeze ends.

## What the Freeze Means

During beta freeze, the following are the ONLY permitted changes:

  ✅ Bug fixes — crashes, data not saving, UI not rendering,
     export formatting errors, authentication failures
  ✅ Security patches — RLS gaps, auth vulnerabilities,
     tenant isolation failures
  ✅ Test additions — adding tests for existing behavior
  ✅ Documentation updates — comments, README, guides

The following are PROHIBITED until the freeze is lifted:

  ❌ New features of any kind
  ❌ New npm dependencies
  ❌ Database schema changes
  ❌ Architecture changes
  ❌ UI redesigns or visual changes (unless fixing a crash)
  ❌ Performance optimizations (unless causing user-visible failures)
  ❌ New API routes (unless fixing a broken existing route)

## What Counts as a Bug Fix

To qualify as a bug fix (permitted during freeze):
  - It must be reproducible
  - It must affect existing users or break existing functionality
  - The fix must be minimal (fewest possible files changed)
  - A "it would be nice if" improvement is NOT a bug fix

## Bug Fix Process

  1. Reproduce the issue on depo-pro.com
  2. Create a focused fix (minimal file changes)
  3. Run npx tsc --noEmit && npm run build (both must pass)
  4. Commit with message: "fix: [description of bug fixed]"
  5. Push to main — Vercel deploys automatically
  6. Verify the fix on depo-pro.com

## How Claude Code Reads This File

At session start, Claude Code reads the STATUS field above.
If STATUS is ACTIVE: enforce freeze rules for the entire session.
If STATUS is LIFTED: normal development rules apply (but still
  read AI_AUTONOMOUS_RULES.md and MASTER_CONTROL.md).

## How to Lift the Freeze

When beta feedback collection is complete, James edits this file:
  Change:  STATUS: ACTIVE
  To:      STATUS: LIFTED
  Add:     Lifted date: [DATE]
  Add:     Reason: Beta complete — Phase 2 development begins
Then commit: "docs: lift beta freeze — Phase 2 begins"
