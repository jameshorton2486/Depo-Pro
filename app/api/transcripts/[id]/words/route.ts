// ═══════════════════════════════════════════════════════════════
// WORDS API - Save word corrections and review progress
// ═══════════════════════════════════════════════════════════════
// PATCH: Save corrections, reviewed state, and session progress
// GET: Retrieve current review progress
// Access: Court reporters (own jobs) and assigned scopists

import type { NextRequest} from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptWithTokensAndJob, updateTranscript } from '@/lib/supabase/queries/transcripts';
import { Role, JobStatus } from '@/lib/constants';
import type { ReviewState } from '@/types/review';
import { isTranscriptLocked, getLockStatus } from '@/lib/transcript-locking';
import {
  getReviewSession,
  getTranscriptionWords,
  hasTranscriptReviewAccess,
  mergeReviewSession,
} from '@/lib/transcripts/review-session';

// Threshold bounds
const MIN_THRESHOLD = 0.5;
const MAX_THRESHOLD = 1.0;
const DEFAULT_THRESHOLD = 0.85;

interface WordCorrection {
  wordIndex: number;
  correctedWord: string;
}

interface SaveReviewRequest {
  corrections: WordCorrection[];
  reviewedIndices: number[];
  lastReviewedIndex: number;
  audioPosition: number;
  confidenceThreshold: number;
  complete?: boolean;
  updatedAt?: string; // Client sends last known server timestamp for optimistic locking
}

function normalizeThreshold(threshold: number | undefined): number {
  if (threshold === undefined || isNaN(threshold)) {
    return DEFAULT_THRESHOLD;
  }
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, threshold));
}

const PATCHHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: transcriptionId } = await params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SaveReviewRequest = await request.json();
    const {
      corrections,
      reviewedIndices,
      lastReviewedIndex,
      audioPosition,
      confidenceThreshold: rawThreshold,
      complete,
      updatedAt: clientUpdatedAt,
    } = body;

    const confidenceThreshold = normalizeThreshold(rawThreshold);

    // Fetch transcription with job
    const supabase = await createSupabaseServerClient();
    const transcription = await getTranscriptWithTokensAndJob(supabase, transcriptionId, currentUser.id);

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Check lock status - CRITICAL: Prevent edits to locked transcripts
    if (isTranscriptLocked(transcription as any)) {
      const lockStatus = getLockStatus(transcription as any);
      return NextResponse.json(
        {
          error: 'Transcript is locked',
          code: 'TRANSCRIPT_LOCKED',
          details: {
            reason: lockStatus.reason,
            lockedAt: lockStatus.lockedAt,
            message: 'This transcript has been finalized. Edits are tracked separately.',
          }
        },
        { status: 403 }
      );
    }

    // Row-level optimistic lock: prevent stale overwrites from concurrent editors
    if (clientUpdatedAt && (transcription as any).updated_at) {
      const serverTs = new Date((transcription as any).updated_at).getTime();
      const clientTs = new Date(clientUpdatedAt).getTime();
      // 2-second tolerance covers auto-save timing jitter
      if (serverTs > clientTs && Math.abs(serverTs - clientTs) > 2000) {
        return NextResponse.json(
          {
            error: 'Transcript has been modified by another user',
            code: 'STALE_DATA',
            serverUpdatedAt: (transcription as any).updated_at,
            details: { message: 'Please reload the page to get the latest version before saving.' },
          },
          { status: 409 },
        );
      }
    }

    // Check access: user must be the creator OR an assigned scopist OR admin
    if (!hasTranscriptReviewAccess(transcription, currentUser.id, currentUser.role, Role.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const isAssignedScopist = Array.isArray(transcription.job.assignments)
      && transcription.job.assignments.length > 0;

    // Get current words array (transcription is already fetched above)
    // Note: words are stored in transcript_tokens or in a JSONB column
    const currentWords = getTranscriptionWords(transcription);
    const maxIndex = currentWords.length - 1;

    const invalidCorrectionIndices = corrections.filter(
      (c) => !Number.isInteger(c.wordIndex) || c.wordIndex < 0 || c.wordIndex > maxIndex,
    );
    const invalidReviewedIndices = reviewedIndices.filter(
      (index) => !Number.isInteger(index) || index < 0 || index > maxIndex,
    );
    const invalidLastReviewedIndex =
      !Number.isInteger(lastReviewedIndex) ||
      lastReviewedIndex < 0 ||
      lastReviewedIndex > maxIndex;

    if (
      currentWords.length === 0 ||
      invalidCorrectionIndices.length > 0 ||
      invalidReviewedIndices.length > 0 ||
      invalidLastReviewedIndex
    ) {
      return NextResponse.json(
        {
          error: 'Invalid word indices',
          details: {
            wordCount: currentWords.length,
            invalidCorrections: invalidCorrectionIndices.map((c) => c.wordIndex),
            invalidReviewed: invalidReviewedIndices,
            invalidLastReviewedIndex: invalidLastReviewedIndex ? lastReviewedIndex : null,
          },
        },
        { status: 400 },
      );
    }

    // Apply corrections to words array
    const updatedWords = currentWords.map((word, index) => {
      const correction = corrections.find((c) => c.wordIndex === index);
      const isReviewed = reviewedIndices.includes(index);

      if (correction) {
        return {
          ...word,
          correctedWord: correction.correctedWord,
          reviewed: true,
          editedAt: new Date().toISOString(),
          editedBy: currentUser.id,
        };
      } else if (isReviewed) {
        return {
          ...word,
          reviewed: true,
        };
      }

      return word;
    });

    // Create TranscriptionEdit records for corrections
    if (corrections.length > 0) {
      const newEditRecords = corrections.map((c) => ({
        transcription_id: transcriptionId,
        editor_id: currentUser.id,
        editor_email: currentUser.email || null,
        editor_role: currentUser.role || null,
        edit_type: 'WORD_CORRECTION',
        original_text: currentWords[c.wordIndex]?.word || '',
        edited_text: c.correctedWord,
        position: currentWords[c.wordIndex]?.start || 0,
        metadata: { wordIndex: c.wordIndex },
      }));

      // Insert edits in batch
      const { error: editError } = await supabase
        .from('transcription_edits')
        .insert(newEditRecords);

      if (editError) {
        console.error('Error creating transcription edits:', editError);
        // Continue anyway - edits are logged but not critical
      }

      // Wire integrity chain: snapshot before the first edit of each session
      const isFirstSave = !getReviewSession((transcription as any).flagged_segments)?.lastSavedAt;
      if (isFirstSave) {
        try {
          const { createHash } = await import('crypto');
          const snapshotHash = createHash('sha256')
            .update(JSON.stringify(currentWords))
            .digest('hex');
          await supabase.from('transcript_integrity_chain').insert({
            transcription_id: transcriptionId,
            version_number: ((transcription as any).chain_version ?? 0) + 1,
            transcript_hash: snapshotHash,
            previous_hash: (transcription as any).current_integrity_hash ?? null,
            created_by: currentUser.id,
          });
        } catch (chainErr) {
          console.error('Error inserting integrity chain entry:', chainErr);
          // Non-critical — continue
        }
      }
    }

    // Calculate progress stats
    const totalFlagged = updatedWords.filter(
      (w) => w.confidence < confidenceThreshold,
    ).length;
    const reviewedFlagged = updatedWords.filter(
      (w) => w.confidence < confidenceThreshold && w.reviewed,
    ).length;
    const correctedCount = updatedWords.filter(
      (w) => w.correctedWord !== undefined,
    ).length;
    const remainingCount = totalFlagged - reviewedFlagged;

    // Determine review state
    let reviewState: ReviewState = 'PENDING';
    if (complete && reviewedFlagged >= totalFlagged) {
      reviewState = 'COMPLETED';
    } else if (reviewedIndices.length > 0 || corrections.length > 0) {
      reviewState = 'IN_PROGRESS';
    }

    // Build review session for resume functionality
    const reviewSession = {
      transcriptionId,
      jobId: transcription.job.id,
      reviewState,
      lastReviewedIndex,
      confidenceThreshold,
      corrections: corrections.map((c) => ({
        wordIndex: c.wordIndex,
        originalWord: currentWords[c.wordIndex]?.word || '',
        correctedWord: c.correctedWord,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
      })),
      reviewedIndices,
      lastSavedAt: new Date().toISOString(),
      audioPosition,
    };

    // Update transcription (only words and review data, not base text)
    // Store review session in flagged_segments for resume functionality
    await updateTranscript(supabase, transcriptionId, {
      content_json: updatedWords as any,
      flagged_word_count: remainingCount,
      flagged_segments: mergeReviewSession(transcription.flagged_segments, reviewSession) as any,
    });

    // If marking complete, update job status
    if (complete && reviewState === 'COMPLETED') {
      const { updateJobStatus } = await import('@/lib/supabase/queries/jobs');
      const newStatus = isAssignedScopist
        ? JobStatus.SCOPIST_COMPLETE
        : JobStatus.REVIEW_COMPLETE;

      await updateJobStatus(supabase, transcription.job.id, newStatus);

      // Update assignment if scopist
      if (isAssignedScopist) {
        const { error: assignmentError } = await supabase
          .from('job_assignments')
          .update({
            status: 'SUBMITTED',
            submitted_at: new Date().toISOString(),
          })
          .eq('job_id', transcription.job.id)
          .eq('scopist_id', currentUser.id);

        if (assignmentError) {
          console.error('Error updating assignment:', assignmentError);
        }
      }
    }

    const savedAt = new Date().toISOString();
    return NextResponse.json({
      success: true,
      savedAt,
      updatedAt: savedAt, // Echo back for client-side optimistic lock tracking
      correctionCount: corrections.length,
      reviewedCount: reviewedFlagged,
      correctedCount,
      remainingCount,
      totalFlagged,
      reviewState,
    });
  } catch (error) {
    console.error('Error saving word corrections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET: Retrieve current review progress
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

    // Fetch transcription with job
    const supabase = await createSupabaseServerClient();
    const transcription = await getTranscriptWithTokensAndJob(supabase, transcriptionId, currentUser.id);

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Check access
    if (!hasTranscriptReviewAccess(transcription, currentUser.id, currentUser.role, Role.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get saved session from flaggedSegments
    const reviewSession = getReviewSession(transcription.flagged_segments);

    // Calculate current progress stats
    const words = getTranscriptionWords(transcription);
    const threshold = reviewSession?.confidenceThreshold || DEFAULT_THRESHOLD;

    const totalFlagged = words.filter((w) => w.confidence < threshold).length;
    const reviewedFlagged = words.filter(
      (w) => w.confidence < threshold && w.reviewed,
    ).length;
    const correctedCount = words.filter((w) => w.correctedWord !== undefined).length;

    return NextResponse.json({
      transcriptionId: transcription.id,
      wordCount: words.length,
      flaggedWordCount: transcription.flagged_word_count || transcription.flaggedWordCount || 0,
      reviewSession,
      totalFlagged,
      reviewedCount: reviewedFlagged,
      correctedCount,
      remainingCount: totalFlagged - reviewedFlagged,
    });
  } catch (error) {
    console.error('Error fetching review progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
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
