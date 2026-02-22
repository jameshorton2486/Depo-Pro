# FEATURE FREEZE — BETA PERIOD

**Effective:** February 22, 2026  
**Duration:** Until beta feedback is collected (minimum 2 weeks)

## Rules
1. No new features
2. Bug fixes only
3. Security patches only
4. All changes require review before merge

## What Counts As A Bug Fix
- Crashes or error states
- Data not saving correctly
- UI elements not rendering
- Export formatting defects
- Authentication/authorization failures

## What Does Not Count As A Bug Fix
- New feature requests
- New export formats
- New dashboard widgets
- UI redesign work
- Non-critical performance tuning

## Bug Fix Process
1. Reproduce issue
2. Implement minimal focused fix
3. Run verification (`tsc`, tests, build as applicable)
4. Merge to `main`
5. Verify on production
