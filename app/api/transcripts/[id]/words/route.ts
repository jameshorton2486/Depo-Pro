// app/api/transcripts/[id]/words/route.ts
// API route for updating flagged words during review

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FlaggedWord } from '@/types/transcript';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Batch update words (PATCH method as per spec)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;
    const body = await request.json();
    const { updates } = body; // Array of { wordId, correctedWord?, isReviewed? }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 });
    }

    // Get the transcription
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptId },
      include: {
        job: {
          include: {
            assignments: {
              where: {
                scopistId: session.user.id,
                status: {
                  in: ['ACCEPTED', 'IN_PROGRESS']
                }
              }
            }
          }
        }
      },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = transcription.job.createdById === session.user.id;
    const isAssignedScopist = transcription.job.assignments.length > 0;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAssignedScopist && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse words and flagged segments
    const words: any[] = transcription.words 
      ? JSON.parse(transcription.words as string)
      : [];
    const flaggedSegments: FlaggedWord[] = transcription.flaggedSegments 
      ? JSON.parse(transcription.flaggedSegments as string)
      : [];

    // Apply all updates
    const updatedWords: FlaggedWord[] = [];
    const now = new Date().toISOString();
    
    for (const update of updates) {
      // Find in flagged segments
      const segmentIndex = flaggedSegments.findIndex(w => w.id === update.wordId || w.wordIndex === update.wordIndex);
      
      if (segmentIndex !== -1) {
        // Update flagged segment
        if (update.correctedWord !== undefined) {
          flaggedSegments[segmentIndex].correctedWord = update.correctedWord;
        }
        
        if (update.isReviewed !== undefined) {
          flaggedSegments[segmentIndex].isReviewed = update.isReviewed;
          if (update.isReviewed) {
            (flaggedSegments[segmentIndex] as any).reviewedAt = now;
            (flaggedSegments[segmentIndex] as any).reviewedById = session.user.id;
          }
        }

        updatedWords.push(flaggedSegments[segmentIndex]);

        // Update corresponding word in words array if corrected
        if (update.correctedWord !== undefined && flaggedSegments[segmentIndex].wordIndex !== undefined) {
          const wordIndex = flaggedSegments[segmentIndex].wordIndex;
          if (words[wordIndex]) {
            words[wordIndex].word = update.correctedWord;
            words[wordIndex].isEdited = true;
          }
        }

        // Create edit record
        if (update.correctedWord !== undefined) {
          await prisma.transcriptionEdit.create({
            data: {
              transcriptionId: transcriptId,
              editorId: session.user.id,
              editorEmail: session.user.email || undefined,
              editorRole: session.user.role,
              editType: 'WORD_CORRECTION',
              originalText: flaggedSegments[segmentIndex].word,
              editedText: update.correctedWord,
              position: flaggedSegments[segmentIndex].startTime || 0,
              metadata: {
                wordId: update.wordId,
                wordIndex: flaggedSegments[segmentIndex].wordIndex,
                confidence: flaggedSegments[segmentIndex].confidence,
                isReviewed: update.isReviewed,
                batchUpdate: true,
              },
            },
          });
        }
      }
    }

    // Update both words and flaggedSegments in database
    await prisma.transcription.update({
      where: { id: transcriptId },
      data: {
        words: JSON.stringify(words),
        flaggedSegments: JSON.stringify(flaggedSegments),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updatedWords.length,
      words: updatedWords,
    });

  } catch (error) {
    console.error('Error batch updating words:', error);
    return NextResponse.json(
      { error: 'Failed to batch update words' },
      { status: 500 }
    );
  }
}

// Get review progress
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

    // Get the transcription
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptId },
      include: {
        job: true,
      },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Parse flagged segments
    const flaggedSegments: FlaggedWord[] = transcription.flaggedSegments 
      ? JSON.parse(transcription.flaggedSegments as string)
      : [];

    const total = flaggedSegments.length;
    const reviewed = flaggedSegments.filter(w => w.isReviewed).length;
    const corrected = flaggedSegments.filter(w => w.correctedWord).length;

    return NextResponse.json({
      total,
      reviewed,
      corrected,
      pending: total - reviewed,
      percentage: total > 0 ? Math.round((reviewed / total) * 100) : 0,
    });

  } catch (error) {
    console.error('Error getting review progress:', error);
    return NextResponse.json(
      { error: 'Failed to get review progress' },
      { status: 500 }
    );
  }
}
