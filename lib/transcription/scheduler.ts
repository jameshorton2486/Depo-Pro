// lib/transcription/scheduler.ts

import { createAdminClient } from '@/lib/supabase/admin';
import { validateAudio, extractAudioFromVideo } from './validate';
import { chunkAudio, DEFAULT_CHUNKING_CONFIG } from './chunking';
import { transcribeFile, toPipelineFormat } from '@/lib/transcription';
import { reassembleChunks } from './reassemble';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { createHash } from 'crypto';

import type {
  AudioChunk,
  ProcessedChunk,
  DeepgramResult,
} from '@/types/transcription';
import { buildKeywordsForJob } from './buildKeywords';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;

function buildInternalHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (INTERNAL_API_SECRET) {
    headers.authorization = `Bearer ${INTERNAL_API_SECRET}`;
  }
  return headers;
}

/**
 * Serverless-friendly transcription scheduling.
 *
 * Instead of running the full pipeline in one function call,
 * this breaks processing into individual chunk operations that
 * each complete within Vercel's timeout limits.
 *
 * Pattern: Chain of API calls
 *  POST /api/jobs/[id]/transcribe → starts pipeline, creates chunk records
 *  POST /api/jobs/[id]/transcribe/process-chunk → processes one chunk at a time
 *
 * At the end of each chunk, trigger the next chunk via internal fetch.
 * If a chunk fails, the chain stops. Resume by calling process-chunk
 * for the first incomplete chunk.
 */

/**
 * Start the transcription pipeline.
 * Handles validation, chunking, and kicks off the first chunk.
 * Should complete well within 60s.
 */
