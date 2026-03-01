import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { AddNoteSchema } from '@/lib/calendar/validations';
import { canAddNotes } from '@/lib/calendar/permissions';
import { createAuditLog } from '@/lib/calendar/audit';
import { getCalendarEventNotes, addNoteToCalendarEvent } from '@/lib/supabase/queries/calendar';
import { logger } from '@/lib/logger';

// ============================================
// POST /api/calendar/[id]/notes
// Add a note to a calendar event
// Uses the existing notes or internalNotes field
// ============================================

async function POSTHandler(
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

    // 2. Permission Check
    if (!canAddNotes(userRole as any)) {
      return NextResponse.json(
        { 
          error: 'Permission denied', 
          code: 'PERMISSION_DENIED',
          message: 'Your role cannot add notes to events.'
        },
        { status: 403 }
      );
    }

    // 3. Parse and Validate
    const body = await request.json();
    const validationResult = AddNoteSchema.safeParse(body);
    
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

    const { content, isInternal } = validationResult.data;

    // 4. Add note via query layer
    const result = await addNoteToCalendarEvent(eventId, content, isInternal, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add note', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Get user info for response
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = getSupabaseAdminClient();
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);

    const firstName = userData?.user?.user_metadata?.firstName || '';
    const lastName = userData?.user?.user_metadata?.lastName || '';
    const userDisplayName = firstName && lastName
      ? `${firstName} ${lastName}`
      : 'Unknown User';

    const timestamp = new Date().toISOString();

    // Audit log (without transaction parameter)
    await createAuditLog({
      targetId: eventId,
      targetType: 'CALENDAR_EVENT',
      action: 'NOTE_ADDED',
      actorUserId: userId,
      metadata: {
        noteField: isInternal ? 'internalNotes' : 'notes',
        isInternal,
        contentPreview: content.slice(0, 100),
        userDisplayName,
        timestamp,
      },
    });

    return NextResponse.json({
      success: true,
      note: {
        content,
        isInternal,
        createdAt: new Date().toISOString(),
        createdBy: {
          id: userId,
          name: userDisplayName,
        },
      },
      message: 'Note added successfully',
    });

  } catch (error) {
    const { id: eventId } = await params;
    logger.error('[AddNote] Error', error instanceof Error ? error : new Error(String(error)), { eventId });
    
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

// ============================================
// GET /api/calendar/[id]/notes
// Get notes for an event (parsed from notes/internalNotes)
// ============================================

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;
    const userRole = currentUser.role as string;

    // Only certain roles can see internal notes
    const canSeeInternal = ['ADMIN', 'REPORTER', 'AGENCY_ADMIN'].includes(userRole);

    // Get notes via query layer
    const notesData = await getCalendarEventNotes(eventId, canSeeInternal);

    if (!notesData) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Parse notes (simple implementation - in production you might want better parsing)
    const publicNotes = notesData.notes ? [{ content: notesData.notes, isInternal: false }] : [];
    const internalNotes = canSeeInternal && notesData.internalNotes
      ? [{ content: notesData.internalNotes, isInternal: true }]
      : [];

    return NextResponse.json({
      notes: [...publicNotes, ...internalNotes],
    });

  } catch (error) {
    const { id: eventId } = await params;
    logger.error('[GetNotes] Error', error instanceof Error ? error : new Error(String(error)), { eventId });
    
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST] },
  GETHandler as any
);

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST] },
  POSTHandler as any
);

