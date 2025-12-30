# DEPO-PRO PHASE 5: Advanced Calendar Capabilities

## Complete Implementation Guide for Steps 4-6

---

## 📋 PHASE 5 SUMMARY

| Step | Feature | Status | Files |
|------|---------|--------|-------|
| **Step 4** | External Calendar Sync | Ready | 8 files |
| **Step 5** | Smart Scheduling Suggestions | Ready | 4 files |
| **Step 6** | UX Hardening & Validation | Ready | 5 files |

---

## 🔹 STEP 4: External Calendar Sync (Read-Only → Bi-Directional)

### Objective
Safely integrate external calendars (Google/Outlook) without breaking Depo-Pro's internal scheduling authority.

### Key Files

| File | Purpose | Destination |
|------|---------|-------------|
| `01-schema-phase5-external-calendar.prisma` | Prisma schema additions | Reference for schema.prisma |
| `02-enums-phase5-additions.ts` | New enums | Merge into lib/enums.ts |
| `03-lib-external-calendar-types.ts` | Provider interface | lib/external-calendar/types.ts |
| `04-lib-external-calendar-google-provider.ts` | Google Calendar API | lib/external-calendar/google-provider.ts |
| `05-lib-external-calendar-sync-service.ts` | Sync orchestration | lib/external-calendar/sync-service.ts |
| `08-api-external-calendar-route.ts` | Connection management | app/api/external-calendar/route.ts |
| `09-api-google-callback-route.ts` | OAuth callback | app/api/external-calendar/google/callback/route.ts |

### Sync Modes

```typescript
enum ExternalCalendarSyncMode {
  READ_ONLY        // Default: Only read external events
  PUSH_INTERNAL    // Push Depo-Pro events to external
  BIDIRECTIONAL    // Full two-way sync (use with caution)
}
```

### Conflict Resolution Rules (HARD GUARDRAILS)

1. **Internal Depo-Pro events ALWAYS win**
2. External events marked as `EXTERNAL_BLOCK`
3. External events render visually distinct (striped/muted)
4. External events CANNOT be mutated internally
5. No auto-rescheduling in Step 4

### Visual Rendering

External events should be displayed with:
- Striped background pattern
- 60% opacity muted colors
- "External" badge with provider icon
- Non-draggable, non-resizable
- Click shows info but no edit options

---

## 🔹 STEP 5: Smart Scheduling Suggestions (Advisory Only)

### Objective
Introduce AI-assisted scheduling intelligence without automatic changes.

### Key Files

| File | Purpose | Destination |
|------|---------|-------------|
| `06-lib-scheduling-suggestion-engine.ts` | Suggestion generation | lib/scheduling/suggestion-engine.ts |
| `10-api-suggestions-route.ts` | Suggestion API | app/api/calendar/suggestions/route.ts |
| `12-component-scheduling-suggestion.tsx` | UI component | components/calendar/scheduling-suggestion.tsx |

### Suggestion Engine Analyzes

- Reporter availability
- External calendar blocks
- Historical durations by event type
- Time-of-day success patterns
- Workload balance

### Output Format

```typescript
interface SchedulingSuggestion {
  id: string;
  type: SchedulingSuggestionType;
  recommendedStart: Date;
  recommendedEnd: Date;
  confidenceScore: number;        // 0-100
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string[];
  metadata?: {
    reporterId?: string;
    reporterName?: string;
    alternativeSlots?: TimeSlot[];
    durationEstimateMinutes?: number;
    historicalSuccessRate?: number;
  };
}
```

### UI Presentation Rules

- ✅ Suggestions appear as hints/badges/tooltips
- ✅ Visually distinct (light blue background)
- ✅ Show confidence percentage
- ✅ Rationale visible on expand
- ✅ **Require explicit "Apply" action**
- ✅ Include "Dismiss" option
- ❌ NEVER auto-apply

### Role-Based Visibility

| Role | View | Apply |
|------|------|-------|
| ADMIN | All suggestions | Yes |
| AGENCY | All suggestions | Yes |
| COURT_REPORTER | Availability-based only | Yes |
| ATTORNEY | All (view only) | No |

---

## 🔹 STEP 6: UX Hardening, Edge Cases & Production Readiness

### Objective
Make the calendar safe, predictable, and professional under real-world usage.

### Key Files

| File | Purpose | Destination |
|------|---------|-------------|
| `07-lib-scheduling-validation-service.ts` | Validation engine | lib/scheduling/validation-service.ts |
| `13-component-confirmation-modals.tsx` | Confirmation dialogs | components/calendar/confirmation-modals.tsx |
| `14-api-validate-move-route.ts` | Move validation API | app/api/calendar/events/[id]/validate-move/route.ts |

### Drag-and-Drop Validation Checks

```typescript
const VALIDATION_CHECKS = [
  'OVERLAP',              // Events overlap
  'DOUBLE_BOOKING',       // Reporter double-booked
  'PAST_TIME',            // Scheduling in the past
  'TOO_SHORT_NOTICE',     // Less than 24 hours notice
  'OUTSIDE_HOURS',        // Outside business hours
  'EXTERNAL_CONFLICT',    // Conflicts with external event
  'DURATION_MISMATCH',    // Duration too short/long
];
```

### Validation Severity Levels

| Severity | Behavior | Override |
|----------|----------|----------|
| **ERROR** | Blocks the action | No |
| **WARNING** | Allows with confirmation | Yes |
| **INFO** | Informational only | Yes |

### Confirmation Modals Required For

