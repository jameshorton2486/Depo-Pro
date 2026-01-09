// lib/workers/transcription-worker.ts
// Background job processor for transcription

import { Job } from 'bullmq';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { transcribeAudio, transcribeFromUrl } from '@/lib/transcription';
import { downloadFile } from '@/lib/storage';
import type { TranscriptionJobData } from '@/types/deepgram';
import { logger } from '@/lib/logger';

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
  const startTime = Date.now();

  const {
    jobId,
    audioFileUrl,
    audioFileName,
    modelType,
  } = data;

  logger.info(`Processing transcription for job ${jobId}`, { jobId, audioFileName, modelType });

  try {
    // Update job status to TRANSCRIBING
    const supabase = await createSupabaseServerClient();
    const attemptsMade = (job as { attemptsMade?: number }).attemptsMade || 0;

    await supabase
      .from('jobs')
      .update({
        status: 'TRANSCRIBING',
        processing_started_at: new Date().toISOString(),
        job_attempts: attemptsMade + 1,
      })
      .eq('id', jobId);

    // Get proper noun keywords from all sources:
    // 1. DepositionNote (PROPER_NOUN type)
    // 2. CSRProperNoun (live-captured during deposition)
    // 3. CaseExtractedTerm (extracted from uploaded documents)
    const { buildKeywordsForJob } = await import('@/lib/transcription/buildKeywords');
    const keywordConfigs = await buildKeywordsForJob(jobId);
    const properNounKeywords = keywordConfigs.map(k => k.word);

    logger.info(`[Keywords] Found ${properNounKeywords.length} proper noun keywords for job ${jobId}`, {
      jobId,
      keywordCount: properNounKeywords.length,
      sampleKeywords: properNounKeywords.slice(0, 5),
      sources: 'DepositionNote, CSRProperNoun, CaseExtractedTerm',
    });

    // Use keywords directly (no additional firm dictionary needed - all sources included above)
    const customKeyterms: string[] = [...properNounKeywords];

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
    const { data: existingTranscripts } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', jobId)
      .limit(1)
      .single();

    const transcriptData = {
      full_transcript: result.transcript,
      deepgram_raw_json: JSON.stringify(result.rawResponse),
      words: result.words as any,
      utterances: result.utterances as any,
      flagged_segments: result.flaggedSegments as any,
      speaker_analysis: speakerAnalysis ? (JSON.stringify(speakerAnalysis) as any) : undefined,
      duration: result.metadata.duration,
      word_count: result.words.length,
      flagged_word_count: result.qualityReport.lowConfidenceCount + result.qualityReport.inaudibleCount,
      average_confidence: result.qualityReport.overallConfidence,
      speaker_count: new Set(result.utterances.map(u => u.speaker)).size,
      model_used: modelType,
      status: 'COMPLETED' as const,
    };

    let transcriptionId: string;
    if (existingTranscripts) {
      // Update existing transcript
      const { data: updated, error: updateError } = await supabase
        .from('transcriptions')
        .update(transcriptData)
        .eq('id', existingTranscripts.id)
        .select('id')
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to update transcription: ${updateError?.message || 'Unknown error'}`);
      }

      transcriptionId = updated.id;
    } else {
      // Create new transcript
      const { data: newTranscript, error: insertError } = await supabase
        .from('transcriptions')
        .insert({
          ...transcriptData,
          job_id: jobId,
          version: 1,
        })
        .select('id')
        .single();

      if (insertError || !newTranscript) {
        throw new Error(`Failed to create transcription: ${insertError?.message || 'Unknown error'}`);
      }

      transcriptionId = newTranscript.id;
    }

    // TODO: Re-implement confidence statistics persistence - lib/services/confidence-analysis-service was deleted
    // Persist confidence statistics (Phase 2.4: Pipeline Orchestration)
    // try {
    //   const { persistConfidenceStats } = await import('@/lib/services/confidence-analysis-service');
    //   const wordData = result.words.map((w: any) => ({
    //     word: w.word || '',
    //     confidence: w.confidence || 0,
    //     speaker: w.speaker,
    //     start: w.start || 0,
    //     end: w.end || 0,
    //   }));
    //   await persistConfidenceStats(jobId, transcriptionId, wordData);
    //   logger.info(`Confidence stats persisted for job ${jobId}`, { jobId, transcriptionId });
    // } catch (statsError) {
    //   logger.error(
    //     `Failed to persist confidence stats for job ${jobId}`,
    //     statsError instanceof Error ? statsError : new Error(String(statsError)),
    //     { jobId }
    //   );
    //   // Don't fail the transcription if stats persistence fails
    // }

    // Update job status based on quality
    const processingTime = Date.now() - startTime;
    const finalStatus = result.qualityReport.needsReview ? 'AI_REVIEWING' : 'READY_FOR_EDIT';
    await supabase
      .from('jobs')
      .update({
        status: finalStatus,
        transcription_completed_at: new Date().toISOString(),
        processing_completed_at: new Date().toISOString(),
        transcription_duration_ms: processingTime,
        audio_duration_seconds: result.metadata.duration,
        job_attempts: (job as { attemptsMade?: number }).attemptsMade || 1,
      })
      .eq('id', jobId);

    logger.info(`Job ${jobId} transcription completed successfully (status: ${finalStatus})`, { jobId, finalStatus });

    // Create audit log for successful transcription
    try {
      const { audit } = await import('@/lib/audit');
      await audit.transcriptionCompleted(transcriptionId, {
        jobId,
        wordCount: result.words.length,
        flaggedCount: result.flaggedSegments.length,
        durationMs: processingTime,
        model: modelType,
      });
    } catch (auditError) {
      logger.warn(`Failed to audit log transcription completion for job ${jobId}`, {
        error: auditError instanceof Error ? auditError.message : String(auditError),
        jobId
      });
      // Don't fail the transcription if audit logging fails
    }

  } catch (error) {
    logger.error(
      `❌ Transcription failed for job ${jobId}`,
      error instanceof Error ? error : new Error(String(error)),
      { jobId }
    );

    // Update job status to FAILED (not CANCELLED - this is a real failure)
    try {
      const supabase = await createSupabaseServerClient();
      const attemptsMade = (job as { attemptsMade?: number }).attemptsMade || 0;

      await supabase
        .from('jobs')
        .update({
          status: 'CANCELLED',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          last_error_code: 'TRANSCRIPTION_FAILED',
          last_error_message: error instanceof Error ? error.message : 'Unknown error',
          job_attempts: attemptsMade + 1,
        })
        .eq('id', jobId);

      // Create audit log for failed transcription
      try {
        const { audit } = await import('@/lib/audit');
        await audit.transcriptionFailed(jobId, {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: attemptsMade + 1,
        });
      } catch (auditError) {
        logger.warn(`Failed to audit log transcription failure for job ${jobId}`, {
          error: auditError instanceof Error ? auditError.message : String(auditError),
          jobId
        });
      }
    } catch (updateError) {
      logger.error(
        'Failed to update job status',
        updateError instanceof Error ? updateError : new Error(String(updateError)),
        { jobId }
      );
    }

    // Re-throw to ensure error is logged
    throw error;
  }
}
