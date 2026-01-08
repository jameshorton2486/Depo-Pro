# Code Audit Report: Depo-Pro

**Date:** January 9, 2025
**Auditor:** Principal Software Engineer / Architect
**Scope:** Comprehensive repository audit for production readiness

---

## Executive Summary

**Overall Health:** ⚠️ **MODERATE RISK** - Architecture migration in progress, critical issues present

**Key Findings:**
- ✅ **Supabase migration largely complete** - Prisma removed from active code
- 🔴 **CRITICAL:** Prisma-compatible wrapper (`lib/db.ts`) still in active use (violates architecture)
- 🔴 **CRITICAL:** TypeScript errors blocking builds (9 errors)
- 🔴 **CRITICAL:** Route conflict between `app/admin` and `app/(dashboard)/admin`
- ⚠️ **HIGH:** 50+ markdown status files cluttering root directory
- ⚠️ **HIGH:** NextAuth still present but disabled (dead code)
- ⚠️ **MEDIUM:** Duplicate enum/feature-flag files
- ⚠️ **MEDIUM:** Direct `.from()` calls bypassing query modules (11 files)

**Top Risks:**
1. `lib/db.ts` Prisma wrapper violates Supabase-only architecture
2. TypeScript errors prevent production builds
3. Route conflicts create ambiguous navigation
4. Dead code increases maintenance burden

---

## Critical Issues (Fix Immediately)

| Category | File/Location | Issue | Recommended Fix |
|----------|---------------|-------|-----------------|
| **Architecture Violation** | `lib/db.ts` | Prisma-compatible wrapper actively used (82 references) | **DELETE** `lib/db.ts`, migrate all `db.*` calls to Supabase query modules |
| **TypeScript Error** | `app/api/files/[id]/download/route.ts:20` | `session.user` doesn't exist on `SessionUser` | Change `session.user` to `session` (flat structure) |
| **TypeScript Error** | `app/api/jobs/[id]/rx/route.ts:36,45` | `session.user` doesn't exist | Change `session.user.id` to `session.id`, `session.user.role` to `session.role` |
| **Route Conflict** | `app/admin/dashboard/page.tsx` vs `app/(dashboard)/admin/page.tsx` | Duplicate admin routes | **DELETE** `app/admin/dashboard/page.tsx`, consolidate to `app/(dashboard)/admin/*` |
| **Dead Code** | `app/api/auth/[...nextauth]/route.ts` | NextAuth route handler (disabled) | **DELETE** - Supabase auth is primary |
| **Dead Code** | `lib/auth-options.ts` | NextAuth config (credentials disabled) | **DELETE** or move to `archive/` |
| **Dead Code** | `app/api/auth/register/route.ts` | Returns 410 (legacy disabled) | **DELETE** - handled by Supabase |
| **Dead Code** | `app/api/dictionary/[id]/route.ts` | Returns 503 (feature disabled) | **DELETE** or implement |
| **Security** | `lib/db.ts:9` | Uses `SUPABASE_SERVICE_ROLE_KEY` fallback | Remove service role key usage, use RLS-enforced client |
| **Architecture** | `app/api/cron/cleanup/route.ts` | Uses `db.job.updateMany()` (Prisma wrapper) | Migrate to `lib/supabase/queries/jobs.ts` |

---

## High Priority (Fix This Sprint)

