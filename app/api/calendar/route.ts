import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createCalendarEvent } from '@/lib/supabase/queries/calendar';
import { getUserById } from '@/lib/supabase/queries/users';
import { z } from 'zod';

// ============================================
// GET /api/calendar - List calendar events
// Uses ONLY actual CalendarEvent schema fields
// ============================================

const querySchema = z.object({
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  status: z.string().optional(),
  assignedReporterId: z.string().optional(),
  firmId: z.string().optional(),
  agencyId: z.string().optional(),
  showCancelled: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);

    const parseResult = querySchema.safeParse(searchParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const params = parseResult.data;

    // Build where clause - use startTime (actual field name)
    const where: Record<string, unknown> = {
      startTime: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };

    if (params.status) {
      const statuses = params.status.split(',');
      where.status = { in: statuses };
    }

    if (params.assignedReporterId) {
      where.assignedReporterId = params.assignedReporterId;
    }

    if (params.firmId) {
      where.firmId = params.firmId;
    }

    if (params.agencyId) {
      where.agencyId = params.agencyId;
    }

    const supabase = await createSupabaseServerClient();
    const user = session.user as { id: string; firmId?: string; agencyId?: string };

    if (!user.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Build query filters
    let query = supabase
      .from('calendar_events')
      .select('*, jobs(id, status, case_name, case_number)')
      .eq('firm_id', user.firmId)
      .gte('start_time', params.startDate.toISOString())
      .lte('end_time', params.endDate.toISOString());

    if (params.status) {
      const statuses = params.status.split(',');
      query = query.in('status', statuses);
    } else if (params.showCancelled !== 'true') {
      query = query.neq('status', 'CANCELLED');
    }

    if (params.assignedReporterId) {
      query = query.eq('assigned_reporter_id', params.assignedReporterId);
    }

    if (params.firmId) {
      query = query.eq('firm_id', params.firmId);
    }

    if (params.agencyId) {
      query = query.eq('agency_id', params.agencyId);
    }

    query = query.order('start_time', { ascending: true });

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      throw eventsError;
    }

    // Enrich with assigned reporter info
    const transformedEvents = await Promise.all(
      (events || []).map(async (event: any) => {
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

        return {
          id: event.id,
          title: event.title,
          start: event.start_time,
          end: event.end_time,
          status: event.status,
          eventType: event.event_type,
          location: event.location,
          isRemote: event.is_remote,
          meetingLink: event.meeting_link,
          assignedReporter,
          firmId: event.firm_id,
          agencyId: event.agency_id,
          jobId: event.job_id,
          caseName: event.jobs?.case_name || null,
          caseNumber: event.jobs?.case_number || null,
          notes: event.notes,
        };
      })
    );

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/calendar - Create new event
// ============================================

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z.string().transform((s) => new Date(s)).optional(),
  eventType: z.enum(['DEPOSITION', 'HEARING', 'MEETING', 'OTHER']).optional(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  meetingLink: z.string().optional(),
  notes: z.string().optional(),
  assignedReporterId: z.string().optional(),
  firmId: z.string().optional(),
  agencyId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const parseResult = createEventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const user = session.user as { id: string; firmId?: string; agencyId?: string };

    if (!user.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const endTime = data.endTime || new Date(data.startTime.getTime() + 2 * 60 * 60 * 1000);

    const supabase = await createSupabaseServerClient();

    const eventData: any = {
      firm_id: data.firmId || user.firmId || '',
      created_by_id: user.id,
      title: data.title,
      start_time: data.startTime.toISOString(),
      end_time: endTime.toISOString(),
      event_type: data.eventType || 'DEPOSITION',
      assigned_reporter_id: data.assignedReporterId || null,
      location: data.location || null,
      notes: data.notes || null,
      status: 'SCHEDULED',
    };

    if (data.agencyId || user.agencyId) {
      eventData.agency_id = data.agencyId || user.agencyId || null;
    }

    if (data.isRemote !== undefined) {
      eventData.is_remote = data.isRemote;
    }

    if (data.meetingLink) {
      eventData.meeting_link = data.meetingLink;
    }

    const event = await createCalendarEvent(supabase, eventData);

    // Enrich with assigned reporter info
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
    }, { status: 201 });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}


