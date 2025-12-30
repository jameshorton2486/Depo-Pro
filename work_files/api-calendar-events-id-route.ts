// ============================================================
// CALENDAR EVENT DETAIL API ROUTE (STABILIZED)
// Path: app/api/calendar/events/[id]/route.ts
// ============================================================
// STABILIZATION: Added explicit tenant isolation, audit logging,
// and tightened permission checks
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { AuditAction, AuditEntityType } from '@/lib/enums';
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
// ROUTE PARAMS TYPE
// ------------------------------------------------------------

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ------------------------------------------------------------
// HELPER: Assert Tenant Isolation
// Returns user with firmId or throws appropriate error response
// ------------------------------------------------------------

async function assertTenantIsolation(
  session: { user: { id: string; role?: string } } | null
): Promise<{ user: NonNullable<typeof session>['user'] & { firmId: string; role: string } }> {
  if (!session?.user) {
    throw NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, firmId: true },
  });

  if (!user) {
    throw NextResponse.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 403 }
    );
  }

  if (!user.firmId) {
    throw NextResponse.json(
      { error: 'User not associated with a firm', code: 'NO_FIRM' },
      { status: 403 }
    );
  }

  return { user: { ...session.user, ...user, firmId: user.firmId, role: user.role } };
}

// ------------------------------------------------------------
// HELPER: Assert Event Access
// Validates user can access the event (tenant + role)
// ------------------------------------------------------------