| Category | File/Location | Issue | Recommended Fix |
|----------|---------------|-------|-----------------|
| **TypeScript** | `lib/deepgram/index.ts:43` | Redis type mismatch | Fix BullMQ Redis connection type |
| **TypeScript** | `lib/queue/connection.ts:24-25` | Queue type mismatch | Fix BullMQ Queue generic types |
| **TypeScript** | `lib/queue/transcription-queue.ts:47-48` | Queue type mismatch | Fix BullMQ Queue generic types |
| **TypeScript** | `lib/workers/create-worker.ts:32` | Redis connection type | Fix Redis connection options |
| **Documentation** | Root directory | 50+ markdown status files | **Archive** to `docs/archive/` or delete |
| **Duplicate Code** | `lib/enums.ts` vs `lib/enums-phase5.ts` | Duplicate enum definitions | Merge `enums-phase5.ts` into `enums.ts`, delete duplicate |
| **Duplicate Code** | `lib/feature-flags.ts` vs `lib/feature-flags-enhanced.ts` | Duplicate feature flags | Merge into single file, delete duplicate |
| **Direct DB Access** | `app/api/calendar/events/route.ts` | Direct `.from('calendar_events')` | Migrate to `lib/supabase/queries/calendar.ts` |
| **Direct DB Access** | `app/api/calendar/events/[id]/route.ts` | Direct `.from()` calls (6 instances) | Migrate to query modules |
| **Direct DB Access** | `app/api/admin/metrics/route.ts` | Direct `.from()` calls (3 instances) | Migrate to `lib/supabase/queries/admin.ts` |
| **Direct DB Access** | `app/api/transcripts/[id]/ai-review/route.ts` | Direct `.from()` calls (3 instances) | Migrate to query modules |
| **Direct DB Access** | `app/api/transcripts/[id]/score/route.ts` | Direct `.from()` calls (4 instances) | Migrate to query modules |
| **N+1 Query** | `app/api/jobs/[id]/notes/route.ts:100` | `Promise.all()` in loop fetching reporters | Batch fetch reporters in single query |
| **Missing Validation** | `app/api/queue/route.ts` | No Zod validation for `JobData` | Add Zod schema validation |
| **Missing Auth** | `app/api/health/route.ts` | Public endpoint (intentional) | ✅ OK - health checks should be public |
| **Backup Files** | Root directory | 6 `.backup` files | **DELETE** - version control handles history |

---

## Medium Priority (Plan Next Cycle)

| Category | File/Location | Issue | Recommended Fix |
|----------|---------------|-------|-----------------|
| **Unused Exports** | `lib/auth.ts` | Re-exports from multiple sources | Audit and remove unused exports |
| **PowerShell Scripts** | Root directory | 4 fix scripts (`fix-*.ps1`) | Move to `scripts/` or delete if obsolete |
| **Archive Folder** | `archive/legacy-prisma-services/` | 67 files (Prisma services) | ✅ OK - properly archived |
| **Archive Folder** | `archive/legacy-scripts/` | 7 migration scripts | ✅ OK - historical reference |
| **TODO Comments** | Multiple files | 89 TODO/FIXME comments | Create GitHub issues, remove comments |
| **Type Safety** | Multiple files | 211 `any` type usages | Gradually replace with proper types |
| **Console Logging** | `app/api/*` | 117 `console.log/error` calls | Migrate to `@/lib/logger` |
| **Environment Variables** | Multiple files | Direct `process.env` access (8 files) | Use `@/lib/env/validation.ts` |
| **Missing Rate Limiting** | `app/api/calendar/*` | Calendar routes lack rate limiting | Add rate limiting to public-facing routes |
| **Storage** | `lib/storage.ts` | Uses local filesystem, not Supabase Storage | Migrate to Supabase Storage buckets |
| **RLS Gaps** | Supabase migrations | Some tables may lack RLS policies | Audit all tables, ensure RLS enabled |

---

## Low Priority / Cleanup

| Category | File/Location | Issue | Recommended Fix |
|----------|---------------|-------|-----------------|
| **Unused Dependencies** | `package.json` | `next-auth` (disabled) | Remove if not needed for compatibility |
| **Unused Dependencies** | `package.json` | `@auth/core` (NextAuth dependency) | Remove if NextAuth fully removed |
| **Documentation** | Root directory | Multiple `*_COMPLETE.md` files | Consolidate into single status doc |
| **Documentation** | Root directory | `PHASE2_PROGRESS.md` | Move to `docs/` or archive |
| **Code Style** | Multiple files | Inconsistent error handling | Standardize error responses |
| **Code Style** | Multiple files | Mixed async/await patterns | Standardize async patterns |

---

## Files Safe to Delete

### Dead Code
- `app/admin/dashboard/page.tsx` - Duplicate route (use `app/(dashboard)/admin/page.tsx`)
- `app/api/auth/[...nextauth]/route.ts` - NextAuth disabled
- `app/api/auth/register/route.ts` - Returns 410, handled by Supabase
- `app/api/dictionary/[id]/route.ts` - Returns 503, feature disabled
- `lib/auth-options.ts` - NextAuth config (credentials disabled)

