// ============================================================
// BOOKING REQUEST DETAIL API ROUTE
// Path: app/api/calendar/booking-requests/[id]/route.ts
// Handles approve, reject, modify actions
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { createCalendarEvent, getCalendarEventById, updateCalendarEvent } from '@/lib/supabase/queries/calendar';
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

    const { data: bookingRequest, error: requestError } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', id)
      .eq('firm_id', user.firmId)
      .maybeSingle();

    if (requestError || !bookingRequest) {
      return NextResponse.json({ error: 'Booking request not found' }, { status: 404 });
    }

    // Attorneys can only see their own
    if (user.role === 'ATTORNEY' && bookingRequest.requested_by_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Enrich with related data
    const requestedBy = await getUserById(supabase, bookingRequest.requested_by_id);
    const respondedBy = bookingRequest.responded_by_id 
      ? await getUserById(supabase, bookingRequest.responded_by_id)
      : null;
    
    let calendarEvent = null;
    if (bookingRequest.calendar_event_id) {
      calendarEvent = await getCalendarEventById(bookingRequest.calendar_event_id);
      if (calendarEvent?.assigned_reporter_id) {
        const reporter = await getUserById(supabase, calendarEvent.assigned_reporter_id);
        if (reporter) {
          calendarEvent = {
            ...calendarEvent,
            assignedReporter: {
              id: reporter.id,
              firstName: reporter.user_metadata?.firstName || '',
              lastName: reporter.user_metadata?.lastName || '',
              email: reporter.email || '',
            },
          };
        }
      }
    }

    return NextResponse.json({ 
      request: {
        ...bookingRequest,
        requestedBy: requestedBy ? {
          id: requestedBy.id,
          firstName: requestedBy.user_metadata?.firstName || '',
          lastName: requestedBy.user_metadata?.lastName || '',
          email: requestedBy.email || '',
          phone: requestedBy.user_metadata?.phone || null,
        } : null,
        respondedBy: respondedBy ? {
          id: respondedBy.id,
          firstName: respondedBy.user_metadata?.firstName || '',
          lastName: respondedBy.user_metadata?.lastName || '',
        } : null,
        calendarEvent,
      }
    });

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

    // Find existing request
    const { data: existing, error: existingError } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', id)
      .eq('firm_id', user.firmId)
      .maybeSingle();

    if (existingError || !existing) {
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
          : new Date(existing.preferred_date);

        // Calculate end time based on duration
        const endTime = new Date(eventDate);
        endTime.setMinutes(endTime.getMinutes() + existing.estimated_duration);

        // Check for conflicts if reporter assigned
        if (data.assignedReporterId) {
          const { data: conflicts } = await supabase
            .from('calendar_events')
            .select('id, title, start_time')
            .eq('firm_id', user.firmId)
            .eq('assigned_reporter_id', data.assignedReporterId)
            .not('status', 'in', '(CANCELLED,COMPLETED)')
            .or(`and(start_time.lte.${eventDate.toISOString()},end_time.gt.${eventDate.toISOString()}),and(start_time.lt.${endTime.toISOString()},end_time.gte.${endTime.toISOString()})`)
            .maybeSingle();

          if (conflicts) {
            return NextResponse.json({
              error: 'Reporter has a conflict at this time',
              conflict: {
                id: conflicts.id,
                title: conflicts.title,
                start: conflicts.start_time,
              },
            }, { status: 409 });
          }
        }

        // Create calendar event
        const calendarEvent = await createCalendarEvent(supabase, {
          firm_id: user.firmId as string,
          title: `${existing.case_name} - ${existing.deponent_name}`,
          event_type: existing.event_type,
          status: data.assignedReporterId ? 'SCHEDULED' : 'REQUESTED',
          start_time: eventDate.toISOString(),
          end_time: endTime.toISOString(),
          location: existing.location || null,
          notes: existing.special_notes || null,
          assigned_reporter_id: data.assignedReporterId || null,
          created_by_id: user.id,
        });

        // Update booking request
        const { data: updatedRequest, error: updateError } = await supabase
          .from('booking_requests')
          .update({
            status: 'APPROVED',
            calendar_event_id: calendarEvent.id,
            responded_by_id: user.id,
            responded_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

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

        const { data: updatedRequest, error: updateError } = await supabase
          .from('booking_requests')
          .update({
            status: 'REJECTED',
            rejection_reason: data.rejectionReason,
            responded_by_id: user.id,
            responded_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

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

        if (existing.status === 'APPROVED' && existing.calendar_event_id) {
          // Also cancel the calendar event
          await updateCalendarEvent(existing.calendar_event_id, {
            status: 'CANCELLED',
            cancellation_reason: 'Booking request cancelled',
            cancelled_at: new Date().toISOString(),
          });
        }

        const { data: updatedRequest, error: updateError } = await supabase
          .from('booking_requests')
          .update({
            status: 'CANCELLED',
            responded_by_id: user.id,
            responded_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

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

        const { data: updatedRequest, error: updateError } = await supabase
          .from('booking_requests')
          .update({
            status: 'MODIFIED',
            preferred_date: new Date(data.proposedDate).toISOString(), // Update to agency's proposed date
            responded_by_id: user.id,
            responded_at: new Date().toISOString(),
            // Store original date in notes
            special_notes: existing.special_notes 
              ? `${existing.special_notes}\n\nOriginal requested date: ${existing.preferred_date}`
              : `Original requested date: ${existing.preferred_date}`,
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

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

    const { data: existing, error: existingError } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', id)
      .eq('firm_id', user.firmId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only requesting attorney or admin can delete
    if (existing.requested_by_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Can't delete approved requests
    if (existing.status === 'APPROVED') {
      return NextResponse.json({ 
        error: 'Cannot delete approved request. Cancel instead.' 
      }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('booking_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: 'Request deleted',
    });

  } catch (error) {
    console.error('Booking request DELETE [id] error:', error);
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}
