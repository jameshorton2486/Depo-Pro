import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTranscriptionStatus } from '@/lib/transcription';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// GET /api/transcripts/[id]/status - Poll transcription status
// ═══════════════════════════════════════════════════════════════

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await params;

    // Verify transcript exists and user has access
    const transcript = await db.transcription.findFirst({
      where: {
        id: transcriptId,
        job: {
          reporterId: session.user.id, // Multi-tenant security
        },
      },
      select: {
        id: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        rawText: true,
        status: true,
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

    // Get processing status (mock implementation for now)
    const status = await getTranscriptionStatus(transcriptId);

    // Calculate word count
    const wordCount = transcript.rawText?.split(/\s+/).length || 0;

    // Return transcript metadata
    return NextResponse.json({
      id: transcript.id,
      jobId: transcript.job.id,
      caseNumber: transcript.job.caseNumber,
      version: transcript.version,
      wordCount,
      status: status.status,
      progress: status.progress,
      transcriptStatus: transcript.status,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
      hasContent: !!transcript.rawText,
    },
      { status: 200 }
    );

  } catch (error) {
    const { id } = await params;
    logger.error(`Failed to get transcript status - transcriptId: ${id}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to get transcript status' },
      { status: 500 }
    );
  }
}