export async function startTranscriptionPipeline(
  jobId: string,
  audioFileUrl: string,
  baseUrl: string  // e.g., process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com')
): Promise<{ transcriptionId: string; totalChunks: number }> {
  const supabase = createAdminClient();

  const tempDir = path.join(os.tmpdir(), `depo-pipeline-start-${jobId}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Update status to VALIDATING
    await updateTranscriptionStatus(jobId, 'VALIDATING');

    // Download and validate audio (quick — just metadata check)
    const audioPath = await downloadAudioFromStorage(audioFileUrl, tempDir);
    const validation = await validateAudio(audioPath);

    if (!validation.valid) {
      throw new Error(`Audio validation failed: ${validation.error}`);
    }

    // If video, extract audio (this might take a bit but should be < 60s for validation)
    let finalAudioPath = audioPath;
    const videoFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    if (videoFormats.includes(validation.format.toLowerCase())) {
      finalAudioPath = await extractAudioFromVideo(audioPath);
    }

    // Update job audio metadata
    await supabase
      .from('jobs')
      .update({
        audio_duration_seconds: validation.duration,
        audio_format: validation.format as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Determine if chunking is needed
    const CHUNK_THRESHOLD = 1800; // 30 minutes
    let chunks: AudioChunk[] = [];

    if (validation.duration > CHUNK_THRESHOLD) {
      await updateTranscriptionStatus(jobId, 'CHUNKING');
      chunks = await chunkAudio(finalAudioPath, DEFAULT_CHUNKING_CONFIG);
    } else {
      chunks = [{
        index: 0,
        filePath: finalAudioPath,
        startSeconds: 0,
        endSeconds: validation.duration,
        overlapSeconds: 0,
        durationSeconds: validation.duration,
      }];
    }

    // Create or get transcription record
    const { data: existing } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', jobId)
      .single();

    let transcriptionId: string;

    if (existing) {
      transcriptionId = existing.id;
    } else {
      const { data: newTranscription, error } = await supabase
        .from('transcriptions')
        .insert({
          job_id: jobId,
          status: 'CHUNKING' as any,
          chunk_count: chunks.length,
          chunking_config: DEFAULT_CHUNKING_CONFIG as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error || !newTranscription) {
        throw new Error(`Failed to create transcription record: ${error?.message}`);
      }

      transcriptionId = newTranscription.id;
    }

    // Create chunk records
    if (chunks.length > 1) {
      const chunkRecords = chunks.map(chunk => ({
        transcription_id: transcriptionId,
        chunk_index: chunk.index,
        audio_start_seconds: chunk.startSeconds,
        audio_end_seconds: chunk.endSeconds,
        overlap_seconds: chunk.overlapSeconds,
        duration_seconds: chunk.durationSeconds,
        status: 'PENDING' as any,
      }));

      await supabase
        .from('transcription_chunks')
        .insert(chunkRecords);
    }

    // Update status to TRANSCRIBING
    await updateTranscriptionStatus(jobId, 'TRANSCRIBING');

    // Trigger first chunk processing (fire and forget)
    setImmediate(() => {
      fetch(`${baseUrl}/api/jobs/${jobId}/transcribe/process-chunk`, {
        method: 'POST',
        headers: buildInternalHeaders(),
        body: JSON.stringify({ chunkIndex: 0 }),
      }).catch(err => {
        console.error('Failed to trigger first chunk:', err.message);
      });
    });

    return { transcriptionId, totalChunks: chunks.length };
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  }
}

/**
 * Process a single chunk. Called by the process-chunk API route.
 * After completing, triggers the next chunk (or finishes pipeline).
 */
export async function processChunk(
  jobId: string,
  chunkIndex: number,
  baseUrl: string
): Promise<{ completed: boolean; nextChunkIndex: number | null }> {
  const supabase = createAdminClient();

  try {
    // Get transcription ID
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id, chunk_count')
      .eq('job_id', jobId)
      .single();

    if (!transcription) {
      throw new Error('Transcription not found');
    }

    const transcriptionId = transcription.id;
    const totalChunks = transcription.chunk_count || 1;

    // Get chunk record
    const { data: chunkRecord } = await supabase
      .from('transcription_chunks')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .eq('chunk_index', chunkIndex)
      .single();

    // If already complete, skip to next
    if (chunkRecord?.status === 'COMPLETE') {
      console.warn(`Chunk ${chunkIndex} already complete`);
      if (chunkIndex + 1 < totalChunks) {
        return { completed: false, nextChunkIndex: chunkIndex + 1 };
      } else {
        return await finalizePipeline(jobId, baseUrl);
      }
    }

    // Get job info
    const { data: job } = await supabase
      .from('jobs')
      .select('audio_file_url, firm_id')
      .eq('id', jobId)
      .single();

    if (!job || !job.audio_file_url) {
      throw new Error('Job or audio file URL not found');
    }

    // Download audio
    const tempDir = path.join(os.tmpdir(), `depo-chunk-${jobId}-${chunkIndex}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const audioPath = await downloadAudioFromStorage(job.audio_file_url, tempDir);

      // Get vocabulary keywords
      const keywords = await buildKeywordsForJob(jobId);

      // Transcribe via lib/transcription.ts
      const transcriptionResult = await transcribeFile(audioPath, {
        customKeyterms: keywords.map((keyword) => keyword.word),
      });
      const result = toPipelineFormat(transcriptionResult);

      // Store result
      await supabase
        .from('transcription_chunks')
        .update({
          deepgram_response: result as any,
          word_count: result.words.length,
          status: 'COMPLETE' as any,
          updated_at: new Date().toISOString(),
        })
        .eq('transcription_id', transcriptionId)
        .eq('chunk_index', chunkIndex);

      console.warn(`Chunk ${chunkIndex}/${totalChunks} complete`);

      // If more chunks remain, trigger next
      if (chunkIndex + 1 < totalChunks) {
        setImmediate(() => {
          fetch(`${baseUrl}/api/jobs/${jobId}/transcribe/process-chunk`, {
            method: 'POST',
            headers: buildInternalHeaders(),
            body: JSON.stringify({ chunkIndex: chunkIndex + 1 }),
          }).catch(err => {
            console.error(`Failed to trigger chunk ${chunkIndex + 1}:`, err.message);
          });
        });

        return { completed: false, nextChunkIndex: chunkIndex + 1 };
      } else {
        // Last chunk — finalize
        return await finalizePipeline(jobId, baseUrl);
      }
    } finally {
      // Clean up temp files
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch { /* ignore */ }
      }
    }
  } catch (error: any) {
    console.error(`Chunk ${chunkIndex} processing error:`, error.message);

    // Log error
    await logProcessingError(jobId, `Chunk ${chunkIndex} failed: ${error.message}`);

    throw error;
  }
}

