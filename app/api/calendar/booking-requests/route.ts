// ============================================================
// BOOKING REQUEST API ROUTES
// Path: app/api/calendar/booking-requests/route.ts
// Task 2.3.3 - Attorney Booking Request Workflow
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { z } from 'zod';

// ------------------------------------------------------------
// VALIDATION SCHEMAS
// ------------------------------------------------------------

const createBookingRequestSchema = z.object({
  caseName: z.string().min(1, 'Case name is required'),
  caseNumber: z.string().optional(),
  preferredDate: z.string().datetime(),
  alternateDate1: z.string().datetime().optional(),
  alternateDate2: z.string().datetime().optional(),
  estimatedDuration: z.number().min(30).max(480).default(240), // 30 min to 8 hours
  eventType: z.enum(['DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO', 'STATEMENT', 'OTHER']).default('DEPOSITION'),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  deponentName: z.string().min(1, 'Deponent name is required'),
  deponentContact: z.string().optional(),
  needsInterpreter: z.boolean().default(false),
  interpreterLanguage: z.string().optional(),
  needsVideographer: z.boolean().default(false),
  needsRealtime: z.boolean().default(false),
  specialNotes: z.string().optional(),
});

const querySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'MODIFIED']).optional(),
  requestedById: z.string().optional(),
});

// ------------------------------------------------------------
// GET - Fetch booking requests
// ------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      status: searchParams.get('status') || undefined,
      requestedById: searchParams.get('requestedById') || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const _user = {
      id: currentUser.id,
      role: currentUser.role,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    // Build query
    let requestsQuery = supabase
      .from('booking_requests')
      .select('*')
      .eq('firm_id', currentUser.firmId);

    // Attorneys only see their own requests
    if (currentUser.role === 'ATTORNEY') {
      requestsQuery = requestsQuery.eq('requested_by_id', currentUser.id);
    } else if (query.requestedById) {
      requestsQuery = requestsQuery.eq('requested_by_id', query.requestedById);
    }

    // Status filter
    if (query.status) {
      requestsQuery = requestsQuery.eq('status', query.status);
    }

    requestsQuery = requestsQuery.order('created_at', { ascending: false });

    const { data: requests, error: requestsError } = await requestsQuery;

    if (requestsError) {
      throw requestsError;
    }

    // Enrich with related data
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (request: any) => {
        const requestedBy = await getUserById(supabase, request.requested_by_id);
        const respondedBy = request.responded_by_id 
          ? await getUserById(supabase, request.responded_by_id)
          : null;
        
        let calendarEvent = null;
        if (request.calendar_event_id) {
          const { data: event } = await supabase
            .from('calendar_events')
            .select('id, title, start_time, status')
            .eq('id', request.calendar_event_id)
            .maybeSingle();
          calendarEvent = event;
        }

        return {
          ...request,
          requestedBy: requestedBy ? {
            id: requestedBy.id,
            firstName: requestedBy.user_metadata?.firstName || '',
            lastName: requestedBy.user_metadata?.lastName || '',
            email: requestedBy.email || '',
          } : null,
          respondedBy: respondedBy ? {
            id: respondedBy.id,
            firstName: respondedBy.user_metadata?.firstName || '',
            lastName: respondedBy.user_metadata?.lastName || '',
          } : null,
          calendarEvent,
        };
      })
    );

    return NextResponse.json({
      requests: enrichedRequests,
      total: enrichedRequests.length,
    });

  } catch (error) {
    console.error('Booking requests GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// POST - Create booking request (Attorneys)
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const _user = {
      id: currentUser.id,
      role: currentUser.role,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    // Typically attorneys create requests, but agency can too
    if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Only attorneys can submit booking requests' }, { status: 403 });
    }

    const body = await request.json();
    const data = createBookingRequestSchema.parse(body);

    // Validate interpreter language if needed
    if (data.needsInterpreter && !data.interpreterLanguage) {
      return NextResponse.json({ 
        error: 'Interpreter language is required when interpreter is needed' 
      }, { status: 400 });
    }

    // Create the booking request
    const { data: bookingRequest, error: createError } = await supabase
      .from('booking_requests')
      .insert({
        firm_id: currentUser.firmId,
        requested_by_id: currentUser.id,
        case_name: data.caseName,
        case_number: data.caseNumber || null,
        preferred_date: new Date(data.preferredDate).toISOString(),
        alternate_date_1: data.alternateDate1 ? new Date(data.alternateDate1).toISOString() : null,
        alternate_date_2: data.alternateDate2 ? new Date(data.alternateDate2).toISOString() : null,
        estimated_duration: data.estimatedDuration,
        event_type: data.eventType,
        location: data.location || null,
        is_remote: data.isRemote,
        deponent_name: data.deponentName,
        deponent_contact: data.deponentContact || null,
        needs_interpreter: data.needsInterpreter,
        interpreter_language: data.interpreterLanguage || null,
        needs_videographer: data.needsVideographer,
        needs_realtime: data.needsRealtime,
        special_notes: data.specialNotes || null,
        status: 'PENDING',
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Get requested by info
    const requestedBy = await getUserById(supabase, currentUser.id);

    // TODO: Notify agency of new booking request
    // await notifyAgencyOfNewRequest(bookingRequest);

    return NextResponse.json({
      message: 'Booking request submitted',
      request: {
        ...bookingRequest,
        requestedBy: requestedBy ? {
          id: requestedBy.id,
          firstName: requestedBy.user_metadata?.firstName || '',
          lastName: requestedBy.user_metadata?.lastName || '',
          email: requestedBy.email || '',
        } : null,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Booking request POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}

