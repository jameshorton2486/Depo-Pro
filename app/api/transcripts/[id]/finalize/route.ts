// =============================================================================
// FINALIZE TRANSCRIPT API
// app/api/transcripts/[id]/finalize/route.ts
//
// Finalize a transcript (lock it)
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptByJobId, getTranscriptById, updateTranscriptStatus } from '@/lib/supabase/queries/transcripts';
import { getJobById } from '@/lib/supabase/queries/jobs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transcripts/[id]/finalize
 * Finalize a transcript
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    
    // Try to find by job ID first (since pages use jobId)
    let transcript = await getTranscriptByJobId(supabase, id);
    let job = await getJobById(supabase, id);

    // If not found by job ID, try finding by transcript ID
    if (!transcript) {
      transcript = await getTranscriptById(supabase, id);
      if (transcript) {
        job = await getJobById(supabase, transcript.job_id);
      }
    }

    if (!transcript || !job) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    // Check access
    if (
      currentUser.role !== 'ADMIN' &&
      job.created_by_id !== currentUser.id &&
      (job as any).scopist_id !== currentUser.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if already finalized
    if (transcript.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Transcript already finalized' },
        { status: 400 }
      );
    }

    // Finalize the transcript
    await updateTranscriptStatus(supabase, transcript.id, 'COMPLETED');

    return NextResponse.json({
      success: true,
      message: 'Transcript finalized successfully',
    });
  } catch (error) {
    console.error('Error finalizing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to finalize transcript' },
      { status: 500 }
    );
  }
}
