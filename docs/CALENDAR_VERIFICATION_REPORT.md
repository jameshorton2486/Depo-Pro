# Calendar UI Readiness Verification Report

**Date:** 2025-01-26  
**Status:** ⚠️ **NOT READY** - Critical issues found

---

## ✅ 1. Data Model & Prisma

### CalendarEvent Model
- ✅ **PASS** - Model exists with all required fields:
  - `id` (String @id)
  - `startTime` / `endTime` (DateTime)
  - `status` (CalendarEventStatus enum)
  - `assignedReporterId` (nullable)
  - `createdAt`, `updatedAt`

### Enum Alignment
- ❌ **FAIL** - `CalendarEventStatus` and `EventType` are **NOT** in `lib/constants.ts`
- ⚠️ **RISK** - API routes use string literals in Zod schemas instead of constants
- **Action Required:** Add enums to `lib/constants.ts` and update API routes

---

## ⚠️ 2. API Routes (Calendar Data Contract)

### GET /api/calendar/events
- ✅ Accepts date range (`start`, `end`)
- ✅ Accepts optional `userId` (via `reporterId`)
- ✅ Returns ISO dates
- ❌ **FAIL** - Returns UI-specific formatting:
  - Lines 194-232: Transforms data for FullCalendar format
  - Includes `backgroundColor`, `borderColor` (UI concerns)
  - Includes formatted `name` fields (should be client-side)
- **Action Required:** Remove UI formatting, return raw data

### POST /api/calendar/events
- ✅ Creates events safely
- ✅ Validates enum + date logic
- ✅ Checks for conflicts
- ❌ **FAIL** - No cache revalidation after create

### PATCH /api/calendar/events/[id]
- ✅ Updates only allowed fields
- ✅ Role-based permission checks
- ❌ **FAIL** - No cache revalidation after update

### DELETE /api/calendar/events/[id]
- ✅ Hard delete (no soft delete, but acceptable)
- ❌ **FAIL** - No cache revalidation after delete

---

## ✅ 3. Permissions & Auth

- ✅ **PASS** - All routes use server-side auth
- ✅ **PASS** - Role checks: `session.user.role !== 'ADMIN'`
- ✅ **PASS** - Ownership checks: `assignedReporterId === user.id`
- ✅ **PASS** - No client-side role checks

---

## ✅ 4. Timezone Handling

- ✅ **PASS** - Dates stored as UTC in DB (`DateTime` type)
- ✅ **PASS** - API accepts ISO datetime strings
- ✅ **PASS** - No `toLocaleString()` in API routes
- ✅ **PASS** - Timezone field stored separately (`timezone: String`)

---

## ❌ 5. Server ↔ Client Boundary

- ❌ **FAIL** - Server returns UI-specific data:
  ```typescript
  // Lines 194-232 in app/api/calendar/events/route.ts
  backgroundColor: getStatusColor(event.status),  // ❌ UI concern
  borderColor: getStatusColor(event.status),      // ❌ UI concern
  name: `${user.firstName} ${user.lastName}`,    // ❌ Formatting
  ```
- **Action Required:** Remove all UI formatting, return raw Prisma data

---

## ❌ 6. Caching & Revalidation

- ❌ **FAIL** - No `revalidatePath` or `revalidateTag` calls
- ❌ **FAIL** - No cache invalidation after:
  - Create (POST)
  - Update (PATCH)
  - Delete (DELETE)
- **Action Required:** Add revalidation to all mutation endpoints

---

## ✅ 7. Error Surfaces

- ✅ **PASS** - Returns meaningful HTTP status codes:
  - 401 (Unauthorized)
  - 403 (Forbidden)
  - 400 (Validation errors)
  - 409 (Conflicts)
  - 500 (Server errors)
- ✅ **PASS** - Zod validation provides error details

---

## ❌ 8. File Structure Sanity

- ❌ **FAIL** - No `lib/calendar/` directory
- ❌ **FAIL** - Calendar logic mixed in API routes
- **Action Required:** Create:
  - `lib/calendar/types.ts`
  - `lib/calendar/queries.ts`
  - `lib/calendar/mutations.ts`

---

## ✅ 9. Git Hygiene

- ✅ **PASS** - Schema changes committed
- ✅ **PASS** - Lint errors fixed
- ⚠️ **WARNING** - Multiple untracked files (docs, scripts)

---

## 🔴 Critical Issues Summary

1. **UI Formatting in API** - Remove FullCalendar-specific transformations
2. **Missing Enums** - Add `CalendarEventStatus` and `EventType` to `lib/constants.ts`
3. **No Cache Revalidation** - Add `revalidatePath` after mutations
4. **Missing Calendar Library** - Create `lib/calendar/` structure

---

## ✅ Fix Priority

1. **P0 (Blocking):** Remove UI formatting from API
2. **P0 (Blocking):** Add enum constants
3. **P1 (High):** Add cache revalidation
4. **P2 (Medium):** Create calendar library structure

---

## 🟢 Verdict

**NOT READY** for Calendar UI until:
- ✅ UI formatting removed from API
- ✅ Enums added to constants
- ✅ Cache revalidation added

**Estimated Fix Time:** 30-45 minutes

