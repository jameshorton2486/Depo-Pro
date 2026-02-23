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
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { checkUserRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transcripts/[id]/ai-review
 * Request AI review of a transcript
 * 
 * Body:
 * - prompt: Optional custom prompt for AI (default: review for accuracy)
 * - options: AI processing options
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[ai-review] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkUserRateLimit(user.id, 'AI_REVIEW');
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const { id: transcriptId } = await context.params;

    // Fetch transcript (RLS enforces access)
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      logger.warn('[ai-review] Transcript not found', { transcriptId, userId: user.id });
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || 'Review this transcript for accuracy, clarity, and completeness. Provide suggestions for improvements.';
    const options = body.options || {};

    // Log audit event - transcript viewed for AI review
    await auditLog('transcript.ai_review_requested', {
      entity: 'transcript',
      entityId: transcriptId,
      metadata: {
        promptLength: prompt.length,
        hasCustomPrompt: body.prompt !== undefined,
      },
    });

    // TODO: Integrate with AI service (OpenAI, Claude, etc.)
    // For now, return a placeholder response
    // This is where you would:
    // 1. Call AI service with transcript content and prompt
    // 2. Store AI response as a revision (not applied)
    // 3. Return diff/preview to user for review

    logger.info('[ai-review] AI review requested', {
      transcriptId,
      userId: user.id,
      hasCustomPrompt: body.prompt !== undefined,
    });

    // Create a placeholder revision (not applied)
    const { data: revision, error: revisionError } = await supabase
      .from('transcript_revisions')
      .insert({
        transcript_id: transcriptId,
        revised_content: transcript.content, // Placeholder - would be AI output
        source: 'ai',
        created_by: user.id,
        metadata: {
          prompt,
          options,
          model: options.model || 'default',
        },
        diff_summary: 'AI review pending implementation',
        applied: false,
      })
      .select()
      .single();

    if (revisionError) {
      logger.error('[ai-review] Failed to create revision', revisionError, { transcriptId, userId: user.id });
      return NextResponse.json({ error: 'Failed to create revision' }, { status: 500 });
    }

    // Log audit event - revision created
    await auditLog('transcript_revision.created', {
      entity: 'transcript_revision',
      entityId: revision.id,
      metadata: {
        source: 'ai',
        transcriptId,
        applied: false,
      },
    });

    return NextResponse.json({
      success: true,
      revision: {
        id: revision.id,
        transcriptId: revision.transcript_id,
        source: revision.source,
        diffSummary: revision.diff_summary,
        applied: revision.applied,
        createdAt: revision.created_at,
      },
      message: 'AI review requested. Please implement AI service integration.',
    });

  } catch (error) {
    logger.error('[ai-review] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transcripts/[id]/ai-review
 * Get AI review revisions for a transcript
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[ai-review] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

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
}
