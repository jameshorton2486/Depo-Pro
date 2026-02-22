import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    const supabase = await createSupabaseServerClient();

    // Check access to job
    const job = await getJobById(supabase, jobId, {
      includeAssignments: true,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const hasAccess =
      currentUser.role === 'ADMIN' ||
      (job as any).created_by_id === currentUser.id ||
      await isUserAssignedToJob(jobId, currentUser.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query transcription status - get transcript for this job
    const transcription = await getTranscriptByJobId(supabase, jobId);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 },
      );
    }

    // Map to expected format
    return NextResponse.json({
      id: transcription.id,
      status: transcription.status || 'PENDING',
      errorMessage: null, // Would need error tracking column
      createdAt: transcription.created_at,
      completedAt: transcription.completed_at || null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 },
    );
  }
}
