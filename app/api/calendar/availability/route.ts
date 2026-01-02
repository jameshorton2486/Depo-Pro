// ============================================================
// REPORTER AVAILABILITY API ROUTES
// Path: app/api/calendar/availability/route.ts
// Task 2.4.2 - Availability API Routes
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// ------------------------------------------------------------
// VALIDATION SCHEMAS
// ------------------------------------------------------------

const createAvailabilitySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().default('America/Chicago'),
  type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'TENTATIVE']).default('AVAILABLE'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(), // RRULE format
  recurrenceEnd: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const querySchema = z.object({
  reporterId: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'TENTATIVE']).optional(),
});

// ------------------------------------------------------------
// GET - Fetch availability slots
// ------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      reporterId: searchParams.get('reporterId') || undefined,
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      type: searchParams.get('type') || undefined,
    });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Role-based access control: ADMIN and REPORTER can access availability
    // This matches the page-level permissions for /calendar/availability
    const allowedRoles = ['ADMIN', 'REPORTER', 'AGENCY'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Build where clause
    const whereClause: any = {
      firmId: user.firmId,
    };

    // Role-based filtering
    if (user.role === 'REPORTER') {
      // Reporters can only see their own availability
      whereClause.reporterId = user.id;
    } else if (query.reporterId) {
      // Agency/Admin can filter by specific reporter
      whereClause.reporterId = query.reporterId;
    }

    // Date range filter
    if (query.start && query.end) {
      whereClause.OR = [
        {
          startTime: { gte: new Date(query.start), lte: new Date(query.end) },
        },
        {
          endTime: { gte: new Date(query.start), lte: new Date(query.end) },
        },
      ];
    }

    // Type filter
    if (query.type) {
      whereClause.type = query.type;
    }

    const availability = await db.reporterAvailability.findMany({
      where: whereClause,
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Transform for calendar display
    const slots = availability.map((slot: any) => ({
      id: slot.id,
      title: slot.type === 'AVAILABLE' 
        ? 'Available' 
        : slot.type === 'UNAVAILABLE' 
        ? 'Unavailable' 
        : 'Tentative',
      start: slot.startTime.toISOString(),
      end: slot.endTime.toISOString(),
      backgroundColor: slot.type === 'AVAILABLE' 
        ? 'hsl(142, 76%, 36%)'  // green-600
        : slot.type === 'UNAVAILABLE' 
        ? 'hsl(0, 84%, 60%)'     // red-500
        : 'hsl(45, 93%, 47%)',  // yellow-500
      borderColor: 'transparent',
      display: 'background', // Shows as background highlight
      extendedProps: {
        type: slot.type,
        reporterId: slot.reporterId,
        reporterName: slot.reporter ? `${slot.reporter.firstName} ${slot.reporter.lastName}` : 'Unknown',
        notes: slot.notes,
        isRecurring: slot.isRecurring,
        recurrenceRule: slot.recurrenceRule,
      },
    }));

    return NextResponse.json({
      availability: slots,
      total: slots.length,
    });

  } catch (error) {
    console.error('Availability GET error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// POST - Create availability slot
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Role-based access control: ADMIN, REPORTER, and AGENCY can create availability
    // Reporters create their own, Admin/Agency can create for any reporter
    const allowedRoles = ['ADMIN', 'REPORTER', 'AGENCY'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to set availability' }, { status: 403 });
    }

    const body = await request.json();
    const data = createAvailabilitySchema.parse(body);

    // Determine which reporter this is for
    let reporterId = user.id;
    
    if (['ADMIN', 'AGENCY'].includes(user.role) && body.reporterId) {
      // Verify reporter exists in same firm
      const reporter = await db.user.findFirst({
        where: {
          id: body.reporterId,
          firmId: user.firmId,
          role: 'REPORTER',
        },
      });
      
      if (!reporter) {
        return NextResponse.json({ error: 'Reporter not found' }, { status: 404 });
      }
      
      reporterId = body.reporterId;
    } else if (user.role !== 'REPORTER') {
      return NextResponse.json({ error: 'Must specify reporterId' }, { status: 400 });
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    // Validate times
    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Check for overlapping availability of same type
    const overlapping = await db.reporterAvailability.findFirst({
      where: {
        reporterId,
        type: data.type,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json({ 
        error: 'Overlapping availability slot exists',
        existingSlot: {
          id: overlapping.id,
          start: overlapping.startTime,
          end: overlapping.endTime,
        },
      }, { status: 409 });
    }

    // Create the availability slot
    const availability = await db.reporterAvailability.create({
      data: {
        reporterId,
        firmId: user.firmId,
        startTime,
        endTime,
        timezone: data.timezone,
        type: data.type,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        notes: data.notes,
      },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Availability created',
      availability,
    }, { status: 201 });

  } catch (error) {
    console.error('Availability POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// DELETE - Bulk delete availability (by date range)
// ------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const reporterId = searchParams.get('reporterId');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates required' }, { status: 400 });
    }

    // Build delete filter
    const whereClause: any = {
      firmId: user.firmId,
      startTime: { gte: new Date(start) },
      endTime: { lte: new Date(end) },
    };

    // Reporters can only delete their own
    if (user.role === 'REPORTER') {
      whereClause.reporterId = user.id;
    } else if (reporterId) {
      whereClause.reporterId = reporterId;
    }

    const result = await db.reporterAvailability.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({
      message: `Deleted ${result.count} availability slots`,
      count: result.count,
    });

  } catch (error) {
    console.error('Availability DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 });
  }
}
