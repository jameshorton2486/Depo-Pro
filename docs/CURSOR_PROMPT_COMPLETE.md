# CURSOR AI PROMPT - Complete Navigation System Implementation

## OVERVIEW

Implement a complete role-aware navigation system for Depo-Pro with:
- ✅ Centralized navigation schema
- ✅ Route-level authorization (middleware)
- ✅ Role-aware sidebar with collapsible sections
- ✅ Auto-generated breadcrumbs per page
- ✅ ⌘K Command palette with fuzzy search (Fuse.js)
- ✅ Mobile sidebar variant
- ✅ Permission mismatch warnings in dev
- ✅ CI check for unauthorized routes
- ✅ Auto-generated sitemap per role
- ✅ Admin-only visual permission matrix

---

## FILES ALREADY CREATED

The following files are ready and just need to be wired up:

| File | Purpose |
|------|---------|
| `lib/navigation.ts` | Central navigation schema |
| `lib/auth/require-role.ts` | Route authorization utilities |
| `lib/breadcrumbs.ts` | Breadcrumb generator |
| `lib/permissions-audit.ts` | Dev warnings & CI checks |
| `lib/sitemap.ts` | Auto-generate sitemaps per role |
| `lib/permission-matrix.ts` | Build visual permission matrices |
| `lib/command-index.ts` | Command palette search index |
| `components/layouts/app-sidebar.tsx` | Main sidebar component |
| `components/layouts/breadcrumbs.tsx` | Breadcrumb UI component |
| `components/layouts/mobile-sidebar.tsx` | Mobile navigation |
| `components/command/command-palette.tsx` | ⌘K with fuzzy search |
| `middleware.ts` | Route-level protection |
| `app/unauthorized/page.tsx` | Access denied page |
| `app/(dashboard)/admin/sitemap/page.tsx` | Role sitemap viewer |
| `app/(dashboard)/admin/permissions/page.tsx` | Permission matrix viewer |
| `scripts/check-route-permissions.ts` | CI validation script |

**NEW DEPENDENCY:**
```bash
npm install fuse.js
```

---

## IMPLEMENTATION TASKS

### Task 1: Update Dashboard Layout

Replace `app/(dashboard)/layout.tsx` with this complete implementation:

```tsx
// ═══════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT WITH FULL NAVIGATION SYSTEM
// ═══════════════════════════════════════════════════════════════

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SidebarLayout } from '@/components/layouts/app-sidebar';
import { Breadcrumbs } from '@/components/layouts/breadcrumbs';
import { CommandPalette } from '@/components/command/command-palette';
import { type UserRole } from '@/lib/navigation';
import { usePermissionAudit } from '@/lib/permissions-audit';

// Dev-only permission audit
function DevPermissionAudit() {
  'use client';
  usePermissionAudit();
  return null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  const userRole = session.user.role as UserRole;
  const userName = session.user.name || session.user.email;

  return (
    <SidebarLayout userRole={userRole} userName={userName}>
      {/* Dev-only permission warnings */}
      {process.env.NODE_ENV === 'development' && <DevPermissionAudit />}
      
      {/* Command Palette (⌘K) */}
      <CommandPalette role={userRole} userName={userName} />
      
      {/* Page Content with Breadcrumbs */}
      <div className="p-6">
        <Breadcrumbs role={userRole} className="mb-4" />
        {children}
      </div>
    </SidebarLayout>
  );
}
```

### Task 2: Add Route Protection to All Dashboard Pages

Add this import and call to the TOP of each async function:

```tsx
import { protectRoute } from '@/lib/auth/require-role';
```

Then add the `await protectRoute([...])` call as the FIRST line:

**Admin pages:**
```tsx
// app/(dashboard)/admin/page.tsx
await protectRoute(['ADMIN', 'AGENCY']);

// app/(dashboard)/admin/users/page.tsx
await protectRoute(['ADMIN']);

// app/(dashboard)/admin/rx-queue/page.tsx
await protectRoute(['ADMIN', 'AGENCY']);
```

**Reporter page:**
```tsx
// app/(dashboard)/reporter/page.tsx
await protectRoute(['ADMIN', 'REPORTER']);
```

**Scopist page:**
```tsx
// app/(dashboard)/scopist/page.tsx
await protectRoute(['ADMIN', 'SCOPIST']);
```

**Attorney pages:**
```tsx
// app/(dashboard)/attorney/page.tsx
await protectRoute(['ADMIN', 'ATTORNEY']);

// app/(dashboard)/attorney/cases/page.tsx
await protectRoute(['ADMIN', 'ATTORNEY']);

// app/(dashboard)/attorney/transcripts/page.tsx
await protectRoute(['ADMIN', 'ATTORNEY']);
```

