import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptWithTokensAndJob, createTranscript, updateTranscript } from '@/lib/supabase/queries/transcripts';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/security';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';

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

async function canEditTranscript(
  supabase: any,
  transcriptId: string,
  userId: string
): Promise<{ canEdit: boolean; reason?: string }> {
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

const GETHandler = withRequestLogging(async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const transcriptId = params.id;

  const rateLimit = checkRateLimit(user.id, 'API_GLOBAL');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptId, {
    verifyAccessForUserId: user.id,
  });

  if (!transcript) {
    return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
  }

  const isCreator =
    transcript.job.createdById === user.id ||
    transcript.job.created_by_id === user.id;
  const isAssignedScopist =
    transcript.job.scopist_id === user.id ||
    (Array.isArray(transcript.job.assignments) &&
      transcript.job.assignments.some((assignment: any) => assignment.scopist_id === user.id));

  if (!isCreator && !isAssignedScopist && user.role !== 'ADMIN') {
    await createAuditLog({
      actorUserId: user.id,
      firmId: user.firm_id || null,
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
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await createAuditLog({
    actorUserId: user.id,
    firmId: transcript.job.firmId || user.firm_id || null,
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
  });

  return NextResponse.json(
    {
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
});

const PATCHHandler = withRequestLogging(async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const transcriptId = params.id;

  const rateLimit = checkRateLimit(user.id, 'API_GLOBAL');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
  }

  const existingTranscript = await getTranscriptWithTokensAndJob(supabase, transcriptId, {
    verifyAccessForUserId: user.id,
  });

  if (!existingTranscript) {
    return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
  }

  if (
    existingTranscript.job.createdById !== user.id &&
    existingTranscript.job.created_by_id !== user.id
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const lockCheck = await canEditTranscript(supabase, transcriptId, user.id);
  if (!lockCheck.canEdit) {
    return NextResponse.json(
      { error: lockCheck.reason || 'Transcript is locked' },
      { status: 403 }
    );
  }

  const versionNumber = (existingTranscript.version_number || existingTranscript.versionNumber || 0) + 1;
  const newTranscript = await createTranscript(supabase, {
    job_id: existingTranscript.job_id,
    status: existingTranscript.status || 'DRAFT',
    full_transcript: content,
    word_count: content.split(/\s+/).length,
    created_by_id: user.id,
  });

  return NextResponse.json(
    {
      id: newTranscript.id,
      version: newTranscript.version || `${versionNumber}.0-manual`,
      message: 'Transcript updated successfully',
    },
    { status: 200 },
  );
});

const PUTHandler = withRequestLogging(async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const transcriptId = params.id;

  const rateLimit = checkRateLimit(user.id, 'API_GLOBAL');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const data = await request.json();
  const { content } = data;

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptId, {
    verifyAccessForUserId: user.id,
  });

  if (!transcript) {
    return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
  }

  const isCreator =
    transcript.job.createdById === user.id ||
    transcript.job.created_by_id === user.id;
  const isAssignedScopist =
    transcript.job.scopist_id === user.id ||
    (Array.isArray(transcript.job.assignments) &&
      transcript.job.assignments.some((assignment: any) => assignment.scopist_id === user.id));

  if (!isCreator && !isAssignedScopist && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const lockCheck = await canEditTranscript(supabase, transcriptId, user.id);
  if (!lockCheck.canEdit) {
    return NextResponse.json(
      { error: lockCheck.reason || 'Transcript is locked' },
      { status: 403 }
    );
  }

  const updatedTranscript = await updateTranscript(supabase, transcriptId, {
    full_transcript: content || undefined,
  });

  return NextResponse.json({
    success: true,
    transcript: {
      id: updatedTranscript.id,
      version: updatedTranscript.version,
    },
  });
});

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY],
    requireFirm: true,
    rateLimit: { limit: 60, windowMs: 60_000 },
    auditAction: 'TRANSCRIPT_VIEWED',
  },
  GETHandler as any
);

export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST],
    requireFirm: true,
    rateLimit: { limit: 60, windowMs: 60_000 },
    auditAction: 'TRANSCRIPT_VERSION_CREATED',
  },
  PATCHHandler as any
);

export const PUT = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST],
    requireFirm: true,
    rateLimit: { limit: 60, windowMs: 60_000 },
    auditAction: 'TRANSCRIPT_UPDATED',
  },
  PUTHandler as any
);
