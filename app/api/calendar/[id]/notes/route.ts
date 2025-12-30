import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { AddNoteSchema } from '@/lib/calendar/validations';
import { canAddNotes } from '@/lib/calendar/permissions';
import { createAuditLog } from '@/lib/calendar/audit';

// ============================================
// POST /api/calendar/[id]/notes
// Add a note to a calendar event
// Uses the existing notes or internalNotes field
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

    // 4. Verify Event Exists
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, notes: true, internalNotes: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. Get user info for note attribution
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const userDisplayName = user 
      ? `${user.firstName} ${user.lastName}`
      : 'Unknown User';
    const timestamp = new Date().toISOString();
    const noteEntry = `[${timestamp}] ${userDisplayName}: ${content}`;

    // 6. Update Event with Note in Transaction
    const _result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const noteField = isInternal ? 'internalNotes' : 'notes';
      const currentNotes = event[noteField] || '';
      const updatedNotes = currentNotes 
        ? `${currentNotes}\n\n${noteEntry}`
        : noteEntry;

      const updatedEvent = await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          [noteField]: updatedNotes,
          updatedAt: new Date(),
        },
      });

      // Audit log
      await createAuditLog({
        eventId: eventId,
        action: 'NOTE_ADDED',
        performedById: userId,
        newValue: {
          noteField,
          isInternal,
          contentPreview: content.slice(0, 100),
        },
        metadata: {
          userDisplayName,
          timestamp,
        },
      }, tx);

      return updatedEvent;
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
    console.error('[AddNote] Error:', error);
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;
    const userRole = session.user.role as string;

    // Only certain roles can see internal notes
    const canSeeInternal = ['ADMIN', 'REPORTER', 'AGENCY_ADMIN'].includes(userRole);

    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      select: { 
        id: true, 
        notes: true, 
        internalNotes: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Parse notes (simple implementation - in production you might want better parsing)
    const publicNotes = event.notes ? [{ content: event.notes, isInternal: false }] : [];
    const internalNotes = canSeeInternal && event.internalNotes 
      ? [{ content: event.internalNotes, isInternal: true }]
      : [];

    return NextResponse.json({
      notes: [...publicNotes, ...internalNotes],
    });

  } catch (error) {
    console.error('[GetNotes] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

