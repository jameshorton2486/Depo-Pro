// app/api/jobs/[id]/review/route.ts
// Review API - Handle word corrections, confirmations, and skips
// Integrates with Accuracy Intelligence Plan - Step 2: Correction Logging

import type { NextRequest } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { isJobLockedByOther } from '@/lib/supabase/queries/locks';
import { logCorrection, getWordContext } from '@/lib/services/correction-logger';
import { captureError } from '@/lib/error-capture';

export const dynamic = 'force-dynamic';

interface ReviewRequest {
  wordId: string;
  action: 'correct' | 'confirm' | 'skip';
  correctedWord?: string;
  expectedUpdatedAt?: string;
}

function getJobAccessResult(
  job: { created_by_id?: string | null; reporter_id?: string | null; scopist_id?: string | null; firm_id?: string | null },
  user: ProtectedContext['user'],
) {
  const userFirmId = user.firm_id || (user as ProtectedContext['user'] & { firmId?: string | null }).firmId || null;
  if (user.role === 'ADMIN') {
    return { allowed: true as const };
  }

  const isReporterOwner = job.created_by_id === user.id || job.reporter_id === user.id;
  if (isReporterOwner) {
    return { allowed: true as const };
  }

  const sameFirm = Boolean(job.firm_id && userFirmId && job.firm_id === userFirmId);
  if (!sameFirm) {
    return { allowed: false as const, status: 403, error: 'Forbidden' };
  }

  if (user.role === 'SCOPIST' && job.scopist_id && job.scopist_id !== user.id) {
    return { allowed: false as const, status: 403, error: 'Forbidden - not assigned to this job' };
  }

  return { allowed: true as const };
}

/**
 * PATCH /api/jobs/[id]/review
 * Update flagged word status (correct/confirm/skip)
 * Logs correction to transcription_corrections table for accuracy intelligence
 */
const PATCHHandler = async (
  req: NextRequest,
  context: ProtectedContext
) => {
  const startTime = performance.now();
  try {
    const { user, supabase } = context;
    const resolvedParams = typeof (context.params as any)?.then === 'function'
      ? await (context.params as any)
      : context.params;
    const { id: jobId } = resolvedParams as Record<string, string>;
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
      .select('id, created_by_id, firm_id, reporter_id, scopist_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const access = getJobAccessResult(job, user);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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

    const isLocked = await isJobLockedByOther(jobId, user.id);
    if (isLocked) {
      return NextResponse.json(
        { error: 'Job is locked by another user', code: 'LOCKED' },
        { status: 423 },
      );
    }

    // Get firm_id from user
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single();

    const firmId = userProfile?.firm_id || job.firm_id;

    // Update flagged word status
    const newStatus =
      action === 'correct' ? 'CORRECTED' :
      action === 'confirm' ? 'CONFIRMED' :
      'SKIPPED';

    const updateData: any = {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
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

    // Write audit trail entry for word corrections
    if (action === 'correct' && correctedWord) {
      const { error: auditError } = await supabase
        .from('transcription_edits')
        .insert({
          transcription_id: flaggedWord.transcription_id,
          editor_id: user.id,
          edit_type: 'WORD_CORRECTION' as const,
          original_value: flaggedWord.original_word,
          new_value: correctedWord.trim(),
          word_index: flaggedWord.word_index,
        });

      if (auditError) {
        // Non-fatal: log but don't fail the request
        console.error('Failed to write transcription_edits audit entry:', auditError);
      }
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
      reviewerId: user.id,
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
      corrected: allFlaggedWords?.filter((w: any) => w.status === 'CORRECTED').length || 0,
      confirmed: allFlaggedWords?.filter((w: any) => w.status === 'CONFIRMED').length || 0,
      skipped: allFlaggedWords?.filter((w: any) => w.status === 'SKIPPED').length || 0,
      pending: allFlaggedWords?.filter((w: any) => w.status === 'PENDING').length || 0,
    };

    return NextResponse.json({
      flaggedWord: { ...flaggedWord, ...updateData },
      stats,
      updatedAt: responseUpdatedAt,
    });
  } catch (error) {
    captureError(error, { route: 'PATCH /api/jobs/[id]/review', jobId: 'unknown' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    const duration = Math.round(performance.now() - startTime);
    if (duration > 1000) {
      console.warn(`[perf:slow] PATCH /api/jobs/[id]/review ${duration}ms`);
    }
    console.warn(`[perf] ${req.method} ${req.nextUrl.pathname} ${duration}ms`);
  }
}



export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.SCOPIST, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  PATCHHandler
);
