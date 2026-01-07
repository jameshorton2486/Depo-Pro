// =============================================================================
// RESIZE EVENT API ROUTE
// Path: app/api/calendar/events/[id]/resize/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { resizeEvent } from '@/lib/scheduling/scheduling-service';
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
    if (!session?.user?.id) {
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

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const result = await resizeEvent({
      eventId,
      newEnd: new Date(endTime),
      userId: user.id,
      userRole: user.role,
      firmId: user.firmId,
    });

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

