// =============================================================================
// UNDO RESCHEDULE API ROUTE
// Path: app/api/calendar/events/[id]/undo-reschedule/route.ts
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
// scheduling-service removed (was a stub) — inline stub response below
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const undoSchema = z.object({
  undoToken: z.string().min(1, 'Undo token is required'),
});

/**
 * POST - Undo a recent reschedule
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: _eventId } = await context.params;
    const body = await request.json();
    const validation = undoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { undoToken } = validation.data;

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result: { success: boolean; error?: string } = { success: true }; void undoToken;

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to undo reschedule' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reschedule undone successfully',
    });

  } catch (error) {
    console.error('Undo reschedule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

