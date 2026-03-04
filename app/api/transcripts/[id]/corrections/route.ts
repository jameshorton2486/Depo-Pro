/**
 * Transcript Corrections API
 * Handles saving word corrections and reviewed word indices
 * Compatible with new review page components
 */

import type { NextRequest} from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptWithTokensAndJob, updateTranscript } from '@/lib/supabase/queries/transcripts';
import { isJobLockedByOther } from '@/lib/supabase/queries/locks';
import { Role } from '@/lib/constants';
import {
  getReviewSession,
  getTranscriptionWords,
  hasTranscriptReviewAccess,
  mergeReviewSession,
} from '@/lib/transcripts/review-session';

const GETHandler = async (
  _request: NextRequest,
  { user, params }: ProtectedContext,
) => {
  try {
    const transcriptionId = params.id;

    // Fetch existing review session from transcript's flagged_segments
    const supabase = await createSupabaseServerClient();
    const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptionId, user.id);

    if (!transcript) {
      return NextResponse.json({
        exists: false,
        reviewedIndices: [],
        corrections: {},
      });
    }

    // Get review session from flagged_segments
    const reviewSession = getReviewSession(transcript.flagged_segments);

    if (!reviewSession) {
      return NextResponse.json({
        exists: false,
        reviewedIndices: [],
        corrections: {},
      });
    }

    return NextResponse.json({
      exists: true,
      reviewedIndices: reviewSession.reviewedIndices || [],
      corrections: reviewSession.corrections || {},
      updatedAt: reviewSession.lastSavedAt || transcript.updated_at,
    });
  } catch (_error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] review session load failure', _error);
    }
    console.error('Error loading review session:', _error);
    return NextResponse.json(
      { error: 'Failed to load review session' },
      { status: 500 }
    );
  }
};

const POSTHandler = async (
  request: NextRequest,
  { user, params }: ProtectedContext,
) => {
  const startTime = performance.now();
  try {
    const transcriptionId = params.id;

    const body = await request.json();
    const {
      corrections = [], // Array of [wordIndex, correction] pairs
      reviewedWordIndices = [], // Array of word indices marked as reviewed
      expectedVersion,  // ISO string of last known updatedAt (optional — backward compatible)
    } = body;

    // Fetch transcription with job
    const supabase = await createSupabaseServerClient();
    const transcription = await getTranscriptWithTokensAndJob(supabase, transcriptionId, user.id);

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Check access: user must be the creator OR an assigned scopist OR admin
    if (!hasTranscriptReviewAccess(transcription, user.id, user.role, Role.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // --- Optimistic Locking Check ---
    if (expectedVersion) {
      if (transcription.updated_at !== expectedVersion) {
        return NextResponse.json(
          {
            error: 'Conflict — this transcript was modified by another user since you loaded it. Please reload the page to see the latest version.',
            code: 'CONFLICT',
            serverVersion: transcription.updated_at,
            clientVersion: expectedVersion,
          },
          { status: 409 },
        );
      }
    }
    // --- End Optimistic Locking Check ---

    const jobId = transcription.job?.id;
    if (jobId) {
      const isLocked = await isJobLockedByOther(jobId, user.id);
      if (isLocked) {
        return NextResponse.json(
          { error: 'Job is locked by another user', code: 'LOCKED' },
          { status: 423 },
        );
      }
    }

    // Get current words array
    const currentWords = getTranscriptionWords(transcription);

    // Apply corrections
    const correctionsMap = new Map(corrections);
    const reviewedSet = new Set(reviewedWordIndices);

    const updatedWords = currentWords.map((word, index) => {
      const correctedWord = correctionsMap.get(index);
      const isReviewed = reviewedSet.has(index);

      if (correctedWord) {
        return {
          ...word,
          correctedWord,
          reviewed: true,
          isEdited: true,
        };
      }

      if (isReviewed) {
        return {
          ...word,
          reviewed: true,
        };
      }

      return word;
    });

    // Calculate remaining flagged words
    const remainingFlagged = updatedWords.filter(
      (w) => w.confidence < 0.85 && !w.reviewed
    ).length;

    // Get current flaggedSegments or create empty object
    // Build review session data and merge into flagged_segments
    const reviewSession = {
      transcriptionId,
      userId: user.id,
      reviewedIndices: reviewedWordIndices,
      corrections: Object.fromEntries(corrections) as Record<string, string>,
      lastSavedAt: new Date().toISOString(),
    };

    // Update transcription with review session stored in flagged_segments
    // Note: content_json is not a real DB column — corrections persist via
    // transcription_edits table (inserted below) and flagged_words table.
    await updateTranscript(supabase, transcriptionId, {
      flagged_word_count: remainingFlagged,
      flagged_segments: mergeReviewSession(transcription.flagged_segments, reviewSession) as any,
    });

    // Create audit log entries for corrections
    if (corrections.length > 0) {
      const editRecords = corrections
        .filter(([wordIndex, correctedWord]: [number, string]) => {
          const originalWord = currentWords[wordIndex];
          return originalWord && originalWord.word !== correctedWord;
        })
        .map(([wordIndex, correctedWord]: [number, string]) => {
          const originalWord = currentWords[wordIndex];
          return {
            transcription_id: transcriptionId,
            editor_id: user.id,
            editor_email: null,
            editor_role: user.role || null,
            edit_type: 'WORD_CORRECTION',
            original_text: originalWord?.word || '',
            edited_text: correctedWord,
            position: originalWord?.start || 0,
            metadata: {
              wordIndex,
              confidence: originalWord?.confidence,
              timestamp: new Date().toISOString(),
            },
          };
        });

      if (editRecords.length > 0) {
        const { error: editError } = await supabase
          .from('transcription_edits')
          .insert(editRecords);

        if (editError) {
          console.error('Error creating transcription edits:', editError);
        }
      }
    }

    const { data: refreshed } = await supabase
      .from('transcriptions')
      .select('updated_at')
      .eq('id', transcriptionId)
      .single();

    return NextResponse.json({
      success: true,
      correctionsApplied: corrections.length,
      reviewedCount: reviewedWordIndices.length,
      remainingFlagged: remainingFlagged,
      updatedAt: refreshed?.updated_at,
    });
  } catch (_error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] corrections save failure', _error);
    }
    console.error('Error saving corrections:', _error);
    return NextResponse.json(
      { error: 'Failed to save corrections' },
      { status: 500 }
    );
  } finally {
    const duration = Math.round(performance.now() - startTime);
    console.log(`[perf] ${request.method} ${request.nextUrl.pathname} ${duration}ms`);
  }
}


export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.SCOPIST, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  POSTHandler as any
);

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.SCOPIST, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  GETHandler as any
);
