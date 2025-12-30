import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { AssignPersonnelSchema } from '@/lib/calendar/validations';
import { canAssignPersonnel } from '@/lib/calendar/permissions';
import { createAuditLog } from '@/lib/calendar/audit';

// ============================================
// POST /api/calendar/[id]/assign
// Assigns/unassigns personnel to a calendar event
// Currently supports REPORTER (scopist/videographer/interpreter 
// fields don't exist in schema yet)
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;
    const userId = session.user.id;
    const userRole = session.user.role as string;

    // 2. Parse and Validate
    const body = await request.json();
    const validationResult = AssignPersonnelSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      );
    }

    const { personnelType, personnelId, notifyAssignee, notes } = validationResult.data;

    // 3. Permission Check
    // For now, only REPORTER assignment is supported (schema limitation)
    if (personnelType !== 'REPORTER') {
      return NextResponse.json(
        { 
          error: 'Personnel type not yet supported', 
          code: 'NOT_IMPLEMENTED',
          message: `Assignment of ${personnelType.toLowerCase()}s is not yet available.`
        },
        { status: 501 }
      );
    }

    if (!canAssignPersonnel(userRole as any, personnelType)) {
      return NextResponse.json(
        { 
          error: 'Permission denied', 
          code: 'PERMISSION_DENIED',
          message: `Your role cannot assign ${personnelType.toLowerCase()}s.`
        },
        { status: 403 }
      );
    }

    // 4. Fetch Event
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        assignedReporterId: true,
        firmId: true,
        agencyId: true,
        internalNotes: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. Check Event Status
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      return NextResponse.json(
        { 
          error: 'Cannot modify assignments for this event', 
          code: 'INVALID_STATUS',
          message: `Event is ${event.status.toLowerCase()}.`
        },
        { status: 400 }
      );
    }

    // 6. Validate Personnel if assigning
    if (personnelId) {
      const personnel = await db.user.findUnique({
        where: { id: personnelId },
        select: { 
          id: true, 
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          agencyId: true,
        },
      });

      if (!personnel) {
        return NextResponse.json(
          { error: 'Personnel not found', code: 'PERSONNEL_NOT_FOUND' },
          { status: 404 }
        );
      }

      // Validate role is REPORTER
      if (personnel.role !== 'REPORTER' && personnel.role !== 'ADMIN' && personnel.role !== 'AGENCY_ADMIN') {
        return NextResponse.json(
          { 
            error: 'Invalid personnel role', 
            code: 'ROLE_MISMATCH',
            message: 'Selected user is not a reporter.'
          },
          { status: 400 }
        );
      }

      // Check agency affiliation if event has an agency
      if (event.agencyId && personnel.agencyId && personnel.agencyId !== event.agencyId) {
        return NextResponse.json(
          { 
            error: 'Personnel not in agency', 
            code: 'AGENCY_MISMATCH',
            message: 'Selected reporter is not affiliated with this agency.'
          },
          { status: 400 }
        );
      }

      // _personnelName = `${personnel.firstName} ${personnel.lastName}`; // Unused
    }

    // 7. Store previous value for audit
    const previousReporterId = event.assignedReporterId;

    // 8. Update in Transaction
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update the event
      const updatedEvent = await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          assignedReporterId: personnelId,
          updatedAt: new Date(),
          // Add notes to internalNotes if provided
          ...(notes && {
            internalNotes: event.internalNotes 
              ? `${event.internalNotes}\n\nAssignment note: ${notes}`
              : `Assignment note: ${notes}`,
          }),
        },
        include: {
          assignedReporter: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true 
            } 
          },
        },
      });

      // Create audit log
      const auditAction = personnelId 
        ? 'REPORTER_ASSIGNED' as const
        : 'REPORTER_UNASSIGNED' as const;

      await createAuditLog({
        eventId: eventId,
        action: auditAction,
        performedById: userId,
        previousValue: { assignedReporterId: previousReporterId },
        newValue: { assignedReporterId: personnelId },
        metadata: {
          personnelType,
          notifyAssignee,
          notes,
        },
      }, tx);

      return updatedEvent;
    });

    // 9. Send Notification (if enabled)
    // TODO: Implement notification service
    // if (notifyAssignee && personnelId) {
    //   await notificationService.sendAssignmentNotification({
    //     personnelId,
    //     eventId,
    //     personnelType,
    //     assignedById: userId,
    //   });
    // }

    // 10. Return Success
    const assignedReporterName = result.assignedReporter
      ? `${result.assignedReporter.firstName} ${result.assignedReporter.lastName}`
      : null;

    return NextResponse.json({
      success: true,
      assignment: {
        personnelType,
        personnelId,
        personnelName: assignedReporterName,
        isUnassignment: !personnelId,
      },
      message: personnelId 
        ? `${personnelType} assigned successfully`
        : `${personnelType} unassigned successfully`,
    });

  } catch (error) {
    console.error('[AssignPersonnel] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

