// ═══════════════════════════════════════════════════════════════
// WORDS API - Save word corrections and review progress
// ═══════════════════════════════════════════════════════════════
// PATCH: Save corrections, reviewed state, and session progress
// GET: Retrieve current review progress
// Access: Court reporters (own jobs) and assigned scopists

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role, JobStatus } from '@/lib/constants';
import { ReviewState } from '@/types/review';
import { isTranscriptLocked, getLockStatus } from '@/lib/transcript-locking';

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
}

function normalizeThreshold(threshold: number | undefined): number {
  if (threshold === undefined || isNaN(threshold)) {
    return DEFAULT_THRESHOLD;
  }
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, threshold));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: transcriptionId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
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
    } = body;

    const confidenceThreshold = normalizeThreshold(rawThreshold);

    // Fetch transcription with job
    const transcription = await db.transcription.findUnique({
      where: { id: transcriptionId },
      select: {
        id: true,
        lockedAt: true,
        lockedBy: true,
        lockReason: true,
        status: true,
        words: true,
        flaggedSegments: true,
        flaggedWordCount: true,
        job: {
          include: {
            assignments: {
              where: {
                scopistId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Check lock status - CRITICAL: Prevent edits to locked transcripts
    if (isTranscriptLocked(transcription)) {
      const lockStatus = getLockStatus(transcription);
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

    // Check access: user must be the creator OR an assigned scopist OR admin
    const isCreator = transcription.job.createdById === session.user.id;
    const isAssignedScopist = transcription.job.assignments.length > 0;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isCreator && !isAssignedScopist && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current words array (transcription is already fetched above)
    const currentWords = (transcription.words as any[]) || [];

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
          editedBy: session.user.id,
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
    const newEditRecords = corrections.map((c) => ({
      transcriptionId,
      editorId: session.user.id,
      editorEmail: session.user.email || null,
      editorRole: session.user.role || null,
      editType: 'WORD_CORRECTION' as const,
      originalText: currentWords[c.wordIndex]?.word || '',
      editedText: c.correctedWord,
      position: currentWords[c.wordIndex]?.start || 0,
      metadata: { wordIndex: c.wordIndex },
    }));

    if (newEditRecords.length > 0) {
      await db.transcriptionEdit.createMany({
        data: newEditRecords,
      });
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
        userId: session.user.id,
      })),
      reviewedIndices,
      lastSavedAt: new Date().toISOString(),
      audioPosition,
    };

    // Get current flaggedSegments or create empty object
    const currentFlaggedSegments = (transcription.flaggedSegments as Record<string, any>) || {};

    // Update transcription (only words and review data, not base text)
    await db.transcription.update({
      where: { id: transcriptionId },
      data: {
        words: updatedWords,
        flaggedWordCount: remainingCount,
        flaggedSegments: {
          ...currentFlaggedSegments,
          reviewSession,
        },
      },
    });

    // If marking complete, update job status
    if (complete && reviewState === 'COMPLETED') {
      const newStatus = isAssignedScopist
        ? JobStatus.SCOPIST_COMPLETE
        : JobStatus.REVIEW_COMPLETE;

      await db.job.update({
        where: { id: transcription.job.id },
        data: {
          status: newStatus,
        },
      });

      // Update assignment if scopist
      if (isAssignedScopist) {
        await db.jobAssignment.updateMany({
          where: {
            jobId: transcription.job.id,
            scopistId: session.user.id,
          },
          data: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: transcriptionId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch transcription with job
    const transcription = await db.transcription.findUnique({
      where: { id: transcriptionId },
      include: {
        job: {
          select: {
            id: true,
            createdById: true,
            assignments: {
              where: {
                scopistId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Check access
    const isCreator = transcription.job.createdById === session.user.id;
    const isAssignedScopist = transcription.job.assignments.length > 0;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isCreator && !isAssignedScopist && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get saved session from flaggedSegments
    const flaggedSegments = transcription.flaggedSegments as Record<string, any>;
    const reviewSession = flaggedSegments?.reviewSession || null;

    // Calculate current progress stats
    const words = (transcription.words as any[]) || [];
    const threshold = reviewSession?.confidenceThreshold || DEFAULT_THRESHOLD;

    const totalFlagged = words.filter((w) => w.confidence < threshold).length;
    const reviewedFlagged = words.filter(
      (w) => w.confidence < threshold && w.reviewed,
    ).length;
    const correctedCount = words.filter((w) => w.correctedWord !== undefined).length;

    return NextResponse.json({
      transcriptionId: transcription.id,
      wordCount: words.length,
      flaggedWordCount: transcription.flaggedWordCount,
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