/**
 * Resume a failed pipeline. Finds first incomplete chunk and restarts.
 */
export async function resumePipeline(
  jobId: string,
  baseUrl: string
): Promise<{ resumedFromChunk: number }> {
  const supabase = createAdminClient();

  // Get transcription ID
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('id, chunk_count')
    .eq('job_id', jobId)
    .single();

  if (!transcription) {
    throw new Error('Transcription not found');
  }

  const totalChunks = transcription.chunk_count || 1;

  // Find first incomplete chunk
  let resumeIndex = 0;

  if (totalChunks > 1) {
    const { data: chunks } = await supabase
      .from('transcription_chunks')
      .select('chunk_index, status')
      .eq('transcription_id', transcription.id)
      .order('chunk_index', { ascending: true });

    if (chunks) {
      for (const chunk of chunks) {
        if (chunk.status !== 'COMPLETE') {
          resumeIndex = chunk.chunk_index;
          break;
        }
      }
    }
  }

  // Trigger processing from resume index
  setImmediate(() => {
    fetch(`${baseUrl}/api/jobs/${jobId}/transcribe/process-chunk`, {
      method: 'POST',
      headers: buildInternalHeaders(),
      body: JSON.stringify({ chunkIndex: resumeIndex }),
    }).catch(err => {
      console.error(`Failed to resume from chunk ${resumeIndex}:`, err.message);
    });
  });

  return { resumedFromChunk: resumeIndex };
}

// === Helper Functions ===