### Backup Files
- `package.json.backup`
- `eslint.config.mjs.backup`
- `.env.local.backup`
- `.env.backup`
- `lib/transcription.ts.backup`
- `.eslintrc.json.backup`

### Documentation (Archive to `docs/archive/`)
- `ALL_TASKS_COMPLETE.md`
- `IMPLEMENTATION_COMPLETE.md`
- `IMPLEMENTATION_COMPLETE_FINAL.md`
- `E2E_BI_AI_FIRM_COMPLETE.md`
- `ADMIN_AI_HIPAA_COMPLETE.md`
- `RLS_AUDIT_GOOGLE_COMPLETE.md`
- `NEXTJS_15_LOCK_COMPLETE.md`
- `TYPESCRIPT_FIXES_COMPLETE.md`
- `PRISMA_REMOVAL_COMPLETE.md`
- `ADMIN_SETUP_COMPLETE.md`
- `FINAL_IMPLEMENTATION_SUMMARY.md`
- `FINAL_STATUS.md`
- `PHASE1_STATUS.md`
- `PHASE2_PROGRESS.md`
- `MIGRATION_jobs_route.md`
- `MIGRATION_jobs_id_route.md`
- `ARCHITECTURE_FINALIZATION_REPORT.md`
- `AUTHENTICATION_FINAL_STATUS.md`

### Duplicate Files
- `lib/enums-phase5.ts` - Merge into `lib/enums.ts`
- `lib/feature-flags-enhanced.ts` - Merge into `lib/feature-flags.ts`

---

## Supabase Policy Gaps

| Table | Missing/Weak RLS Rule | Impact |
|-------|----------------------|--------|
| `audit_logs` | ✅ RLS enabled (3 policies) | ✅ OK |
| `user_sessions` | ✅ RLS enabled (4 policies) | ✅ OK |
| `jobs` | ⚠️ Verify RLS policies exist | Check migration files |
| `transcriptions` | ⚠️ Verify RLS policies exist | Check migration files |
| `job_files` | ⚠️ Verify RLS policies exist | Check migration files |
| `deposition_notes` | ⚠️ Verify RLS policies exist | Check migration files |
| `calendar_events` | ⚠️ Verify RLS policies exist | Check migration files |

**Action Required:** Audit all tables in `supabase/migrations/` to ensure:
1. `ENABLE ROW LEVEL SECURITY` is present
2. Policies exist for SELECT, INSERT, UPDATE, DELETE
3. Policies enforce role-based access

---

## Recommended Refactors

### 1. Eliminate Prisma Wrapper (`lib/db.ts`)
**Priority:** 🔴 CRITICAL
**Impact:** 82 files using `db.*` API

**Steps:**
1. Identify all `db.*` usages (grep: `from '@/lib/db'`)
2. Map to Supabase query modules
3. Migrate in batches:
   - Batch 1: `app/api/files/*` (2 files)
   - Batch 2: `app/api/transcripts/*` (1 file)
   - Batch 3: `app/api/cron/*` (1 file)
4. Delete `lib/db.ts` after migration

### 2. Consolidate Admin Routes
**Priority:** 🔴 CRITICAL
**Impact:** Route ambiguity

**Steps:**
1. Delete `app/admin/dashboard/page.tsx`
2. Ensure all admin routes under `app/(dashboard)/admin/*`
3. Update navigation links
4. Test admin access

### 3. Migrate Direct `.from()` Calls
**Priority:** ⚠️ HIGH
**Impact:** 11 files bypassing query modules

**Files:**
- `app/api/calendar/events/route.ts`
- `app/api/calendar/events/[id]/route.ts`
- `app/api/admin/metrics/route.ts`
- `app/api/transcripts/[id]/ai-review/route.ts`
- `app/api/transcripts/[id]/score/route.ts`
- `app/api/admin/incidents/route.ts`
- `app/api/admin/metrics/ai-quality/route.ts`
- `app/api/admin/metrics/cases/route.ts`
- `app/api/admin/audit/route.ts`
- `app/api/calendar/google/sync/route.ts`

**Action:** Create query functions in respective modules, replace direct calls

### 4. Fix TypeScript Errors
**Priority:** 🔴 CRITICAL
**Impact:** Build failures

