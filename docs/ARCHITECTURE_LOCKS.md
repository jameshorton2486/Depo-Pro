# ARCHITECTURE LOCKS

> **Version:** v0.9-stable  
> **Created:** January 2, 2026  
> **Status:** LOCKED — Changes require team review

---

## Purpose

This document declares architectural decisions that are **locked** for Depo-Pro. These are not suggestions — they are constraints that prevent drift and maintain system integrity.

Violating these locks without explicit approval will introduce technical debt and security risks.

---

## 🔒 LOCKED DECISIONS

### 1. Permissions: Single Source of Truth

```
route-access.ts is the ONLY source of truth for permissions
```

**Location:** `lib/permissions/route-access.ts`

**Rules:**
- All route permissions defined in `ROUTE_ACCESS` and `API_ACCESS`
- All permission checks use `hasRouteAccess()` or `hasApiAccess()`
- No inline role checks like `if (role === 'ADMIN')` in components
- No hardcoded role arrays in UI code

**Why:** Scattered permission logic is impossible to audit and creates security gaps.

---

### 2. Navigation: Globally Unique, Role-Scoped

```
Navigation IDs must be globally unique and role-scoped
```

**Location:** `lib/navigation/` + `components/layout/`

**Rules:**
- Every nav item has a unique `id`
- Nav items filtered by role using centralized permissions
- No duplicate nav items across different role sections
- Breadcrumbs derive from same permission system

**Why:** Duplicate or conflicting navigation creates user confusion and permission leaks.

---

### 3. UI Components: Never Enforce Permissions

```
UI components never enforce permissions directly
```

**Rules:**
- Components receive `canEdit`, `canDelete`, `canView` as props
- Components never import role types or check roles internally
- Permission decisions made at page/route level, passed down
- Components are role-agnostic and reusable

**Example (Correct):**
```typescript
// Page level
const canEdit = hasRouteAccess('/jobs/edit', userRole);
return <JobCard job={job} canEdit={canEdit} />;

// Component level
function JobCard({ job, canEdit }: Props) {
  return canEdit ? <EditButton /> : null;
}
```

**Example (WRONG):**
```typescript
// Component checking role directly — DON'T DO THIS
function JobCard({ job, userRole }: Props) {
  if (userRole === 'ADMIN' || userRole === 'REPORTER') {
    return <EditButton />;
  }
}
```

**Why:** Components with embedded permission logic cannot be tested, audited, or reused safely.

---

### 4. Transcript Finalization: Irreversible Without Override

```
Transcript finalization is irreversible without admin override
```

**Rules:**
- `FINALIZED` status = hard lock on all edits
- Only `ADMIN` role can unlock
- Every unlock creates audit log entry with reason
- No "soft finalize" or "temporary lock" states

**State Machine:**
```
DRAFT → IN_REVIEW → FINALIZED → DELIVERED
                ↑        |
                └────────┘ (ADMIN only, with audit)
```

**Why:** Legal transcripts must be trustworthy. Arbitrary edits after finalization destroy that trust.

---

### 5. Exports: Immutable Snapshots

```
Exports are immutable snapshots — never mutate source data
```

**Rules:**
- Export generates a new file from current state
- Export never modifies the source transcript
- Export history logged for audit
- Re-exporting creates new file, doesn't update old one

**Why:** Exports may be submitted as legal evidence. Mutating them creates liability.

---

### 6. Business Logic: Server-Side Only

```
Business logic stays server-side
```

**Rules:**
- Validation logic in API routes, not components
- State transitions handled by services, not UI
- Calculations (pricing, dates, permissions) done server-side
- Client receives computed results, not raw data to compute

**Why:** Client-side logic can be bypassed, manipulated, or inconsistent across devices.

---

## 🚫 EXPLICITLY FORBIDDEN

These patterns are banned:

| Pattern | Why Forbidden |
|---------|---------------|
| `if (role === 'X')` in components | Use permission props |
| Direct Prisma calls in components | Use API routes |
| `// TODO: add permission check` | Add it now or don't merge |
| Commented-out permission logic | Delete it or implement it |
| Feature flags that bypass permissions | Flags control features, not security |

---

## 📋 HOW TO PROPOSE CHANGES

If you believe an architectural lock should be modified:

1. **Document the problem** the current lock creates
2. **Propose the change** with clear scope
3. **Show the migration path** for existing code
4. **Get explicit approval** before implementing
5. **Update this document** after approval

Changes made without this process will be reverted.

---

## 📅 REVIEW SCHEDULE

This document should be reviewed:
- Before each major version release
- When adding new roles
- When adding new route categories
- After any security incident

---

**END OF ARCHITECTURE LOCKS**
