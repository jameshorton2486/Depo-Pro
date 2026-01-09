// ============================================================
// CONVERT CALENDAR EVENT TO JOB API ROUTE
// Path: app/api/calendar/events/[id]/convert-to-job/route.ts
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { getCalendarEventById, convertEventToJob } from '@/lib/supabase/queries/calendar';
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
    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);
    
    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json(
        { error: 'User not associated with a firm', code: 'NO_FIRM' },
        { status: 403 }
      );
    }

    const user = {
      id: userData.id,
      role: userData.user_metadata?.role || 'REPORTER',
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
      firstName: userData.user_metadata?.firstName || '',
      lastName: userData.user_metadata?.lastName || '',
    };

    // 4. Fetch calendar event
    const event = await getCalendarEventById(eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Calendar event not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. Authorization check
    if (!canConvertEventToJob(user.role, user.firmId as string, event.firm_id)) {
      return NextResponse.json(
        { error: 'You do not have permission to convert this event', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 6. Idempotency check
    if (event.job_id || event.status === 'CONVERTED') {
      return NextResponse.json(
        { 
          error: 'This event has already been converted to a job',
          code: 'ALREADY_CONVERTED',
          jobId: event.job_id,
        },
        { status: 409 }
      );
    }

    // 7. Validation
    if (!event.title || !event.start_time) {
      return NextResponse.json(
        { error: 'Event is missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 8. Convert event to job using query module function
    const convertResult = await convertEventToJob(eventId, {
      title: event.title,
      case_name: event.title,
      case_number: null,
      deposition_date: new Date(event.start_time).toISOString(),
      location: event.location || null,
      zoom_link: event.meeting_link || null,
      created_by_id: session.user.id,
      firm_id: event.firm_id,
      agency_id: event.agency_id || null,
      assigned_to_id: event.assigned_reporter_id || null,
      scopist_id: null,
      internal_notes: event.notes || null,
    });

    if (!convertResult.success || !convertResult.jobId) {
      return NextResponse.json(
        { error: convertResult.error || 'Failed to convert event', code: 'CONVERSION_ERROR' },
        { status: 500 }
      );
    }

    // Get the created job
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, status')
      .eq('id', convertResult.jobId)
      .single();

    // Get updated event
    const updatedEvent = await getCalendarEventById(eventId);

    const result = {
      job: job || { id: convertResult.jobId, title: event.title, status: 'CREATED' },
      event: updatedEvent,
    };

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
        id: result.event?.id,
        status: result.event?.status,
        jobId: result.event?.job_id,
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
