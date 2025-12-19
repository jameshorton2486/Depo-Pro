// lib/workers/transcription-worker.ts
// Background job processor for transcription

import { Job } from 'bullmq';
import { prisma } from '@/lib/db';
import { 
  transcribeAudio, 
  processTranscriptResponse,
  getMimetypeFromExtension 
} from '@/lib/transcription';
import { downloadFile } from '@/lib/storage';
import { analyzeSpeakersEnhanced } from '@/lib/services/speaker-identification';
import type { TranscriptionJobData } from '@/types/deepgram';

// ============================================
// Now using shared TranscriptionJobData from @/types/deepgram
// ============================================

// ============================================
// PROCESS TRANSCRIPTION JOB
// ============================================

export async function processTranscriptionJob(
  job: Job<TranscriptionJobData> | TranscriptionJobData
): Promise<void> {
  // Handle both BullMQ Job and plain data object
  const data = 'data' in job ? job.data : job;
  
  const { 
    jobId, 
    audioFileUrl, 
    audioFileName,
    modelType 
  } = data;

  console.log(`Processing transcription for job ${jobId}`);

  try {
    // Update job status to TRANSCRIBING
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'TRANSCRIBING' },
    });

    // Download audio file
    console.log(`Downloading audio from: ${audioFileUrl}`);
    const audioBuffer = await downloadFile(audioFileUrl);
    
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Failed to download audio file or file is empty');
    }

    // Get mimetype from filename
    const mimetype = getMimetypeFromExtension(audioFileName);
    console.log(`Audio mimetype: ${mimetype}, size: ${audioBuffer.length} bytes`);

    // Transcribe with Deepgram
    console.log(`Starting Deepgram transcription with model: ${modelType}`);
    const deepgramResponse = await transcribeAudio(audioBuffer, modelType, mimetype);
    
    // Process response
    const processedTranscript = processTranscriptResponse(deepgramResponse);
    console.log(`Transcription complete: ${processedTranscript.wordCount} words, ${processedTranscript.flaggedWordCount} flagged`);

    // Analyze speakers
    const speakerAnalysis = analyzeSpeakersEnhanced(processedTranscript.utterances);
    console.log(`Speaker analysis: ${speakerAnalysis.guesses.length} speakers detected`);

    // Check if transcript exists for this job
    const existingTranscript = await prisma.transcription.findFirst({
      where: { jobId },
    });

    const transcriptData = {
      fullTranscript: processedTranscript.fullText,
      deepgramRawJson: JSON.stringify(deepgramResponse),
      words: JSON.stringify(processedTranscript.words),
      utterances: JSON.stringify(processedTranscript.utterances),
      flaggedSegments: JSON.stringify(processedTranscript.flaggedWords),
      speakerAnalysis: JSON.stringify(speakerAnalysis),
      duration: processedTranscript.duration,
      wordCount: processedTranscript.wordCount,
      flaggedWordCount: processedTranscript.flaggedWordCount,
      averageConfidence: processedTranscript.averageConfidence,
      modelUsed: modelType,
      status: 'COMPLETED' as const,
    };

    if (existingTranscript) {
      // Update existing transcript
      await prisma.transcription.update({
        where: { id: existingTranscript.id },
        data: transcriptData,
      });
    } else {
      // Create new transcript
      await prisma.transcription.create({
        data: {
          ...transcriptData,
          jobId,
          version: 1,
        },
      });
    }

    // Update job status to AI_REVIEWING
    await prisma.job.update({
      where: { id: jobId },
      data: { 
        status: 'AI_REVIEWING',
        transcriptionCompletedAt: new Date(),
      },
    });

    console.log(`Job ${jobId} transcription completed successfully`);

  } catch (error) {
    console.error(`Transcription failed for job ${jobId}:`, error);

    // Update job status to CANCELLED
    await prisma.job.update({
      where: { id: jobId },
      data: { 
        status: 'CANCELLED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}
