# 🗑️ Safe Deletion List (Diagnostics & Temporary Files)

**Purpose:** Clean repo without breaking auth  
**Rule:** Delete ONLY after auth is verified working  
**Last Updated:** 2025-01-XX

---

## ⚠️ IMPORTANT

**DO NOT DELETE until:**
1. ✅ Auth is verified working (see `AUTH_TESTING_PROMPT.md`)
2. ✅ All tests pass
3. ✅ Production deployment successful

---

## 📄 Temporary Documentation Files

These were created during debugging and can be archived or deleted:

### High Priority (Delete After Verification)

- `AUTH_AUDIT_FIXES_COMPLETE.md`
- `AUTH_LOCK_REPORT.md`
- `PROCESS_ENV_RUNTIME_FIX.md`
- `RUNTIME_ERROR_FIX.md`
- `ERRORS_CHECK.md`
- `FILES_WITH_ERRORS.md`
- `QUICK_FIX_ENV.md`
- `RUN_VALIDATION.md`
- `MIDDLEWARE_401_FIX.md`
- `ENV_FORMAT_FIX.md`
- `PROCESS_ENV_FIX.md`
- `PROCESS_ENV_RUNTIME_FIX.md`
- `DEBUG_SUPABASE_CLIENT.md`
- `ENV_FIX_COMPLETE.md`
- `FIX_SUMMARY.md` (if temporary)

**Action:** Archive to `/docs/_archive/` or delete after commit

---

## 🧪 Diagnostics / Debug Code

### Components

- `components/diagnostics/supabase-diagnostic.tsx` ❌ **DELETE**
  - Temporary diagnostic component
  - May cause lint errors (uses `process` in Edge runtime)

### Library Files

- `lib/supabase/dev-env-check.ts` ❌ **DELETE**
  - Temporary env check
  - Functionality covered by `lib/env.ts`

### Debug Routes

- `app/debug-env/page.tsx` ❌ **DELETE**
  - Temporary debug page
  - Replaced by `app/_debug/env-check/page.tsx`

- `app/_debug/*` ⚠️ **OPTIONAL - Keep for Verification**
  - `app/_debug/env-check/page.tsx` - Useful for env verification
  - `app/_debug/auth-test/page.tsx` - Useful for isolated auth testing
  - `app/_debug/headers/page.tsx` - Useful for header verification
  - `app/_debug/session/page.tsx` - Useful for session verification
  - `app/api/debug/session/route.ts` - Useful for server session check

  **Recommendation:** Keep for now, remove before production or gate behind feature flag

---

## 🛠️ Scripts (Optional to Keep)

These scripts were created during debugging:

- `fix-supabase-auth.ps1` ⚠️ **ARCHIVE**
- `scripts/fix-env-format.ps1` ⚠️ **ARCHIVE**
- `scripts/validate-env-format.ps1` ⚠️ **ARCHIVE**
- `scripts/diagnostics/test-supabase-auth.js` ❌ **DELETE**
- `scripts/diagnostics/verify-env-runtime.js` ❌ **DELETE**
- `scripts/diagnostics/verify-supabase-env.js` ❌ **DELETE**

**Action:** Move to `/scripts/_archive/` if retained, or delete

---

## 🚫 DO NOT DELETE

These files are **REQUIRED** for auth to work:

### Core Auth Files

- ✅ `lib/supabase/browser.ts` - Browser client
- ✅ `lib/supabase/server.ts` - Server client
- ✅ `lib/supabase/admin.ts` - Admin client
- ✅ `lib/supabase/middleware.ts` - Middleware client helper
- ✅ `lib/supabase/client.ts` - Client re-exports
- ✅ `lib/env.ts` - Runtime env validation
- ✅ `middleware.ts` - Route protection

### Configuration

- ✅ `.env.example` - Env var template
- ✅ `app/layout.tsx` - Env validation enforcement

### Auth Pages

