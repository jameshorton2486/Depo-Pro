import { db } from '@/lib/db';
// ============================================================
// CALENDAR EVENTS API ROUTE
// Path: app/api/calendar/events/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Simple request logging wrapper (replaces withRequestLogging)
const withRequestLogging = <T extends (...args: any[]) => any>(fn: T): T => {
  return ((...args: any[]) => {
    logger.info('Request started', { path: args[0]?.url });
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.then(
          (res) => {
            logger.info('Request completed', { path: args[0]?.url });
            return res;
          },
          (err) => {
            logger.error('Request failed', err as Error);
            throw err;
          }
        );
      }
      logger.info('Request completed', { path: args[0]?.url });
      return result;
    } catch (err) {
      logger.error('Request failed', err as Error);
      throw err;
    }
  }) as T;
};
import { checkRateLimit } from '@/lib/security';
import { revalidatePath } from 'next/cache';
import { EventType } from '@/lib/constants';
import { checkConflicts } from '@/lib/calendar/conflict-detection';

// ------------------------------------------------------------
// VALIDATION SCHEMAS
// ------------------------------------------------------------

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  eventType: z.nativeEnum(EventType).default(EventType.DEPOSITION),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().default('America/Chicago'),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  meetingLink: z.string().url().optional(),
  assignedReporterId: z.string().optional(),
  jobId: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  // Recurrence
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  recurrenceEndDate: z.string().datetime().optional(),
  // Participants
  participants: z.array(z.object({
    userId: z.string().optional(),
    externalName: z.string().optional(),
    externalEmail: z.string().email().optional(),
    externalPhone: z.string().optional(),
    role: z.enum(['ATTORNEY_PLAINTIFF', 'ATTORNEY_DEFENSE', 'WITNESS', 'DEPONENT', 'INTERPRETER', 'VIDEOGRAPHER', 'OBSERVER']),
  })).optional(),
});

const querySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  status: z.string().optional(),
  reporterId: z.string().optional(),
  jobId: z.string().optional(),
});

// ------------------------------------------------------------
// GET - Fetch calendar events (role-filtered)
// ------------------------------------------------------------

