# CURSOR PROMPT: Install Files from work_files

**Paste this entire prompt into Cursor**

---

## TASK

Install files from `work_files/` directory to their correct project locations.

---

## STEP 1: Create Directories

Create these directories if they don't exist:

```
lib/calendar/
lib/scheduling/
app/api/calendar/events/[id]/reschedule/
app/api/calendar/events/[id]/undo-reschedule/
app/api/calendar/events/[id]/resize/
app/api/calendar/events/[id]/convert-to-job/
app/api/calendar/events/check-conflicts/
app/api/jobs/[id]/assign-reporter/
app/api/reporters/
hooks/
```

---

## STEP 2: Copy Files

Copy each file from work_files/ to its destination. **Do not modify contents.**

### Stabilization Files

| Source (in work_files/) | Destination |
|------------------------|-------------|
| `eslint.config.mjs` | `eslint.config.mjs` |
| `lib-calendar-calendar-types.ts` | `lib/calendar/calendar-types.ts` |
| `api-calendar-events-id-route.ts` | `app/api/calendar/events/[id]/route.ts` |
| `api-jobs-id-assign-route.ts` | `app/api/jobs/[id]/assign/route.ts` |

### Phase 3 Files

| Source (in work_files/) | Destination |
|------------------------|-------------|
| `03-lib-rbac.ts` | `lib/rbac.ts` |
| `04-lib-rbac-client.ts` | `lib/rbac-client.ts` |
| `05-api-convert-to-job-route.ts` | `app/api/calendar/events/[id]/convert-to-job/route.ts` |
| `06-api-assign-reporter-route.ts` | `app/api/jobs/[id]/assign-reporter/route.ts` |
| `07-api-reporters-route.ts` | `app/api/reporters/route.ts` |
| `08-component-convert-to-job-button.tsx` | `components/calendar/convert-to-job-button.tsx` |
| `09-component-assign-reporter-dropdown.tsx` | `components/jobs/assign-reporter-dropdown.tsx` |
| `10-component-event-status-badge.tsx` | `components/calendar/event-status-badge.tsx` |
| `11-component-calendar-event-detail-updated.tsx` | `components/calendar/calendar-event-detail.tsx` |
| `12-component-calendar-index.ts` | `components/calendar/index.ts` |

### Phase 4 Files

| Source (in work_files/) | Destination |
|------------------------|-------------|
| `02-enums-additions.ts` | `lib/enums-phase4.ts` |
| `03-lib-conflict-detection.ts` | `lib/scheduling/conflict-detection.ts` |
| `04-lib-scheduling-service.ts` | `lib/scheduling/scheduling-service.ts` |
| `05-api-reschedule-route.ts` | `app/api/calendar/events/[id]/reschedule/route.ts` |
| `06-api-undo-reschedule-route.ts` | `app/api/calendar/events/[id]/undo-reschedule/route.ts` |
| `07-api-check-conflicts-route.ts` | `app/api/calendar/events/check-conflicts/route.ts` |
| `08-api-resize-route.ts` | `app/api/calendar/events/[id]/resize/route.ts` |
| `09-component-conflict-dialog.tsx` | `components/calendar/conflict-dialog.tsx` |
| `10-hook-use-undo-toast.ts` | `hooks/use-undo-toast.ts` |
| `11-component-drag-preview.tsx` | `components/calendar/drag-preview.tsx` |
| `12-component-depo-calendar-enhanced.tsx` | `components/calendar/depo-calendar.tsx` |
| `13-lib-scheduling-index.ts` | `lib/scheduling/index.ts` |

---

## STEP 3: Verify

After copying, run these commands:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## NOTES

- If files are missing from work_files/, skip them
- If lint fails with "unused variable" errors, prefix with `_` (e.g., `request` → `_request`)
- Phase 4 requires Prisma schema changes - see PHASE4_CURSOR_MEGA_PROMPT.md

---

Please proceed with the installation and report results.