async function finalizePipeline(
  jobId: string,
  _baseUrl: string
): Promise<{ completed: boolean; nextChunkIndex: null }> {
  const supabase = createAdminClient();

  try {
    console.warn('All chunks complete, finalizing pipeline...');

    await updateTranscriptionStatus(jobId, 'REASSEMBLING');

    // Get transcription
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id, chunk_count')
      .eq('job_id', jobId)
      .single();

    if (!transcription) {
      throw new Error('Transcription not found');
    }

    const _totalChunks = transcription.chunk_count || 1;

    // Get all chunk results
    const { data: chunks } = await supabase
      .from('transcription_chunks')
      .select('*')
      .eq('transcription_id', transcription.id)
      .order('chunk_index', { ascending: true });

    if (!chunks || chunks.length === 0) {
      throw new Error('No chunk results found');
    }

    // Build processed chunks
    const processedChunks: ProcessedChunk[] = chunks.map(chunk => ({
      index: chunk.chunk_index,
      result: chunk.deepgram_response as DeepgramResult,
      audioStartSeconds: chunk.audio_start_seconds,
      overlapSeconds: chunk.overlap_seconds,
    }));

    // Reassemble
    let finalResult;
    if (processedChunks.length === 1) {
      finalResult = {
        ...processedChunks[0].result,
        rawJson: processedChunks[0].result.rawJson,
      };
    } else {
      const reassembled = await reassembleChunks(
        processedChunks,
        DEFAULT_CHUNKING_CONFIG.overlapSeconds
      );
      finalResult = {
        ...reassembled,
        rawJson: processedChunks.map(c => c.result.rawJson),
      };
    }

    // Compute integrity hash
    const integrityHash = createHash('sha256')
      .update(finalResult.fullTranscript)
      .digest('hex');

    // Store final result
    await supabase
      .from('transcriptions')
      .update({
        deepgram_raw_json: finalResult.rawJson as any,
        original_transcript: finalResult.fullTranscript,
        full_transcript: finalResult.fullTranscript,
        original_integrity_hash: integrityHash,
        current_integrity_hash: integrityHash,
        words: finalResult.words as any,
        segments: finalResult.segments as any,
        speakers: finalResult.speakers as any,
        total_word_count: finalResult.words.length,
        status: 'EXTRACTING_FLAGS' as any,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);

    // Extract flagged words
    await updateTranscriptionStatus(jobId, 'EXTRACTING_FLAGS');
    await extractFlaggedWords(transcription.id, finalResult.words, 0.85);

    // Mark complete
    await updateTranscriptionStatus(jobId, 'COMPLETE');

    await supabase
      .from('jobs')
      .update({
        status: 'AI_COMPLETE' as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.warn(`Pipeline complete for job ${jobId}`);

    return { completed: true, nextChunkIndex: null };
  } catch (error: any) {
    console.error('Pipeline finalization error:', error.message);

    await updateTranscriptionStatus(jobId, 'PIPELINE_FAILED');
    await logProcessingError(jobId, `Finalization failed: ${error.message}`);

    throw error;
  }
}

async function downloadAudioFromStorage(audioFileUrl: string, tempDir: string): Promise<string> {
  const supabase = createAdminClient();

  let storagePath: string;

  if (audioFileUrl.includes('supabase.co/storage')) {
    const urlParts = audioFileUrl.split('/depo-audio/');
    storagePath = urlParts[1] || audioFileUrl;
  } else if (audioFileUrl.startsWith('depo-audio/')) {
    storagePath = audioFileUrl.replace('depo-audio/', '');
  } else {
    storagePath = audioFileUrl;
  }

  const { data, error } = await supabase.storage
    .from('depo-audio')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Storage download error: ${error?.message}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const ext = path.extname(storagePath) || '.mp3';
  const outputPath = path.join(tempDir, `audio-original${ext}`);

  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

async function updateTranscriptionStatus(jobId: string, status: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('transcriptions')
    .update({
      status: status as any,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId);
}


async function extractFlaggedWords(
  transcriptionId: string,
  words: any[],
  threshold: number
): Promise<void> {
  const supabase = createAdminClient();

  try {
    await supabase.rpc('extract_flagged_words', {
      p_transcription_id: transcriptionId,
      p_threshold: threshold,
    });
  } catch {
    // Manual extraction fallback
    const flaggedWords = words.filter(w => w.confidence < threshold);

    if (flaggedWords.length === 0) return;

    const records = flaggedWords.map((word, idx) => {
      const wordIndex = words.indexOf(word);
      const contextBefore = words
        .slice(Math.max(0, wordIndex - 5), wordIndex)
        .map(w => w.word)
        .join(' ');
      const contextAfter = words
        .slice(wordIndex + 1, Math.min(words.length, wordIndex + 6))
        .map(w => w.word)
        .join(' ');

      return {
        transcription_id: transcriptionId,
        word_index: wordIndex,
        original_word: word.word,
        confidence: word.confidence,
        start_time: word.start,
        end_time: word.end,
        speaker: word.speaker,
        context_before: contextBefore,
        context_after: contextAfter,
        status: 'PENDING' as any,
        sort_order: idx,
      };
    });

    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      await supabase.from('flagged_words').insert(batch);
    }
  }
}

async function logProcessingError(jobId: string, errorMessage: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    await supabase.rpc('log_processing_error', {
      p_job_id: jobId,
      p_error_type: 'TRANSCRIPTION_ERROR',
      p_error_message: errorMessage,
    });
  } catch {
    await supabase.from('processing_errors').insert({
      job_id: jobId,
      error_type: 'TRANSCRIPTION_ERROR' as any,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
  }
}
