# Depo-Pro Technical Audit Report

**Audit Date:** January 3, 2026  
**Project:** Depo-Pro Legal Transcription SaaS Platform  
**Version:** v0.9-stable (MVP)  
**Auditor:** Claude AI Technical Review

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total TypeScript/TSX Files | 588 |
| Total Lines of Code | ~100,323 |
| Page Components | 98 |
| API Routes | 107 |
| UI Components | 159 |
| Library Modules | 154 |
| Critical Issues | 4 |
| Medium Issues | 6 |
| Low Priority Items | 5 |
| TODO/FIXME Items | 75 |

### Overall Assessment: ⚠️ **NEEDS FIXES BEFORE GO-LIVE**

The codebase is approximately 95% complete but has **critical routing conflicts** that will cause unpredictable behavior in production. These must be resolved before beta launch.

---

## 🔴 CRITICAL ISSUES (Must Fix)

### Issue #1: Next.js Routing Conflicts (CRITICAL)

**Problem:** Multiple page.tsx files defining the same URL routes, causing undefined behavior.

| URL Route | File 1 (Route Group) | File 2 (Regular) | Winner? |
|-----------|---------------------|------------------|---------|
| `/login` | `app/(auth)/login/page.tsx` (146 lines) | `app/login/page.tsx` (12 lines - redirect) | Undefined |
| `/register` | `app/(auth)/register/page.tsx` (248 lines) | `app/register/page.tsx` (12 lines - redirect) | Undefined |
| `/attorney-dashboard` | `app/(attorney)/attorney-dashboard/page.tsx` (7326 bytes) | `app/attorney-dashboard/page.tsx` (3277 bytes) | Undefined |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` (28 lines) | `app/dashboard/page.tsx` (33 lines) | Undefined |
| `/exhibits` | `app/(attorney)/exhibits/page.tsx` (12116 bytes) | `app/exhibits/page.tsx` (833 bytes) | Undefined |
| `/issues` | `app/(attorney)/issues/page.tsx` (10218 bytes) | `app/issues/page.tsx` (827 bytes) | Undefined |
| `/dashboard/reporter` | `app/(dashboard)/reporter/page.tsx` (205 lines) | `app/dashboard/reporter/page.tsx` (195 lines) | Undefined |
| `/dashboard/scopist` | `app/(dashboard)/scopist/page.tsx` (252 lines) | `app/dashboard/scopist/page.tsx` (136 lines) | Undefined |

**Additional Confusing Structure:**
- `app/auth/*` AND `app/(auth)/*` both exist with similar pages
- `app/login/page.tsx` redirects to `/auth/login` but `(auth)/login` creates `/login`

**Impact:** Users may see different pages randomly, authentication flows may break, unpredictable deployments.

---

### Issue #2: API Route Parameter Inconsistency (CRITICAL)

**Problem:** Job API routes use inconsistent parameter names (`[id]` vs `[jobId]`).

```
app/api/jobs/
├── [id]/                  # Uses params.id
│   ├── status/route.ts    # PATCH - updates status
│   ├── files/route.ts
│   ├── assign/route.ts
│   └── ... (15 more)
└── [jobId]/               # Uses params.jobId  ⚠️ CONFLICT
    ├── status/route.ts    # GET - gets status   ⚠️ DUPLICATE!
    └── upload/route.ts
```

**Specific Conflict:** Both `/api/jobs/[id]/status` and `/api/jobs/[jobId]/status` exist!

**Impact:** API calls may hit the wrong endpoint, frontend bugs, data corruption possible.

---

### Issue #3: Duplicate Auth Path Structure (HIGH)

**Problem:** Auth pages exist in THREE locations:

```
1. app/(auth)/login/page.tsx         → Creates route: /login
2. app/login/page.tsx                → Creates route: /login (CONFLICT!)
3. app/auth/login/page.tsx           → Creates route: /auth/login
```

**Same pattern for:** register, forgot-password, reset-password

**Impact:** Confusion about canonical URLs, SEO issues, potential auth flow breaks.

---

### Issue #4: Database Import Inconsistency (MEDIUM-HIGH)

**Problem:** Code uses two different import styles for Prisma:

```typescript
// Style 1 (157 files):
import { db } from '@/lib/db';

// Style 2 (12 files):
import { prisma } from '@/lib/db';
```

While `lib/db.ts` exports both as aliases, this inconsistency:
- Makes code harder to maintain
- Could cause issues if export changes
- Confuses new developers

---

## 🟡 MEDIUM ISSUES

### Issue #5: Stub Pages Still Using StubPage Component

**8 pages still show "Coming Soon":**

| Page | Path | Notes |
|------|------|-------|
| Invoice Detail | `/billing/invoices/[invoiceId]/page.tsx` | Should show invoice |
| Invoice Preview | `/billing/invoices/[invoiceId]/preview/page.tsx` | Stub |
| Usage Report | `/reports/usage/page.tsx` | Stub |
| System Report | `/reports/system/page.tsx` | Stub |
| Accuracy Report | `/reports/accuracy/page.tsx` | Stub |
| AI Models Settings | `/settings/ai-models/page.tsx` | Stub |
| Integrations Settings | `/settings/integrations/page.tsx` | Stub |
| Billing Rates Settings | `/settings/billing-rates/page.tsx` | Stub |
| Audio Processing Settings | `/settings/audio-processing/page.tsx` | Stub |

**Recommendation:** Keep as stubs for MVP, clearly mark as "Phase 2" features.

---

### Issue #6: 75 TODO/FIXME Items in Codebase

**Key areas needing attention:**

| Area | Count | Sample |
|------|-------|--------|
| BullMQ Integration | 5 | `// TODO: Implement BullMQ integration` |
| Calendar Edit Modal | 2 | `// TODO: Open edit modal` |
| Audio Duration | 1 | `// TODO: Get from audio file metadata` |
| Case Access Permissions | 2 | `// TODO: Add caseId to AttorneyTranscript` |
| Speaker Analysis | 1 | `// TODO: Update speaker analysis` |

**Recommendation:** Review each TODO and either implement, defer to Phase 2, or remove.

---

### Issue #7: Archive/Legacy Files Still in Repository

**Location:** `archive/` directory (should not be in production repo)

```
archive/
├── .backup-deepgram-integration-20251113-235553/
├── legacy/
│   └── archive_phase2/
└── legacy_cleanup_20251225/
    └── reports/
```

**Recommendation:** Remove from main branch, store separately if needed for reference.

---

### Issue #8: Some API Routes Missing Auth Checks

**Routes without explicit auth() calls:**

| Route | Reason | Action |
|-------|--------|--------|
| `/api/webhooks/stripe` | Uses signature verification | ✅ OK |
| `/api/webhooks/deepgram` | Uses signature verification | ✅ OK |
| `/api/webhooks/[provider]` | Generic webhook | ⚠️ Review |
| `/api/contact` | Public contact form | ⚠️ Needs rate limiting |
| `/api/assignments/[id]/notify` | Should be protected | 🔴 FIX |

---

### Issue #9: Inconsistent Route Group Usage

**Problem:** Mixed use of route groups for organization:

```
app/
├── (attorney)/      # Route group for attorney pages
├── (auth)/          # Route group for auth pages  
├── (dashboard)/     # Route group for dashboard pages
├── auth/            # Regular folder (creates /auth/* routes)
├── dashboard/       # Regular folder (creates /dashboard/* routes)
├── attorney-dashboard/  # Regular folder (creates /attorney-dashboard)
└── login/           # Regular folder (creates /login)
```

**This is architectural debt that should be cleaned up.**

---

### Issue #10: Calendar Component TypeScript Warning

**Warning in VS Code:**
```
Props must be serializable for components in the "use client" entry file.
"onEventClick" is a function that's not a Server Action.
```

**File:** `components/calendar/calendar-day-cell.tsx`  
**Impact:** Low - this is a harmless warning, not an error.

---

## 🟢 LOW PRIORITY / INFORMATIONAL

### Item #11: SQL Migration File Warnings
- VS Code's MSSQL extension incorrectly flags PostgreSQL syntax
- **Action:** Install PostgreSQL extension or ignore warnings

### Item #12: Large Codebase Size
- 100K+ lines of TypeScript
- 588 files
- **Action:** Consider code splitting for performance if bundle grows

### Item #13: Multiple Prisma Schema Files
- `schema.prisma` (main)
- `calendar-schema.prisma`
- `schema-additions.prisma`
- **Action:** Consolidate or document why split

### Item #14: Unused Archive Files
- Old backups and reports in `/archive`
- **Action:** Remove or move to separate branch

### Item #15: Duplicate Button Components
- Check for component duplication in UI folder
- **Action:** Audit components for deduplication opportunities

---

## 📋 DETAILED FIX PLAN

### Phase 1: Critical Fixes (Day 1 - 4 hours)

#### Step 1.1: Fix Routing Conflicts

**PowerShell Commands to Execute:**

```powershell
# Navigate to project
cd C:\Users\james\depo-pro

# Create backup
Copy-Item -Path "app" -Destination "app_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Recurse

# Remove duplicate regular folders (keep route groups)
Remove-Item -Path "app\login" -Recurse -Force
Remove-Item -Path "app\register" -Recurse -Force  
Remove-Item -Path "app\attorney-dashboard" -Recurse -Force
Remove-Item -Path "app\exhibits" -Recurse -Force
Remove-Item -Path "app\issues" -Recurse -Force

# Remove dashboard duplicates (keep route group versions)
Remove-Item -Path "app\dashboard\reporter" -Recurse -Force
Remove-Item -Path "app\dashboard\scopist" -Recurse -Force
Remove-Item -Path "app\dashboard\admin" -Recurse -Force

# Remove root dashboard page (keep route group version)
Remove-Item -Path "app\dashboard\page.tsx" -Force

# Verify
npm run build
```

#### Step 1.2: Convert `/auth/*` to Redirects

Keep `app/auth/invite/accept/page.tsx` but convert others to redirects:

```typescript
// app/auth/login/page.tsx
import { redirect } from 'next/navigation';
export default function AuthLoginRedirect() {
  redirect('/login');
}

// app/auth/register/page.tsx  
import { redirect } from 'next/navigation';
export default function AuthRegisterRedirect() {
  redirect('/register');
}

// app/auth/forgot-password/page.tsx
import { redirect } from 'next/navigation';
export default function AuthForgotRedirect() {
  redirect('/forgot-password');
}

// app/auth/reset-password/page.tsx
import { redirect } from 'next/navigation';
export default function AuthResetRedirect() {
  redirect('/reset-password');
}
```

#### Step 1.3: Fix API Route Parameter Conflict

**Option A (Recommended): Remove `[jobId]` folder, keep `[id]`**

```powershell
# Move any unique functionality from [jobId] to [id]
# Then remove the duplicate folder
Remove-Item -Path "app\api\jobs\[jobId]" -Recurse -Force
```

**Option B: Merge the routes manually**

1. Copy `GET` handler from `[jobId]/status/route.ts` to `[id]/status/route.ts`
2. Copy upload handler to `[id]/upload/route.ts`
3. Delete `[jobId]` folder

---

### Phase 2: Medium Fixes (Day 2 - 2 hours)

#### Step 2.1: Add Auth to Unprotected Routes

```typescript
// app/api/assignments/[id]/notify/route.ts
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}
```

#### Step 2.2: Add Rate Limiting to Contact Route

```typescript
// app/api/contact/route.ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, { limit: 5, window: '1h' });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // ... rest of handler
}
```

#### Step 2.3: Standardize Database Imports

Run find-and-replace to standardize on `db`:

```bash
# In VS Code: Find and Replace (Ctrl+Shift+H)
# Find: import { prisma } from '@/lib/db'
# Replace: import { db } from '@/lib/db'

# Then find: prisma.
# Replace: db.
```

---

### Phase 3: Cleanup (Day 3 - 1 hour)

#### Step 3.1: Remove Archive Folder

```powershell
# Move to a backup location outside the repo
Move-Item -Path "archive" -Destination "C:\backups\depo-pro-archive-$(Get-Date -Format 'yyyyMMdd')"

# Or just delete if not needed
Remove-Item -Path "archive" -Recurse -Force
```

#### Step 3.2: Review TODO Items

Create a ticket/issue for each TODO that should be addressed post-MVP.

---

## 📊 Verification Checklist

After implementing fixes, verify:

```powershell
# 1. TypeScript compiles cleanly
npm run typecheck

# 2. Build succeeds
npm run build

# 3. Lint passes
npm run lint

# 4. No duplicate routes
# Manually verify in browser:
# - /login loads login form (not redirect loop)
# - /register loads register form
# - /dashboard redirects to role-appropriate page
# - /api/jobs/[id]/status works

# 5. Auth flows work
# - Login → Dashboard
# - Register → Verification/Dashboard
# - Logout → Home
```

---

## 🎯 Go-Live Readiness After Fixes

| Criterion | Before Fixes | After Fixes |
|-----------|-------------|-------------|
| Routing Stability | ❌ Conflicts | ✅ Clean |
| API Consistency | ❌ Duplicates | ✅ Unified |
| Auth Coverage | ⚠️ Gaps | ✅ Complete |
| Build Success | ✅ Passes | ✅ Passes |
| Type Safety | ✅ Clean | ✅ Clean |
| **Go-Live Ready** | **❌ NO** | **✅ YES** |

---

## Appendix: Full Routing Conflict Map

### Current State (BROKEN):

```
URL: /login
├── app/(auth)/login/page.tsx     ← Full implementation (146 lines)
└── app/login/page.tsx            ← Redirect to /auth/login (12 lines)
    → But /auth/login also exists as app/auth/login/page.tsx!

URL: /register  
├── app/(auth)/register/page.tsx  ← Full implementation (248 lines)
└── app/register/page.tsx         ← Redirect to /auth/register (12 lines)

URL: /attorney-dashboard
├── app/(attorney)/attorney-dashboard/page.tsx ← Full implementation
└── app/attorney-dashboard/page.tsx            ← Different implementation

URL: /dashboard
├── app/(dashboard)/dashboard/page.tsx ← Router component (28 lines)
└── app/dashboard/page.tsx             ← Different router (33 lines)

URL: /exhibits
├── app/(attorney)/exhibits/page.tsx ← Full implementation (12KB)
└── app/exhibits/page.tsx            ← Stub/minimal (833 bytes)

URL: /issues
├── app/(attorney)/issues/page.tsx ← Full implementation (10KB)
└── app/issues/page.tsx            ← Stub/minimal (827 bytes)
```

### Target State (CLEAN):

```
URL: /login           → app/(auth)/login/page.tsx (ONLY)
URL: /register        → app/(auth)/register/page.tsx (ONLY)
URL: /forgot-password → app/(auth)/forgot-password/page.tsx (ONLY)
URL: /reset-password  → app/(auth)/reset-password/page.tsx (ONLY)
URL: /auth/login      → REDIRECT to /login
URL: /auth/register   → REDIRECT to /register
URL: /attorney-dashboard → app/(attorney)/attorney-dashboard/page.tsx (ONLY)
URL: /dashboard       → app/(dashboard)/dashboard/page.tsx (ONLY)
URL: /exhibits        → app/(attorney)/exhibits/page.tsx (ONLY)
URL: /issues          → app/(attorney)/issues/page.tsx (ONLY)
```

---

*Report generated by Claude AI Technical Audit*  
*For questions, contact the development team*
