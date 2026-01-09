// ============================================================
// REPORTER AVAILABILITY API ROUTES
// Path: app/api/calendar/availability/route.ts
// Task 2.4.2 - Availability API Routes
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { z } from 'zod';

// ------------------------------------------------------------
// VALIDATION SCHEMAS
// ------------------------------------------------------------

const createAvailabilitySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().default('America/Chicago'),
  type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'TENTATIVE']).default('AVAILABLE'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(), // RRULE format
  recurrenceEnd: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const querySchema = z.object({
  reporterId: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'TENTATIVE']).optional(),
});

// ------------------------------------------------------------
// GET - Fetch availability slots
// ------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      reporterId: searchParams.get('reporterId') || undefined,
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      type: searchParams.get('type') || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);
    
    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const user = {
      id: userData.id,
      role: userData.user_metadata?.role || 'REPORTER',
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    // Role-based access control: ADMIN and REPORTER can access availability
    // This matches the page-level permissions for /calendar/availability
    const allowedRoles = ['ADMIN', 'REPORTER', 'AGENCY'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Build query
    let availabilityQuery = supabase
      .from('reporter_availability')
      .select('*')
      .eq('firm_id', user.firmId);

    // Role-based filtering
    if (user.role === 'REPORTER') {
      // Reporters can only see their own availability
      availabilityQuery = availabilityQuery.eq('reporter_id', user.id);
    } else if (query.reporterId) {
      // Agency/Admin can filter by specific reporter
      availabilityQuery = availabilityQuery.eq('reporter_id', query.reporterId);
    }

    // Date range filter - events that overlap with the query range
    // We'll filter for events where start_time <= query.end AND end_time >= query.start
    if (query.start && query.end) {
      const startISO = new Date(query.start).toISOString();
      const endISO = new Date(query.end).toISOString();
      // Events that overlap: start before query end AND end after query start
      availabilityQuery = availabilityQuery
        .lte('start_time', endISO)
        .gte('end_time', startISO);
    }

    // Type filter
    if (query.type) {
      availabilityQuery = availabilityQuery.eq('type', query.type);
    }

    availabilityQuery = availabilityQuery.order('start_time', { ascending: true });

    const { data: availability, error: availabilityError } = await availabilityQuery;

    if (availabilityError) {
      throw availabilityError;
    }

    // Enrich with reporter info
    const slots = await Promise.all(
      (availability || []).map(async (slot: any) => {
        let reporter = null;
        if (slot.reporter_id) {
          const reporterData = await getUserById(supabase, slot.reporter_id);
          if (reporterData) {
            reporter = {
              id: reporterData.id,
              firstName: reporterData.user_metadata?.firstName || '',
              lastName: reporterData.user_metadata?.lastName || '',
              email: reporterData.email || '',
            };
          }
        }

        return {
          id: slot.id,
          title: slot.type === 'AVAILABLE' 
            ? 'Available' 
            : slot.type === 'UNAVAILABLE' 
            ? 'Unavailable' 
            : 'Tentative',
          start: slot.start_time,
          end: slot.end_time,
          backgroundColor: slot.type === 'AVAILABLE' 
            ? 'hsl(142, 76%, 36%)'  // green-600
            : slot.type === 'UNAVAILABLE' 
            ? 'hsl(0, 84%, 60%)'     // red-500
            : 'hsl(45, 93%, 47%)',  // yellow-500
          borderColor: 'transparent',
          display: 'background', // Shows as background highlight
          extendedProps: {
            type: slot.type,
            reporterId: slot.reporter_id,
            reporterName: reporter ? `${reporter.firstName} ${reporter.lastName}` : 'Unknown',
            notes: slot.notes,
            isRecurring: slot.is_recurring,
            recurrenceRule: slot.recurrence_rule,
          },
        };
      })
    );

    return NextResponse.json({
      availability: slots,
      total: slots.length,
    });

  } catch (error) {
    console.error('Availability GET error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// POST - Create availability slot
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);
    
    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const user = {
      id: userData.id,
      role: userData.user_metadata?.role || 'REPORTER',
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    // Role-based access control: ADMIN, REPORTER, and AGENCY can create availability
    // Reporters create their own, Admin/Agency can create for any reporter
    const allowedRoles = ['ADMIN', 'REPORTER', 'AGENCY'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to set availability' }, { status: 403 });
    }

    const body = await request.json();
    const data = createAvailabilitySchema.parse(body);

    // Determine which reporter this is for
    let reporterId = user.id;
    
    if (['ADMIN', 'AGENCY'].includes(user.role) && body.reporterId) {
      // Verify reporter exists in same firm
      const reporterData = await getUserById(supabase, body.reporterId);
      
      if (!reporterData || 
          (reporterData.user_metadata?.firmId !== user.firmId && reporterData.user_metadata?.firm_id !== user.firmId) ||
          reporterData.user_metadata?.role !== 'REPORTER') {
        return NextResponse.json({ error: 'Reporter not found' }, { status: 404 });
      }
      
      reporterId = body.reporterId;
    } else if (user.role !== 'REPORTER') {
      return NextResponse.json({ error: 'Must specify reporterId' }, { status: 400 });
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    // Validate times
    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Check for overlapping availability of same type
    const { data: overlapping, error: overlapError } = await supabase
      .from('reporter_availability')
      .select('id, start_time, end_time')
      .eq('reporter_id', reporterId)
      .eq('type', data.type)
      .or(`start_time.lte.${startTime.toISOString()},end_time.gt.${startTime.toISOString()},start_time.lt.${endTime.toISOString()},end_time.gte.${endTime.toISOString()},start_time.gte.${startTime.toISOString()},end_time.lte.${endTime.toISOString()}`)
      .maybeSingle();

    if (overlapError && overlapError.code !== 'PGRST116') {
      throw overlapError;
    }

    if (overlapping) {
      return NextResponse.json({ 
        error: 'Overlapping availability slot exists',
        existingSlot: {
          id: overlapping.id,
          start: overlapping.start_time,
          end: overlapping.end_time,
        },
      }, { status: 409 });
    }

    // Create the availability slot
    const { data: availability, error: createError } = await supabase
      .from('reporter_availability')
      .insert({
        reporter_id: reporterId,
        firm_id: user.firmId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: data.timezone,
        type: data.type,
        is_recurring: data.isRecurring,
        recurrence_rule: data.recurrenceRule || null,
        recurrence_end: data.recurrenceEnd ? new Date(data.recurrenceEnd).toISOString() : null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Get reporter info
    const reporter = await getUserById(supabase, reporterId);

    return NextResponse.json({
      message: 'Availability created',
      availability: {
        ...availability,
        reporter: reporter ? {
          id: reporter.id,
          firstName: reporter.user_metadata?.firstName || '',
          lastName: reporter.user_metadata?.lastName || '',
        } : null,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Availability POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// DELETE - Bulk delete availability (by date range)
// ------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);
    
    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const user = {
      id: userData.id,
      role: userData.user_metadata?.role || 'REPORTER',
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const reporterId = searchParams.get('reporterId');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates required' }, { status: 400 });
    }

    // Build delete filter
    let deleteQuery = supabase
      .from('reporter_availability')
      .delete()
      .eq('firm_id', user.firmId)
      .gte('start_time', new Date(start).toISOString())
      .lte('end_time', new Date(end).toISOString());

    // Reporters can only delete their own
    if (user.role === 'REPORTER') {
      deleteQuery = deleteQuery.eq('reporter_id', user.id);
    } else if (reporterId) {
      deleteQuery = deleteQuery.eq('reporter_id', reporterId);
    }

    const { count, error: deleteError } = await deleteQuery;

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: `Deleted ${count || 0} availability slots`,
      count: count || 0,
    });

  } catch (error) {
    console.error('Availability DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 });
  }
}

