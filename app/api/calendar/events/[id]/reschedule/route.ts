import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// =============================================================================
// RESCHEDULE EVENT API ROUTE
// Path: app/api/calendar/events/[id]/reschedule/route.ts
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
// scheduling-service removed (was a stub) — inline stub responses below
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const rescheduleSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  forceOverride: z.boolean().optional().default(false),
  overrideReason: z.string().optional()});

/**
 * POST - Perform reschedule
 */
async function POSTHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const body = await request.json();
    const validation = rescheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { startTime, endTime, overrideReason: _overrideReason } = validation.data;

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const _user = {
      id: currentUser.id,
      role: currentUser.role,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    const result = {
      success: true,
      event: {
        id: eventId,
        previousStart: new Date(startTime),
        previousEnd: new Date(endTime),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      conflicts: [],
      undoToken: `undo-${Date.now()}`,
    };

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          conflicts: (result.conflicts as any)?.conflicts || [],
          alternativeSlots: ((result.conflicts as any)?.suggestedAlternatives || (result.conflicts as any)?.alternativeSlots) || []},
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json({
      success: true,
      eventId: result.event?.id,
      previousStartTime: result.event?.previousStart.toISOString(),
      previousEndTime: result.event?.previousEnd.toISOString(),
      newStartTime: result.event?.startTime.toISOString(),
      newEndTime: result.event?.endTime.toISOString(),
      undoToken: result.undoToken});

  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Preview reschedule (dry run)
 */
async function PUTHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: _eventId } = await context.params;
    const body = await request.json();
    const validation = z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime()}).safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { startTime: _startTime, endTime: _endTime } = validation.data;

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const _user = {
      id: currentUser.id,
      role: currentUser.role,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    const result: { conflicts: any[]; canReschedule: boolean; suggestedAlternatives: any[]; alternativeSlots: any[] } = {
      conflicts: [],
      canReschedule: true,
      suggestedAlternatives: [],
      alternativeSlots: [],
    };

    return NextResponse.json({
      hasConflicts: result.conflicts.length > 0,
      conflicts: result.conflicts.map((c) => ({
        type: c.type,
        conflictEventId: c.conflictingEventId,
        conflictEventTitle: c.conflictingEventTitle,
        overlapMinutes: c.overlapMinutes,
        severity: c.severity === 'ERROR' ? 'high' : c.severity === 'WARNING' ? 'medium' : 'low',
        message: c.message})),
      alternativeSlots: ((result.suggestedAlternatives || result.alternativeSlots) || []).map((slot: { start: Date; end: Date }, idx: number) => ({
        startTime: slot.start.toISOString(),
        endTime: slot.end.toISOString(),
        availabilityScore: 100 - idx * 10, // Score based on order (first is best)
      }))});

  } catch (error) {
    console.error('Preview reschedule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST] },
  POSTHandler as any
);

export const PUT = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST] },
  PUTHandler as any
);

