/**
 * Transcript Corrections API
 * Handles saving word corrections and reviewed word indices
 * Compatible with new review page components
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptWithTokensAndJob, updateTranscript } from '@/lib/supabase/queries/transcripts';
import { Role } from '@/lib/constants';
import {
  getReviewSession,
  getTranscriptionWords,
  hasTranscriptReviewAccess,
  mergeReviewSession,
} from '@/lib/transcripts/review-session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: transcriptionId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch existing review session from transcript's flagged_segments
    const supabase = await createSupabaseServerClient();
    const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptionId, currentUser.id);

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
    console.error('Error loading review session:', _error);
    return NextResponse.json(
      { error: 'Failed to load review session' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: transcriptionId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      corrections = [], // Array of [wordIndex, correction] pairs
      reviewedWordIndices = [], // Array of word indices marked as reviewed
      expectedUpdatedAt,  // ISO string of last known updatedAt
    } = body;

    // Fetch transcription with job
    const supabase = await createSupabaseServerClient();
    const transcription = await getTranscriptWithTokensAndJob(supabase, transcriptionId, currentUser.id);

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Check access: user must be the creator OR an assigned scopist OR admin
    if (!hasTranscriptReviewAccess(transcription, currentUser.id, currentUser.role, Role.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check for optimistic locking conflict
    if (expectedUpdatedAt) {
      const expectedDate = new Date(expectedUpdatedAt);
      const actualDate = new Date(transcription.updated_at || transcription.updatedAt);

      // Allow 1 second tolerance for timing differences
      if (Math.abs(actualDate.getTime() - expectedDate.getTime()) > 1000) {
        return NextResponse.json(
          {
            error: 'Conflict detected',
            code: 'CONFLICT',
            message: 'Transcript was modified by another user. Please refresh and try again.',
            serverUpdatedAt: actualDate.toISOString(),
          },
          { status: 409 }
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
      userId: currentUser.id,
      reviewedIndices: reviewedWordIndices,
      corrections: Object.fromEntries(corrections) as Record<string, string>,
      lastSavedAt: new Date().toISOString(),
    };

    // Update transcription with review session stored in flagged_segments
    await updateTranscript(supabase, transcriptionId, {
      content_json: updatedWords as any,
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
            editor_id: currentUser.id,
            editor_email: currentUser.email || null,
            editor_role: currentUser.role || null,
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

    return NextResponse.json({
      success: true,
      correctionsApplied: corrections.length,
      reviewedCount: reviewedWordIndices.length,
      remainingFlagged: remainingFlagged,
      updatedAt: new Date().toISOString(),
    });
  } catch (_error) {
    console.error('Error saving corrections:', _error);
    return NextResponse.json(
      { error: 'Failed to save corrections' },
      { status: 500 }
    );
  }
}
