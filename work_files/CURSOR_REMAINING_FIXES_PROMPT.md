# CURSOR AI MEGA-PROMPT: DEPO-PRO POST-AUDIT FIXES
# =============================================================================
# Copy this entire prompt into Cursor AI Composer to fix remaining issues
# =============================================================================

## CONTEXT
I'm working on Depo-Pro, a legal transcription SaaS platform. A technical audit identified several issues that need fixing. The routing conflicts have been resolved via PowerShell script. This prompt addresses the remaining issues.

## TASK 1: Standardize Database Imports
Find all files using `import { prisma } from '@/lib/db'` and change to `import { db } from '@/lib/db'`. Then update all `prisma.` references to `db.`.

Files to check (sample):
- lib/webhooks/index.ts (currently uses alias pattern)
- Any file still using `prisma.` variable name

Search pattern: `from '@/lib/db'` and ensure consistent use of `db`.

## TASK 2: Add Auth Check to Notify Route
File: `app/api/assignments/[id]/notify/route.ts`

Add authentication check at the start of the handler:
```typescript
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ... existing code
}
```

## TASK 3: Add Rate Limiting to Contact Route
File: `app/api/contact/route.ts`

Add rate limiting to prevent abuse:
```typescript
// Add at top of file
import { headers } from 'next/headers';

// Add rate limiting check (simple in-memory for now)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
  
  // ... existing code
}
```

## TASK 4: Fix Calendar Component Warning (Optional)
File: `components/calendar/calendar-day-cell.tsx`

The warning about `onEventClick` can be silenced by:
1. Ensuring `'use client'` is at the top of the file
2. OR renaming to `onEventClickAction` (but this requires updating all usages)

Check if `'use client'` directive exists. If not, add it at line 1.

## TASK 5: Review and Document TODO Items
Create a new file `docs/POST_MVP_TODO.md` that catalogs all TODO items for post-MVP work:

```markdown
# Post-MVP TODO Items

This document catalogs technical debt and planned enhancements identified in the codebase.

## Priority 1: Queue Integration
- [ ] lib/jobs.ts: Implement BullMQ integration for background jobs
- [ ] lib/jobs.ts: Implement BullMQ status check
- [ ] lib/jobs.ts: Implement BullMQ retry logic
- [ ] lib/jobs.ts: Implement BullMQ stats

## Priority 2: Audio Processing
- [ ] lib/services/audio-enhancement-service.ts: Get audio duration from file metadata
- [ ] lib/workers/transcription-worker.ts: Update speaker analysis for new Utterance format

## Priority 3: Billing Improvements
- [ ] lib/billing/invoice-generator.ts: Check if full review session exists

## Priority 4: Permissions
- [ ] lib/permissions/case-access.ts: Add caseId to AttorneyTranscript model
- [ ] lib/permissions/case-access.ts: Add proper case-level check

## Priority 5: UI Improvements
- [ ] components/calendar/calendar-event-detail.tsx: Implement edit modal
- [ ] components/calendar/CalendarShell.tsx: Implement edit modal

## Deferred to Phase 2
- RX Session service schema updates
- Full billing/invoicing implementation
- External calendar deep integration
```

## TASK 6: Verify Auth/Session Handling Consistency
Check that all protected API routes use the same auth pattern:

```typescript
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Role check if needed
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // ... handler code
}
```

## VERIFICATION STEPS
After making changes, run:
1. `npm run typecheck` - Should have 0 errors
2. `npm run lint` - Should pass
3. `npm run build` - Should succeed

## NOTES
- Do NOT modify any files in node_modules
- Do NOT change the Prisma schema (it's stable)
- Do NOT add new dependencies without explicit approval
- All changes should be backward compatible
