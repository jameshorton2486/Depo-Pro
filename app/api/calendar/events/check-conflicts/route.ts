import { db } from '@/lib/db';
// =============================================================================
// CHECK CONFLICTS API ROUTE
// Path: app/api/calendar/events/check-conflicts/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkForConflicts } from '@/lib/scheduling/conflict-detection';
import { z } from 'zod';

const checkConflictsSchema = z.object({
  eventId: z.string().optional(),
  reporterId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  _isRemote: z.boolean().optional().default(false),
});

/**
 * POST - Check for scheduling conflicts
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = checkConflictsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { eventId: _eventId, reporterId, location, startTime, endTime, _isRemote } = validation.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const result = await checkForConflicts({
      reporterId: reporterId || undefined,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      firmId: user.firmId,
    });

    return NextResponse.json({
      hasConflicts: result.hasConflicts,
      conflicts: result.conflicts.map((c) => ({
        type: c.type,
        conflictEventId: c.conflictingEventId,
        conflictEventTitle: c.conflictingEventTitle,
        overlapMinutes: c.overlapMinutes,
        severity: c.severity === 'ERROR' ? 'high' : c.severity === 'WARNING' ? 'medium' : 'low',
        message: c.message,
      })),
      alternativeSlots: ((result.suggestedAlternatives || result.alternativeSlots) || []).map((slot: { start: Date; end: Date }, idx: number) => ({
        startTime: slot.start.toISOString(),
        endTime: slot.end.toISOString(),
        availabilityScore: 100 - idx * 10, // Score based on order (first is best)
      })),
    });

  } catch (error) {
    console.error('Check conflicts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
