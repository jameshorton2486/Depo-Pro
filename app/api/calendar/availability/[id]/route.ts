// ============================================================
// AVAILABILITY SLOT DETAIL API ROUTE
// Path: app/api/calendar/availability/[id]/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// ------------------------------------------------------------
// VALIDATION SCHEMA
// ------------------------------------------------------------

const updateAvailabilitySchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'TENTATIVE']).optional(),
  notes: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional().nullable(),
  recurrenceEnd: z.string().datetime().optional().nullable(),
});

// ------------------------------------------------------------
// GET - Fetch single availability slot
// ------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const availability = await db.reporterAvailability.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!availability) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
    }

    // Reporters can only see their own
    if (user.role === 'REPORTER' && availability.reporterId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ availability });

  } catch (error) {
    console.error('Availability GET [id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// PATCH - Update availability slot
// ------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Find existing slot
    const existing = await db.reporterAvailability.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
    }

    // Permission check
    const canEdit = ['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role);

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateAvailabilitySchema.parse(body);

    // Build update object
    const updateData: any = {};
    
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.type) updateData.type = data.type;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurrenceRule !== undefined) updateData.recurrenceRule = data.recurrenceRule;
    if (data.recurrenceEnd !== undefined) {
      updateData.recurrenceEnd = data.recurrenceEnd ? new Date(data.recurrenceEnd) : null;
    }

    // Validate time range if updated
    const startTime = updateData.startTime || existing.startTime;
    const endTime = updateData.endTime || existing.endTime;
    
    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Update
    const updated = await db.reporterAvailability.update({
      where: { id: id },
      data: updateData,
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Availability updated',
      availability: updated,
    });

  } catch (error) {
    console.error('Availability PATCH [id] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// DELETE - Delete single availability slot
// ------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Find existing slot
    const existing = await db.reporterAvailability.findFirst({
      where: {
        id: id,
        firmId: user.firmId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
    }

    // Permission check
    const canDelete = ['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role);

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.reporterAvailability.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: 'Availability deleted',
    });

  } catch (error) {
    console.error('Availability DELETE [id] error:', error);
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 });
  }
}
