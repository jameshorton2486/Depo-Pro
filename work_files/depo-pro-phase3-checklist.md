# DEPO-PRO PHASE 3: Implementation Checklist

**Project:** Depo-Pro Calendar → Job Controlled Mutations  
**Target Completion:** Before Phase 4 (Drag-and-Drop Scheduling)  
**Prerequisites:** Calendar read-only UI complete, backend foundation stable

---

## 🔧 BACKEND IMPLEMENTATION

### 1. Schema Updates
- [ ] Add `CONVERTED` to `CalendarEventStatus` enum
- [ ] Add `jobId` field to `CalendarEvent` model (unique, optional)
- [ ] Add `CalendarEvent` → `Job` relation
- [ ] Add inverse `sourceEvent` relation on `Job` model
- [ ] Add `assignedReporterId` field to `Job` model
- [ ] Add `assignedReporter` relation on `Job` model
- [ ] Create `AuditLog` model with required fields
- [ ] Add `auditLogs` relation to `User` model
- [ ] Add `reporterAssignments` relation to `User` model
- [ ] Run `npx prisma migrate dev --name phase3_calendar_mutations`
- [ ] Run `npx prisma generate`
- [ ] Verify migration applied successfully

### 2. Utility Files
- [ ] Create `lib/audit.ts` with `createAuditLog()` function
- [ ] Create `lib/rbac.ts` with permission matrix
- [ ] Create `lib/rbac-client.ts` for client-side permission checks
- [ ] Verify RBAC matrix matches spec:
  | Role | Convert to Job | Assign Reporter |
  |------|----------------|-----------------|
  | ADMIN | ✅ | ✅ |
  | AGENCY | ✅ | ✅ |
  | FIRM_MANAGER | ✅ | ❌ |
  | COURT_REPORTER | ❌ | ✅ |
  | ATTORNEY | ❌ | ❌ |

### 3. Convert Calendar Event → Job API
**File:** `app/api/calendar/[eventId]/convert-to-job/route.ts`

- [ ] Implement authentication check (401 if not logged in)
- [ ] Implement authorization check (403 if wrong role)
- [ ] Handle Next.js 15 async params correctly
- [ ] Fetch calendar event from database
- [ ] Return 404 if event not found
- [ ] Return 409 if event already converted (idempotency)
- [ ] Validate required fields (title, scheduledStart, firmId)
- [ ] Return 400 if validation fails
- [ ] Use Prisma transaction for atomicity
- [ ] Create Job record with mapped fields
- [ ] Update CalendarEvent with jobId and CONVERTED status
- [ ] Create AuditLog entry within transaction
- [ ] Return success response with job and event data
- [ ] Add try/catch with 500 error response

### 4. Assign Reporter to Job API
**File:** `app/api/jobs/[jobId]/assign-reporter/route.ts`

**POST (Assign):**
- [ ] Implement authentication check
- [ ] Implement authorization check
- [ ] Parse request body for `reporterId`
- [ ] Return 400 if reporterId missing
- [ ] Verify job exists (404 if not)
- [ ] Verify reporter exists (404 if not)
- [ ] Verify reporter has COURT_REPORTER role (400 if not)
- [ ] Verify reporter belongs to same firm/agency (403 if not)
- [ ] Store previous assignment for audit
- [ ] Update job with new reporter
- [ ] Create AuditLog entry
- [ ] Return updated job with reporter details

**DELETE (Unassign):**
- [ ] Implement authentication check
- [ ] Implement authorization check
- [ ] Verify job exists
- [ ] Store previous reporter for audit
- [ ] Set assignedReporterId to null
- [ ] Create AuditLog entry
- [ ] Return success response

### 5. Get Available Reporters API
**File:** `app/api/reporters/route.ts`

- [ ] Implement authentication check
- [ ] Parse query params (firmId, agencyId)
- [ ] Query users with COURT_REPORTER role
- [ ] Filter by firm/agency access
- [ ] Return reporter list (id, name, email)
- [ ] Order by name ascending

---

## 💻 UI IMPLEMENTATION

### 6. Convert to Job Button Component
**File:** `components/calendar/convert-to-job-button.tsx`

- [ ] Accept props: eventId, eventTitle, isConverted, existingJobId, onConversionComplete
- [ ] Check user permission client-side
- [ ] Return null if no permission
- [ ] Show disabled state if already converted
- [ ] Implement AlertDialog for confirmation
- [ ] Show warning text: "This action cannot be undone"
- [ ] Handle loading state during API call
- [ ] Call convert-to-job API on confirm
- [ ] Show success toast on completion
- [ ] Show error toast on failure
- [ ] Call onConversionComplete callback with jobId

### 7. Assign Reporter Dropdown Component
**File:** `components/jobs/assign-reporter-dropdown.tsx`

- [ ] Accept props: jobId, firmId, agencyId, currentReporterId, currentReporterName, onAssignmentChange
- [ ] Check user permission client-side
- [ ] Show read-only view for users without permission
- [ ] Fetch reporters on mount using useEffect
- [ ] Show loading state while fetching
- [ ] Render Select component with reporter options
- [ ] Handle reporter selection (POST to API)
- [ ] Show unassign button (X) when reporter assigned
- [ ] Handle unassign (DELETE to API)
- [ ] Show success/error toasts
- [ ] Call onAssignmentChange callback

### 8. Event Status Badge Component
**File:** `components/calendar/event-status-badge.tsx`

