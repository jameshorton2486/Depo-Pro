import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ConvertToJobSchema } from '@/lib/calendar/validations';
import { canConvertToJob } from '@/lib/calendar/permissions';
import { getCalendarEventById, convertEventToJob } from '@/lib/supabase/queries/calendar';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { createAuditLog } from '@/lib/calendar/audit';
import { logger } from '@/lib/logger';

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

    // 4. Fetch Event via query layer
    const event = await getCalendarEventById(eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. Check if Already Converted
    if (event.job_id) {
      return NextResponse.json(
        { 
          error: 'Event already converted', 
          code: 'ALREADY_CONVERTED',
          jobId: event.job_id
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
    if (!event.assigned_reporter_id) {
      return NextResponse.json(
        { 
          error: 'Reporter must be assigned before converting to job', 
          code: 'REPORTER_REQUIRED' 
        },
        { status: 400 }
      );
    }

    // 8. Convert Event to Job via query layer
    const convertResult = await convertEventToJob(eventId, {
      title: event.title || 'Untitled Job',
      case_name: event.title || 'Untitled Case',
      case_number: event.case_number || null,
      deposition_date: event.start_time,
      location: event.location || null,
      zoom_link: event.meeting_link || null,
      created_by_id: userId,
      firm_id: event.firm_id || '',
      agency_id: event.agency_id || null,
      assigned_to_id: event.assigned_reporter_id || null,
      scopist_id: assignToScopist && scopistId ? scopistId : null,
      internal_notes: notes || null,
    });

    if (!convertResult.success) {
      if (convertResult.jobId) {
        // Already converted
        return NextResponse.json(
          {
            error: 'Event already converted',
            code: 'ALREADY_CONVERTED',
            jobId: convertResult.jobId,
          },
          { status: 409 }
        );
      }
      logger.error('Failed to convert event to job', new Error(convertResult.error || 'Unknown error'), { eventId });
      return NextResponse.json(
        { error: convertResult.error || 'Failed to convert event to job', code: 'CONVERSION_ERROR' },
        { status: 500 }
      );
    }

    // Create audit log
    await createAuditLog({
      targetId: eventId,
      targetType: 'CALENDAR_EVENT',
      action: 'CALENDAR_CONVERT_TO_JOB',
      actorUserId: userId,
      metadata: {
        jobId: convertResult.jobId,
        eventSnapshot: {
          title: event.title,
          startTime: event.start_time,
        },
        priority,
        includeTranscription,
        assignToScopist,
      },
    });

    // Get created job for response via query layer
    if (!convertResult.jobId) {
      return NextResponse.json(
        { error: 'Job ID not returned from conversion', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await createSupabaseServerClient();
    const result = await getJobById(supabase, convertResult.jobId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to fetch created job', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // 9. Return Success
    return NextResponse.json({
      success: true,
      job: {
        id: result.id,
        title: result.title || result.case_name || 'Untitled Job',
        status: result.status,
      },
      message: 'Event successfully converted to job',
    });

  } catch (error) {
    const { id: eventId } = await params;
    logger.error('[ConvertToJob] Error', error instanceof Error ? error : new Error(String(error)), { eventId });
    
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
