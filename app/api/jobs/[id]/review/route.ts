// app/api/jobs/[id]/review/route.ts
// Review API - Handle word corrections, confirmations, and skips
// Integrates with Accuracy Intelligence Plan - Step 2: Correction Logging

import type { NextRequest } from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isJobLockedByOther } from '@/lib/supabase/queries/locks';
import { logCorrection, getWordContext } from '@/lib/services/correction-logger';

export const dynamic = 'force-dynamic';

interface ReviewRequest {
  wordId: string;
  action: 'correct' | 'confirm' | 'skip';
  correctedWord?: string;
  expectedUpdatedAt?: string;
}

/**
 * PATCH /api/jobs/[id]/review
 * Update flagged word status (correct/confirm/skip)
 * Logs correction to transcription_corrections table for accuracy intelligence
 */
const PATCHHandler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body: ReviewRequest = await req.json();
    const { wordId, action, correctedWord, expectedUpdatedAt } = body;

    if (!wordId || !action) {
      return NextResponse.json(
        { error: 'wordId and action are required' },
        { status: 400 }
      );
    }

    if (action === 'correct' && !correctedWord?.trim()) {
      return NextResponse.json(
        { error: 'correctedWord is required for correct action' },
        { status: 400 }
      );
    }
    if (!expectedUpdatedAt) {
      return NextResponse.json(
        { error: 'expectedUpdatedAt is required' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the flagged word
    const { data: flaggedWord, error: flaggedError } = await supabase
      .from('flagged_words')
      .select('*')
      .eq('id', wordId)
      .single();

    if (flaggedError || !flaggedWord) {
      return NextResponse.json(
        { error: 'Flagged word not found' },
        { status: 404 }
      );
    }

    // Get transcription to verify access and get firm_id
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('id, job_id, words, utterances, updated_at')
      .eq('id', flaggedWord.transcription_id)
      .single();

    if (transcriptionError || !transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Get job to verify access and get firm_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, firm_id, reporter_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify job matches transcription
    if (transcription.job_id !== jobId) {
      return NextResponse.json(
        { error: 'Job/transcription mismatch' },
        { status: 400 }
      );
    }

    const expectedDate = new Date(expectedUpdatedAt);
    const actualDate = new Date(transcription.updated_at);
    if (Math.abs(actualDate.getTime() - expectedDate.getTime()) > 1000) {
      return NextResponse.json(
        {
          error: 'Conflict detected',
          code: 'CONFLICT',
          message: 'This transcript was modified since you loaded it. Refresh to see changes.',
          serverUpdatedAt: actualDate.toISOString(),
        },
        { status: 409 },
      );
    }

    const isLocked = await isJobLockedByOther(jobId, currentUser.id);
    if (isLocked) {
      return NextResponse.json(
        { error: 'Job is locked by another user', code: 'LOCKED' },
        { status: 423 },
      );
    }

    // Get firm_id from user
    const { data: user } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', currentUser.id)
      .single();

    const firmId = user?.firm_id || job.firm_id;

    // Update flagged word status
    const newStatus =
      action === 'correct' ? 'CORRECTED' :
      action === 'confirm' ? 'CONFIRMED' :
      'SKIPPED';

    const updateData: any = {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser.id,
    };

    if (action === 'correct' && correctedWord) {
      updateData.corrected_word = correctedWord.trim();
    }

    const { error: updateError } = await supabase
      .from('flagged_words')
      .update(updateData)
      .eq('id', wordId);

    if (updateError) {
      console.error('Error updating flagged word:', updateError);
      return NextResponse.json(
        { error: 'Failed to update word' },
        { status: 500 }
      );
    }

    // Get all words for context extraction
    let allWords: any[] = [];
    try {
      if (transcription.utterances) {
        const utterances = Array.isArray(transcription.utterances)
          ? transcription.utterances
          : JSON.parse(transcription.utterances as string || '[]');
        allWords = utterances.flatMap((u: any) => u.words || []);
      } else if (transcription.words) {
        allWords = Array.isArray(transcription.words)
          ? transcription.words
          : JSON.parse(transcription.words as string || '[]');
      }
    } catch (error) {
      console.error('Error parsing words:', error);
    }

    // Find word index in allWords array
    const wordIndex = allWords.findIndex(
      w => w.start === flaggedWord.start_time && w.word === flaggedWord.original_word
    );

    // ACCURACY INTELLIGENCE: Log correction for pattern analysis
    await logCorrection({
      transcriptionId: flaggedWord.transcription_id,
      jobId,
      firmId,
      reviewerId: currentUser.id,
      wordIndex: wordIndex >= 0 ? wordIndex : -1,
      originalWord: flaggedWord.original_word,
      correctedWord: action === 'correct' ? correctedWord : undefined,
      action: newStatus as 'CORRECTED' | 'CONFIRMED' | 'SKIPPED',
      confidence: flaggedWord.confidence,
      speakerLabel: flaggedWord.speaker_label || undefined,
      audioPosition: flaggedWord.start_time,
      contextBefore: wordIndex >= 0 ? getWordContext(allWords, wordIndex, -3) : undefined,
      contextAfter: wordIndex >= 0 ? getWordContext(allWords, wordIndex, 3) : undefined,
    });

    const { data: touchedTranscription, error: touchError } = await supabase
      .from('transcriptions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', flaggedWord.transcription_id)
      .select('updated_at')
      .single();

    if (touchError) {
      console.error('Error touching transcription updated_at:', touchError);
    }

    const responseUpdatedAt = touchedTranscription?.updated_at || new Date().toISOString();

    // Calculate updated stats
    const { data: allFlaggedWords } = await supabase
      .from('flagged_words')
      .select('status')
      .eq('transcription_id', flaggedWord.transcription_id);

    const stats = {
      total: allFlaggedWords?.length || 0,
      corrected: allFlaggedWords?.filter(w => w.status === 'CORRECTED').length || 0,
      confirmed: allFlaggedWords?.filter(w => w.status === 'CONFIRMED').length || 0,
      skipped: allFlaggedWords?.filter(w => w.status === 'SKIPPED').length || 0,
      pending: allFlaggedWords?.filter(w => w.status === 'PENDING').length || 0,
    };

    return NextResponse.json({
      flaggedWord: { ...flaggedWord, ...updateData },
      stats,
      updatedAt: responseUpdatedAt,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] review mutation failure', error);
    }
    console.error('Error in review API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [GuardRole.ADMIN, GuardRole.SCOPIST, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  async (request, { params }) => ((PATCHHandler) as any)(request, { params: Promise.resolve(params as any) })
);
