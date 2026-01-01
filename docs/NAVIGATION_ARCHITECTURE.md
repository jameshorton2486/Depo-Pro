# Navigation Architecture Recommendation

## ✅ My Recommendation: **Hybrid Approach** (Best of Both Worlds)

### Why This Is The Best Approach

1. **Leverages What You Have** - Builds on existing `lib/navigation.ts`
2. **Adds Hierarchy Where Needed** - Admin gets sidebar with sections, others keep clean navbar
3. **Maintains Route-Level Security** - Auth stays separate (already good)
4. **Scalable** - Easy to add new roles or sections
5. **Progressive Enhancement** - Can migrate gradually

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Route-Level Auth                        │
│          (middleware.ts + requireRole())                 │
│  Guards access - users can't reach routes they shouldn't │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            Navigation Schema (lib/navigation.ts)         │
│  Defines what's visible - users only see what they can  │
│  access. Single source of truth for all navigation.     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Role-Aware Presentation Layer               │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Top Navbar   │  │ Sidebar      │                    │
│  │ (All Roles)  │  │ (Admin Only) │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## 📋 Implementation Phases

### Phase 1: Enhance Navigation Schema (1 hour)

**File: `lib/navigation-enhanced.ts`** ✅ Already created

- Hierarchical sections for admin
- Flat structure for simpler roles (backward compatible)
- Maintains existing API for current components

**Migration Strategy:**
```typescript
// Keep existing lib/navigation.ts for backward compatibility
// Import enhanced version where needed
import { getNavigationForRole } from '@/lib/navigation-enhanced';
```

### Phase 2: Create Admin Sidebar Component (2 hours)

**File: `components/layouts/admin-sidebar.tsx`** (new)

Features:
- Collapsible sections
- Active route highlighting
- Badges for notifications
- Responsive (drawer on mobile)

**Usage:**
```tsx
// In admin layout or pages
<AdminSidebar user={user} />
```

### Phase 3: Update Dashboard Layout (30 min)

**File: `app/(dashboard)/layout.tsx`**

Conditional rendering:
```tsx
{role === 'ADMIN' ? (
  <AdminLayout>
    <AdminSidebar />
    {children}
  </AdminLayout>
) : (
  <StandardLayout>
    <Navbar />
    {children}
  </StandardLayout>
)}
```

### Phase 4: Route Consolidation (Optional, Later)

**Long-term goal:** Remove `/attorney` prefix, use role guards instead

Current → Future:
- `/attorney/cases` → `/cases` (guarded for attorneys)
- `/attorney/transcripts` → `/transcripts` (guarded for attorneys)

**Benefits:**
- Cleaner URLs
- Easier to understand
- No URL-based access control

**Migration:** Can be done incrementally without breaking changes

## 🎯 Key Principles (Non-Negotiable)

### 1. Routes Determine Capability
```typescript
// ✅ Good: Route-level check
export default async function CasesPage() {
  await requireRole(['ATTORNEY', 'ADMIN']);
  // Page content
}

// ❌ Bad: Navigation determines access
if (!canSeeCases) return null;
```

### 2. Navigation Determines Discoverability
```typescript
// ✅ Good: Schema-driven
const nav = getNavigationForRole(role);
// Users only see links to pages they can access

// ❌ Bad: Hardcoded conditionals
{role === 'ADMIN' && <Link href="/admin/users">Users</Link>}
{role === 'ATTORNEY' && <Link href="/attorney/cases">Cases</Link>}
```

### 3. Single Source of Truth
```typescript
// ✅ Good: One schema file
// lib/navigation-enhanced.ts defines everything

// ❌ Bad: Navigation logic scattered
// Navbar has links, Sidebar has links, Command palette has links
// All need updates when adding a page
```

## 🔒 Security Model

### Route-Level Authorization (Already Implemented ✅)

**Layer 1: Middleware**
```typescript
// middleware.ts
const roleRestrictedPaths = {
  '/admin': ['ADMIN'],
  '/attorney': ['ATTORNEY', 'ADMIN'],
};
```

**Layer 2: Server Components**
```typescript
// app/(dashboard)/admin/page.tsx
export default async function AdminPage() {
  await requireRole(['ADMIN']);
  // ...
}
```

