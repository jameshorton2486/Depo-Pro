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
    const transcript = await db.transcript.findUnique({
      where: {
        id: transcriptId,
      },
      include: {
        tokens: {
          orderBy: {
            index: 'asc',
          },
        },
        job: {
          select: {
            id: true,
            caseNumber: true,
            depositionDate: true,
            status: true,
            createdById: true,
            files: {
              where: {
                type: 'AUDIO',
              },
              select: {
                storageUrl: true,
              },
              take: 1,
            },
            assignments: {
              where: {
                scopistId: session.user.id,
                status: {
                  in: ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'],
                },
              },
            },
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check access: Creator or Assigned Scopist
    const isCreator = transcript.job.createdById === session.user.id;
    const isAssignedScopist = transcript.job.assignments.length > 0;

    if (!isCreator && !isAssignedScopist && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      id: transcript.id,
      content: transcript.content,
      contentJson: transcript.contentJson,
      tokens: transcript.tokens,
      version: transcript.version,
      versionNumber: transcript.versionNumber,
      audioUrl: transcript.job.files[0]?.storageUrl || null,
      job: transcript.job,
      createdAt: transcript.createdAt,
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
    const existingTranscript = await db.transcript.findFirst({
      where: {
        id: transcriptId,
        job: {
          createdById: session.user.id,
        },
      },
      select: {
        id: true,
        jobId: true,
        versionNumber: true,
      },
    });

    if (!existingTranscript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Create new version
    const newTranscript = await db.transcript.create({
      data: {
        jobId: existingTranscript.jobId,
        content: content,
        contentJson: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: content,
                },
              ],
            },
          ],
        },
        version: `${existingTranscript.versionNumber + 1}.0-manual`,
        versionNumber: existingTranscript.versionNumber + 1,
        createdBy: session.user.id,
      },
    });

    logger.info(`Transcript updated - transcriptId: ${newTranscript.id}, version: ${newTranscript.versionNumber}`);

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

// ═══════════════════════════════════════════════════════════════
// PUT /api/transcripts/[id] - Update transcript content
// ═══════════════════════════════════════════════════════════════

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await params;
    const data = await request.json();
    const { content, contentJson } = data;

    if (!content && !contentJson) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // Verify access
    const transcript = await db.transcript.findUnique({
      where: { id: transcriptId },
      include: {
        job: {
          select: {
            createdById: true,
            assignments: {
              where: {
                scopistId: session.user.id,
                status: {
                  in: ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'],
                },
              },
            },
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    const isCreator = transcript.job.createdById === session.user.id;
    const isAssignedScopist = transcript.job.assignments.length > 0;

    if (!isCreator && !isAssignedScopist && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update transcript
    const updatedTranscript = await db.transcript.update({
      where: { id: transcriptId },
      data: {
        content: content || undefined,
        contentJson: contentJson || undefined,
        // TODO: Handle versioning logic here (e.g., increment version number)
      },
    });

    logger.info('Transcript updated', {
      transcriptId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      transcript: {
        id: updatedTranscript.id,
        version: updatedTranscript.version,
      },
    });
  } catch (error) {
    const { id } = await params;
    logger.error(`Failed to update transcript - transcriptId: ${id}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to update transcript' },
      { status: 500 }
    );
  }
}
