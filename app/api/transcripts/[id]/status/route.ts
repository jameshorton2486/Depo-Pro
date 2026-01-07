// =============================================================================
// TRANSCRIPT STATUS API
// app/api/transcripts/[id]/status/route.ts
//
// Phase 3B-1: Status transition endpoint
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { transitionStatus } from '@/lib/transcripts/status-service';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    const result = await transitionStatus(
      transcriptId,
      status,
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: (result as any).error },
        { status: 400 }
      );
    }

    // Fetch updated transcript
    const supabase = await createSupabaseServerClient();
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcriptions')
      .select('id, status, updated_at')
      .eq('id', transcriptId)
      .single();

    if (transcriptError) {
      console.error('Error fetching transcript:', transcriptError);
      return NextResponse.json(
        { error: 'Failed to fetch transcript' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Status updated successfully',
      transcript: {
        id: transcript.id,
        status: transcript.status,
        updatedAt: transcript.updated_at,
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
