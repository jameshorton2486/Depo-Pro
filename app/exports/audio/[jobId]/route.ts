import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { listFilesForJob } from '@/lib/supabase/queries/files';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /exports/audio/[jobId]
 * Download audio file for a job
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

    // Verify job exists
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access
    const user = session.user as { id: string; role: string };
    const isCreator = (job as any).created_by_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isScopist = (job as any).scopist_id === user.id;

    if (!isCreator && !isAdmin && !isScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get audio files
    const files = await listFilesForJob(supabase, jobId);
    const audioFiles = files.filter((f: any) => f.type === 'AUDIO');

    if (!audioFiles || audioFiles.length === 0) {
      return NextResponse.json(
        { error: 'Audio file not found for this job' },
        { status: 404 }
      );
    }

    const audioFile = audioFiles[0];

    // Redirect to file download endpoint
    return NextResponse.redirect(new URL(`/api/files/${audioFile.id}/download`, request.url));
  } catch (error) {
    console.error('Error in audio export route:', error);
    return NextResponse.json(
      { error: 'Failed to download audio' },
      { status: 500 }
    );
  }
}
