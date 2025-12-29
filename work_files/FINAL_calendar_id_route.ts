import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// ============================================
// GET /api/calendar/[id] - Get single event
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const event = await db.calendarEvent.findUnique({
      where: { id },
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        job: {
          select: { id: true, status: true, caseName: true, caseNumber: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar GET [id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// ============================================
// PATCH /api/calendar/[id] - Update event
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.startTime) updateData.startTime = new Date(body.startTime);
    if (body.endTime) updateData.endTime = new Date(body.endTime);
    if (body.location !== undefined) updateData.location = body.location;
    if (body.isRemote !== undefined) updateData.isRemote = body.isRemote;
    if (body.meetingLink !== undefined) updateData.meetingLink = body.meetingLink;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignedReporterId !== undefined) updateData.assignedReporterId = body.assignedReporterId;

    if (body.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }
    if (body.status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    }

    const event = await db.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// ============================================
// DELETE /api/calendar/[id] - Soft delete
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = await db.calendarEvent.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
