// =============================================================================
// RESCHEDULE EVENT API ROUTE
// Path: app/api/calendar/events/[id]/reschedule/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rescheduleEvent, previewReschedule } from '@/lib/scheduling/scheduling-service';
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
    const validation = rescheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { startTime, endTime, overrideReason: _overrideReason } = validation.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true }});

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const result = await rescheduleEvent({
      eventId,
      newStart: new Date(startTime),
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
export async function PUT(
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
    const validation = z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime()}).safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { startTime, endTime } = validation.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true }});

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const result = await previewReschedule({
      eventId,
      newStart: new Date(startTime),
      newEnd: new Date(endTime),
      userId: user.id,
      userRole: user.role,
      firmId: user.firmId});

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

