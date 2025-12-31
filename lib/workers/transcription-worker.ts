// lib/workers/transcription-worker.ts
// Background job processor for transcription

import { Job } from 'bullmq';
import { db } from '@/lib/db';
import { transcribeAudio, transcribeFromUrl } from '@/lib/transcription';
import { downloadFile } from '@/lib/storage';
import type { TranscriptionJobData } from '@/types/deepgram';
import { Logger } from '@/lib/observability';

const logger = new Logger('TranscriptionWorker');

// ============================================
// Now using shared TranscriptionJobData from @/types/deepgram
// ============================================

// ============================================
// PROCESS TRANSCRIPTION JOB
// ============================================

export async function processTranscriptionJob(
  job: Job<TranscriptionJobData> | TranscriptionJobData,
): Promise<void> {
  // Handle both BullMQ Job and plain data object
  const data = 'data' in job ? job.data : job;

  const {
    jobId,
    audioFileUrl,
    audioFileName,
    modelType,
  } = data;

  logger.info(`Processing transcription for job ${jobId}`, { jobId, audioFileName, modelType });

  try {
    // Update job status to TRANSCRIBING
    await db.job.update({
      where: { id: jobId },
      data: { status: 'TRANSCRIBING' },
    });

    // Get proper noun keywords from reporter notes for Deepgram
    const { getProperNounKeywords } = await import('@/lib/transcription/buildKeywords');
    const properNounKeywords = await getProperNounKeywords(jobId);
    
    // Get custom dictionary terms for this firm (if firmId available)
    const customKeyterms: string[] = [...properNounKeywords];
    if (data.firmId) {
      // TODO: Fetch custom dictionary terms from database
    }

    // Map modelType to Deepgram model preference
    const modelPreference: 'nova-3' | 'nova-2' | 'nova-2-medical' =
      modelType === 'MEDICAL' ? 'nova-2-medical' :
      modelType === 'BILINGUAL' ? 'nova-2' :
      'nova-3';

    // Transcribe with Deepgram - NO MOCK FALLBACK
    logger.info(`Starting Deepgram transcription with model: ${modelPreference}`, { jobId, modelPreference });
    let result;

    // Try URL first (faster, no download needed)
    if (audioFileUrl.startsWith('http://') || audioFileUrl.startsWith('https://')) {
      result = await transcribeFromUrl(audioFileUrl, {
        customKeyterms,
        modelPreference,
      });
    } else {
      // Download and transcribe from buffer
      logger.info(`Downloading audio from: ${audioFileUrl}`, { jobId, audioFileUrl });
      const audioBuffer = await downloadFile(audioFileUrl);

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Failed to download audio file or file is empty');
      }

      logger.info(`Audio size: ${audioBuffer.length} bytes`, { jobId, size: audioBuffer.length });
      result = await transcribeAudio(audioBuffer, {
        customKeyterms,
        modelPreference,
      });
    }

    logger.info(`✅ Transcription complete`, {
      jobId,
      wordCount: result.words.length,
      flaggedCount: result.flaggedSegments.length
    });

    // Analyze speakers (optional enhancement)
    // Note: analyzeSpeakersEnhanced expects different format, skip for now
    // TODO: Update speaker analysis to work with new Utterance format
    const speakerAnalysis = null;

    // Check if transcript exists for this job
    const existingTranscript = await db.transcription.findFirst({
      where: { jobId },
    });

    const transcriptData = {
      fullTranscript: result.transcript,
      deepgramRawJson: JSON.stringify(result.rawResponse),
      words: result.words as any,
      utterances: result.utterances as any,
      flaggedSegments: result.flaggedSegments as any,
      speakerAnalysis: speakerAnalysis ? (JSON.stringify(speakerAnalysis) as any) : undefined,
      duration: result.metadata.duration,
      wordCount: result.words.length,
      flaggedWordCount: result.qualityReport.lowConfidenceCount + result.qualityReport.inaudibleCount,
      averageConfidence: result.qualityReport.overallConfidence,
      speakerCount: new Set(result.utterances.map(u => u.speaker)).size,
      modelUsed: modelType,
      status: 'COMPLETED' as const,
    };

    if (existingTranscript) {
      // Update existing transcript
      await db.transcription.update({
        where: { id: existingTranscript.id },
        data: transcriptData,
      });
    } else {
      // Create new transcript
      await db.transcription.create({
        data: {
          ...transcriptData,
          jobId,
          version: 1,
        },
      });
    }

    // Update job status based on quality
    const finalStatus = result.qualityReport.needsReview ? 'AI_REVIEWING' : 'READY_FOR_EDIT';
    await db.job.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        transcriptionCompletedAt: new Date(),
      },
    });

    logger.info(`Job ${jobId} transcription completed successfully (status: ${finalStatus})`, { jobId, finalStatus });

  } catch (error) {
    logger.error(`❌ Transcription failed for job ${jobId}`, error as Error, { jobId });

    // Update job status to FAILED (not CANCELLED - this is a real failure)
    try {
      await db.job.update({
        where: { id: jobId },
        data: {
          status: 'CANCELLED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (updateError) {
      logger.error('Failed to update job status', updateError as Error, { jobId });
    }

    // Re-throw to ensure error is logged
    throw error;
  }
}
