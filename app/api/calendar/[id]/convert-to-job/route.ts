import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { ConvertToJobSchema } from '@/lib/calendar/validations';
import { canConvertToJob } from '@/lib/calendar/permissions';

// ============================================
// POST /api/calendar/[id]/convert-to-job
// Converts a calendar event to a Job
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication Check
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

    // 2. Permission Check
    if (!canConvertToJob(userRole as any)) {
      return NextResponse.json(
        { 
          error: 'Permission denied', 
          code: 'PERMISSION_DENIED',
          message: 'Your role does not have permission to convert events to jobs.'
        },
        { status: 403 }
      );
    }

    // 3. Parse and Validate Body
    const body = await request.json();
    const validationResult = ConvertToJobSchema.safeParse(body);
    
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

    const { includeTranscription, assignToScopist, scopistId, priority, notes } = validationResult.data;

    // 4. Fetch Event with Relations
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. Check if Already Converted
    if (event.jobId) {
      return NextResponse.json(
        { 
          error: 'Event already converted', 
          code: 'ALREADY_CONVERTED',
          jobId: event.jobId
        },
        { status: 409 }
      );
    }

    // 6. Check Event Status
    if (event.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot convert cancelled event', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // 7. Validate Reporter Assignment
    if (!event.assignedReporterId) {
      return NextResponse.json(
        { 
          error: 'Reporter must be assigned before converting to job', 
          code: 'REPORTER_REQUIRED' 
        },
        { status: 400 }
      );
    }

    // 8. Create Job in Transaction
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create the job
      const job = await tx.job.create({
        data: {
          title: event.title,
          caseName: event.title, // Required field, use title as default
          depositionDate: event.startTime,
          location: event.location || null,
          zoomLink: event.meetingLink || null,
          status: 'CREATED',
          
          // Relationships
          createdById: userId,
          firmId: event.firmId,
          agencyId: event.agencyId || null,
          assignedToId: event.assignedReporterId || null,
          
          // Scopist assignment if requested
          ...(assignToScopist && scopistId && {
            scopistId: scopistId,
          }),
          
          // Notes
          ...(notes && {
            internalNotes: notes,
          }),
        },
      });

      // Update the calendar event
      await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          jobId: job.id,
          status: 'CONVERTED' as any, // Type assertion needed until Prisma client regenerates
          confirmedAt: new Date(),
        },
      });

      // Create audit log using generic AuditLog
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'CALENDAR_CONVERT_TO_JOB',
          targetType: 'CalendarEvent',
          targetId: eventId,
          metadata: {
            jobId: job.id,
            eventSnapshot: {
              title: event.title,
              startTime: event.startTime.toISOString(),
            },
            priority,
            includeTranscription,
            assignToScopist,
          },
        },
      });

      return job;
    });

    // 9. Return Success
    return NextResponse.json({
      success: true,
      job: {
        id: result.id,
        title: result.title,
        status: result.status,
      },
      message: 'Event successfully converted to job',
    });

  } catch (error) {
    console.error('[ConvertToJob] Error:', error);
    
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