async function assertEventAccess(
  eventId: string,
  user: { id: string; firmId: string; role: string },
  requireWriteAccess: boolean = false
): Promise<NonNullable<Awaited<ReturnType<typeof db.calendarEvent.findFirst>>>> {
  // TENANT ISOLATION: Always filter by firmId
  const event = await db.calendarEvent.findFirst({
    where: {
      id: eventId,
      firmId: user.firmId, // CRITICAL: Tenant boundary
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
    throw NextResponse.json(
      { error: 'Event not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // Role-based access check
  const hasAccess = checkEventRoleAccess(user, event, requireWriteAccess);
  if (!hasAccess) {
    throw NextResponse.json(
      { error: 'Access denied', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  return event;
}

// ------------------------------------------------------------
// HELPER: Check Role-Based Access
// ------------------------------------------------------------

function checkEventRoleAccess(
  user: { id: string; role: string },
  event: { assignedReporterId: string | null; requestedById: string | null; participants?: { userId: string }[] },
  requireWriteAccess: boolean
): boolean {
  const role = user.role;

  // Admin and Agency have full access
  if (role === 'ADMIN' || role === 'AGENCY') {
    return true;
  }

  // Reporters: read access to assigned events, limited write
  if (role === 'REPORTER' || role === 'COURT_REPORTER') {
    const isAssigned = event.assignedReporterId === user.id;
    if (requireWriteAccess) {
      // Reporters can only update their own assigned events
      return isAssigned;
    }
    return isAssigned;
  }

  // Attorneys: read access to requested events and participated events
  if (role === 'ATTORNEY') {
    const isRequester = event.requestedById === user.id;
    const isParticipant = event.participants?.some(p => p.userId === user.id);
    // Attorneys have read-only access
    if (requireWriteAccess) {
      return false;
    }
    return isRequester || !!isParticipant;
  }

  // Scopists: no calendar access
  return false;
}

// ------------------------------------------------------------
// GET - Fetch single event
// ------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const session = await auth();
    const { user } = await assertTenantIsolation(session);
    const event = await assertEventAccess(id, user, false);

    // AUDIT: Log view action
    await logAudit({
      userId: user.id,
      action: AuditAction.VIEW,
      entityType: AuditEntityType.CalendarEvent,
      entityId: id,
      details: { eventTitle: event.title },
    });

    return NextResponse.json({ event });

  } catch (error) {
    // If error is already a NextResponse, return it
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Calendar GET [id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// PATCH - Update event (with strict permission checks)
// ------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const session = await auth();
    const { user } = await assertTenantIsolation(session);
    const existingEvent = await assertEventAccess(id, user, true);

    // Parse and validate request body
    const body = await request.json();
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const isAgencyOrAdmin = ['ADMIN', 'AGENCY'].includes(user.role);
    const isAssignedReporter = existingEvent.assignedReporterId === user.id;

    // STRICT PERMISSION ENFORCEMENT for Reporters
    if (user.role === 'REPORTER' || user.role === 'COURT_REPORTER') {
      if (!isAssignedReporter) {
        return NextResponse.json(
          { error: 'You can only update events assigned to you', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Reporters can only confirm or add notes
      const allowedFields = ['status', 'notes'];
      const attemptedFields = Object.keys(data);
      const disallowedFields = attemptedFields.filter(f => !allowedFields.includes(f));

      if (disallowedFields.length > 0) {
        return NextResponse.json({
          error: 'Reporters can only update status and notes',
          code: 'FORBIDDEN',
          disallowedFields,
        }, { status: 403 });
      }

      // Can only set status to CONFIRMED
      if (data.status && data.status !== 'CONFIRMED') {
        return NextResponse.json({
          error: 'Reporters can only confirm events',
          code: 'FORBIDDEN',
        }, { status: 403 });
      }
    }

    // Only Agency/Admin can update most fields
    if (!isAgencyOrAdmin && !isAssignedReporter) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...data };

    // Handle datetime conversions
    if (data.startTime) {
      updateData.startTime = new Date(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = new Date(data.endTime);
    }

    // VALIDATION: Time range
    if (updateData.startTime && updateData.endTime) {
      if ((updateData.endTime as Date) <= (updateData.startTime as Date)) {
        return NextResponse.json(
          { error: 'End time must be after start time', code: 'INVALID_TIME_RANGE' },
          { status: 400 }
        );
      }
    }

    // Check for conflicts if reporter or time changed
    const reporterChanged = data.assignedReporterId !== undefined &&
                           data.assignedReporterId !== existingEvent.assignedReporterId;
    const timeChanged = data.startTime || data.endTime;

    if ((reporterChanged || timeChanged) && (data.assignedReporterId || existingEvent.assignedReporterId)) {
      const reporterId = data.assignedReporterId ?? existingEvent.assignedReporterId;
      const startTime = (updateData.startTime as Date) ?? existingEvent.startTime;
      const endTime = (updateData.endTime as Date) ?? existingEvent.endTime;

      if (reporterId) {
        // TENANT ISOLATION: Validate reporter belongs to same firm
        const reporter = await db.user.findFirst({
          where: {
            id: reporterId,
            firmId: user.firmId, // CRITICAL: Same tenant check
            role: { in: ['REPORTER', 'COURT_REPORTER'] },
          },
        });

        if (!reporter) {
          return NextResponse.json(
            { error: 'Reporter not found or not in your firm', code: 'INVALID_REPORTER' },
            { status: 400 }
          );
        }

        const conflicts = await checkReporterConflicts(
          reporterId,
          startTime,
          endTime,
          user.firmId,
          id
        );

        if (conflicts.length > 0) {
          return NextResponse.json({
            error: 'Reporter has conflicting events',
            code: 'CONFLICT',
            conflicts: conflicts.map((c) => ({
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
        return NextResponse.json(
          { error: 'Cancellation reason is required', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
    }

    // Perform update
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

    // AUDIT: Log update action
    await logAudit({
      userId: user.id,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CalendarEvent,
      entityId: id,
      details: {
        eventTitle: updatedEvent.title,
        changedFields: Object.keys(data),
        previousStatus: existingEvent.status,
        newStatus: updatedEvent.status,
      },
    });

    return NextResponse.json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });

  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Calendar PATCH [id] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update event', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// DELETE - Delete event (Agency/Admin only)
// ------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const session = await auth();
    const { user } = await assertTenantIsolation(session);

    // STRICT: Only Agency and Admin can delete
    if (!['ADMIN', 'AGENCY'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only Agency and Admin can delete events', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Get event with tenant isolation
    const event = await db.calendarEvent.findFirst({
      where: {
        id: id,
        firmId: user.firmId, // TENANT ISOLATION
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if event has a linked job
    if (event.jobId) {
      return NextResponse.json({
        error: 'Cannot delete event with linked job. Cancel the event instead.',
        code: 'HAS_LINKED_JOB',
        suggestion: 'PATCH with status: CANCELLED',
      }, { status: 400 });
    }

    // Delete participants first
    await db.eventParticipant.deleteMany({
      where: { eventId: id },
    });

    // Delete the event
    await db.calendarEvent.delete({
      where: { id: id },
    });

    // AUDIT: Log delete action
    await logAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.CalendarEvent,
      entityId: id,
      details: {
        eventTitle: event.title,
        eventStatus: event.status,
      },
    });

    return NextResponse.json({
      message: 'Event deleted successfully',
    });

  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Calendar DELETE [id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// HELPER: Check Reporter Conflicts
// ------------------------------------------------------------

async function checkReporterConflicts(
  reporterId: string,
  startTime: Date,
  endTime: Date,
  firmId: string,
  excludeEventId?: string
) {
  const whereClause: Record<string, unknown> = {
    firmId, // TENANT ISOLATION
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
