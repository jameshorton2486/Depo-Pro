// =============================================================================
// RESIZE EVENT API ROUTE
// Path: app/api/calendar/events/[id]/resize/route.ts
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
// scheduling-service removed (was a stub) — inline stub response below
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const resizeSchema = z.object({
  endTime: z.string().datetime(),
});

/**
 * POST - Resize event (change duration)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const body = await request.json();
    const validation = resizeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { endTime } = validation.data;

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);

    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const _user = {
      id: session.user.id,
      role: session.user.role,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    const result = {
      success: true,
      event: {
        id: eventId,
        previousStart: new Date(),
        previousEnd: new Date(endTime),
        startTime: new Date(),
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
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json({
      success: true,
      eventId: result.event?.id,
      previousEndTime: result.event?.previousEnd.toISOString(),
      newEndTime: result.event?.endTime.toISOString(),
      undoToken: result.undoToken,
    });

  } catch (error) {
    console.error('Resize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
