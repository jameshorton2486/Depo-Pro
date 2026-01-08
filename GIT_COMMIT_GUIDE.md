# 📦 Git Commit Guide: Authentication Migration

## 📋 Current Status

### Already Staged (14 files)
These are ready to commit:
- Core auth files (lib/auth.ts, lib/auth/session.ts, lib/security.ts)
- Some component updates
- Middleware updates

### Modified But Not Staged (~50+ files)
- All component migrations to useAuth()
- All API route updates
- Package.json updates

### New Files to Add
- ✅ `hooks/use-auth.ts` - **CRITICAL** - New auth hook
- ✅ `lib/auth-supabase.ts` - **CRITICAL** - Supabase helpers
- ✅ `lib/auth-compat.ts` - **CRITICAL** - Compatibility layer
- ✅ New migrations in `supabase/migrations/`
- ✅ New test files
- ✅ Various new components and utilities

### Documentation Files (Optional)
You have many audit/migration docs. Consider keeping only:
- ✅ `AUTHENTICATION_MIGRATION_COMPLETE.md` - Main summary
- ⚠️ Others can be archived or removed

---

## 🎯 Recommended Commit Strategy

### Option 1: Single Comprehensive Commit (Recommended)
Commit everything related to the authentication migration in one commit.

### Option 2: Multiple Logical Commits
1. Core infrastructure (auth-supabase, use-auth, auth-compat)
2. Component migrations
3. API route updates
4. Documentation

---

## 📝 Step-by-Step Instructions

### Step 1: Review and Clean Up Documentation

**Keep these:**
- `AUTHENTICATION_MIGRATION_COMPLETE.md` (or `AUTHENTICATION_FINAL_STATUS.md`)
- `BETA_CHECKLIST.md`

**Optional - Archive or Delete:**
- `AUTHENTICATION_AUDIT_COMPLETE.md`
- `AUTH_AUDIT_REPORT.md`
- `AUTH_MIGRATION_COMPLETE.md`
- `AUTH_MIGRATION_FINAL.md`
- `AUTH_MIGRATION_STATUS.md`
- `AUTH_REMEDIATION_FINAL.md`

### Step 2: Stage All Code Changes

```powershell
# Stage all modified files
git add app/
git add components/
git add lib/
git add hooks/
git add middleware.ts
git add package.json
git add package-lock.json

# Stage new critical files
git add hooks/use-auth.ts
git add lib/auth-supabase.ts
git add lib/auth-compat.ts

# Stage new migrations
git add supabase/migrations/

# Stage new test files
git add tests/

# Stage new components/utilities
git add components/layout/
git add components/review/
git add lib/db/
git add lib/env/
git add lib/errors/
git add lib/health/
git add lib/security/
git add lib/workers/
```

### Step 3: Stage Documentation (Optional)

```powershell
# Keep only the main documentation
git add AUTHENTICATION_MIGRATION_COMPLETE.md
git add BETA_CHECKLIST.md

# Or if you prefer the final status doc:
# git add AUTHENTICATION_FINAL_STATUS.md
```

### Step 4: Verify What Will Be Committed

```powershell
# Check staged files
git status

# Review the diff summary
git diff --cached --stat
```

### Step 5: Commit

```powershell
# Single comprehensive commit
git commit -m "feat: Complete authentication migration from NextAuth to Supabase

- Migrate all components from useSession() to useAuth() hook
- Create Supabase-native auth infrastructure (auth-supabase.ts, use-auth.ts)
- Add compatibility layer for gradual migration (auth-compat.ts)
- Update all API routes to use Supabase authentication
- Remove SessionProvider from root layout
- Update middleware to use Supabase session management
- Fix all TypeScript and linting errors
- Add comprehensive test coverage

BREAKING CHANGE: None - compatibility layer ensures backward compatibility

Closes: Authentication migration to Supabase-native implementation"
```

### Step 6: Push to GitHub

```powershell
# Push to main branch
git push origin main

# Or if you want to create a feature branch first:
# git checkout -b feat/auth-migration
# git push origin feat/auth-migration
```

---

## 🧹 Cleanup Commands (Optional)

If you want to remove duplicate documentation files:

```powershell
# Remove duplicate docs (be careful!)
git rm AUTHENTICATION_AUDIT_COMPLETE.md
git rm AUTH_AUDIT_REPORT.md
git rm AUTH_MIGRATION_COMPLETE.md
git rm AUTH_MIGRATION_FINAL.md
git rm AUTH_MIGRATION_STATUS.md
git rm AUTH_REMEDIATION_FINAL.md
```

---

## ✅ Pre-Commit Checklist

- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] All linting errors resolved (`npm run lint`)
- [ ] All critical files staged
- [ ] Commit message is descriptive
- [ ] Ready to push

---

## 🚨 Important Notes

1. **Don't commit:**
   - `.env.local` or any `.env*` files
   - `node_modules/`
   - `.next/` build directory
   - Any backup files

2. **Do commit:**
   - All source code changes
   - New migration files
   - Updated package.json
   - Test files
   - Documentation (selective)

3. **NextAuth Files:**
   - The old NextAuth files (`app/api/auth/[...nextauth]/route.ts`, `lib/auth-options.ts`) are still in the repo but not used
   - You can remove them in a follow-up commit if desired

---

## 📊 Expected Commit Size

- **Modified files**: ~50+
- **New files**: ~20+
- **Total changes**: Significant but necessary for migration

---

## 🎯 Quick Command Reference

```powershell
# See what will be committed
git status

# Stage everything (code only)
git add app/ components/ lib/ hooks/ middleware.ts package*.json

# Stage new critical files
git add hooks/use-auth.ts lib/auth-supabase.ts lib/auth-compat.ts

# Commit
git commit -m "feat: Complete authentication migration to Supabase"

# Push
git push origin main
```
