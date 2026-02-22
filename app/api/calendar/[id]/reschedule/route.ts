import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { RescheduleEventSchema } from '@/lib/calendar/validations';
import { canReschedule } from '@/lib/calendar/permissions';
import { createAuditLog } from '@/lib/calendar/audit';
import { getCalendarEventById, rescheduleCalendarEvent } from '@/lib/supabase/queries/calendar';
import { logger } from '@/lib/logger';

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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;
    const userId = currentUser.id;
    const userRole = currentUser.role as string;

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

    // 3. Fetch Event via query layer
    const event = await getCalendarEventById(eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 4. Permission Check
    if (!canReschedule(userRole as any, userId, { 
      createdById: event.created_by_id, 
      firmId: event.firm_id 
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

    // 6. Reschedule Event via query layer (includes conflict checking)
    const rescheduleResult = await rescheduleCalendarEvent(
      eventId,
      scheduledStart,
      scheduledEnd,
      {
        updateLocation: updateLocation || false,
        location: newLocation?.address || null,
        isRemote: newLocation?.isRemote || false,
        meetingLink: newLocation?.zoomUrl || null,
      }
    );

    if (!rescheduleResult.success) {
      if (rescheduleResult.conflict) {
        return NextResponse.json(
          {
            error: 'Schedule conflict',
            code: 'CONFLICT',
            message: 'Reporter has a conflicting event at this time.',
            conflict: rescheduleResult.conflict,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: rescheduleResult.error || 'Failed to reschedule event', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Get updated event for response
    const result = await getCalendarEventById(eventId);
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to fetch updated event', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Audit log (without transaction parameter)
    await createAuditLog({
      targetId: eventId,
      targetType: 'CALENDAR_EVENT',
      action: 'EVENT_RESCHEDULED',
      actorUserId: userId,
      metadata: {
        previousValue: {
          startTime: event.start_time,
          endTime: event.end_time,
          status: event.status,
        },
        newValue: {
          startTime: scheduledStart,
          endTime: scheduledEnd,
          status: result.status,
        },
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
    const { id: eventId } = await params;
    logger.error('[RescheduleEvent] Error', error instanceof Error ? error : new Error(String(error)), { eventId });
    
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

