import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /exports/transcript/[jobId]/docx
 * Export transcript as DOCX
 * Redirects to the main export API with format parameter
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;

    const supabase = await createSupabaseServerClient();

    // Verify job exists and get transcript ID
    const job = await getJobById(supabase, jobId, {
      includeTranscripts: true,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const transcript = await getTranscriptByJobId(supabase, jobId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found for this job' },
        { status: 404 }
      );
    }

    // Check access    const isCreator = (job as any).created_by_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const isScopist = (job as any).scopist_id === currentUser.id;

    if (!isCreator && !isAdmin && !isScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Redirect to the main export API with DOCX format
    const exportUrl = `/api/transcripts/${transcript.id}/export?format=docx&lineNumbers=true`;
    return NextResponse.redirect(new URL(exportUrl, request.url));
  } catch (error) {
    console.error('Error in DOCX export route:', error);
    return NextResponse.json(
      { error: 'Failed to export transcript' },
      { status: 500 }
    );
  }
}
