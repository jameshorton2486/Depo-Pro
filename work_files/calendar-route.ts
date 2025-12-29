import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// ============================================
// GET /api/calendar - List calendar events
// ============================================

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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    
    const parseResult = querySchema.safeParse(searchParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parseResult.error.issues },
        { status: 400 }
      );
    }
    
    const params = parseResult.data;

    // Build where clause using ACTUAL schema fields
    const where: Record<string, unknown> = {
      startTime: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };

    if (params.status) {
      const statuses = params.status.split(',');
      where.status = { in: statuses };
    }

    if (params.assignedReporterId) {
      where.assignedReporterId = params.assignedReporterId;
    }

    if (params.firmId) {
      where.firmId = params.firmId;
    }
    
    if (params.agencyId) {
      where.agencyId = params.agencyId;
    }

    if (params.showCancelled !== 'true') {
      if (!where.status) {
        where.status = { not: 'CANCELLED' };
      }
    }

    const events = await db.calendarEvent.findMany({
      where,
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        job: {
          select: { 
            id: true, 
            status: true,
            caseName: true,
            caseNumber: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Transform for UI - use ACTUAL fields
    const transformedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      status: event.status,
      eventType: event.eventType,
      location: event.location,
      isRemote: event.isRemote,
      meetingLink: event.meetingLink,
      assignedReporter: event.assignedReporter,
      firmId: event.firmId,
      agencyId: event.agencyId,
      jobId: event.jobId,
      caseName: event.job?.caseName || null,
      caseNumber: event.job?.caseNumber || null,
      jobStatus: event.job?.status || null,
      notes: event.notes,
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/calendar - Create new event
// Uses ONLY valid EventType values from schema
// ============================================

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z.string().transform((s) => new Date(s)).optional(),
  // Only include EventType values that exist in YOUR schema
  // Remove or adjust this line based on actual enum values
  eventType: z.enum(['DEPOSITION', 'HEARING', 'MEETING', 'OTHER']).optional(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  meetingLink: z.string().optional(),
  notes: z.string().optional(),
  assignedReporterId: z.string().optional(),
  firmId: z.string().optional(),
  agencyId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const parseResult = createEventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parseResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = parseResult.data;
    const user = session.user as { id: string; firmId?: string; agencyId?: string };

    // Calculate default end time (2 hours after start) if not provided
    const endTime = data.endTime || new Date(data.startTime.getTime() + 2 * 60 * 60 * 1000);

    const event = await db.calendarEvent.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: endTime,
        eventType: data.eventType,
        location: data.location,
        isRemote: data.isRemote,
        meetingLink: data.meetingLink,
        notes: data.notes,
        status: 'SCHEDULED',
        assignedReporterId: data.assignedReporterId || undefined,
        createdById: user.id,
        firmId: data.firmId || user.firmId || '',
        agencyId: data.agencyId || user.agencyId,
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
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
