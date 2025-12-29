# PHASE 5 CURSOR MEGA-PROMPT
## Advanced Calendar Capabilities: External Sync, Smart Suggestions & UX Hardening

**Copy this entire prompt into Cursor AI to implement Phase 5 Steps 4-6**

---

## 🎯 PHASE 5 OVERVIEW

Phase 5 completes the advanced calendar system with three major capability sets:

| Step | Feature | Safety Level |
|------|---------|--------------|
| **Step 4** | External Calendar Sync (Google/Outlook) | READ_ONLY default |
| **Step 5** | Smart Scheduling Suggestions | Advisory only |
| **Step 6** | UX Hardening & Production Readiness | Full validation |

### 🛑 HARD CONSTRAINTS (NON-NEGOTIABLE)

```typescript
const PHASE5_HARD_CONSTRAINTS = {
  // Internal Depo-Pro events ALWAYS win conflicts
  internalEventPriority: 'ABSOLUTE',
  
  // External events can NEVER be mutated internally
  externalEventMutation: 'FORBIDDEN',
  
  // Suggestions require EXPLICIT user action
  autoApplySuggestions: false,
  
  // ALL operations require audit logging
  auditRequired: true,
  
  // Tenant isolation on EVERY operation
  tenantIsolation: 'ENFORCED',
  
  // No silent failures - always surface errors
  silentFailures: false,
};
```

---

## 📁 FILES TO INSTALL

### Step 1: Create Directory Structure

```bash
# Create directories
mkdir -p lib/external-calendars
mkdir -p lib/suggestions
mkdir -p lib/calendar
mkdir -p app/api/calendar/oauth/google/callback
mkdir -p app/api/calendar/external/connections
mkdir -p app/api/calendar/external/[connectionId]/sync
mkdir -p app/api/calendar/suggestions
mkdir -p app/api/calendar/events/[id]/validate-move
mkdir -p components/calendar
```

### Step 2: Schema Additions (Prisma)

Add these to `prisma/schema.prisma`:

**New Enums:**
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

enum ExternalEventSource {
  INTERNAL
  EXTERNAL
  SYNCED
}

enum CalendarSyncStatus {
  PENDING
  SYNCING
  SYNCED
  FAILED
  CONFLICT
}

enum ConflictResolutionStrategy {
  INTERNAL_WINS
  EXTERNAL_WINS
  MANUAL
  NEWEST_WINS
}

enum SuggestionType {
  TIME_SLOT
  REPORTER
  DURATION
  LOCATION
}

enum SuggestionStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
}
```

**New Models (see `01-schema-additions.prisma` for full definitions):**
- `ExternalCalendarConnection` - OAuth tokens and sync settings
- `ExternalCalendarEvent` - Cached external events
- `CalendarSyncLog` - Sync history
- `SchedulingSuggestion` - AI suggestions (for analytics)
- `ReporterPerformanceMetrics` - Historical data for suggestions
- `DragDropValidation` - Audit log for drag-drop operations

**Add relations to existing models:**
```prisma
// Add to User model:
externalCalendars     ExternalCalendarConnection[]
performanceMetrics    ReporterPerformanceMetrics?

// Add to CalendarEvent model:
externalEvents        ExternalCalendarEvent[]
suggestions           SchedulingSuggestion[]

// Add to Firm model:
externalCalendarConnections ExternalCalendarConnection[]
```

After schema changes:
```bash
npx prisma migrate dev --name add_phase5_calendar
npx prisma generate
```

### Step 3: File Installation Map

| Source File | Destination |
|------------|-------------|
| `02-enums-phase5.ts` | `lib/enums-phase5.ts` |
| `03-lib-external-calendars-provider.ts` | `lib/external-calendars/provider.ts` |
| `04-lib-external-calendars-google-provider.ts` | `lib/external-calendars/google-provider.ts` |
| `05-lib-external-calendars-sync-service.ts` | `lib/external-calendars/sync-service.ts` |
| `06-lib-suggestions-engine.ts` | `lib/suggestions/suggestion-engine.ts` |
| `07-lib-calendar-drag-drop-hardening.ts` | `lib/calendar/drag-drop-hardening.ts` |
| `08-api-oauth-google-callback-route.ts` | `app/api/calendar/oauth/google/callback/route.ts` |
| `09-api-external-connections-route.ts` | `app/api/calendar/external/connections/route.ts` |
| `10-api-suggestions-route.ts` | `app/api/calendar/suggestions/route.ts` |
| `11-component-external-event-badge.tsx` | `components/calendar/external-event-badge.tsx` |
| `12-component-scheduling-suggestion.tsx` | `components/calendar/scheduling-suggestion.tsx` |
| `13-component-confirmation-modals.tsx` | `components/calendar/confirmation-modals.tsx` |
| `14-api-validate-move-route.ts` | `app/api/calendar/events/[id]/validate-move/route.ts` |
| `15-api-sync-route.ts` | `app/api/calendar/external/[connectionId]/sync/route.ts` |
| `16-lib-external-calendars-index.ts` | `lib/external-calendars/index.ts` |
| `17-lib-suggestions-index.ts` | `lib/suggestions/index.ts` |

---

## 🔧 STEP 4: EXTERNAL CALENDAR SYNC

### 4.1 Environment Variables

Add to `.env`:
```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4.2 Google OAuth Setup