async function getEventsHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      status: searchParams.get('status') || undefined,
      reporterId: searchParams.get('reporterId') || undefined,
      jobId: searchParams.get('jobId') || undefined,
    });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { firm: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Build where clause based on role
    const whereClause: any = {
      firmId: user.firmId,
    };

    // Date range filter
    if (query.start && query.end) {
      whereClause.OR = [
        {
          startTime: { gte: new Date(query.start), lte: new Date(query.end) },
        },
        {
          endTime: { gte: new Date(query.start), lte: new Date(query.end) },
        },
        {
          AND: [
            { startTime: { lte: new Date(query.start) } },
            { endTime: { gte: new Date(query.end) } },
          ],
        },
      ];
    }

    // Status filter
    if (query.status) {
      whereClause.status = query.status;
    }

    // Role-based filtering
    switch (user.role) {
      case 'REPORTER':
        // Reporters only see their assigned events
        whereClause.assignedReporterId = user.id;
        break;

      case 'ATTORNEY':
        // Attorneys see events they requested or are participating in
        whereClause.OR = [
          { requestedById: user.id },
          { participants: { some: { userId: user.id } } },
        ];
        break;

      case 'AGENCY':
      case 'ADMIN':
        // Full access to organization events
        // Additional reporter filter if specified
        if (query.reporterId) {
          whereClause.assignedReporterId = query.reporterId;
        }
        break;

      case 'SCOPIST':
        // Scopists can view events for jobs they're assigned to
        whereClause.job = {
          assignments: {
            some: {
              scopistId: user.id,
              status: { in: ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'] },
            },
          },
        };
        break;

      default:
        // Allow other roles to view but with limited access
        // They'll only see events they're explicitly part of
        whereClause.participants = {
          some: { userId: user.id },
        };
        break;
    }

    // Job filter
    if (query.jobId) {
      whereClause.jobId = query.jobId;
    }

    const events = await db.calendarEvent.findMany({
      where: whereClause,
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        job: {
          select: { id: true, caseName: true, status: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Return raw data - UI formatting happens client-side
    return NextResponse.json({
      events: events.map((event: any) => ({
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        status: event.status,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        timezone: event.timezone,
        allDay: event.allDay,
        location: event.location,
        isRemote: event.isRemote,
        meetingLink: event.meetingLink,
        assignedReporterId: event.assignedReporterId,
        assignedReporter: event.assignedReporter,
        requestedById: event.requestedById,
        requestedBy: event.requestedBy,
        jobId: event.jobId,
        job: event.job,
        participants: event.participants,
        notes: event.notes,
        internalNotes: event.internalNotes,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        createdBy: event.createdBy,
      })),
      total: events.length,
    });

  } catch (error) {
    logger.error('Calendar GET error:', error as Error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export const GET = withRequestLogging(getEventsHandler);

// ------------------------------------------------------------
// POST - Create calendar event (Agency/Admin only)
// ------------------------------------------------------------

async function postEventsHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { firm: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Only Agency and Admin can create events directly
    if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role)) {
      return NextResponse.json({
        error: 'Only Agency and Admin users can create events. Attorneys should submit booking requests.'
      }, { status: 403 });
    }

    const body = await request.json();
    const data = createEventSchema.parse(body);

    // Validate times
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Phase 3A-4: Check for conflicts (soft warning, doesn't block)
    let conflicts: Array<{ eventId: string; eventTitle: string; message: string }> = [];
    if (data.assignedReporterId) {
      const conflictWarnings = await checkConflicts(
        new Date(startTime),
        new Date(endTime),
        data.assignedReporterId
      );
      conflicts = (Array.isArray(conflictWarnings) ? conflictWarnings : conflictWarnings.conflicts || []).map((c: any) => ({
        eventId: c.eventId,
        eventTitle: c.eventTitle,
        message: c.message,
      }));
    }

    // Note: We don't block on conflicts, but we return them in the response
    // The UI will show a warning dialog

    // Create the event
    const event = await db.calendarEvent.create({
      data: {
        firmId: user.firmId,
        title: data.title,
        eventType: data.eventType,
        status: data.assignedReporterId ? 'SCHEDULED' : 'REQUESTED',
        startTime,
        endTime,
        timezone: data.timezone,
        allDay: data.allDay,
        location: data.location,
        isRemote: data.isRemote,
        meetingLink: data.meetingLink,
        assignedReporterId: data.assignedReporterId,
        scheduledById: user.id,
        jobId: data.jobId,
        notes: data.notes,
        internalNotes: data.internalNotes,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
        createdById: user.id,
        // Create participants if provided
        participants: data.participants ? {
          create: data.participants.map(p => ({
            userId: p.userId,
            externalName: p.externalName,
            externalEmail: p.externalEmail,
            externalPhone: p.externalPhone,
            role: p.role,
          })),
        } : undefined,
      },
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        participants: true,
        job: true,
      },
    });

    // TODO: Send notification to assigned reporter
    // await notifyReporter(event);

    // Invalidate calendar cache
    revalidatePath('/api/calendar/events');

    return NextResponse.json({
      message: 'Event created successfully',
      event,
      conflicts: conflicts.length > 0 ? conflicts : undefined, // Phase 3A-4: Include conflicts in response
    }, { status: 201 });

  } catch (error) {
    logger.error('Calendar POST error:', error as Error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export const POST = withRequestLogging(postEventsHandler);

// ------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------

async function _checkReporterConflicts(
  reporterId: string,
  startTime: Date,
  endTime: Date,
  firmId: string,
  excludeEventId?: string
) {
  const whereClause: any = {
    firmId,
    assignedReporterId: reporterId,
    status: { notIn: ['CANCELLED', 'COMPLETED'] },
    OR: [
      // New event starts during existing event
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } },
        ],
      },
      // New event ends during existing event
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } },
        ],
      },
      // New event completely contains existing event
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } },
        ],
      },
    ],
  };

  if (excludeEventId) {
    whereClause.id = { not: excludeEventId };
  }

  return db.calendarEvent.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
    },
  });
}






