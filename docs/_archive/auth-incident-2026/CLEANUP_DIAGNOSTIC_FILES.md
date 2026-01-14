# Diagnostic Files Cleanup Guide

## Files to Archive or Remove

### 🔴 High Priority (Remove - Temporary Diagnostics)

These files were created during debugging and should be removed:

1. **`app/debug-env/page.tsx`**
   - Temporary debug page
   - Replaced by `app/_debug/env-check/page.tsx`
   - **Action:** Delete

2. **`scripts/diagnostics/test-supabase-auth.js`**
   - Temporary auth test script
   - Functionality covered by `tests/e2e/auth.spec.ts`
   - **Action:** Delete

3. **`scripts/diagnostics/verify-env-runtime.js`**
   - Temporary env verification
   - Functionality covered by `lib/env.ts` + `app/layout.tsx`
   - **Action:** Delete

4. **`scripts/diagnostics/verify-supabase-env.js`**
   - Temporary Supabase env check
   - Functionality covered by runtime validation
   - **Action:** Delete

5. **`components/diagnostics/supabase-diagnostic.tsx`**
   - Temporary diagnostic component
   - Uses `process` in Edge runtime (causes lint errors)
   - **Action:** Delete

### 🟡 Medium Priority (Archive - May Be Useful Later)

These files contain useful information but aren't needed for production:

6. **`DEBUG_SUPABASE_CLIENT.md`**
   - Debug documentation
   - **Action:** Move to `docs/archive/` or delete

7. **`ENV_FORMAT_FIX.md`**
   - Temporary fix documentation
   - **Action:** Archive or delete

8. **`QUICK_FIX_ENV.md`**
   - Temporary fix guide
   - **Action:** Archive or delete

9. **`RUN_VALIDATION.md`**
   - Temporary validation guide
   - **Action:** Archive or delete

10. **`PROCESS_ENV_FIX.md`**
    - Temporary fix documentation
    - **Action:** Archive or delete

11. **`PROCESS_ENV_RUNTIME_FIX.md`**
    - Temporary fix documentation
    - **Action:** Archive or delete

12. **`RUNTIME_ERROR_FIX.md`**
    - Temporary fix documentation
    - **Action:** Archive or delete

### 🟢 Low Priority (Keep - Useful for Verification)

These debug pages are useful for verification and can be kept:

- `app/_debug/env-check/page.tsx` - Useful for verifying env embedding
- `app/_debug/auth-test/page.tsx` - Useful for isolated auth testing
- `app/_debug/headers/page.tsx` - Useful for header verification
- `app/_debug/session/page.tsx` - Useful for session verification
- `app/api/debug/session/route.ts` - Useful for server session check
- `app/api/health/supabase/route.ts` - Production health check (keep)

**Note:** Consider moving `_debug` pages behind a feature flag or removing in production builds.

---

## Cleanup Script

Run this PowerShell script to remove high-priority files:

```powershell
# Remove temporary diagnostic files
Remove-Item app/debug-env/page.tsx -ErrorAction SilentlyContinue
Remove-Item scripts/diagnostics/test-supabase-auth.js -ErrorAction SilentlyContinue
Remove-Item scripts/diagnostics/verify-env-runtime.js -ErrorAction SilentlyContinue
Remove-Item scripts/diagnostics/verify-supabase-env.js -ErrorAction SilentlyContinue
Remove-Item components/diagnostics/supabase-diagnostic.tsx -ErrorAction SilentlyContinue

# Archive documentation files (optional)
New-Item -ItemType Directory -Path docs/archive -Force | Out-Null
Move-Item DEBUG_SUPABASE_CLIENT.md docs/archive/ -ErrorAction SilentlyContinue
Move-Item ENV_FORMAT_FIX.md docs/archive/ -ErrorAction SilentlyContinue
Move-Item QUICK_FIX_ENV.md docs/archive/ -ErrorAction SilentlyContinue
Move-Item RUN_VALIDATION.md docs/archive/ -ErrorAction SilentlyContinue
Move-Item PROCESS_ENV_FIX.md docs/archive/ -ErrorAction SilentlyContinue
Move-Item PROCESS_ENV_RUNTIME_FIX.md docs/archive/ -ErrorAction SilentlyContinue
Move-Item RUNTIME_ERROR_FIX.md docs/archive/ -ErrorAction SilentlyContinue

Write-Host "✅ Cleanup complete"
```

---

## After Cleanup

1. Verify app still builds: `npm run build`
2. Verify no broken imports: `npm run typecheck`
3. Verify lint passes: `npm run lint`
4. Test auth flow: Visit `/login` and verify it works
