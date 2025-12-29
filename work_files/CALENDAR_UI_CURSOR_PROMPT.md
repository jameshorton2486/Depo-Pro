# Depo-Pro Calendar UI — Comprehensive Cursor AI Prompt

## CONTEXT

You are implementing Calendar UI Phase 1 for Depo-Pro, a legal transcription SaaS platform.

**Tech Stack:**
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Prisma ORM + Supabase (PostgreSQL)
- react-big-calendar + date-fns
- shadcn/ui + Tailwind CSS
- @headlessui/react for dialogs

**Phase 1 Scope (DO NOT EXCEED):**
- ✅ Month / Week / Day / Agenda views
- ✅ Event display (title, time, reporter, status)
- ✅ Click → Event detail drawer
- ✅ Create Deposition modal (Job Intake)
- ❌ NO drag & drop
- ❌ NO rescheduling via UI
- ❌ NO Google Calendar sync
- ❌ NO availability overlays

---

## TASK 1: VERIFY & FIX CALENDAR COMPONENTS

The following files have been created. Verify they compile and fix any issues:

### Files to Check:
```
components/calendar/
├── calendar.types.ts        # TypeScript types
├── CalendarView.tsx         # react-big-calendar wrapper
├── CalendarEventCard.tsx    # Event display component
├── EventDetailsDrawer.tsx   # Side panel for event details
├── CreateEventModal.tsx     # Multi-tab form for new events
├── CalendarShell.tsx        # Main container with role awareness
└── index.ts                 # Barrel exports

app/(dashboard)/calendar/
└── page.tsx                 # Server component page

styles/
└── calendar.css             # Custom calendar styles
```

### Verification Steps:
1. Run `npm run typecheck` - fix all TypeScript errors
2. Run `npm run lint` - fix all ESLint warnings
3. Run `npm run dev` - verify page loads without runtime errors
4. Navigate to `/calendar` - verify UI renders

---

## TASK 2: FIX MISSING IMPORTS & DEPENDENCIES

If you see import errors, ensure these packages are installed:

```bash
npm install react-big-calendar date-fns @headlessui/react
npm install -D @types/react-big-calendar
```

### Common Import Fixes:

**If `@/lib/utils` is missing:**
```typescript
// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**If shadcn/ui components are missing:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add dropdown-menu
```

---

## TASK 3: CALENDAR API ROUTES

Ensure these API routes exist and function correctly:

### GET /api/calendar
```typescript
// app/api/calendar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  status: z.string().optional(),
  assignedReporterId: z.string().optional(),
  firmId: z.string().optional(),
  agencyId: z.string().optional(),
  showCancelled: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = querySchema.parse(searchParams);

    // Build where clause
    const where: any = {
      scheduledStart: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };

    // Filter by status
    if (params.status) {
      const statuses = params.status.split(',');
      where.status = { in: statuses };
    }

    // Filter by reporter
    if (params.assignedReporterId) {
      where.assignedReporterId = params.assignedReporterId;
    }

    // Filter by firm/agency
    if (params.firmId) {
      where.firmId = params.firmId;
    }
    if (params.agencyId) {
      where.agencyId = params.agencyId;
    }

    // Exclude cancelled unless requested
    if (!params.showCancelled) {
      where.status = where.status || {};
      where.status.not = 'CANCELLED';
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        orderingAttorney: {
          select: { id: true, firstName: true, lastName: true, firmName: true },
        },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
```

### POST /api/calendar
```typescript
// app/api/calendar/route.ts (continued)

const createEventSchema = z.object({
  caseStyle: z.string().min(1),
  caseNumber: z.string().optional(),
  deponentName: z.string().min(1),
  deponentRole: z.enum(['PLAINTIFF', 'DEFENDANT', 'CORPORATE_REP', 'EXPERT_WITNESS', 'FACT_WITNESS', 'THIRD_PARTY']).optional(),
  scheduledStart: z.string().transform((s) => new Date(s)),
  scheduledEnd: z.string().transform((s) => new Date(s)).optional(),
  timezone: z.string().default('America/Chicago'),
  locationType: z.enum(['IN_PERSON', 'ZOOM', 'TEAMS', 'WEBEX', 'PHONE', 'HYBRID', 'OTHER']),
  locationAddress: z.string().optional(),
  zoomJoinUrl: z.string().optional(),
  interpreterRequired: z.boolean().default(false),
  interpreterLanguage: z.string().optional(),
  videographerRequired: z.boolean().default(false),
  realtimeRequired: z.boolean().default(false),
  assignedReporterId: z.string().optional(),
  notes: z.string().optional(),
  firmId: z.string().optional(),
  agencyId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createEventSchema.parse(body);

    const event = await prisma.calendarEvent.create({
      data: {
        ...data,
        createdById: session.user.id,
        status: 'SCHEDULED',
      },
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Calendar POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
```

