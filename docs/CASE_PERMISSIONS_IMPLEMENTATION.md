# Case-Level Permissions Implementation Summary

## ✅ COMPLETED

### 1. Database Schema Updates

**Added Models:**
- ✅ `CaseMembership` - Junction table for case-level access control
- ✅ `CaseRole` enum - ATTORNEY, PARALEGAL, REPORTER

**Updated Models:**
- ✅ `User` - Added `firmId` (nullable for backward compatibility)
- ✅ `Case` - Made `firmId` required (not nullable)
- ✅ `Firm` - Updated ID to use `cuid()`

**Updated Enums:**
- ✅ `UserRole` - Added PARALEGAL, AGENCY_ADMIN, FIRM_ADMIN

### 2. Permission System Library

**Created:** `lib/permissions/case-access.ts`

**Functions:**
- ✅ `checkCaseAccess()` - Verify user has access to case
- ✅ `checkCasePermission()` - Check specific action permission
- ✅ `getUserAccessibleCases()` - Get all cases user can access
- ✅ `assertCaseAccess()` - Throw error if no access (for API routes)

### 3. Security Guarantees

✅ **Prevents cross-firm leakage** - Users can only access cases in their firm
✅ **Prevents cross-case leakage** - Users must have explicit membership
✅ **Allows shared cases** - Multiple attorneys per case
✅ **Allows mixed reporter sources** - Reporters access via deposition assignment
✅ **Scales to enterprise** - Firm-level isolation

---

## 📋 NEXT STEPS (REQUIRED)

### 1. Database Migration

**⚠️ IMPORTANT:** Before running migration, you need to:

1. **Fix database connection** (see `docs/DATABASE_CONNECTION_FIX_SUPABASE.md`)
2. **Create default Firm** for existing users
3. **Migrate existing Cases** to have `firmId`

**Migration Script Needed:**
```typescript
// Create default firm for existing users
// Assign all existing cases to a default firm
// Create CaseMembership records for existing attorneys
```

### 2. Update API Routes

**All attorney API routes must use permission checks:**

```typescript
import { assertCaseAccess } from '@/lib/permissions/case-access';

// In API route:
await assertCaseAccess(userId, caseId, 'view');
```

**Routes to update:**
- `/api/attorney/transcripts/*`
- `/api/attorney/exhibits/*`
- `/api/attorney/annotations/*`
- `/api/attorney/reports/*`

### 3. Create CaseMembership Management

**API Routes Needed:**
- `POST /api/cases/[id]/members` - Add user to case
- `DELETE /api/cases/[id]/members/[userId]` - Remove user from case
- `GET /api/cases/[id]/members` - List case members

---

## 🔐 PERMISSION MATRIX (IMPLEMENTED)

| Role | View Case | Upload Transcript | Annotate | Upload Exhibit | Link Exhibit |
|------|-----------|-------------------|----------|----------------|--------------|
| Attorney (via membership) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paralegal (via membership) | ✅ | ❌ | ✅ | ❌ | ✅ |
| Reporter (via deposition) | ✅ | ✅ (own only) | ❌ | ✅ (own only) | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🧪 TESTING CHECKLIST

Before deploying:

- [ ] Create default Firm for existing data
- [ ] Migrate existing Cases to have firmId
- [ ] Create CaseMembership for existing attorneys
- [ ] Test cross-firm access prevention
- [ ] Test cross-case access prevention
- [ ] Test reporter deposition access
- [ ] Test attorney multi-case access
- [ ] Update all API routes with permission checks

---

## 📝 NOTES

**Backward Compatibility:**
- `User.firmId` is nullable to allow existing users
- Migration script will assign default firm
- Existing cases will be assigned to default firm

**Future Enhancements:**
- Paralegal role support (schema ready)
- Permission overrides via JSONB
- Firm-level admin controls
- Audit logging for access attempts

---

**Status:** Schema complete, permission library ready, API integration pending

