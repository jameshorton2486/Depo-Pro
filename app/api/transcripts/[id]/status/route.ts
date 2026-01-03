// =============================================================================
// TRANSCRIPT STATUS API
// app/api/transcripts/[id]/status/route.ts
//
// Phase 3B-1: Status transition endpoint
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { transitionStatus } from '@/lib/transcripts/status-service';
import { UserRole } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/transcripts/[id]/status
 * Transition transcript to a new status
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;
    const body = await request.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Transition status
    const result = await transitionStatus(
      transcriptId,
      status,
      session.user.id,
      session.user.role as UserRole,
      reason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Fetch updated transcript
    const transcript = await db.transcription.findUnique({
      where: { id: transcriptId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'Status updated successfully',
      transcript,
    });
  } catch (error) {
    console.error('Error updating transcript status:', error);
    return NextResponse.json(
      { error: 'Failed to update transcript status' },
      { status: 500 }
    );
  }
}
