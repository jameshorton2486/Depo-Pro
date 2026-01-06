import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit, requireAuth } from '@/lib/security';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';

// Simple request logging wrapper (replaces withRequestLogging)
const withRequestLogging = <T extends (...args: any[]) => any>(fn: T): T => {
  return ((...args: any[]) => {
    logger.info('Request started', { path: args[0]?.url });
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.then(
          (res) => {
            logger.info('Request completed', { path: args[0]?.url });
            return res;
          },
          (err) => {
            logger.error('Request failed', { path: args[0]?.url, error: err });
            throw err;
          }
        );
      }
      logger.info('Request completed', { path: args[0]?.url });
      return result;
    } catch (err) {
      logger.error('Request failed', { path: args[0]?.url, error: err });
      throw err;
    }
  }) as T;
};

// Stub for canEditTranscript (replaces _future/transcripts/lock-service)
async function canEditTranscript(_transcriptId: string, _userId: string): Promise<{ canEdit: boolean; reason?: string }> {
  // TODO: Implement transcript locking with Supabase
  // For now, allow editing (will be implemented later)
  return { canEdit: true };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/transcripts/[id] - Get full transcript content
// ═══════════════════════════════════════════════════════════════

export const GET = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id: transcriptId } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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
            firmId: true,
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
      // Log access denied
      await createAuditLog({
        actorUserId: session.user.id,
        firmId: (session.user as any).firmId || null,
        action: AuditAction.ACCESS_DENIED,
        targetType: AuditTargetType.TRANSCRIPT,
        targetId: transcriptId,
        metadata: { reason: 'insufficient_permissions' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(() => {}); // Fire and forget
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Log transcript view
    await createAuditLog({
      actorUserId: session.user.id,
      firmId: transcript.job.firmId || (session.user as any).firmId || null,
      action: AuditAction.TRANSCRIPT_VIEWED,
      targetType: AuditTargetType.TRANSCRIPT,
      targetId: transcriptId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(() => {}); // Fire and forget

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
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/transcripts/[id] - Update transcript content
// ═══════════════════════════════════════════════════════════════

export const PATCH = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id: transcriptId } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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
        version: true,
        versionNumber: true,
      },
    });

    if (!existingTranscript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Phase 3B-5: Check if transcript is locked
    const lockCheck = await canEditTranscript(
      transcriptId,
      session.user.id,
      session.user.role as any
    );

    if (!lockCheck.allowed) {
      return NextResponse.json(
        { error: lockCheck.reason || 'Transcript is locked' },
        { status: 403 }
      );
    }

    // Create new version
    const newTranscript = await db.transcript.create({
      data: {
        jobId: existingTranscript.jobId,
        content,
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

    return NextResponse.json({
      id: newTranscript.id,
      version: newTranscript.version,
      message: 'Transcript updated successfully',
    },
      { status: 200 },
    );

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/transcripts/[id] - Update transcript content
// ═══════════════════════════════════════════════════════════════

export const PUT = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id: transcriptId } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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

    // Phase 3B-5: Check if transcript is locked
    const lockCheck = await canEditTranscript(
      transcriptId,
      session.user.id,
      session.user.role as any
    );

    if (!lockCheck.allowed) {
      return NextResponse.json(
        { error: lockCheck.reason || 'Transcript is locked' },
        { status: 403 }
      );
    }

    // Update transcript
    const updatedTranscript = await db.transcript.update({
      where: { id: transcriptId },
      data: {
        content: content || undefined,
        contentJson: contentJson || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      transcript: {
        id: updatedTranscript.id,
        version: updatedTranscript.version,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});
