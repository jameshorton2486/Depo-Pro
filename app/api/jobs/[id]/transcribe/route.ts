import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { transcribeAudio, type TranscriptionOptions } from '@/lib/transcription';
import { downloadFile } from '@/lib/storage';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// POST /api/jobs/[id]/transcribe - Start audio transcription
// ═══════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { fileId, options }: { fileId: string; options?: TranscriptionOptions } = body;

    // Validate file exists and belongs to this job
    const file = await db.jobFile.findFirst({
      where: {
        id: fileId,
        jobId,
        job: {
          reporterId: session.user.id, // Multi-tenant security
        },
      },
      include: {
        job: {
          select: {
            id: true,
            caseNumber: true,
            depoDate: true,
          },
        },
      },
    });

    if (!file) {
      logger.warn(`File not found for transcription - fileId: ${fileId}, jobId: ${jobId}, userId: ${session.user.id}`);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Only transcribe audio files
    if (!file.mimeType.startsWith('audio/') && !file.mimeType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Only audio/video files can be transcribed' },
        { status: 400 }
      );
    }

    logger.info(`Starting transcription - fileId: ${fileId}, jobId: ${jobId}, fileName: ${file.filename}`);

    // Download file from storage
    const downloadResult = await downloadFile(file.storageKey);

    // Transcribe audio (async process)
    const result = await transcribeAudio(downloadResult.buffer, options);

    // Create or update transcript record
    let transcript = await db.transcription.findFirst({
      where: { 
        jobId,
        isCurrent: true,
      },
    });

    if (transcript) {
      // Mark old version as not current
      await db.transcription.update({
        where: { id: transcript.id },
        data: { isCurrent: false },
      });
      
      // Create new version
      transcript = await db.transcription.create({
        data: {
          jobId,
          rawText: result.text,
          formattedText: result.text,
          version: transcript.version + 1,
          isCurrent: true,
          status: 'DRAFT',
          source: 'DEEPGRAM',
          createdById: session.user.id,
        },
      });
      logger.info(`Transcript updated - transcriptId: ${transcript.id}, version: ${transcript.version}`);
    } else {
      // Create new transcript
      transcript = await db.transcription.create({
        data: {
          jobId,
          rawText: result.text,
          formattedText: result.text,
          version: 1,
          isCurrent: true,
          status: 'DRAFT',
          source: 'DEEPGRAM',
          createdById: session.user.id,
        },
      });
      logger.info(`Transcript created - transcriptId: ${transcript.id}`);
    }

    // Update job status to PROCESSING if it was PENDING
    await db.job.updateMany({
      where: {
        id: jobId,
        status: 'PENDING',
      },
      data: {
        status: 'PROCESSING',
      },
    });

    return NextResponse.json({
      success: true,
      transcriptId: transcript.id,
      confidence: result.confidence,
      wordCount: result.text.split(/\s+/).length,
      duration: result.duration,
    });

  } catch (error) {
    const { id } = await params;
    logger.error(`Transcription failed - jobId: ${id}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
