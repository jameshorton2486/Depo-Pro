import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RescheduleEventSchema } from '@/lib/calendar/validations';
import { canReschedule } from '@/lib/calendar/permissions';
import { createAuditLog } from '@/lib/calendar/audit';

// ============================================
// PATCH /api/calendar/[id]/reschedule
// Reschedules a calendar event
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
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

    // 2. Parse and Validate
    const body = await request.json();
    const validationResult = RescheduleEventSchema.safeParse(body);
    
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

    const { 
      scheduledStart, 
      scheduledEnd, 
      reason, 
      notifyParties,
      updateLocation,
      newLocation 
    } = validationResult.data;

    // 3. Fetch Event
    const supabase = await createSupabaseServerClient();
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('id, status, start_time, end_time, created_by_id, firm_id, assigned_reporter_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 4. Permission Check
    if (!canReschedule(userRole as any, userId, { 
      createdById: event.createdById, 
      firmId: event.firmId 
    })) {
      return NextResponse.json(
        { 
          error: 'Permission denied', 
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to reschedule this event.'
        },
        { status: 403 }
      );
    }

    // Additional check: Attorneys can only reschedule their firm's events
    if ((userRole === 'ATTORNEY' || userRole === 'FIRM_ADMIN') && event.firm_id) {
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = getSupabaseAdminClient();
      const { data: userData } = await adminClient.auth.admin.getUserById(userId);
      
      const userFirmId = userData?.user?.user_metadata?.firmId || null;
      
      if (userFirmId !== event.firm_id) {
        return NextResponse.json(
          { 
            error: 'Permission denied', 
            code: 'PERMISSION_DENIED',
            message: 'You can only reschedule events for your own firm.'
          },
          { status: 403 }
        );
      }
    }

    // 5. Check Status
    if (['CANCELLED', 'COMPLETED', 'IN_PROGRESS'].includes(event.status)) {
      return NextResponse.json(
        { 
          error: 'Cannot reschedule this event', 
          code: 'INVALID_STATUS',
          message: `Event is ${event.status.toLowerCase()}.`
        },
        { status: 400 }
      );
    }

    // 6. Check for Conflicts (if reporter assigned)
    if (event.assigned_reporter_id) {
      const scheduledStartDate = new Date(scheduledStart);
      const scheduledEndDate = new Date(scheduledEnd);

      // Check for overlapping events
      const { data: conflicts } = await supabase
        .from('calendar_events')
        .select('id, title, start_time')
        .eq('assigned_reporter_id', event.assigned_reporter_id)
        .neq('id', eventId)
        .neq('status', 'CANCELLED')
        .or(`start_time.lte.${scheduledStartDate.toISOString()},end_time.gt.${scheduledStartDate.toISOString()},start_time.lt.${scheduledEndDate.toISOString()},end_time.gte.${scheduledEndDate.toISOString()},start_time.gte.${scheduledStartDate.toISOString()},end_time.lte.${scheduledEndDate.toISOString()}`);

      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0];
        return NextResponse.json(
          { 
            error: 'Schedule conflict', 
            code: 'CONFLICT',
            message: 'Reporter has a conflicting event at this time.',
            conflict: {
              eventId: conflict.id,
              title: conflict.title,
              time: conflict.start_time,
            },
          },
          { status: 409 }
        );
      }
    }

    // 7. Build Update Data
    const updateData: any = {
      start_time: new Date(scheduledStart).toISOString(),
      end_time: new Date(scheduledEnd).toISOString(),
      status: event.status === 'CONFIRMED' ? 'SCHEDULED' : event.status, // Reset to scheduled if was confirmed
      updated_at: new Date().toISOString(),
    };

    if (updateLocation && newLocation) {
      updateData.is_remote = newLocation.isRemote;
      updateData.location = newLocation.address || null;
      updateData.meeting_link = newLocation.zoomUrl || null;
    }

    // 8. Update Event
    const { data: result, error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      console.error('Event update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Audit log (without transaction parameter)
    await createAuditLog({
      eventId: eventId,
      action: 'EVENT_RESCHEDULED',
      performedById: userId,
      previousValue: {
        startTime: event.start_time,
        endTime: event.end_time,
        status: event.status,
      },
      newValue: {
        startTime: updateData.start_time,
        endTime: updateData.end_time,
        status: updateData.status,
      },
      metadata: {
        reason,
        notifyParties,
        updateLocation,
      },
    });

    // 9. Send Notifications
    // TODO: Implement notification service

    return NextResponse.json({
      success: true,
      message: 'Event rescheduled successfully',
      event: {
        id: result.id,
        startTime: result.start_time,
        endTime: result.end_time,
        status: result.status,
      },
    });

  } catch (error) {
    console.error('[RescheduleEvent] Error:', error);
    
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

