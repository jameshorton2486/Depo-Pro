// ============================================================
// BOOKING REQUEST DETAIL API ROUTE
// Path: app/api/calendar/booking-requests/[id]/route.ts
// Handles approve, reject, modify actions
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// ------------------------------------------------------------
// VALIDATION SCHEMAS
// ------------------------------------------------------------

const updateRequestSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel', 'modify']),
  // For approval
  assignedReporterId: z.string().optional(),
  confirmedDate: z.string().datetime().optional(),
  // For rejection/modification
  rejectionReason: z.string().optional(),
  proposedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// ------------------------------------------------------------
// GET - Fetch single booking request
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
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const bookingRequest = await db.bookingRequest.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
      include: {
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        respondedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        calendarEvent: {
          include: {
            assignedReporter: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!bookingRequest) {
      return NextResponse.json({ error: 'Booking request not found' }, { status: 404 });
    }

    // Attorneys can only see their own
    if (user.role === 'ATTORNEY' && bookingRequest.requestedById !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ request: bookingRequest });

  } catch (error) {
    console.error('Booking request GET [id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// PATCH - Update booking request (approve/reject/modify)
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
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Find existing request
    const existing = await db.bookingRequest.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Booking request not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateRequestSchema.parse(body);

    // Handle different actions
    switch (data.action) {
      // --------------------------------------------------------
      // APPROVE - Agency approves and creates calendar event
      // --------------------------------------------------------
      case 'approve': {
        if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role)) {
          return NextResponse.json({ error: 'Only agency can approve requests' }, { status: 403 });
        }

        if (existing.status !== 'PENDING' && existing.status !== 'MODIFIED') {
          return NextResponse.json({ error: 'Can only approve pending requests' }, { status: 400 });
        }

        const eventDate = data.confirmedDate 
          ? new Date(data.confirmedDate) 
          : existing.preferredDate;

        // Calculate end time based on duration
        const endTime = new Date(eventDate);
        endTime.setMinutes(endTime.getMinutes() + existing.estimatedDuration);

        // Check for conflicts if reporter assigned
        if (data.assignedReporterId) {
          const conflicts = await db.calendarEvent.findFirst({
            where: {
              firmId: user.firmId,
              assignedReporterId: data.assignedReporterId,
              status: { notIn: ['CANCELLED', 'COMPLETED'] },
              OR: [
                {
                  AND: [
                    { startTime: { lte: eventDate } },
                    { endTime: { gt: eventDate } },
                  ],
                },
                {
                  AND: [
                    { startTime: { lt: endTime } },
                    { endTime: { gte: endTime } },
                  ],
                },
              ],
            },
          });

          if (conflicts) {
            return NextResponse.json({
              error: 'Reporter has a conflict at this time',
              conflict: {
                id: conflicts.id,
                title: conflicts.title,
                start: conflicts.startTime,
              },
            }, { status: 409 });
          }
        }

        // Create calendar event
        const calendarEvent = await db.calendarEvent.create({
          data: {
            firmId: user.firmId,
            title: `${existing.caseName} - ${existing.deponentName}`,
            eventType: existing.eventType,
            status: data.assignedReporterId ? 'SCHEDULED' : 'REQUESTED',
            startTime: eventDate,
            endTime: endTime,
            timezone: 'America/Chicago',
            location: existing.location,
            isRemote: existing.isRemote,
            assignedReporterId: data.assignedReporterId,
            requestedById: existing.requestedById,
            scheduledById: user.id,
            notes: existing.specialNotes,
            createdById: user.id,
          },
        });

        // Update booking request
        const updatedRequest = await db.bookingRequest.update({
          where: { id: id },
          data: {
            status: 'APPROVED',
            calendarEventId: calendarEvent.id,
            respondedById: user.id,
            respondedAt: new Date(),
          },
          include: {
            calendarEvent: true,
          },
        });

        // TODO: Notify attorney of approval
        // await notifyAttorneyOfApproval(updatedRequest);

        return NextResponse.json({
          message: 'Request approved and event created',
          request: updatedRequest,
          event: calendarEvent,
        });
      }

      // --------------------------------------------------------
      // REJECT - Agency rejects the request
      // --------------------------------------------------------
      case 'reject': {
        if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role)) {
          return NextResponse.json({ error: 'Only agency can reject requests' }, { status: 403 });
        }

        if (!data.rejectionReason) {
          return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        const updatedRequest = await db.bookingRequest.update({
          where: { id: id },
          data: {
            status: 'REJECTED',
            rejectionReason: data.rejectionReason,
            respondedById: user.id,
            respondedAt: new Date(),
          },
        });

        // TODO: Notify attorney of rejection
        // await notifyAttorneyOfRejection(updatedRequest);

        return NextResponse.json({
          message: 'Request rejected',
          request: updatedRequest,
        });
      }

      // --------------------------------------------------------
      // CANCEL - Attorney cancels their request
      // --------------------------------------------------------
      case 'cancel': {
        // Only the requesting attorney or agency can cancel
        if (existing.requestedById !== user.id && !['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role)) {
          return NextResponse.json({ error: 'Cannot cancel this request' }, { status: 403 });
        }

        if (existing.status === 'APPROVED' && existing.calendarEventId) {
          // Also cancel the calendar event
          await db.calendarEvent.update({
            where: { id: existing.calendarEventId },
            data: {
              status: 'CANCELLED',
              cancellationReason: 'Booking request cancelled',
              cancelledAt: new Date(),
            },
          });
        }

        const updatedRequest = await db.bookingRequest.update({
          where: { id: id },
          data: {
            status: 'CANCELLED',
            respondedById: user.id,
            respondedAt: new Date(),
          },
        });

        return NextResponse.json({
          message: 'Request cancelled',
          request: updatedRequest,
        });
      }

      // --------------------------------------------------------
      // MODIFY - Agency proposes different date
      // --------------------------------------------------------
      case 'modify': {
        if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role)) {
          return NextResponse.json({ error: 'Only agency can modify requests' }, { status: 403 });
        }

        if (!data.proposedDate) {
          return NextResponse.json({ error: 'Proposed date is required' }, { status: 400 });
        }

        const updatedRequest = await db.bookingRequest.update({
          where: { id: id },
          data: {
            status: 'MODIFIED',
            preferredDate: new Date(data.proposedDate), // Update to agency's proposed date
            respondedById: user.id,
            respondedAt: new Date(),
            // Store original date in notes
            specialNotes: existing.specialNotes 
              ? `${existing.specialNotes}\n\nOriginal requested date: ${existing.preferredDate.toISOString()}`
              : `Original requested date: ${existing.preferredDate.toISOString()}`,
          },
        });

        // TODO: Notify attorney of proposed change
        // await notifyAttorneyOfModification(updatedRequest, data.proposedDate);

        return NextResponse.json({
          message: 'Alternative date proposed',
          request: updatedRequest,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Booking request PATCH [id] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// DELETE - Delete booking request (cancel)
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
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const existing = await db.bookingRequest.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only requesting attorney or admin can delete
    if (existing.requestedById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Can't delete approved requests
    if (existing.status === 'APPROVED') {
      return NextResponse.json({ 
        error: 'Cannot delete approved request. Cancel instead.' 
      }, { status: 400 });
    }

    await db.bookingRequest.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: 'Request deleted',
    });

  } catch (error) {
    console.error('Booking request DELETE [id] error:', error);
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}
