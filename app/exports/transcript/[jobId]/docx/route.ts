import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

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
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;

    // Verify job exists and get transcript ID
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        transcription: {
          select: { id: true },
        },
        createdBy: {
          select: { id: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.transcription) {
      return NextResponse.json(
        { error: 'Transcript not found for this job' },
        { status: 404 }
      );
    }

    // Check access
    const user = session.user as { id: string; role: string };
    const isCreator = job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isScopist = job.scopistId === user.id;

    if (!isCreator && !isAdmin && !isScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Redirect to the main export API with DOCX format
    const exportUrl = `/api/transcripts/${job.transcription.id}/export?format=docx&lineNumbers=true`;
    return NextResponse.redirect(new URL(exportUrl, request.url));
  } catch (error) {
    console.error('Error in DOCX export route:', error);
    return NextResponse.json(
      { error: 'Failed to export transcript' },
      { status: 500 }
    );
  }
}
