import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCalendarEventById, updateCalendarEvent } from '@/lib/supabase/queries/calendar';
import { getUserById } from '@/lib/supabase/queries/users';
import { getJobById } from '@/lib/supabase/queries/jobs';

// ============================================
// GET /api/calendar/[id] - Get single event
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const event = await getCalendarEventById(id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();

    // Enrich with related data
    let assignedReporter = null;
    if (event.assigned_reporter_id) {
      const reporter = await getUserById(supabase, event.assigned_reporter_id);
      if (reporter) {
        assignedReporter = {
          id: reporter.id,
          firstName: reporter.user_metadata?.firstName || '',
          lastName: reporter.user_metadata?.lastName || '',
          email: reporter.email || '',
        };
      }
    }

    let job = null;
    if (event.job_id) {
      job = await getJobById(supabase, event.job_id);
    }

    let createdBy = null;
    if (event.created_by_id) {
      const creator = await getUserById(supabase, event.created_by_id);
      if (creator) {
        createdBy = {
          id: creator.id,
          firstName: creator.user_metadata?.firstName || '',
          lastName: creator.user_metadata?.lastName || '',
        };
      }
    }

    return NextResponse.json({
      event: {
        ...event,
        assignedReporter,
        job: job ? {
          id: job.id,
          status: (job as any).status,
          caseName: (job as any).case_name,
          caseNumber: (job as any).case_number,
        } : null,
        createdBy,
      }
    });
  } catch (error) {
    console.error('Calendar GET [id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// ============================================
// PATCH /api/calendar/[id] - Update event
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await getCalendarEventById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.startTime) updateData.start_time = new Date(body.startTime).toISOString();
    if (body.endTime) updateData.end_time = new Date(body.endTime).toISOString();
    if (body.location !== undefined) updateData.location = body.location;
    if (body.isRemote !== undefined) updateData.is_remote = body.isRemote;
    if (body.meetingLink !== undefined) updateData.meeting_link = body.meetingLink;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignedReporterId !== undefined) updateData.assigned_reporter_id = body.assignedReporterId;

    if (body.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      updateData.cancelled_at = new Date().toISOString();
    }
    if (body.status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
      updateData.confirmed_at = new Date().toISOString();
    }

    const event = await updateCalendarEvent(id, updateData);

    // Enrich with assigned reporter info
    const supabase = await createSupabaseServerClient();
    let assignedReporter = null;
    if (event.assigned_reporter_id) {
      const reporter = await getUserById(supabase, event.assigned_reporter_id);
      if (reporter) {
        assignedReporter = {
          id: reporter.id,
          firstName: reporter.user_metadata?.firstName || '',
          lastName: reporter.user_metadata?.lastName || '',
          email: reporter.email || '',
        };
      }
    }

    return NextResponse.json({
      event: {
        ...event,
        assignedReporter,
      }
    });
  } catch (error) {
    console.error('Calendar PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// ============================================
// DELETE /api/calendar/[id] - Soft delete
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await getCalendarEventById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await updateCalendarEvent(id, {
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString()
    });

    const event = await getCalendarEventById(id);

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
