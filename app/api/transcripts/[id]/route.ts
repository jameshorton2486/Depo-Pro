import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// GET /api/transcripts/[id] - Get full transcript content
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

    // Get full transcript with content
    const transcript = await db.transcription.findFirst({
      where: {
        id: transcriptId,
        job: {
          reporterId: session.user.id,
        },
      },
      include: {
        job: {
          select: {
            id: true,
            caseNumber: true,
            depoDate: true,
            status: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: transcript.id,
      rawText: transcript.rawText,
      formattedText: transcript.formattedText,
      version: transcript.version,
      status: transcript.status,
      source: transcript.source,
      job: transcript.job,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    },
      { status: 200 }
    );
  } catch (error) {
    const { id } = await params;
    logger.error(`Failed to get transcript content - transcriptId: ${id}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to get transcript content' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// PATCH /api/transcripts/[id] - Update transcript content
// ═══════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    // Verify transcript exists and user has access
    const existingTranscript = await db.transcription.findFirst({
      where: {
        id: transcriptId,
        job: {
          reporterId: session.user.id,
        },
      },
      select: {
        id: true,
        jobId: true,
        version: true,
      },
    });

    if (!existingTranscript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Mark current version as not current
    await db.transcription.update({
      where: { id: transcriptId },
      data: { isCurrent: false },
    });

    // Create new version
    const newTranscript = await db.transcription.create({
      data: {
        jobId: existingTranscript.jobId,
        rawText: content,
        formattedText: content,
        version: existingTranscript.version + 1,
        isCurrent: true,
        status: 'DRAFT',
        source: 'MANUAL',
        createdById: session.user.id,
      },
    });

    logger.info(`Transcript updated - transcriptId: ${newTranscript.id}, version: ${newTranscript.version}`);

    return NextResponse.json({
      id: newTranscript.id,
      version: newTranscript.version,
      message: 'Transcript updated successfully',
    },
      { status: 200 }
    );

  } catch (error) {
    const { id } = await params;
    logger.error(`Failed to update transcript - transcriptId: ${id}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to update transcript' },
      { status: 500 }
    );
  }
}
