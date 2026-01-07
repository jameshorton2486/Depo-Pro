// ============================================================
// CONVERT CALENDAR EVENT TO JOB API ROUTE
// Path: app/api/calendar/events/[id]/convert-to-job/route.ts
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { canConvertEventToJob } from '@/lib/rbac';
import { AuditAction, AuditEntityType } from '@/lib/enums';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    // 2. Get event ID
    const { id: eventId } = await context.params;
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // 3. Fetch user with firm info
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true, firstName: true, lastName: true },
    });

    if (!user?.firmId) {
      return NextResponse.json(
        { error: 'User not associated with a firm', code: 'NO_FIRM' },
        { status: 403 }
      );
    }

    // 4. Fetch calendar event
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        job: true,
        firm: { select: { id: true, name: true } },
        assignedReporter: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Calendar event not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. Authorization check
    if (!canConvertEventToJob(user.role, user.firmId, event.firmId)) {
      return NextResponse.json(
        { error: 'You do not have permission to convert this event', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 6. Idempotency check
    if (event.jobId || event.job || event.status === 'CONVERTED') {
      return NextResponse.json(
        { 
          error: 'This event has already been converted to a job',
          code: 'ALREADY_CONVERTED',
          jobId: event.jobId,
        },
        { status: 409 }
      );
    }

    // 7. Validation
    if (!event.title || !event.startTime) {
      return NextResponse.json(
        { error: 'Event is missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 8. Transaction: Create job + Update event
    const result = await (db as any).$transaction(async (tx: any) => {
      const job = await tx.job.create({
        data: {
          title: event.title,
          caseName: event.title,
          caseNumber: null,
          depositionDate: event.startTime,
          location: event.location,
          zoomLink: event.meetingLink,
          status: 'CREATED',
          createdById: session.user.id,
          firmId: event.firmId,
          notes: event.notes,
        },
      });

      const updatedEvent = await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          jobId: job.id,
          status: 'CONVERTED',
        },
        include: {
          assignedReporter: { select: { id: true, firstName: true, lastName: true } },
          job: { select: { id: true, title: true, status: true } },
        },
      });

      return { job, event: updatedEvent };
    });

    // 9. Audit log
    await logAudit({
      userId: session.user.id,
      action: AuditAction.CALENDAR_CONVERT_TO_JOB,
      entityType: AuditEntityType.CalendarEvent,
      entityId: eventId,
      details: {
        jobId: result.job.id,
        jobTitle: result.job.title,
        eventSnapshot: {
          title: event.title,
          startTime: event.startTime,
          location: event.location,
        },
        convertedBy: {
          userId: session.user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Calendar event successfully converted to job',
      job: {
        id: result.job.id,
        title: result.job.title,
        status: result.job.status,
      },
      event: {
        id: result.event.id,
        status: result.event.status,
        jobId: result.event.jobId,
      },
    });

  } catch (error) {
    console.error('Convert to job error:', error);
    return NextResponse.json(
      { error: 'Failed to convert calendar event to job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
