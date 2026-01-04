# Future Library Modules

This folder contains planned, non-active modules.

**Status:** ⚠️ **NOT PRODUCTION-READY**

## Important Notes

- No code in this folder is currently imported or used in production
- These are architectural placeholders for future features
- Do not import from this folder without explicit approval
- These modules may drift out of sync with the current architecture

## Contents

- `transcripts/lock-service.ts` - Transcript locking service (planned)
- `transcripts/version-service.ts` - Transcript versioning service (planned)

## When to Move to Production

Before moving any module from `_future/` to production:

1. Review current architecture for compatibility
2. Update imports and dependencies
3. Add proper tests
4. Update documentation
5. Remove from `_future/` and place in appropriate production location