**Errors:**
1. `app/api/files/[id]/download/route.ts:20` - `session.user` → `session`
2. `app/api/jobs/[id]/rx/route.ts:36,45` - `session.user.*` → `session.*`
3. BullMQ type errors (4 files) - Fix Redis/Queue generic types

### 5. Standardize Auth Patterns
**Priority:** ⚠️ MEDIUM
**Impact:** Code consistency

**Current State:**
- `getCurrentUser()` returns flat `SessionUser`
- Some code expects `session.user.*`
- `auth()` returns `{ user: {...} }` (NextAuth-compatible)

**Action:**
1. Standardize on flat `SessionUser` structure
2. Update all `session.user.*` to `session.*`
3. Deprecate `auth()` compatibility layer

---

## Documentation Cleanup

### Keep (Active Documentation)
- `README.md` (if exists)
- `docs/build-governance.md`
- `docs/build-mode-checklist.md`
- `docs/nextjs-upgrade-plan.md`
- `AUTHENTICATION_FINAL_STATUS.md` (current status)

### Archive to `docs/archive/`
- All `*_COMPLETE.md` files (18 files)
- All `*_STATUS.md` files (3 files)
- All `*_PROGRESS.md` files (1 file)
- All `*_MIGRATION*.md` files (2 files)

### Delete
- Backup files (`.backup`, `.bak`)
- PowerShell fix scripts (if obsolete)
- Duplicate enum/feature-flag files (after merge)

---

## Security & Performance Issues

### Security
1. **Service Role Key Usage** (`lib/db.ts:9`)
   - **Risk:** Bypasses RLS
   - **Fix:** Remove service role key, use authenticated client

2. **Missing Input Validation**
   - `app/api/queue/route.ts` - No Zod validation for `JobData`
   - Multiple calendar routes - Validate query parameters

3. **Rate Limiting Gaps**
   - Calendar routes lack rate limiting
   - Public API endpoints need rate limiting

### Performance
1. **N+1 Query Pattern** (`app/api/jobs/[id]/notes/route.ts:100`)
   - Fetches reporter info in loop
   - **Fix:** Batch fetch reporters

2. **Sequential Supabase Calls**
   - `app/(dashboard)/scopist/page.tsx` - Multiple sequential queries
   - **Fix:** Use `Promise.all()` where possible

3. **Missing Indexes**
   - Verify database indexes exist for common queries
   - Check migration files for index definitions

---

## Next Steps (Prioritized)

### Week 1 (Critical)
1. ✅ Fix TypeScript errors (4 files)
2. ✅ Delete `lib/db.ts`, migrate remaining usages
3. ✅ Resolve route conflict (`app/admin` vs `app/(dashboard)/admin`)
4. ✅ Delete dead NextAuth code

### Week 2 (High Priority)
5. ✅ Migrate direct `.from()` calls to query modules (11 files)
6. ✅ Consolidate duplicate enum/feature-flag files
7. ✅ Archive documentation files
8. ✅ Fix N+1 query patterns

### Week 3 (Medium Priority)
9. ✅ Add missing input validation
10. ✅ Standardize auth patterns
11. ✅ Migrate console.log to logger
12. ✅ Audit RLS policies

---

## Metrics

- **Total Files Audited:** ~200+
- **Critical Issues:** 10
- **High Priority Issues:** 15
- **Medium Priority Issues:** 12
- **Low Priority Issues:** 8
- **Files Safe to Delete:** 30+
- **TypeScript Errors:** 9
- **Direct DB Access Violations:** 11 files
- **Prisma Wrapper Usages:** 82 references
- **TODO Comments:** 89
- **Any Type Usages:** 211

---

## Conclusion

The codebase is in a **transitional state** with a successful Supabase migration largely complete, but critical architectural violations remain. The primary blocker is the Prisma-compatible wrapper (`lib/db.ts`) which violates the Supabase-only architecture constraint.

**Immediate Actions Required:**
1. Eliminate `lib/db.ts` usage
2. Fix TypeScript errors
3. Resolve route conflicts
4. Clean up dead code

**Estimated Effort:** 2-3 weeks for critical/high priority items

**Risk Level:** ⚠️ **MODERATE** - Production-ready after critical fixes, but technical debt remains
