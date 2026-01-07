// =============================================================================
// TRANSCRIPT AI SCORE API
// app/api/transcripts/[id]/score/route.ts
//
// Submit AI quality scores for transcripts
// All scores are auditable and HIPAA-compliant
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ScoreSchema = z.object({
  revisionId: z.string().uuid().optional(),
  clarityScore: z.number().int().min(1).max(5).optional(),
  accuracyScore: z.number().int().min(1).max(5).optional(),
  formattingScore: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/transcripts/[id]/score
 * Submit AI quality score for a transcript
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
      logger.warn('[transcript/score] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

    // Verify transcript exists and user has access (RLS enforced)
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('id')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      logger.warn('[transcript/score] Transcript not found', { transcriptId, userId: user.id });
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const scoreData = ScoreSchema.parse(body);

    // At least one score must be provided
    if (!scoreData.clarityScore && !scoreData.accuracyScore && !scoreData.formattingScore) {
      return NextResponse.json(
        { error: 'At least one score must be provided' },
        { status: 400 }
      );
    }

    // If revisionId is provided, verify it exists and is for this transcript
    if (scoreData.revisionId) {
      const { data: revision, error: revisionError } = await supabase
        .from('transcript_revisions')
        .select('id, transcript_id')
        .eq('id', scoreData.revisionId)
        .eq('transcript_id', transcriptId)
        .single();

      if (revisionError || !revision) {
        logger.warn('[transcript/score] Revision not found', { 
          revisionId: scoreData.revisionId, 
          transcriptId, 
          userId: user.id 
        });
        return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
      }
    }

    // Insert score (RLS enforces access)
    const { data: score, error: insertError } = await supabase
      .from('transcript_ai_scores')
      .insert({
        transcript_id: transcriptId,
        revision_id: scoreData.revisionId || null,
        clarity_score: scoreData.clarityScore || null,
        accuracy_score: scoreData.accuracyScore || null,
        formatting_score: scoreData.formattingScore || null,
        notes: scoreData.notes || null,
        scored_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('[transcript/score] Failed to create score', insertError, { transcriptId, userId: user.id });
      return NextResponse.json({ error: 'Failed to create score' }, { status: 500 });
    }

    // Log audit event - score created
    await auditLog('transcript_ai_score.created', {
      entity: 'transcript_ai_score',
      entityId: score.id,
      metadata: {
        transcriptId,
        clarityScore: scoreData.clarityScore,
        accuracyScore: scoreData.accuracyScore,
        formattingScore: scoreData.formattingScore,
        revisionId: scoreData.revisionId,
      },
    });

    logger.info('[transcript/score] Score created', {
      scoreId: score.id,
      transcriptId,
      userId: user.id,
      overallScore: score.overall_score,
    });

    return NextResponse.json({
      success: true,
      score: {
        id: score.id,
        transcriptId: score.transcript_id,
        revisionId: score.revision_id,
        clarityScore: score.clarity_score,
        accuracyScore: score.accuracy_score,
        formattingScore: score.formatting_score,
        overallScore: score.overall_score,
        notes: score.notes,
        createdAt: score.created_at,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('[transcript/score] Validation error', { issues: error.issues });
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    logger.error('[transcript/score] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transcripts/[id]/score
 * Get AI quality scores for a transcript
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
      logger.warn('[transcript/score] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

    // Fetch scores (RLS enforces access)
    const { data: scores, error: scoresError } = await supabase
      .from('transcript_ai_scores')
      .select('*')
      .eq('transcript_id', transcriptId)
      .order('created_at', { ascending: false });

    if (scoresError) {
      logger.error('[transcript/score] Failed to fetch scores', scoresError, { transcriptId, userId: user.id });
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
    }

    return NextResponse.json({
      scores: scores || [],
      count: scores?.length || 0,
    });

  } catch (error) {
    logger.error('[transcript/score] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