- ✅ `app/(auth)/login/page.tsx`
- ✅ `app/(auth)/register/page.tsx`
- ✅ `app/(auth)/forgot-password/page.tsx`
- ✅ `app/(auth)/reset-password/page.tsx`
- ✅ `app/auth/callback/route.ts`
- ✅ `app/auth/confirm/route.ts`

### Health Checks

- ✅ `app/api/health/supabase/route.ts` - Production health check

---

## 🧹 Cleanup Script

Run this PowerShell script **AFTER** verifying auth works:

```powershell
# Create archive directory
New-Item -ItemType Directory -Path docs/_archive -Force | Out-Null
New-Item -ItemType Directory -Path scripts/_archive -Force | Out-Null

# Archive temporary docs
$docsToArchive = @(
    "AUTH_AUDIT_FIXES_COMPLETE.md",
    "AUTH_LOCK_REPORT.md",
    "PROCESS_ENV_RUNTIME_FIX.md",
    "RUNTIME_ERROR_FIX.md",
    "ERRORS_CHECK.md",
    "FILES_WITH_ERRORS.md",
    "QUICK_FIX_ENV.md",
    "RUN_VALIDATION.md",
    "MIDDLEWARE_401_FIX.md",
    "ENV_FORMAT_FIX.md",
    "PROCESS_ENV_FIX.md",
    "PROCESS_ENV_RUNTIME_FIX.md",
    "DEBUG_SUPABASE_CLIENT.md",
    "ENV_FIX_COMPLETE.md"
)

foreach ($doc in $docsToArchive) {
    if (Test-Path $doc) {
        Move-Item $doc "docs/_archive/" -ErrorAction SilentlyContinue
        Write-Host "Archived: $doc"
    }
}

# Delete diagnostic components
Remove-Item "components/diagnostics/supabase-diagnostic.tsx" -ErrorAction SilentlyContinue
Remove-Item "lib/supabase/dev-env-check.ts" -ErrorAction SilentlyContinue
Remove-Item "app/debug-env/page.tsx" -ErrorAction SilentlyContinue

# Delete diagnostic scripts
Remove-Item "scripts/diagnostics/test-supabase-auth.js" -ErrorAction SilentlyContinue
Remove-Item "scripts/diagnostics/verify-env-runtime.js" -ErrorAction SilentlyContinue
Remove-Item "scripts/diagnostics/verify-supabase-env.js" -ErrorAction SilentlyContinue

# Archive optional scripts
if (Test-Path "fix-supabase-auth.ps1") {
    Move-Item "fix-supabase-auth.ps1" "scripts/_archive/" -ErrorAction SilentlyContinue
}
if (Test-Path "scripts/fix-env-format.ps1") {
    Move-Item "scripts/fix-env-format.ps1" "scripts/_archive/" -ErrorAction SilentlyContinue
}
if (Test-Path "scripts/validate-env-format.ps1") {
    Move-Item "scripts/validate-env-format.ps1" "scripts/_archive/" -ErrorAction SilentlyContinue
}

Write-Host "✅ Cleanup complete"
Write-Host "📦 Archived files moved to docs/_archive/ and scripts/_archive/"
Write-Host "🗑️  Diagnostic files deleted"
```

---

## ✅ After Cleanup Verification

1. **Build:** `npm run build` - Should pass
2. **Type Check:** `npm run typecheck` - Should pass
3. **Lint:** `npm run lint` - Should pass
4. **Auth Test:** Follow `AUTH_TESTING_PROMPT.md` - Should pass

---

## 📝 Commit Strategy

```bash
# Commit 1: Archive temporary docs
git add docs/_archive/
git commit -m "chore(docs): archive temporary debugging documentation"

# Commit 2: Remove diagnostic files
git add -A
git commit -m "chore(cleanup): remove temporary diagnostic files and scripts"

# Commit 3: Verify no broken imports
npm run typecheck
npm run lint
```

---

**Remember:** Only delete after auth is verified working. When in doubt, archive instead of delete.
