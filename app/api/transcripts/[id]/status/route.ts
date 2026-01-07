// =============================================================================
// TRANSCRIPT STATUS API
// app/api/transcripts/[id]/status/route.ts
//
// Phase 3B-1: Status transition endpoint
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { transitionTranscriptStatus } from '@/lib/services/transcript-status';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptById } from '@/lib/supabase/queries/transcripts';

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
    const { status, reason: _reason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Transition status
    const result = await transitionTranscriptStatus(
      transcriptId,
      status,
      session.user.role as string
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to transition status' },
        { status: 400 }
      );
    }

    // Fetch updated transcript via query layer
    const supabase = await createSupabaseServerClient();
    const transcript = await getTranscriptById(supabase, transcriptId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Status updated successfully',
      transcript: {
        id: (transcript as any).id,
        status: (transcript as any).status,
        updatedAt: (transcript as any).updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating transcript status:', error);
    return NextResponse.json(
      { error: 'Failed to update transcript status' },
      { status: 500 }
    );
  }
}