- [ ] Accept props: status, hasJob
- [ ] Define status config (label, variant, icon)
- [ ] SCHEDULED: Calendar icon, outline variant
- [ ] CONFIRMED: CheckCircle icon, default variant
- [ ] CONVERTED: Lock icon, secondary variant
- [ ] CANCELLED: XCircle icon, destructive variant
- [ ] Show "(Job Created)" suffix when converted with job

### 9. Event Detail Panel Integration
**File:** `components/calendar/event-detail-panel.tsx`

- [ ] Display event title and case info
- [ ] Show EventStatusBadge
- [ ] Display date/time with proper formatting
- [ ] Display location (if exists)
- [ ] Display Zoom link (if exists)
- [ ] Display notes (if exists)
- [ ] Show ConvertToJobButton when NOT converted
- [ ] Show "Linked Job" section when converted
- [ ] Show "View Job" button linking to job page
- [ ] Show AssignReporterDropdown when job exists
- [ ] Handle onConversionComplete with router.refresh()

### 10. TypeScript Types
**File:** `types/next-auth.d.ts`

- [ ] Extend Session.user with: id, email, name, role, firmId, agencyId
- [ ] Extend User with same fields
- [ ] Extend JWT with: id, role, firmId, agencyId

---

## 🧪 TESTING

### Backend API Tests

**Convert to Job:**
- [ ] ✅ Convert valid event → creates job, updates event, creates audit log
- [ ] ✅ Duplicate conversion → returns 409 Conflict
- [ ] ✅ Missing required fields → returns 400 Bad Request
- [ ] ✅ Event not found → returns 404 Not Found
- [ ] ✅ Unauthorized role → returns 403 Forbidden
- [ ] ✅ Unauthenticated → returns 401 Unauthorized

**Assign Reporter:**
- [ ] ✅ Assign valid reporter → updates job, creates audit log
- [ ] ✅ Unassign reporter → sets to null, creates audit log
- [ ] ✅ Invalid reporter (not COURT_REPORTER) → returns 400
- [ ] ✅ Reporter not in firm/agency → returns 403
- [ ] ✅ Job not found → returns 404
- [ ] ✅ Unauthorized role → returns 403

**Get Reporters:**
- [ ] ✅ Returns only COURT_REPORTER users
- [ ] ✅ Filters by firm/agency correctly
- [ ] ✅ Returns proper fields (id, name, email)

### UI Tests

**Convert to Job Button:**
- [ ] ✅ Visible only to ADMIN/AGENCY/FIRM_MANAGER
- [ ] ✅ Hidden for COURT_REPORTER/ATTORNEY
- [ ] ✅ Shows "Converted to Job" disabled state after conversion
- [ ] ✅ Confirmation modal appears on click
- [ ] ✅ Success toast appears after conversion
- [ ] ✅ Error toast appears on failure

**Assign Reporter Dropdown:**
- [ ] ✅ Visible only to ADMIN/AGENCY/COURT_REPORTER
- [ ] ✅ Shows read-only for other roles
- [ ] ✅ Dropdown populates with correct reporters
- [ ] ✅ Selection triggers assignment
- [ ] ✅ X button triggers unassignment
- [ ] ✅ Loading states work correctly

**Event Status Badge:**
- [ ] ✅ Shows correct status for each state
- [ ] ✅ Shows lock icon for CONVERTED
- [ ] ✅ Shows "(Job Created)" when job linked

### Audit Log Verification
- [ ] ✅ CALENDAR_CONVERT_TO_JOB logged with event snapshot
- [ ] ✅ JOB_ASSIGN_REPORTER logged with previous/new reporter
- [ ] ✅ JOB_UNASSIGN_REPORTER logged with previous reporter
- [ ] ✅ All logs include actorUserId and timestamp

---

## ✅ EXIT CRITERIA

Before proceeding to Phase 4, ALL items must be checked:

- [ ] `npm run typecheck` passes with ZERO errors
- [ ] `npm run build` completes successfully
- [ ] `npm run lint` passes (or only acceptable warnings)
- [ ] No calendar mutation occurs without audit log entry
- [ ] All RBAC rules enforced server-side (not just UI)
- [ ] Converted events show CONVERTED status and lock icon
- [ ] Converted events cannot be converted again (409 response)
- [ ] Jobs created from events contain all required fields
- [ ] Reporter assignment works for authorized roles only
- [ ] All API routes return proper HTTP status codes
- [ ] All UI components show correct role-based visibility
- [ ] All success/error toasts display correctly

---

## 📁 FILES CREATED

| File | Status |
|------|--------|
| `lib/audit.ts` | ⬜ |
| `lib/rbac.ts` | ⬜ |
| `lib/rbac-client.ts` | ⬜ |
| `app/api/calendar/[eventId]/convert-to-job/route.ts` | ⬜ |
| `app/api/jobs/[jobId]/assign-reporter/route.ts` | ⬜ |
| `app/api/reporters/route.ts` | ⬜ |
| `components/calendar/convert-to-job-button.tsx` | ⬜ |
| `components/calendar/event-status-badge.tsx` | ⬜ |
| `components/calendar/event-detail-panel.tsx` | ⬜ |
| `components/jobs/assign-reporter-dropdown.tsx` | ⬜ |

## 📁 FILES MODIFIED

| File | Status |
|------|--------|
| `prisma/schema.prisma` | ⬜ |
| `types/next-auth.d.ts` | ⬜ |

---

## 🚀 NEXT PHASE

Once all exit criteria are met, proceed to **Phase 4: Drag-and-Drop Scheduling**
- Drag-and-drop rescheduling
- Time conflict detection
- Auto-rescheduling suggestions
- Calendar edits post-conversion (with audit)
