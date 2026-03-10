# AIDER MEGA PROMPT — Stub Fix + Auth + Error Boundaries + Deprecation Batch
# Run with: aider
# Safe to run simultaneously with the Codex batch (zero file overlap)

Read these files first:
- docs/ARCHITECTURE_OVERVIEW.md (Frozen Layer and Refactor Constraints sections)
- docs/REMAINING_TASKS_ANALYSIS.md (tasks STB-01, SEC-02, UI-02, CLN-02)

## GLOBAL RULES

- Only modify the files explicitly listed in each task below.
- Do NOT modify any file in the Frozen Layer (see docs/ARCHITECTURE_OVERVIEW.md).
- Do NOT change database schema. Do NOT create migrations.
- Do NOT rename API routes or change URL paths.
- Do NOT introduce new npm dependencies.
- Do NOT add `// TODO` comments.
- Do NOT expand scope beyond what each task specifies.
- Keep ALL existing function signatures and return types unchanged.
- Keep ALL existing imports in files you modify unless the task says otherwise.
- After ALL changes: run `npm run typecheck && npm run build` — both must pass with zero errors.

---

## TASK 1 of 4: STB-01 — Fix BullMQ job stubs

File: `lib/jobs.ts`

This file has 4 functions that throw "not implemented" errors. The app now uses `lib/transcription/scheduler.ts` for transcription instead of BullMQ, but these stubs remain and will crash if anything accidentally calls them.

Actions:

1. First, search the codebase to see if anything imports from this file:
   `grep -rn "from.*lib/jobs" --include="*.ts" --include="*.tsx" app/ lib/`

2. Add this JSDoc block to the TOP of the file, before any imports:
```typescript
/**
 * @deprecated Legacy BullMQ job stubs.
 * Transcription now uses lib/transcription/scheduler.ts (serverless chunk pattern).
 * These functions are safe no-ops kept for backward compatibility.
 * Do NOT use for new code.
 */
```

3. Find function `processTranscriptionJob` — replace the throw with:
```typescript
console.warn('[jobs.ts] Legacy BullMQ stub called — use scheduler pattern instead');
return { success: false, message: 'Legacy stub — transcription uses scheduler now' };
```

4. Find function `processExportJob` — replace the throw with:
```typescript
console.warn('[jobs.ts] Legacy BullMQ export stub called');
return { success: false, message: 'Legacy stub — not implemented' };
```

5. Find function `processEmailJob` — replace the throw with:
```typescript
console.warn('[jobs.ts] Legacy BullMQ email stub called');
return { success: false, message: 'Legacy stub — not implemented' };
```

6. Find function `getQueueStats` — replace the throw with:
```typescript
console.warn('[jobs.ts] Legacy BullMQ stats stub called');
return { queued: 0, active: 0, completed: 0, failed: 0 };
```

7. Keep ALL function signatures and return types unchanged.
8. Do NOT delete the file or any exports.
9. Do NOT modify any type definitions or interfaces in this file.

Verify: `grep "throw" lib/jobs.ts` should return zero matches.

---

## TASK 2 of 4: SEC-02 — Add auth checks to 7 unprotected stub routes

These API routes return "not implemented" responses but do NOT check if the caller is authenticated. Each file already imports `requireAuthV2` but never calls it. Add the auth check call to every handler.

### File 1: `app/api/medical-records/route.ts`

Find every exported handler function (GET, POST, PUT, PATCH, DELETE — whichever exist).
Add these 2 lines at the VERY START of each handler function body, before any other code:
```typescript
const auth = await requireAuthV2();
if (!auth.authorized) return auth.response;
```
Do NOT change anything else in the file. Do NOT change the response body or status codes.

### File 2: `app/api/firms/route.ts`

Same change. Add `requireAuthV2()` call at the start of every handler. Do NOT change anything else.

### File 3: `app/api/audit-logs/route.ts`

Same change. Add `requireAuthV2()` call at the start of every handler. Do NOT change anything else.

### File 4: `app/api/matters/route.ts`

Same change. Add `requireAuthV2()` call at the start of every handler. Do NOT change anything else.

### File 5: `app/api/depositions/route.ts`

Same change. Add `requireAuthV2()` call at the start of every handler. Do NOT change anything else.

### File 6: `app/api/exhibits/route.ts`

Same change. Add `requireAuthV2()` call at the start of every handler. Do NOT change anything else.

### File 7: `app/api/demands/route.ts`

Same change. Add `requireAuthV2()` call at the start of every handler. Do NOT change anything else.

### Important notes for ALL 7 files:
- If `requireAuthV2` is already imported but not called — just add the call.
- If `requireAuthV2` is NOT imported — add the import: `import { requireAuthV2 } from '@/lib/permissions/api-guards';`
- The auth check goes BEFORE any other logic in the handler.
- Keep the existing "not implemented" response — it should now only be reachable by authenticated users.
- Do NOT change the HTTP status codes of the existing responses.

