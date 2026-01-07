// =============================================================================
// TRANSCRIPT UNLOCK API
// app/api/transcripts/[id]/unlock/route.ts
//
// Phase 3B-5: Admin unlock endpoint
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// Stub for unlockTranscript (replaces _future/transcripts/lock-service)
async function unlockTranscript(
  _transcriptId: string,
  _userId: string,
  _reason: string
): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement transcript unlocking with Supabase
  // For now, return success (will be implemented later)
  return { success: true };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transcripts/[id]/unlock
 * Unlock a finalized transcript (Admin only)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id: transcriptId } = await context.params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason is required for unlocking' },
        { status: 400 }
      );
    }

    const result = await unlockTranscript(
      transcriptId,
      session.user.id,
      reason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to unlock transcript' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Transcript unlocked successfully',
    });
  } catch (error) {
    console.error('Error unlocking transcript:', error);
    return NextResponse.json(
      { error: 'Failed to unlock transcript' },
      { status: 500 }
    );
  }
}