1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `{NEXTAUTH_URL}/api/calendar/oauth/google/callback`
4. Request `calendar.readonly` scope initially

### 4.3 Sync Modes

```typescript
enum ExternalCalendarSyncMode {
  READ_ONLY       // Default: Only import external events
  PUSH_INTERNAL   // Push Depo-Pro events to external
  BIDIRECTIONAL   // Full two-way sync
}
```

### 4.4 Conflict Resolution Rules

```typescript
// HARD GUARDRAILS - DO NOT MODIFY
const CONFLICT_RULES = {
  // Internal Depo-Pro events ALWAYS win
  internalWins: true,
  
  // External events are marked as EXTERNAL_BLOCK
  externalStatus: 'EXTERNAL_BLOCK',
  
  // External events cannot be mutated internally
  externalReadOnly: true,
  
  // No auto-rescheduling
  autoReschedule: false,
};
```

### 4.5 Visual Rendering

External events should be rendered with:
- Striped/hatched background pattern
- Muted colors (60% opacity)
- "External" badge with provider icon
- Cannot be dragged or resized
- Click shows info but no edit options

---

## 💡 STEP 5: SMART SCHEDULING SUGGESTIONS

### 5.1 Suggestion Engine

The suggestion engine analyzes:
- Reporter availability
- External calendar blocks
- Historical event durations
- Time-of-day success patterns
- Workload balance

### 5.2 Output Format

```typescript
interface SchedulingSuggestion {
  type: 'TIME_SLOT' | 'REPORTER' | 'DURATION' | 'LOCATION';
  recommendedStart?: Date;
  recommendedEnd?: Date;
  recommendedReporterId?: string;
  recommendedReporterName?: string;
  recommendedDuration?: number;
  confidenceScore: number; // 0.0 to 1.0
  rationale: string[];
  alternatives?: AlternativeSuggestion[];
}
```

### 5.3 UI Rules

- Suggestions appear as hints/badges/tooltips
- Visually distinct from actual data (light blue background)
- Include confidence percentage
- Show rationale on hover/expand
- **Require explicit "Apply" action**
- Include "Dismiss" option

### 5.4 Role-Based Visibility

```typescript
const SUGGESTION_PERMISSIONS = {
  'ADMIN': { view: true, apply: true },
  'AGENCY': { view: true, apply: true },
  'COURT_REPORTER': { view: 'availability-only', apply: true },
  'ATTORNEY': { view: true, apply: false },
  'CSR': { view: true, apply: 'with-confirmation' },
};
```

### 5.5 Safety Guardrails

- Suggestions are **non-persisted** by default
- No DB writes without explicit user action
- Suggestions logged **only when applied** (for analytics)
- Suggestions expire after 24 hours

---

## 🛡️ STEP 6: UX HARDENING

### 6.1 Drag-Drop Validation

Before any drop is allowed, validate:

```typescript
const DRAG_DROP_CHECKS = [
  'permission',        // User role allows drag-drop
  'eventLocked',       // Event not completed/cancelled
  'pastScheduling',    // Not scheduling in the past
  'futureLimited',     // Within allowed future range
  'durationValid',     // 30 min to 12 hours
  'reporterConflict',  // No double-booking
  'travelTime',        // Minimum 30 min between events
  'externalConflict',  // Check external calendar
  'linkedJob',         // Event linked to job?
];
```

### 6.2 Block Reasons

```typescript
enum DragDropBlockReason {
  OVERLAP = 'OVERLAP',
  PAST_SCHEDULING = 'PAST_SCHEDULING',
  REPORTER_CONFLICT = 'REPORTER_CONFLICT',
  EVENT_LOCKED = 'EVENT_LOCKED',
  TRAVEL_TIME = 'TRAVEL_TIME',
  EXTERNAL_CONFLICT = 'EXTERNAL_CONFLICT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DURATION_TOO_SHORT = 'DURATION_TOO_SHORT',
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  OUTSIDE_HOURS = 'OUTSIDE_HOURS',
}
```

### 6.3 Confirmation Modals Required For

