# Future Components

This folder contains planned, non-active modules.

**Status:** ⚠️ **NOT PRODUCTION-READY**

## Important Notes

- No code in this folder is currently imported or used in production
- These are architectural placeholders for future features
- Do not import from this folder without explicit approval
- These modules may drift out of sync with the current architecture

## Contents

- `admin/feature-flags-manager.tsx` - Feature flags management UI (planned)
- `admin/permission-audit-table.tsx` - Permission auditing UI (planned)

## When to Move to Production

Before moving any component from `_future/` to production:

1. Review current architecture for compatibility
2. Update imports and dependencies
3. Add proper tests
4. Update documentation
5. Remove from `_future/` and place in appropriate production location
