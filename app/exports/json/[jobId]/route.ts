import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

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

    // Verify job exists and get transcript
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        transcription: {
          select: {
            id: true,
            content: true,
            wordCount: true,
            flaggedWordCount: true,
            status: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
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

    // Return JSON export
    const jsonData = {
      jobId: job.id,
      caseName: job.caseName,
      caseNumber: job.caseNumber,
      depositionDate: job.depositionDate,
      transcript: {
        id: job.transcription.id,
        content: job.transcription.content,
        wordCount: job.transcription.wordCount,
        flaggedWordCount: job.transcription.flaggedWordCount,
        status: job.transcription.status,
      },
      reporter: {
        id: job.createdBy.id,
        name: `${job.createdBy.firstName} ${job.createdBy.lastName}`,
      },
      exportedAt: new Date().toISOString(),
    };

    return NextResponse.json(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${job.caseName || 'transcript'}-${jobId}.json"`,
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
