/**
 * Transcript Corrections API
 * Handles saving word corrections and reviewed word indices
 * Compatible with new review page components
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: transcriptionId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      corrections = [], // Array of [wordIndex, correction] pairs
      reviewedWordIndices = [], // Array of word indices marked as reviewed
    } = body;

    // Fetch transcription with job
    const transcription = await db.transcription.findUnique({
      where: { id: transcriptionId },
      include: {
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

    // Check access: user must be the creator OR an assigned scopist OR admin
    const isCreator = transcription.job.createdById === session.user.id;
    const isAssignedScopist = transcription.job.assignments.length > 0;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isCreator && !isAssignedScopist && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current words array
    const currentWords = (transcription.words as any[]) || [];

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
    const currentFlaggedSegments = (transcription.flaggedSegments as Record<string, any>) || {};

    // Update transcription
    await db.transcription.update({
      where: { id: transcriptionId },
      data: {
        words: updatedWords,
        flaggedWordCount: remainingFlagged,
        flaggedSegments: {
          ...currentFlaggedSegments,
          lastSavedAt: new Date().toISOString(),
          correctionsCount: corrections.length,
          reviewedCount: reviewedWordIndices.length,
        },
      },
    });

    // Create audit log entries for corrections
    if (corrections.length > 0) {
      for (const [wordIndex, correctedWord] of corrections) {
        const originalWord = currentWords[wordIndex];
        if (originalWord && originalWord.word !== correctedWord) {
          await db.transcriptionEdit.create({
            data: {
              transcriptionId,
              editorId: session.user.id,
              editorEmail: session.user.email || undefined,
              editorRole: session.user.role as any,
              editType: 'WORD_CORRECTION',
              originalText: originalWord.word,
              editedText: correctedWord,
              position: originalWord.start || 0,
              metadata: {
                wordIndex,
                confidence: originalWord.confidence,
                timestamp: new Date().toISOString(),
              },
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      correctionsApplied: corrections.length,
      reviewedCount: reviewedWordIndices.length,
      remainingFlagged: remainingFlagged,
    });
  } catch (error) {
    console.error('Error saving corrections:', error);
    return NextResponse.json(
      { error: 'Failed to save corrections' },
      { status: 500 }
    );
  }
}
