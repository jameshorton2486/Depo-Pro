import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import { getUserById } from '@/lib/supabase/queries/users';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /exports/json/[jobId]
 * Export transcript as JSON
 * Redirects to the main export API with JSON format (or returns JSON directly)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;

    const supabase = await createSupabaseServerClient();

    // Verify job exists and get transcript
    const job = await getJobById(supabase, jobId);
    const transcript = await getTranscriptByJobId(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found for this job' },
        { status: 404 }
      );
    }

    // Check access
    const user = session.user as { id: string; role: string };
    const isCreator = (job as any).created_by_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isScopist = (job as any).scopist_id === user.id;

    if (!isCreator && !isAdmin && !isScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get created by info
    const createdBy = await getUserById(supabase, (job as any).created_by_id);

    // Return JSON export
    const jsonData = {
      jobId: job.id,
      caseName: (job as any).case_name || (job as any).caseName,
      caseNumber: (job as any).case_number || (job as any).caseNumber,
      depositionDate: (job as any).deposition_date || (job as any).depositionDate,
      transcript: {
        id: transcript.id,
        content: (transcript as any).full_transcript || (transcript as any).fullTranscript || (transcript as any).content,
        wordCount: (transcript as any).word_count || (transcript as any).wordCount,
        flaggedWordCount: (transcript as any).flagged_word_count || (transcript as any).flaggedWordCount || 0,
        status: (transcript as any).status,
      },
      reporter: createdBy ? {
        id: createdBy.id,
        name: `${createdBy.user_metadata?.firstName || ''} ${createdBy.user_metadata?.lastName || ''}`.trim(),
      } : null,
      exportedAt: new Date().toISOString(),
    };

    return NextResponse.json(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${(job as any).case_name || 'transcript'}-${jobId}.json"`,
      },
    });
  } catch (error) {
    console.error('Error in JSON export route:', error);
    return NextResponse.json(
      { error: 'Failed to export transcript' },
      { status: 500 }
    );
  }
}
