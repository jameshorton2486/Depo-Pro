# FEATURE FREEZE — BETA PERIOD

**Effective:** February 22, 2026  
**Duration:** Until beta feedback is collected (minimum 2 weeks)

## Rules
1. NO new features may be added
2. Bug fixes ONLY
3. Security patches ONLY
4. All changes require review before merge

## What Counts As A Bug Fix
- Crashes or error states
- Data not saving correctly
- UI elements not rendering
- Export formatting defects
- Authentication/authorization failures

## What Does Not Count As A Bug Fix
- "It would be nice if..." requests
- New export formats
- New dashboard widgets
- UI redesign work
- Non-critical performance tuning

## Bug Fix Process
1. Reproduce issue
2. Create a focused fix (minimal changes)
3. Test the fix
4. Push to `main`
5. Verify on production

---

## Completed During Feature Freeze (Infrastructure Hardening — Exempt)

These items are classified as hardening/stability, not new features:

| Date | Commit | Description |
|---|---|---|
| 2026-02-24 | `8f3af9c` | Phase 8: error capture, fetchWithRetry, ErrorBoundary, ConnectionStatus |
| 2026-02-24 | (Phase 9) | Phase 9: dead code removal, architecture comments, beta gate docs |

Exemption criteria: no new user-visible functionality, no DB schema changes,
improves observability and resilience only.
