// =============================================================================
// AI TRANSCRIPT REVIEW API
// app/api/transcripts/[id]/ai-review/route.ts
//
// AI-powered transcript review (reviewable & compliant)
// All AI output is stored as revisions, never overwrites directly
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { checkUserRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { runAICorrection } from '@/lib/ai/correctionWorker';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

/**
 * POST /api/transcripts/[id]/ai-review
 * Request AI review of a transcript
 * 
 * Body:
 * - prompt: Optional custom prompt for AI (default: review for accuracy)
 * - options: AI processing options
 */
const POSTHandler = async (
  req: NextRequest,
  { user, supabase, params }: ProtectedContext
) => {
  try {
    const rateLimit = checkUserRateLimit(user.id, 'AI_REVIEW');
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const transcriptId = params.id;

    // Fetch transcript (RLS enforces access)
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcriptions')
      .select('id, status')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      logger.warn('[ai-review] Transcript not found', { transcriptId, userId: user.id });
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Log audit event
    await auditLog('transcript.ai_review_requested', {
      entity: 'transcript',
      entityId: transcriptId,
      metadata: { userId: user.id },
    });

    // Trigger AI correction asynchronously (fire and forget)
    // Results are stored in ai_suggestions table with applied=false
    runAICorrection(transcriptId).catch((err) => {
      logger.error('[ai-review] AI correction failed', err instanceof Error ? err : new Error(String(err)), { transcriptId });
    });

    logger.info('[ai-review] AI review triggered', { transcriptId, userId: user.id });

    return NextResponse.json({
      triggered: true,
      message: 'AI review started. Check /api/transcripts/{id}/suggestions for results.',
    });

  } catch (error) {
    logger.error('[ai-review] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * GET /api/transcripts/[id]/ai-review
 * Get AI review revisions for a transcript
 */
const GETHandler = async (
  _req: NextRequest,
  { user, supabase, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;

    // Fetch AI revisions (RLS enforces access)
    const { data: revisions, error: revisionsError } = await supabase
      .from('transcript_revisions')
      .select('*')
      .eq('transcript_id', transcriptId)
      .eq('source', 'ai')
      .order('created_at', { ascending: false });

    if (revisionsError) {
      logger.error('[ai-review] Failed to fetch revisions', revisionsError, { transcriptId, userId: user.id });
      return NextResponse.json({ error: 'Failed to fetch revisions' }, { status: 500 });
    }

    // Log audit event - revisions viewed
    await auditLog('transcript_revision.viewed', {
      entity: 'transcript_revision',
      entityId: transcriptId,
      metadata: {
        count: revisions?.length || 0,
        source: 'ai',
      },
    });

    return NextResponse.json({
      revisions: revisions || [],
      count: revisions?.length || 0,
    });

  } catch (error) {
    logger.error('[ai-review] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler
);

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
