// ============================================================
// CALENDAR EVENT DETAIL API ROUTE
// Path: app/api/calendar/events/[id]/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// ------------------------------------------------------------
// VALIDATION SCHEMAS
// ------------------------------------------------------------

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  eventType: z.enum(['DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO', 'STATEMENT', 'OTHER']).optional(),
  status: z.enum(['REQUESTED', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  meetingLink: z.string().url().optional().nullable(),
  assignedReporterId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  cancellationReason: z.string().optional(),
});

// ------------------------------------------------------------
// GET - Fetch single event
// ------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const event = await db.calendarEvent.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        scheduledBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        job: {
          select: { 
            id: true, 
            caseName: true, 
            caseNumber: true,
            status: true,
          },
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
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Role-based access check
    const canView = checkEventAccess(user, event);
    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ event });

  } catch (error) {
    console.error('Calendar GET [id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// PATCH - Update event (Agency/Admin, or Reporter for status)
// ------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Fetch existing event
    const existingEvent = await db.calendarEvent.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateEventSchema.parse(body);

    // Permission checks based on role
    const isAgencyOrAdmin = ['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role);
    const isAssignedReporter = existingEvent.assignedReporterId === user.id;

    // Reporters can only update status to CONFIRMED
    if (user.role === 'REPORTER') {
      if (!isAssignedReporter) {
        return NextResponse.json({ error: 'You can only update events assigned to you' }, { status: 403 });
      }
      
      // Reporters can only confirm or add notes
      const allowedFields = ['status', 'notes'];
      const attemptedFields = Object.keys(data);
      const disallowedFields = attemptedFields.filter(f => !allowedFields.includes(f));
      
      if (disallowedFields.length > 0) {
        return NextResponse.json({ 
          error: 'Reporters can only update status and notes',
          disallowedFields,
        }, { status: 403 });
      }

      // Can only set status to CONFIRMED
      if (data.status && data.status !== 'CONFIRMED') {
        return NextResponse.json({ 
          error: 'Reporters can only confirm events' 
        }, { status: 403 });
      }
    }

    // Only Agency/Admin can update most fields
    if (!isAgencyOrAdmin && !isAssignedReporter) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: any = { ...data };

    // Handle datetime conversions
    if (data.startTime) {
      updateData.startTime = new Date(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = new Date(data.endTime);
    }

    // Validate time range if both provided
    if (updateData.startTime && updateData.endTime) {
      if (updateData.endTime <= updateData.startTime) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }
    }

    // Check for conflicts if reporter or time changed
    const reporterChanged = data.assignedReporterId !== undefined && 
                           data.assignedReporterId !== existingEvent.assignedReporterId;
    const timeChanged = data.startTime || data.endTime;

    if ((reporterChanged || timeChanged) && (data.assignedReporterId || existingEvent.assignedReporterId)) {
      const reporterId = data.assignedReporterId ?? existingEvent.assignedReporterId;
      const startTime = updateData.startTime ?? existingEvent.startTime;
      const endTime = updateData.endTime ?? existingEvent.endTime;

      if (reporterId) {
        const conflicts = await checkReporterConflicts(
          reporterId,
          startTime,
          endTime,
          user.firmId,
          id // Exclude current event
        );

        if (conflicts.length > 0) {
          return NextResponse.json({
            error: 'Reporter has conflicting events',
            conflicts: conflicts.map((c: any) => ({
              id: c.id,
              title: c.title,
              start: c.startTime,
              end: c.endTime,
            })),
          }, { status: 409 });
        }
      }
    }

    // Handle status changes
    if (data.status === 'CONFIRMED' && isAssignedReporter) {
      updateData.confirmedAt = new Date();
    }
    if (data.status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      if (!data.cancellationReason) {
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 });
      }
    }

    // Update the event
    const updatedEvent = await db.calendarEvent.update({
      where: { id: id },
      data: updateData,
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        job: true,
        participants: true,
      },
    });

    // TODO: Send notifications for significant changes
    // if (reporterChanged) await notifyNewReporter(updatedEvent);
    // if (data.status === 'CANCELLED') await notifyParticipants(updatedEvent);

    return NextResponse.json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });

  } catch (error) {
    console.error('Calendar PATCH [id] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// DELETE - Delete event (Agency/Admin only)
// ------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Only Agency and Admin can delete
    if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role)) {
      return NextResponse.json({ error: 'Only Agency and Admin can delete events' }, { status: 403 });
    }

    const event = await db.calendarEvent.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if event has a linked job
    if (event.jobId) {
      return NextResponse.json({ 
        error: 'Cannot delete event with linked job. Cancel the event instead.',
        suggestion: 'PATCH with status: CANCELLED'
      }, { status: 400 });
    }

    // Delete participants first (cascade should handle, but being explicit)
    await db.eventParticipant.deleteMany({
      where: { eventId: id },
    });

    // Delete the event
    await db.calendarEvent.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: 'Event deleted successfully',
    });

  } catch (error) {
    console.error('Calendar DELETE [id] error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------

function checkEventAccess(user: any, event: any): boolean {
  switch (user.role) {
    case 'ADMIN':
    case 'AGENCY':
      return true;
    
    case 'REPORTER':
      return event.assignedReporterId === user.id;
    
    case 'ATTORNEY':
      return event.requestedById === user.id || 
             event.participants?.some((p: any) => p.userId === user.id);
    
    default:
      return false;
  }
}

async function checkReporterConflicts(
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
