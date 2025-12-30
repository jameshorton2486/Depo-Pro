// ============================================================
// DRAG-DROP VALIDATION API
// File: app/api/calendar/events/[id]/validate-move/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dragDropValidator } from '@/lib/calendar/drag-drop-hardening';
import { z } from 'zod';

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const validateMoveSchema = z.object({
  proposedStart: z.string().datetime(),
  proposedEnd: z.string().datetime(),
  actionType: z.enum(['drag', 'resize', 'drop']),
});

// ============================================================
// POST - Validate a drag-drop move
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, firmId: true, role: true },
    });
    
    if (!user?.firmId) {
      return NextResponse.json({ error: 'No firm association' }, { status: 403 });
    }
    
    const { id: eventId } = await params;
    
    // Verify event exists and belongs to firm
    const event = await db.calendarEvent.findFirst({
      where: {
        id: eventId,
        firmId: user.firmId,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const validation = validateMoveSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { proposedStart, proposedEnd, actionType } = validation.data;
    
    // Build validation request
    const validationRequest = {
      eventId,
      userId: user.id,
      userRole: user.role,
      firmId: user.firmId,
      originalStart: event.startTime,
      originalEnd: event.endTime,
      proposedStart: new Date(proposedStart),
      proposedEnd: new Date(proposedEnd),
      actionType: actionType as 'drag' | 'resize' | 'drop',
    };
    
    // Perform validation
    const result = await dragDropValidator.validate(validationRequest);
    
    // Log the validation attempt
    await dragDropValidator.logValidation(validationRequest, result);
    
    return NextResponse.json({
      validation: {
        isValid: result.isValid,
        canProceed: result.canProceed,
        blockedReason: result.blockedReason,
        blockedMessage: result.blockedMessage,
        warnings: result.warnings,
        conflictingEventIds: result.conflictingEventIds,
        requiresConfirmation: result.requiresConfirmation,
        confirmationMessage: result.confirmationMessage,
      },
    });
    
  } catch (error) {
    console.error('Validate move error:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