- ✅ Changes within 24 hours of event
- ✅ Reporter reassignment
- ✅ External ↔ internal conflicts
- ✅ Any mutation affecting a linked Job
- ✅ Moving event 7+ days from original

### 6.4 Performance Optimizations

```typescript
// Memoize calendar renders
const CalendarView = React.memo(function CalendarView({ ... }) {
  // ...
});

// Cache availability lookups (30 second TTL)
const availabilityCache = new Map<string, CacheEntry>();

// Debounce drag events (100ms)
const debouncedValidation = useMemo(
  () => debounce(validateMove, 100),
  []
);

// Virtualize long event lists
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## ✅ VERIFICATION CHECKLIST

### Step 4: External Calendar Sync
- [ ] Google OAuth flow works
- [ ] External events appear in calendar view
- [ ] External events are visually distinct (striped/muted)
- [ ] External events cannot be dragged/edited
- [ ] Sync logs are created
- [ ] Conflicts are detected and displayed
- [ ] Internal events are never overwritten

### Step 5: Smart Suggestions
- [ ] Suggestions appear for new events
- [ ] Confidence scores display correctly
- [ ] Rationale is visible on expand
- [ ] "Apply" requires explicit click
- [ ] "Dismiss" removes suggestion
- [ ] Roles restrictions work
- [ ] No automatic DB writes

### Step 6: UX Hardening
- [ ] Invalid drops are blocked with explanation
- [ ] Confirmation modals appear for sensitive changes
- [ ] Drag-drop is smooth (no lag)
- [ ] Reporter conflicts block drop
- [ ] Past scheduling is blocked
- [ ] Linked job mutations show warning
- [ ] All operations are audit logged

---

## 🚨 CRITICAL REMINDERS

### Never Do:
- ❌ Auto-apply suggestions
- ❌ Silently overwrite internal events
- ❌ Allow external event mutation
- ❌ Skip confirmation for imminent changes
- ❌ Bypass tenant isolation

### Always Do:
- ✅ Log all sync operations
- ✅ Show clear conflict indicators
- ✅ Require explicit user action
- ✅ Validate before committing
- ✅ Check role permissions

---

## 🧪 TESTING COMMANDS

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Test Google OAuth (local)
# 1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
# 2. Visit: /settings/calendars
# 3. Click "Connect Google Calendar"
# 4. Complete OAuth flow
# 5. Verify external events appear

# Test Suggestions
# 1. Create new event
# 2. Check for suggestion cards
# 3. Expand to see rationale
# 4. Click Apply or Dismiss
# 5. Verify no auto-application

# Test Drag-Drop Hardening
# 1. Try dragging event to past (should block)
# 2. Try overlapping with another event (should warn)
# 3. Try moving event with linked job (should confirm)
# 4. Try moving imminent event (should confirm)
```

---

## 📊 DATABASE QUERIES FOR VERIFICATION

```sql
-- Check external calendar connections
SELECT id, provider, calendar_name, sync_mode, sync_enabled, last_sync_at, last_sync_status
FROM external_calendar_connections
WHERE firm_id = 'YOUR_FIRM_ID';

-- Check synced external events
SELECT id, title, start_time, end_time, source, sync_status, has_conflict
FROM external_calendar_events
WHERE connection_id = 'YOUR_CONNECTION_ID';

-- Check sync logs
SELECT id, sync_type, status, events_created, events_updated, conflicts_detected, started_at
FROM calendar_sync_logs
ORDER BY started_at DESC
LIMIT 10;

-- Check suggestions
SELECT id, suggestion_type, status, confidence_score, created_at, expires_at
FROM scheduling_suggestions
WHERE firm_id = 'YOUR_FIRM_ID'
ORDER BY created_at DESC;

-- Check drag-drop validations
SELECT id, action_type, is_valid, blocked_reason, was_applied, created_at
FROM drag_drop_validations
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🎯 PHASE 5 COMPLETION CRITERIA

Phase 5 is complete when:

1. **External Calendars**
   - [ ] Google Calendar connects via OAuth
   - [ ] External events import and display
   - [ ] Conflicts are detected and surfaced
   - [ ] No internal event data is overwritten
   - [ ] Sync is fully audited

2. **Smart Suggestions**
   - [ ] Suggestions generate for new events
   - [ ] UI shows confidence and rationale
   - [ ] Apply requires explicit action
   - [ ] Role permissions enforced
   - [ ] Zero background mutations

3. **UX Hardening**
   - [ ] All edge cases handled gracefully
   - [ ] No accidental mutations possible
   - [ ] UI remains responsive
   - [ ] Full audit trail exists
   - [ ] Production-ready quality

---

**END OF PHASE 5 MEGA-PROMPT**