Verify: `npm run build` passes. An unauthenticated request to any of these 7 routes should return 401, not 501.

---

## TASK 3 of 4: UI-02 — Add error boundaries to 5 dashboard pages

These pages are missing error boundaries. If they crash, users see a blank white screen. Wrap each page's content in the existing ErrorBoundary component.

The ErrorBoundary component already exists at `components/ui/error-boundary.tsx` — do NOT modify it.

### File 1: `app/(dashboard)/page.tsx`

Add this import near the top (with the other imports):
```typescript
import { ErrorBoundary } from '@/components/ui/error-boundary';
```

Find the main return statement. Wrap the outermost content element in:
```tsx
<ErrorBoundary pageName="dashboard">
  {/* existing content */}
</ErrorBoundary>
```

Do NOT change any other code in this file.

### File 2: `app/(dashboard)/scopist/page.tsx`

Same pattern. Add the ErrorBoundary import. Wrap content with `<ErrorBoundary pageName="scopist-dashboard">`. Do NOT change anything else.

### File 3: `app/(dashboard)/reporter/page.tsx`

Same pattern. Add the ErrorBoundary import. Wrap content with `<ErrorBoundary pageName="reporter-dashboard">`. Do NOT change anything else.

### File 4: `app/(dashboard)/admin/page.tsx`

Same pattern. Add the ErrorBoundary import. Wrap content with `<ErrorBoundary pageName="admin-dashboard">`. Do NOT change anything else.

### File 5: `app/(dashboard)/jobs/[id]/medical/page.tsx`

Same pattern. Add the ErrorBoundary import. Wrap content with `<ErrorBoundary pageName="medical-chronology">`. Do NOT change anything else.

### Important notes for ALL 5 files:
- If the file is a Server Component (no `'use client'` at top), you may need to wrap the ErrorBoundary usage in a client wrapper or check if ErrorBoundary works in server context. If the ErrorBoundary requires `'use client'`, only wrap the client-side portions.
- If the page already has an ErrorBoundary — skip that file.
- Do NOT restructure the page layout or component hierarchy.
- Do NOT remove or rename any existing components.

Verify: `npm run build` passes. Each page renders without error.

---

## TASK 4 of 4: CLN-02 — Add deprecation comments to legacy auth files

Three files contain legacy auth patterns. The standard is now `withRouteProtection` from `lib/middleware/withRouteProtection.ts`. Add deprecation notices so future developers (and AI agents) know not to use these.

### File 1: `lib/security.ts`

Add this JSDoc block to the VERY TOP of the file, BEFORE any existing imports:
```typescript
/**
 * @deprecated Use withRouteProtection from '@/lib/middleware/withRouteProtection' instead.
 * This file is maintained for backward compatibility with existing routes.
 * All new routes MUST use withRouteProtection.
 * See: docs/ARCHITECTURE_OVERVIEW.md — Auth Pattern Standard
 */
```

Do NOT change any function logic, signatures, exports, or imports.

### File 2: `lib/auth/require-auth.ts`

Add the same JSDoc block to the VERY TOP of the file:
```typescript
/**
 * @deprecated Use withRouteProtection from '@/lib/middleware/withRouteProtection' instead.
 * This file is maintained for backward compatibility with existing routes.
 * All new routes MUST use withRouteProtection.
 * See: docs/ARCHITECTURE_OVERVIEW.md — Auth Pattern Standard
 */
```

Do NOT change any function logic, signatures, exports, or imports.

### File 3: `lib/permissions/api-guards.ts`

Add the same JSDoc block to the VERY TOP of the file:
```typescript
/**
 * @deprecated Use withRouteProtection from '@/lib/middleware/withRouteProtection' instead.
 * This file is maintained for backward compatibility with existing routes.
 * All new routes MUST use withRouteProtection.
 * See: docs/ARCHITECTURE_OVERVIEW.md — Auth Pattern Standard
 */
```

Do NOT change any function logic, signatures, exports, or imports.

Verify: `npm run build` passes. The deprecation comments are present at the top of all 3 files.

---

## FINAL VALIDATION

After completing all 4 tasks, run:

```bash
npm run typecheck
npm run build
grep -c "throw" lib/jobs.ts
```

- typecheck: zero errors
- build: zero errors
- grep on lib/jobs.ts: zero matches

Then commit:
```bash
git add lib/jobs.ts app/api/medical-records/route.ts app/api/firms/route.ts app/api/audit-logs/route.ts app/api/matters/route.ts app/api/depositions/route.ts app/api/exhibits/route.ts app/api/demands/route.ts "app/(dashboard)/page.tsx" "app/(dashboard)/scopist/page.tsx" "app/(dashboard)/reporter/page.tsx" "app/(dashboard)/admin/page.tsx" "app/(dashboard)/jobs/[id]/medical/page.tsx" lib/security.ts lib/auth/require-auth.ts lib/permissions/api-guards.ts
git commit -m "phase-1+2+4+7: aider batch — stubs, auth, error boundaries, deprecation"
```
