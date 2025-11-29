// app/api/transcripts/[id]/words/route.ts
// API route for updating flagged words during review

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { FlaggedWord } from '@/types/transcript';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Update a flagged word
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;
    const body = await request.json();
    const { wordId, correctedWord, isReviewed } = body;

    if (!wordId) {
      return NextResponse.json({ error: 'wordId is required' }, { status: 400 });
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

    // Parse flagged segments
    const flaggedSegments: FlaggedWord[] = transcription.flaggedSegments 
      ? JSON.parse(transcription.flaggedSegments as string)
      : [];

    // Find and update the word
    const wordIndex = flaggedSegments.findIndex(w => w.id === wordId);
    
    if (wordIndex === -1) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    // Update the flagged word
    if (correctedWord !== undefined) {
      flaggedSegments[wordIndex].correctedWord = correctedWord;
    }
    
    if (isReviewed !== undefined) {
      flaggedSegments[wordIndex].isReviewed = isReviewed;
    }

    // Update in database
    await prisma.transcription.update({
      where: { id: transcriptId },
      data: {
        flaggedSegments: JSON.stringify(flaggedSegments),
        updatedAt: new Date(),
      },
    });

    // Create edit record
    await prisma.transcriptionEdit.create({
      data: {
        transcriptionId,
        editorId: session.user.id,
        editorEmail: session.user.email || undefined,
        editorRole: session.user.role,
        editType: 'WORD_CORRECTION',
        originalText: flaggedSegments[wordIndex].word,
        editedText: correctedWord,
        position: flaggedSegments[wordIndex].startTime,
        metadata: {
          wordId,
          confidence: flaggedSegments[wordIndex].confidence,
          isReviewed,
        },
      },
    });

    return NextResponse.json({
      success: true,
      word: flaggedSegments[wordIndex],
    });

  } catch (error) {
    console.error('Error updating word:', error);
    return NextResponse.json(
      { error: 'Failed to update word' },
      { status: 500 }
    );
  }
}

// Batch update multiple words
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
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

    // Parse flagged segments
    const flaggedSegments: FlaggedWord[] = transcription.flaggedSegments 
      ? JSON.parse(transcription.flaggedSegments as string)
      : [];

    // Apply all updates
    const updatedWords: FlaggedWord[] = [];
    
    for (const update of updates) {
      const wordIndex = flaggedSegments.findIndex(w => w.id === update.wordId);
      
      if (wordIndex !== -1) {
        if (update.correctedWord !== undefined) {
          flaggedSegments[wordIndex].correctedWord = update.correctedWord;
        }
        
        if (update.isReviewed !== undefined) {
          flaggedSegments[wordIndex].isReviewed = update.isReviewed;
        }

        updatedWords.push(flaggedSegments[wordIndex]);

        // Create edit record
        await prisma.transcriptionEdit.create({
          data: {
            transcriptionId,
            editorId: session.user.id,
            editorEmail: session.user.email || undefined,
            editorRole: session.user.role,
            editType: 'WORD_CORRECTION',
            originalText: flaggedSegments[wordIndex].word,
            editedText: update.correctedWord,
            position: flaggedSegments[wordIndex].startTime,
            metadata: {
              wordId: update.wordId,
              confidence: flaggedSegments[wordIndex].confidence,
              isReviewed: update.isReviewed,
              batchUpdate: true,
            },
          },
        });
      }
    }

    // Update in database
    await prisma.transcription.update({
      where: { id: transcriptId },
      data: {
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
    const session = await getServerSession(authOptions);
    
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