**Job pages:**
```tsx
// app/(dashboard)/jobs/page.tsx
await protectRoute(['ADMIN', 'REPORTER', 'SCOPIST', 'AGENCY']);

// app/(dashboard)/jobs/new/page.tsx
await protectRoute(['ADMIN', 'REPORTER', 'AGENCY']);

// app/(dashboard)/cases/new/page.tsx
await protectRoute(['ADMIN', 'REPORTER', 'AGENCY']);
```

**Calendar pages:**
```tsx
// app/(dashboard)/calendar/page.tsx
await protectRoute(['ADMIN', 'REPORTER', 'ATTORNEY', 'AGENCY']);

// app/(dashboard)/calendar/availability/page.tsx
await protectRoute(['ADMIN', 'REPORTER']);

// app/(dashboard)/calendar/requests/page.tsx
await protectRoute(['ADMIN', 'AGENCY']);
```

### Task 3: Create Missing Admin Pages

Create placeholder pages for routes in navigation that don't exist:

```bash
# Create these page.tsx files:
app/(dashboard)/admin/users/page.tsx
app/(dashboard)/admin/activity/page.tsx
app/(dashboard)/admin/reports/usage/page.tsx
app/(dashboard)/admin/reports/billing/page.tsx
app/(dashboard)/admin/reports/accuracy/page.tsx
app/(dashboard)/admin/security/page.tsx
app/(dashboard)/admin/integrations/page.tsx
```

Use this template:

```tsx
import { protectRoute } from '@/lib/auth/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ICON_NAME } from 'lucide-react';

export default async function PAGE_NAME() {
  await protectRoute(['ADMIN']);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">PAGE TITLE</h1>
        <p className="text-muted-foreground mt-1">
          PAGE DESCRIPTION
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ICON_NAME className="h-5 w-5" />
            SECTION TITLE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Task 4: Add Breadcrumbs to Individual Pages (Optional Enhancement)

For pages with dynamic IDs, you can add custom breadcrumbs:

```tsx
// app/(dashboard)/jobs/[id]/page.tsx
import { SimpleBreadcrumbs } from '@/components/layouts/breadcrumbs';

export default async function JobPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  
  return (
    <div>
      <SimpleBreadcrumbs 
        items={[
          { label: 'Jobs', href: '/jobs' },
          { label: job.title || 'Job Details' }
        ]} 
      />
      {/* ... */}
    </div>
  );
}
```

### Task 5: Add Command to CI Pipeline

In your CI config (GitHub Actions, etc.), add:

```yaml
- name: Check Route Permissions
  run: npm run check:permissions
```

---

## VERIFICATION CHECKLIST

After implementation, verify:

- [ ] `npm run typecheck` passes
- [ ] `npm run check:permissions` passes
- [ ] Login as ADMIN - see full navigation
- [ ] Login as REPORTER - see reporter nav only
- [ ] Login as SCOPIST - see scopist nav only
- [ ] Login as ATTORNEY - see attorney nav only
- [ ] Press ⌘K - command palette opens
- [ ] Navigate on mobile - hamburger menu works
- [ ] Visit /admin as REPORTER - redirected to /unauthorized
- [ ] Breadcrumbs show on all pages
- [ ] Dev console shows permission audit (in development)

---

## QUICK REFERENCE

### Adding a New Route

1. Add to `lib/navigation.ts` in the appropriate role's section
2. Add to `lib/auth/require-role.ts` ROUTE_PERMISSIONS
3. Add to `middleware.ts` ROUTE_ACCESS
4. Create the page with `protectRoute()`
5. Run `npm run check:permissions` to verify

### Adding a New Role

1. Add to `lib/navigation.ts` NAVIGATION object
2. Add to `lib/auth/require-role.ts` UserRole type
3. Update `lib/constants.ts` Role enum
4. Add to middleware ROUTE_ACCESS entries
5. Create role dashboard page

### Customizing Navigation Icons

Edit `lib/navigation.ts`:
```tsx
{
  label: 'My Page',
  href: '/my-page',
  icon: MyIcon,  // Import from lucide-react
  description: 'Optional description for command palette'
}
```

---

## ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│                    middleware.ts                             │
│              (First line of defense)                         │
│         Blocks unauthorized routes BEFORE render             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               lib/navigation.ts                              │
│            (Single Source of Truth)                          │
│   Defines what each role sees in sidebar, ⌘K, breadcrumbs   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │ Sidebar  │  │ ⌘K Cmd   │  │ Breadcrumbs  │
    │ (role)   │  │ (role)   │  │   (route)    │
    └──────────┘  └──────────┘  └──────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   protectRoute()                             │
│            (Server component guard)                          │
│      Second line of defense inside each page                 │
└─────────────────────────────────────────────────────────────┘
```

---

## END OF PROMPT
