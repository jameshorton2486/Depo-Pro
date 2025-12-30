// app/api/transcripts/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exportTranscript } from '@/lib/export';
import { ExportOptions, ExportMetadata } from '@/types/transcript';
import { checkUserRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { useQuota } from '@/lib/cost-control-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; firmId?: string };
    const { id: transcriptId } = await context.params;

    // Rate limit check
    const rateLimit = checkUserRateLimit(user.id, 'TRANSCRIPT_EXPORT');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    // Quota check
    if (user.firmId) {
      const tier = 'FREE'; // TODO: Get from subscription
      const quotaCheck = await useQuota(user.firmId, 'exports', 1, tier);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          { error: 'Export quota exceeded', ...quotaCheck },
          { status: 429 }
        );
      }
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'docx') as 'docx' | 'pdf' | 'txt';
    const lineNumbering = searchParams.get('lineNumbers') !== 'false';

    // Fetch transcript with job details
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptId },
      include: {
        job: {
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            firm: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = transcription.job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSameFirm = transcription.job.firmId === user.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!transcription.fullTranscript) {
      return NextResponse.json({ error: 'No transcript text available' }, { status: 400 });
    }

    // Apply edits before export (Phase 7 requirement)
    let exportText = transcription.fullTranscript;

    // Fetch all edits for this transcription
    const edits = await prisma.transcriptionEdit.findMany({
      where: { transcriptionId: transcriptId },
      orderBy: { createdAt: 'asc' },
    });

    // If there are edits, apply them to the words array
    if (edits.length > 0 && transcription.words) {
      try {
        const words = JSON.parse(transcription.words as string) as Array<{
          word: string;
          correctedWord?: string;
          isEdited?: boolean;
        }>;

        // Apply corrections from TranscriptionEdit records
        // Edit metadata contains wordIndex and wordId
        edits.forEach(edit => {
          if (edit.editedText && edit.metadata) {
            const metadata = edit.metadata as { wordIndex?: number; wordId?: string };
            const wordIndex = metadata.wordIndex;

            if (wordIndex !== undefined && wordIndex !== null && words[wordIndex]) {
              words[wordIndex].word = edit.editedText;
              words[wordIndex].correctedWord = edit.editedText;
              words[wordIndex].isEdited = true;
            }
          }
        });

        // Also check flaggedSegments for correctedWord values (may have been updated directly)
        if (transcription.flaggedSegments) {
          const flaggedSegments = JSON.parse(transcription.flaggedSegments as string) as Array<{
            wordIndex: number;
            correctedWord?: string;
            word: string;
          }>;

          flaggedSegments.forEach(segment => {
            if (segment.correctedWord && segment.wordIndex !== undefined) {
              const wordIndex = segment.wordIndex;
              if (words[wordIndex]) {
                words[wordIndex].word = segment.correctedWord;
                words[wordIndex].correctedWord = segment.correctedWord;
                words[wordIndex].isEdited = true;
              }
            }
          });
        }

        // Generate corrected text from words array
        exportText = words.map(w => w.correctedWord || w.word).join(' ');
      } catch (error) {
        console.error('Error applying edits to export:', error);
        // Fall back to original transcript if edit application fails
      }
    } else if (transcription.flaggedSegments) {
      // Even without TranscriptionEdit records, check flaggedSegments for corrections
      try {
        const flaggedSegments = JSON.parse(transcription.flaggedSegments as string) as Array<{
          wordIndex: number;
          correctedWord?: string;
          word: string;
        }>;

        const words = JSON.parse(transcription.words as string) as Array<{
          word: string;
          correctedWord?: string;
        }>;

        flaggedSegments.forEach(segment => {
          if (segment.correctedWord && segment.wordIndex !== undefined && words[segment.wordIndex]) {
            words[segment.wordIndex].word = segment.correctedWord;
            words[segment.wordIndex].correctedWord = segment.correctedWord;
          }
        });

        exportText = words.map(w => w.correctedWord || w.word).join(' ');
      } catch (error) {
        console.error('Error applying flagged segment corrections to export:', error);
      }
    }

    // Build metadata
    const metadata: ExportMetadata = {
      caseName: transcription.job.title,
      caseNumber: transcription.job.caseNumber || undefined,
      depositionDate: transcription.job.depositionDate || new Date(),
      deponentName: transcription.job.title || 'Unknown',
      courtReporterName: transcription.job.createdBy.firstName && transcription.job.createdBy.lastName
        ? `${transcription.job.createdBy.firstName} ${transcription.job.createdBy.lastName}`
        : undefined,
      firmName: transcription.job.firm?.name || undefined,
      location: transcription.job.location || undefined,
    };

    // Build options
    const options: ExportOptions = {
      format,
      includeTimestamps: false,
      includeSpeakerLabels: true,
      lineNumbering,
      useQAFormat: true,
    };

    // Generate export with corrected text
    const { buffer, filename, contentType } = await exportTranscript(
      exportText,
      metadata,
      options,
    );

    // Return file
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export transcript' }, { status: 500 });
  }
}
