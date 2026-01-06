import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AssignPersonnelSchema } from '@/lib/calendar/validations';
import { canAssignPersonnel } from '@/lib/calendar/permissions';
import { createAuditLog } from '@/lib/calendar/audit';

// ============================================
// POST /api/calendar/[id]/assign
// Assigns/unassigns personnel to a calendar event
// Currently supports REPORTER (scopist/videographer/interpreter 
// fields don't exist in schema yet)
// ============================================

export async function POST(
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
    const validationResult = AssignPersonnelSchema.safeParse(body);
    
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

    const { personnelType, personnelId, notifyAssignee, notes } = validationResult.data;

    // 3. Permission Check
    // For now, only REPORTER assignment is supported (schema limitation)
    if (personnelType !== 'REPORTER') {
      return NextResponse.json(
        { 
          error: 'Personnel type not yet supported', 
          code: 'NOT_IMPLEMENTED',
          message: `Assignment of ${personnelType.toLowerCase()}s is not yet available.`
        },
        { status: 501 }
      );
    }

    if (!canAssignPersonnel(userRole as any, personnelType)) {
      return NextResponse.json(
        { 
          error: 'Permission denied', 
          code: 'PERMISSION_DENIED',
          message: `Your role cannot assign ${personnelType.toLowerCase()}s.`
        },
        { status: 403 }
      );
    }

    // 4. Fetch Event
    const supabase = await createSupabaseServerClient();
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('id, status, assigned_reporter_id, firm_id, agency_id, internal_notes')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. Check Event Status
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      return NextResponse.json(
        { 
          error: 'Cannot modify assignments for this event', 
          code: 'INVALID_STATUS',
          message: `Event is ${event.status.toLowerCase()}.`
        },
        { status: 400 }
      );
    }

    // 6. Validate Personnel if assigning
    if (personnelId) {
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = getSupabaseAdminClient();
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(personnelId);

      if (userError || !userData.user) {
        return NextResponse.json(
          { error: 'Personnel not found', code: 'PERSONNEL_NOT_FOUND' },
          { status: 404 }
        );
      }

      const personnel = userData.user;
      const role = (personnel.user_metadata?.role as string) || 'REPORTER';
      const agencyId = personnel.user_metadata?.agencyId || null;

      // Validate role is REPORTER
      if (role !== 'REPORTER' && role !== 'ADMIN' && role !== 'AGENCY_ADMIN') {
        return NextResponse.json(
          { 
            error: 'Invalid personnel role', 
            code: 'ROLE_MISMATCH',
            message: 'Selected user is not a reporter.'
          },
          { status: 400 }
        );
      }

      // Check agency affiliation if event has an agency
      if (event.agency_id && agencyId && agencyId !== event.agency_id) {
        return NextResponse.json(
          { 
            error: 'Personnel not in agency', 
            code: 'AGENCY_MISMATCH',
            message: 'Selected reporter is not affiliated with this agency.'
          },
          { status: 400 }
        );
      }
    }

    // 7. Store previous value for audit
    const previousReporterId = event.assigned_reporter_id;

    // 8. Update Event (Supabase doesn't support transactions, so we do sequential updates)
    const updateData: any = {
      assigned_reporter_id: personnelId,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.internal_notes = event.internal_notes 
        ? `${event.internal_notes}\n\nAssignment note: ${notes}`
        : `Assignment note: ${notes}`;
    }

    const { error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId);

    if (updateError) {
      console.error('Event update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Get assigned reporter info if assigned
    let assignedReporter = null;
    if (personnelId) {
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = getSupabaseAdminClient();
      const { data: reporterData } = await adminClient.auth.admin.getUserById(personnelId);
      if (reporterData?.user) {
        assignedReporter = {
          id: reporterData.user.id,
          firstName: reporterData.user.user_metadata?.firstName || '',
          lastName: reporterData.user.user_metadata?.lastName || '',
          email: reporterData.user.email || '',
        };
      }
    }

    // Create audit log (without transaction parameter)
    const auditAction = personnelId 
      ? 'REPORTER_ASSIGNED' as const
      : 'REPORTER_UNASSIGNED' as const;

    await createAuditLog({
      eventId: eventId,
      action: auditAction,
      performedById: userId,
      previousValue: { assignedReporterId: previousReporterId },
      newValue: { assignedReporterId: personnelId },
      metadata: {
        personnelType,
        notifyAssignee,
        notes,
      },
    });

    // 9. Send Notification (if enabled)
    // TODO: Implement notification service
    // if (notifyAssignee && personnelId) {
    //   await notificationService.sendAssignmentNotification({
    //     personnelId,
    //     eventId,
    //     personnelType,
    //     assignedById: userId,
    //   });
    // }

    // 10. Return Success
    const assignedReporterName = assignedReporter
      ? `${assignedReporter.firstName} ${assignedReporter.lastName}`
      : null;

    return NextResponse.json({
      success: true,
      assignment: {
        personnelType,
        personnelId,
        personnelName: assignedReporterName,
        isUnassignment: !personnelId,
      },
      message: personnelId 
        ? `${personnelType} assigned successfully`
        : `${personnelType} unassigned successfully`,
    });

  } catch (error) {
    console.error('[AssignPersonnel] Error:', error);
    
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

