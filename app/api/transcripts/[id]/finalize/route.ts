// =============================================================================
// FINALIZE TRANSCRIPT API
// app/api/transcripts/[id]/finalize/route.ts
//
// Finalize a transcript (lock it)
// =============================================================================

import type { NextRequest} from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptByJobId, getTranscriptById, updateTranscriptStatus } from '@/lib/supabase/queries/transcripts';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { isAdminRole } from '@/lib/admin';

/**
 * POST /api/transcripts/[id]/finalize
 * Finalize a transcript
 */
const POSTHandler = async (
  request: NextRequest,
  { user, params }: ProtectedContext
) => {
  try {
    const id = params.id;
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
      !isAdminRole(user.role) &&
      job.created_by_id !== user.id &&
      (job as any).scopist_id !== user.id
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


export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  POSTHandler as any
);
