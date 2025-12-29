import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { RescheduleEventSchema } from '@/lib/calendar/validations';
import { canReschedule } from '@/lib/calendar/permissions';
import { createAuditLog } from '@/lib/calendar/audit';

// ============================================
// PATCH /api/calendar/[id]/reschedule
// Reschedules a calendar event
// ============================================

export async function PATCH(
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
    const validationResult = RescheduleEventSchema.safeParse(body);
    
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

    const { 
      scheduledStart, 
      scheduledEnd, 
      reason, 
      notifyParties,
      updateLocation,
      newLocation 
    } = validationResult.data;

    // 3. Fetch Event
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        assignedReporter: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 4. Permission Check
    if (!canReschedule(userRole as any, userId, { 
      createdById: event.createdById, 
      firmId: event.firmId 
    })) {
      return NextResponse.json(
        { 
          error: 'Permission denied', 
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to reschedule this event.'
        },
        { status: 403 }
      );
    }

    // Additional check: Attorneys can only reschedule their firm's events
    if ((userRole === 'ATTORNEY' || userRole === 'FIRM_ADMIN') && event.firmId) {
      const userFirm = await db.user.findUnique({
        where: { id: userId },
        select: { firmId: true },
      });
      
      if (userFirm?.firmId !== event.firmId) {
        return NextResponse.json(
          { 
            error: 'Permission denied', 
            code: 'PERMISSION_DENIED',
            message: 'You can only reschedule events for your own firm.'
          },
          { status: 403 }
        );
      }
    }

    // 5. Check Status
    if (['CANCELLED', 'COMPLETED', 'IN_PROGRESS'].includes(event.status)) {
      return NextResponse.json(
        { 
          error: 'Cannot reschedule this event', 
          code: 'INVALID_STATUS',
          message: `Event is ${event.status.toLowerCase()}.`
        },
        { status: 400 }
      );
    }

    // 6. Check for Conflicts (if reporter assigned)
    if (event.assignedReporterId) {
      const conflict = await db.calendarEvent.findFirst({
        where: {
          assignedReporterId: event.assignedReporterId,
          id: { not: eventId },
          status: { notIn: ['CANCELLED'] },
          OR: [
            {
              startTime: { lte: new Date(scheduledStart) },
              endTime: { gt: new Date(scheduledStart) },
            },
            {
              startTime: { lt: new Date(scheduledEnd) },
              endTime: { gte: new Date(scheduledEnd) },
            },
            {
              startTime: { gte: new Date(scheduledStart) },
              endTime: { lte: new Date(scheduledEnd) },
            },
          ],
        },
        select: { id: true, title: true, startTime: true },
      });

      if (conflict) {
        return NextResponse.json(
          { 
            error: 'Schedule conflict', 
            code: 'CONFLICT',
            message: 'Reporter has a conflicting event at this time.',
            conflict: {
              eventId: conflict.id,
              title: conflict.title,
              time: conflict.startTime,
            },
          },
          { status: 409 }
        );
      }
    }

    // 7. Build Update Data
    const updateData: Record<string, unknown> = {
      startTime: new Date(scheduledStart),
      endTime: new Date(scheduledEnd),
      status: event.status === 'CONFIRMED' ? 'SCHEDULED' : event.status, // Reset to scheduled if was confirmed
      updatedAt: new Date(),
    };

    if (updateLocation && newLocation) {
      updateData.isRemote = newLocation.isRemote;
      updateData.location = newLocation.address || null;
      updateData.meetingLink = newLocation.zoomUrl || null;
    }

    // 8. Update in Transaction
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedEvent = await tx.calendarEvent.update({
        where: { id: eventId },
        data: updateData,
      });

      // Audit log
      await createAuditLog({
        eventId: eventId,
        action: 'EVENT_RESCHEDULED',
        performedById: userId,
        previousValue: {
          startTime: event.startTime,
          endTime: event.endTime,
          status: event.status,
        },
        newValue: {
          startTime: updateData.startTime,
          endTime: updateData.endTime,
          status: updateData.status,
        },
        metadata: {
          reason,
          notifyParties,
          updateLocation,
        },
      }, tx);

      return updatedEvent;
    });

    // 9. Send Notifications
    // TODO: Implement notification service

    return NextResponse.json({
      success: true,
      message: 'Event rescheduled successfully',
      event: {
        id: result.id,
        startTime: result.startTime,
        endTime: result.endTime,
        status: result.status,
      },
    });

  } catch (error) {
    console.error('[RescheduleEvent] Error:', error);
    
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