**Layer 3: API Routes**
```typescript
// app/api/admin/users/route.ts
export async function GET() {
  await requireRole(['ADMIN']);
  // ...
}
```

### Navigation as Discovery Only

Navigation never grants access - it only shows what users can access.

## 📐 Navigation Structure Examples

### Admin (Hierarchical Sidebar)
```
Dashboard (standalone)
├── Cases & Jobs
│   ├── All Cases
│   ├── Calendar
│   ├── Assignments
│   └── Booking Requests
├── Transcripts
│   ├── Live Transcripts
│   ├── Review Queue [badge: new]
│   └── Completed
├── People
│   ├── Court Reporters
│   ├── Scopists
│   ├── Attorneys
│   └── All Users
├── System
│   ├── Settings
│   ├── Security
│   ├── Audit Logs
│   ├── Integrations
│   └── Billing
└── Reports
    ├── Usage Analytics
    └── Accuracy Reports
```

### Attorney (Simple Top Nav)
```
Dashboard | Cases | Transcripts | Exhibits
```

### Reporter (Simple Top Nav)
```
Dashboard | My Jobs | Calendar | Availability
```

## 🚀 Next Steps

### Immediate (This Week)
1. ✅ Create enhanced navigation schema (done)
2. Create `AdminSidebar` component
3. Update dashboard layout to conditionally render sidebar
4. Test with different roles

### Short-term (Next Sprint)
1. Add active route highlighting to sidebar
2. Add notification badges
3. Mobile responsive drawer
4. Keyboard navigation

### Long-term (Future)
1. Route consolidation (remove `/attorney` prefix)
2. Command palette integration (already started)
3. Breadcrumbs from navigation schema
4. Searchable navigation

## 🧪 Testing Strategy

### Role Access Tests
```typescript
// Test that each role sees correct navigation
test('ADMIN sees all sections', () => {
  const nav = getNavigationForRole('ADMIN');
  expect(nav.sections).toHaveLength(5);
});

test('ATTORNEY only sees My Work section', () => {
  const nav = getNavigationForRole('ATTORNEY');
  expect(nav.sections).toHaveLength(1);
});
```

### Route Guard Tests
```typescript
// Test that unauthorized access is blocked
test('SCOPIST cannot access /admin', async () => {
  const response = await fetch('/admin', {
    headers: { cookie: scopistSession }
  });
  expect(response.status).toBe(403);
});
```

## 💡 Benefits of This Approach

1. **Single Source of Truth** - All navigation in one place
2. **Type-Safe** - TypeScript catches missing routes
3. **Easy to Audit** - Can list all accessible routes per role
4. **Scalable** - Add new roles without refactoring
5. **Maintainable** - Change URL? Update one file
6. **Testable** - Navigation is pure data, easy to test

## ❌ What This Approach Avoids

- **Navigation drift** - Links always match actual routes
- **Scattered conditionals** - No `if (role === 'ADMIN')` everywhere
- **Hardcoded URLs** - All URLs come from schema
- **Inconsistent UX** - Same navigation logic for all components

## 🎨 UI/UX Considerations

### Admin Sidebar
- Collapsible sections (default: all expanded)
- Active route highlighting
- Badge support for notifications
- Search/filter (future)
- Keyboard shortcuts (future)

### Top Navbar (Other Roles)
- Horizontal, space-efficient
- Dropdown menus for sections (if needed)
- Mobile hamburger menu
- Active state indicators

## 📚 Related Files

- `lib/navigation.ts` - Current flat navigation (keep for compatibility)
- `lib/navigation-enhanced.ts` - New hierarchical navigation ✅
- `components/layouts/navbar.tsx` - Current top navbar
- `components/layouts/admin-sidebar.tsx` - New sidebar (to create)
- `app/(dashboard)/layout.tsx` - Dashboard layout (to update)
- `middleware.ts` - Route-level auth (already good)

## 🔄 Migration Path

1. **Phase 1:** Create enhanced schema (non-breaking)
2. **Phase 2:** Create sidebar component (parallel to navbar)
3. **Phase 3:** Conditionally render sidebar for admins
4. **Phase 4:** Gradually migrate other components to use enhanced schema
5. **Phase 5:** Deprecate old flat schema (if desired)

**Zero downtime** - Everything can be done incrementally.
