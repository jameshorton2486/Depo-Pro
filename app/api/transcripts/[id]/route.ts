import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptWithTokensAndJob, createTranscript, updateTranscript } from '@/lib/supabase/queries/transcripts';
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
            logger.error('Request failed', err instanceof Error ? err : new Error(String(err)), { path: args[0]?.url });
            throw err;
          }
        );
      }
      logger.info('Request completed', { path: args[0]?.url });
      return result;
    } catch (err) {
      logger.error('Request failed', err instanceof Error ? err : new Error(String(err)), { path: args[0]?.url });
      throw err;
    }
  }) as T;
};

async function canEditTranscript(transcriptId: string, userId: string): Promise<{ canEdit: boolean; reason?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('transcriptions')
    .select('locked_by, lock_reason')
    .eq('id', transcriptId)
    .maybeSingle();

  if (error || !data) {
    return { canEdit: true };
  }

  if (data.locked_by && data.locked_by !== userId) {
    return { canEdit: false, reason: data.lock_reason || 'Transcript is locked by another user' };
  }

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
    const supabase = await createSupabaseServerClient();
    const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptId, session.user.id);

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
      }).catch((error) => {
        logger.warn('Failed to write access denied audit log', {
          transcriptId,
          error: error instanceof Error ? error.message : String(error),
        });
      }); // Fire and forget
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
    }).catch((error) => {
      logger.warn('Failed to write transcript view audit log', {
        transcriptId,
        error: error instanceof Error ? error.message : String(error),
      });
    }); // Fire and forget

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
    const supabase = await createSupabaseServerClient();
    const existingTranscript = await getTranscriptWithTokensAndJob(supabase, transcriptId, session.user.id);

    if (!existingTranscript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (existingTranscript.job.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Phase 3B-5: Check if transcript is locked
    const lockCheck = await canEditTranscript(
      transcriptId,
      session.user.id
    );

    if (!lockCheck.canEdit) {
      return NextResponse.json(
        { error: lockCheck.reason || 'Transcript is locked' },
        { status: 403 }
      );
    }

    // Create new version
    const versionNumber = (existingTranscript.version_number || existingTranscript.versionNumber || 0) + 1;
    const newTranscript = await createTranscript(supabase, {
      job_id: existingTranscript.job_id,
      status: existingTranscript.status || 'DRAFT',
      full_transcript: content,
      content_json: {
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
      word_count: content.split(/\s+/).length,
      created_by_id: session.user.id,
    });

    return NextResponse.json({
      id: newTranscript.id,
      version: newTranscript.version || `${versionNumber}.0-manual`,
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
    const supabase = await createSupabaseServerClient();
    const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptId, session.user.id);

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
      session.user.id
    );

    if (!lockCheck.canEdit) {
      return NextResponse.json(
        { error: lockCheck.reason || 'Transcript is locked' },
        { status: 403 }
      );
    }

    // Update transcript
    const updatedTranscript = await updateTranscript(supabase, transcriptId, {
      full_transcript: content || undefined,
      content_json: contentJson || undefined,
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