- ✅ Changes within 24 hours of event
- ✅ Reporter reassignment
- ✅ External ↔ internal conflicts
- ✅ Any mutation affecting a linked Job
- ✅ Moving event 7+ days from original

### Performance Optimizations

```typescript
// Memoize calendar renders
const CalendarView = React.memo(function CalendarView({ ... }));

// Cache availability lookups (30 second TTL)
const availabilityCache = new Map<string, CacheEntry>();

// Debounce drag events (100ms)
const debouncedValidation = useMemo(
  () => debounce(validateMove, 100),
  []
);
```

---

## 🛠 INSTALLATION

### Option 1: PowerShell Script

```powershell
# 1. Copy Phase 5 files to work_files directory
# 2. Run from depo-pro root:
.\work_files\install-phase5.ps1
```

### Option 2: Manual Installation

```bash
# Create directories
mkdir -p lib/external-calendar
mkdir -p lib/scheduling
mkdir -p app/api/external-calendar/google/callback
mkdir -p app/api/calendar/suggestions
mkdir -p app/api/calendar/events/[id]/validate-move

# Copy files per the mapping tables above
```

### Option 3: Cursor AI

Copy the contents of `PHASE5_CURSOR_MEGA_PROMPT.md` into Cursor.

---

## 📝 SCHEMA MIGRATION

### 1. Add Enums to prisma/schema.prisma

```prisma
enum ExternalCalendarSyncMode {
  READ_ONLY
  PUSH_INTERNAL
  BIDIRECTIONAL
}

enum ExternalCalendarProvider {
  GOOGLE
  OUTLOOK
  APPLE
}

enum ExternalEventSyncStatus {
  SYNCED
  PENDING
  CONFLICT
  FAILED
  DELETED
}
```

### 2. Add EXTERNAL_BLOCK to CalendarEventStatus

```prisma
enum CalendarEventStatus {
  REQUESTED
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  RESCHEDULED
  CONVERTED
  EXTERNAL_BLOCK  // NEW
}
```

### 3. Add New Models

See `01-schema-phase5-external-calendar.prisma` for:
- `ExternalCalendarConnection`
- `ExternalCalendarEvent`
- `ExternalCalendarSyncLog`

### 4. Run Migration

```bash
npx prisma migrate dev --name phase5_external_calendar
npx prisma generate
```

---

## 🔐 ENVIRONMENT VARIABLES

Add to `.env`:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=${NEXTAUTH_URL}/api/external-calendar/google/callback
```

### Google Cloud Console Setup

1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI
4. Request `calendar.readonly` scope (minimum)
5. For PUSH_INTERNAL mode, add `calendar.events` scope

---

## ✅ VERIFICATION CHECKLIST

### Step 4: External Calendar Sync
- [ ] Google OAuth flow completes
- [ ] External events appear in calendar view
- [ ] External events are visually distinct
- [ ] External events cannot be dragged/edited
- [ ] Sync logs are created
- [ ] Conflicts are detected and displayed
- [ ] Internal events are NEVER overwritten

### Step 5: Smart Suggestions
- [ ] Suggestions appear for new events
- [ ] Confidence scores display correctly
- [ ] Rationale is visible on expand
- [ ] "Apply" requires explicit click
- [ ] "Dismiss" removes suggestion
- [ ] Role restrictions enforced
- [ ] No automatic DB writes

### Step 6: UX Hardening
- [ ] Invalid drops are blocked with explanation
- [ ] Confirmation modals appear for sensitive changes
- [ ] Drag-drop is smooth (no lag)
- [ ] Reporter conflicts block drop
- [ ] Past scheduling is blocked
- [ ] All operations are audit logged

---

## 🚨 CRITICAL REMINDERS

### ❌ NEVER DO:
- Auto-apply suggestions
- Silently overwrite internal events
- Allow external event mutation internally
- Skip confirmation for imminent changes
- Bypass tenant isolation
- Make silent mutations

### ✅ ALWAYS DO:
- Log all sync operations
- Show clear conflict indicators
- Require explicit user action
- Validate before committing
- Check role permissions
- Enforce tenant boundaries

---

## 🎯 PHASE 5 COMPLETION CRITERIA

Phase 5 is complete when:

1. **External Calendars**
   - Google Calendar connects via OAuth
   - External events import and display
   - Conflicts are detected and surfaced
   - No internal event data is overwritten
   - Sync is fully audited

2. **Smart Suggestions**
   - Suggestions generate for scheduling
   - UI shows confidence and rationale
   - Apply requires explicit action
   - Role permissions enforced
   - Zero background mutations

3. **UX Hardening**
   - All edge cases handled gracefully
   - No accidental mutations possible
   - UI remains responsive
   - Full audit trail exists
   - Production-ready quality

---

## 📁 COMPLETE FILE LIST

```
Phase 5 Files:
├── 01-schema-phase5-external-calendar.prisma
├── 02-enums-phase5-additions.ts
├── 03-lib-external-calendar-types.ts
├── 04-lib-external-calendar-google-provider.ts
├── 05-lib-external-calendar-sync-service.ts
├── 06-lib-scheduling-suggestion-engine.ts
├── 07-lib-scheduling-validation-service.ts
├── 08-api-external-calendar-route.ts
├── 09-api-google-callback-route.ts
├── 10-api-suggestions-route.ts
├── 11-component-external-event-badge.tsx
├── 12-component-scheduling-suggestion.tsx
├── 13-component-confirmation-modals.tsx
├── 14-api-validate-move-route.ts
├── install-phase5.ps1
├── PHASE5_CURSOR_MEGA_PROMPT.md
└── PHASE5_README.md (this file)
```

---

**Phase 5 Implementation Complete**
