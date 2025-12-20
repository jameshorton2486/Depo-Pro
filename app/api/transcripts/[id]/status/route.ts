import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// GET /api/transcripts/[id]/status - Poll transcription status
// ═══════════════════════════════════════════════════════════════

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await params;

    // Verify transcript exists and user has access
    const transcript = await db.transcript.findFirst({
      where: {
        id: transcriptId,
        job: {
          createdById: session.user.id, // Multi-tenant security
        },
      },
      select: {
        id: true,
        version: true,
        createdAt: true,
        content: true,
        job: {
          select: {
            id: true,
            caseNumber: true,
            status: true,
          },
        },
      },
    });

    if (!transcript) {
      logger.warn(`Transcript not found - transcriptId: ${transcriptId}, userId: ${session.user.id}`);
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Calculate word count
    const wordCount = transcript.content?.split(/\s+/).length || 0;

    // Return transcript metadata
    return NextResponse.json({
      id: transcript.id,
      jobId: transcript.job.id,
      caseNumber: transcript.job.caseNumber,
      version: transcript.version,
      wordCount,
      status: transcript.job.status,
      progress: transcript.job.status === 'COMPLETED' ? 100 : 0,
      createdAt: transcript.createdAt,
      hasContent: !!transcript.content,
    },
      { status: 200 },
    );

  } catch (error) {
    const { id } = await params;
    logger.error(`Failed to get transcript status - transcriptId: ${id}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to get transcript status' },
      { status: 500 },
    );
  }
}
