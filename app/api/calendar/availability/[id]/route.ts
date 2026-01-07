// =============================================================================
// DELETE AVAILABILITY BLOCK
// app/api/calendar/availability/[id]/route.ts
//
// Phase 3A-2: Delete individual availability slot
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Find the availability slot
    const availability = await db.reporterAvailability.findUnique({
      where: { id },
      select: { reporterId: true, firmId: true },
    });

    if (!availability) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 });
    }

    // Check permissions: Reporters can only delete their own, Admins/Agency can delete any
    if (user.role === 'REPORTER' && availability.reporterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (availability.firmId !== user.firmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the availability slot
    await db.reporterAvailability.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Availability deleted successfully',
    });
  } catch (error) {
    console.error('Availability DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete availability' },
      { status: 500 }
    );
  }
}
