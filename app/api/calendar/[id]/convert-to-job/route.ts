import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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

    // 4. Fetch Event
    const supabase = await createSupabaseServerClient();
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, location, meeting_link, status, job_id, assigned_reporter_id, firm_id, agency_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
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

    // 8. Create Job (Supabase doesn't support transactions, so we do sequential operations)
    const jobData: any = {
      title: event.title,
      case_name: event.title, // Required field, use title as default
      deposition_date: event.start_time,
      location: event.location || null,
      zoom_link: event.meeting_link || null,
      status: 'CREATED',
      created_by_id: userId,
      firm_id: event.firm_id,
      agency_id: event.agency_id || null,
      assigned_to_id: event.assigned_reporter_id || null,
    };

    if (assignToScopist && scopistId) {
      jobData.scopist_id = scopistId;
    }

    if (notes) {
      jobData.internal_notes = notes;
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job', code: 'JOB_CREATION_ERROR' },
        { status: 500 }
      );
    }

    // Update the calendar event
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        job_id: job.id,
        status: 'CONVERTED',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('Event update error:', updateError);
      // Try to rollback job creation (best effort)
      await supabase.from('jobs').delete().eq('id', job.id);
      return NextResponse.json(
        { error: 'Failed to update event', code: 'EVENT_UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: userId,
        action: 'CALENDAR_CONVERT_TO_JOB',
        target_type: 'CalendarEvent',
        target_id: eventId,
        metadata: {
          jobId: job.id,
          eventSnapshot: {
            title: event.title,
            startTime: event.start_time,
          },
          priority,
          includeTranscription,
          assignToScopist,
        },
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Non-fatal, continue
    }

    const result = job;

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