### PATCH /api/calendar/[id]
```typescript
// app/api/calendar/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id: params.id },
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        orderingAttorney: true,
        job: { select: { id: true, status: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar GET [id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const event = await prisma.calendarEvent.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete - set status to CANCELLED
    const event = await prisma.calendarEvent.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
```

### POST /api/calendar/[id]/convert-to-job
```typescript
// app/api/calendar/[id]/convert-to-job/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the calendar event
    const event = await prisma.calendarEvent.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.jobId) {
      return NextResponse.json(
        { error: 'Event already has a job', jobId: event.jobId },
        { status: 400 }
      );
    }

    // Create Job and CSRRecord in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Job
      const job = await tx.job.create({
        data: {
          title: `${event.deponentName} Deposition`,
          caseName: event.caseStyle,
          caseNumber: event.caseNumber,
          depositionDate: event.scheduledStart,
          location: event.locationAddress,
          zoomLink: event.zoomJoinUrl,
          status: 'CREATED',
          createdById: session.user.id,
          firmId: event.firmId,
          agencyId: event.agencyId,
        },
      });

      // Create CSRRecord
      await tx.cSRRecord.create({
        data: {
          jobId: job.id,
          depositionDate: event.scheduledStart,
          scheduledStartTime: event.scheduledStart,
          endTime: event.scheduledEnd,
          caseCaption: event.caseStyle,
          causeNumber: event.caseNumber,
          locationType: event.locationType,
          locationAddress: event.locationAddress,
          interpreterRequired: event.interpreterRequired,
          interpreterLanguage: event.interpreterLanguage,
          videographerRequired: event.videographerRequired,
          realtimeRequired: event.realtimeRequired,
        },
      });

      // Link job to calendar event
      await tx.calendarEvent.update({
        where: { id: params.id },
        data: { 
          jobId: job.id,
          status: 'CONFIRMED',
        },
      });

      return job;
    });

    return NextResponse.json({ jobId: result.id }, { status: 201 });
  } catch (error) {
    console.error('Convert to job error:', error);
    return NextResponse.json(
      { error: 'Failed to convert event to job' },
      { status: 500 }
    );
  }
}
```

---

## TASK 4: FIX ROLE-BASED ACCESS

Ensure proper role-based rendering:

**Admin / Agency Admin:**
- See all events in tenant
- Can create, edit, cancel events
- Can assign reporters

**Reporter:**
- See only their assigned events
- Can create events (for themselves)
- Cannot cancel events

**Scopist:**
- NO calendar access - redirect to /scopist/jobs

---

## TASK 5: ADD NAVIGATION LINK

Add calendar link to the dashboard sidebar:

```typescript
// In your sidebar/navigation component
{(userRole === 'ADMIN' || userRole === 'REPORTER' || userRole === 'AGENCY_ADMIN') && (
  <NavLink href="/calendar" icon={Calendar}>
    Calendar
  </NavLink>
)}
```

---

## TASK 6: TEST CHECKLIST

Before marking complete, verify:

- [ ] Calendar renders with mock/real data
- [ ] Month/Week/Day/Agenda views work
- [ ] Clicking event opens detail drawer
- [ ] Creating event saves to database
- [ ] Role-based filtering works (Reporter sees only their events)
- [ ] Scopist is redirected away from calendar
- [ ] Convert to Job creates Job + CSRRecord
- [ ] Status colors display correctly
- [ ] Mobile responsive (basic)

---

## TROUBLESHOOTING

### "CalendarEvent model not found"
Run migrations:
```bash
npx prisma migrate dev --name add_calendar_event
npx prisma generate
```

### "Cannot find module '@headlessui/react'"
```bash
npm install @headlessui/react
```

### "Type error: Property 'user' does not exist on type 'Session'"
Update your next-auth types:
```typescript
// types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      firmId?: string;
      agencyId?: string;
    } & DefaultSession['user'];
  }
}
```

### Calendar shows but events don't load
Check browser console for API errors. Ensure:
1. Database has CalendarEvent table
2. API route returns correct JSON structure
3. Dates are being parsed correctly

---

## STOP CONDITION

If you encounter:
- Database schema mismatches
- Authentication configuration issues
- Missing UI components (not shadcn)
- Business logic questions

**STOP and ASK before proceeding.**

---

## SUCCESS CRITERIA

✅ Calendar page loads at /calendar
✅ Events display with correct colors
✅ Create modal saves events
✅ Detail drawer shows event info
✅ Convert to Job works
✅ No TypeScript errors
✅ No console errors
