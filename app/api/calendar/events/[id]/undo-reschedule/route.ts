// =============================================================================
// UNDO RESCHEDULE API ROUTE
// Path: app/api/calendar/events/[id]/undo-reschedule/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { undoReschedule } from '@/lib/scheduling/scheduling-service';
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const body = await request.json();
    const validation = undoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { undoToken } = validation.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await undoReschedule(undoToken);

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

