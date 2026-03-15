// lib/transcription/pipeline.ts

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { validateAudio } from './validate';
import { chunkAudio, cleanupChunks, DEFAULT_CHUNKING_CONFIG } from './chunking';
import { transcribeAudio, toPipelineFormat } from '@/lib/transcription';
import { reassembleChunks } from './reassemble';
import {
  normalizeAudioForTranscription,
  needsNormalization,
  cleanupPreprocessedFile,
  scoreAudioQuality,
  AGGRESSIVE_NORMALIZATION_CONFIG,
} from './preprocessor';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureError } from '@/lib/error-capture';
import { calculateConfidenceAnalytics } from '@/lib/services/confidence-analytics';
import { calculateRiskScore, extractRiskInputs } from '@/lib/services/risk-score';
import { postProcessSegments } from '@/src/lib/transcription/post-process';
import {
  DEFAULT_PROCESSING_RULES,
  type TranscriptSegment,
} from '@/src/types/transcript-format';
import { buildKeywordsForJob } from './buildKeywords';
import { hydrateWords } from './hydrateWords';
import { formatTranscriptWithAdmin } from './formatter';

import type {
  AudioChunk,
  DeepgramResult,
  ProcessedChunk,
  TranscriptionPipelineStatus,
} from '@/types/transcription';

/**
 * Process a transcription job end-to-end.
 *
 * Pipeline stages:
 *  1. VALIDATING    — Download audio, validate format/duration
 *  2. CHUNKING      — Split long audio into 30-min chunks (if needed)
 *  3. TRANSCRIBING  — Send each chunk to Deepgram Nova-3
 *  4. REASSEMBLING  — Merge chunks, deduplicate overlaps
 *  5. EXTRACTING_FLAGS — Identify low-confidence words
 *  6. COMPLETE      — Update job status to AI_COMPLETE
 *
 * Each stage updates the transcription record status.
 * On failure at any stage, sets PIPELINE_FAILED and logs the error.
 * The pipeline is RESUMABLE: completed chunks are skipped on restart.
 */
export async function processTranscriptionJob(
  jobId: string,
  audioFileUrl: string
): Promise<void> {
  let tempDir: string | null = null;
  let audioFilePath: string | null = null;
  let normalizedPath: string | null = null;
  let chunks: AudioChunk[] = [];

  try {
    // --- STAGE 1: VALIDATING ---
    await updateTranscriptionStatus(jobId, 'VALIDATING', 0);

    // Download audio from Supabase Storage to temp file
    tempDir = path.join(os.tmpdir(), `depo-pipeline-${jobId}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    audioFilePath = await downloadAudioFromStorage(audioFileUrl, tempDir);

    // Validate the audio file
    const validation = await validateAudio(audioFilePath);
    if (!validation.valid) {
      throw new Error(`Audio validation failed: ${validation.error}`);
    }

    console.warn(`Audio validated: ${validation.duration}s, ${validation.format}, ${validation.channels} channels`);
    if (validation.warning) {
      console.warn(`[pipeline] Audio warning for job ${jobId}: ${validation.warning}`);
    }

    // --- STAGE 1b: QUALITY SCORING ---
    const qualityScore = await scoreAudioQuality(audioFilePath);
    console.warn(`[pipeline] Audio quality: ${qualityScore.score}/100 (${qualityScore.tier})`);

    if (qualityScore.issues.length > 0) {
      console.warn(`[pipeline] Quality issues: ${qualityScore.issues.join('; ')}`);
    }

    // Store quality score in transcription metadata
    await updateTranscriptionMetadata(jobId, {
      audio_quality_score: qualityScore.score,
      audio_quality_tier: qualityScore.tier,
      audio_quality_issues: qualityScore.issues,
    });

    // Abort if UNUSABLE
    if (qualityScore.tier === 'UNUSABLE') {
      throw new Error(
        `Audio quality is too low to transcribe (score: ${qualityScore.score}/100). ` +
        `Issues: ${qualityScore.issues.join(', ')}. ` +
        'Please run the manual enhancement script (scripts/audio/enhance.py) and re-upload.'
      );
    }

    // --- STAGE 1c: NORMALIZING ---
    // Normalize ALL audio to 16kHz mono WAV for optimal Deepgram accuracy.
    // For video files, this also extracts the audio track in the same pass.
    // Auto-select aggressive config for POOR quality audio.
    const normConfig = qualityScore.tier === 'POOR' ? AGGRESSIVE_NORMALIZATION_CONFIG : {};
    const shouldNormalize = qualityScore.tier === 'POOR' || await needsNormalization(audioFilePath);

    if (shouldNormalize) {
      const configLabel = qualityScore.tier === 'POOR' ? 'AGGRESSIVE' : 'DEFAULT';
      console.warn(`Normalizing audio (${configLabel} config) to 16kHz mono WAV...`);
      const preprocessResult = await normalizeAudioForTranscription(audioFilePath, normConfig);
      normalizedPath = preprocessResult.outputPath;
      audioFilePath = normalizedPath;
      console.warn(`[pipeline] Audio enhanced in ${preprocessResult.processingTimeMs}ms`);
    } else {
      console.warn('Audio already in optimal format, skipping normalization');
    }

    // Update job with audio metadata
    await updateJobAudioMetadata(jobId, {
      audio_duration_seconds: validation.duration,
      audio_format: validation.format,
    });

    // --- STAGE 2: CHUNKING (if duration > 30 minutes) ---
    const CHUNK_THRESHOLD = 1800; // 30 minutes

    if (validation.duration > CHUNK_THRESHOLD) {
      await updateTranscriptionStatus(jobId, 'CHUNKING', 5);
      chunks = await chunkAudio(audioFilePath, DEFAULT_CHUNKING_CONFIG);
      await createChunkRecords(jobId, chunks);
      console.warn(`Audio chunked into ${chunks.length} pieces`);
    } else {
      // Single file — treat as one "chunk"
      chunks = [{
        index: 0,
        filePath: audioFilePath,
        startSeconds: 0,
        endSeconds: validation.duration,
        overlapSeconds: 0,
        durationSeconds: validation.duration,
      }];
      console.warn('Audio fits in single chunk');
    }

    const totalChunks = chunks.length;

    // --- STAGE 3: TRANSCRIBING ---
    await updateTranscriptionStatus(jobId, 'TRANSCRIBING', 10);

    // Get vocabulary keywords for this job
    const keywords = await buildKeywordsForJob(jobId);

    const processedChunks: ProcessedChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      console.warn(`Processing chunk ${i + 1}/${totalChunks}...`);

      // RESUMABILITY CHECK: skip already-completed chunks
      const existingResult = await getChunkResult(jobId, i);
      if (existingResult) {
        console.warn(`  Chunk ${i}/${totalChunks} already complete, skipping`);
        processedChunks.push({
          index: i,
          result: existingResult,
          audioStartSeconds: chunk.startSeconds,
          overlapSeconds: chunk.overlapSeconds,
        });
        continue;
      }

      try {
        // Read chunk audio into buffer
        const audioBuffer = fs.readFileSync(chunk.filePath);

        // Transcribe via Deepgram (lib/transcription.ts)
        const transcriptionResult = await transcribeAudio(audioBuffer, {
          customKeyterms: keywords.map((keyword) => keyword.word),
        });
        const result = toPipelineFormat(transcriptionResult);

        // Store chunk result in database
        await storeChunkResult(jobId, i, result);

        processedChunks.push({
          index: i,
          result,
          audioStartSeconds: chunk.startSeconds,
          overlapSeconds: chunk.overlapSeconds,
        });

        // Update progress — chunkProgress is 0-100 per-chunk, overall maps to 10-70%
        const chunkProgress = Math.round(((i + 1) / totalChunks) * 100);
        const progress = 10 + Math.round(((i + 1) / totalChunks) * 60); // 10-70%
        console.warn(`[pipeline] Job ${jobId}: Chunk ${i + 1}/${totalChunks} complete (${chunkProgress}%)`);
        await updateTranscriptionStatus(jobId, 'TRANSCRIBING', progress, i + 1, totalChunks);

      } catch (chunkError: any) {
        // Classify Deepgram errors for specific user-facing messages
        const msg: string = chunkError.message || '';
        let userMessage: string;

        if (
          chunkError.name === 'AbortError' ||
          msg.includes('ECONNRESET') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('network') ||
          msg.includes('fetch failed') ||
          msg.includes('socket hang up')
        ) {
          userMessage = 'Transcription service temporarily unavailable. Your audio file is saved — please try again in a few minutes.';
        } else if (
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('Unauthorized') ||
          msg.includes('Forbidden')
        ) {
          userMessage = 'Transcription service authentication failed. Please contact support.';
        } else if (
          msg.includes('429') ||
          msg.includes('rate limit') ||
          msg.includes('Too Many Requests')
        ) {
          userMessage = 'Transcription service rate limit reached. Please wait a few minutes and try again.';
        } else {
          userMessage = `Transcription failed: ${msg}`;
        }

        captureError(chunkError, {
          route: 'pipeline/transcribeAudio',
          jobId,
          metadata: { chunkIndex: i, totalChunks },
        });
        console.error(`[pipeline] Chunk ${i} failed:`, msg);
        await logProcessingError(jobId, `Chunk ${i} failed: ${msg}`);

        throw new Error(userMessage);
      }
    }

    // --- STAGE 4: REASSEMBLING ---
    await updateTranscriptionStatus(jobId, 'REASSEMBLING', 75);

    let finalResult: {
      words: any[];
      segments: any[];
      speakers: any[];
      fullTranscript: string;
      rawJson?: any;
    };

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
        rawJson: processedChunks.map(c => c.result.rawJson), // store all chunk responses
      };
    }

    console.warn(`Reassembly complete: ${finalResult.words.length} words total`);

    // --- STAGE 4.5: POST-PROCESSING ---
    // Apply text cleanup rules while preserving original transcript verbatim.
    const rawSegments: TranscriptSegment[] = (finalResult.segments || []).map((seg: any) => ({
      speakerId: `Speaker ${seg.speaker ?? 0}`,
      text: seg.text ?? '',
      startTime: typeof seg.start === 'number' ? seg.start : undefined,
      endTime: typeof seg.end === 'number' ? seg.end : undefined,
    }));

    const processedSegments = postProcessSegments(
      rawSegments,
      DEFAULT_PROCESSING_RULES,
      2,
    );

    const processedTranscript = processedSegments
      .map((seg) => seg.text)
      .join(' ')
      .trim();

    // Compute integrity hash of original transcript
    const integrityHash = createHash('sha256')
      .update(finalResult.fullTranscript)
      .digest('hex');

    // Store final transcription in database
    await storeTranscriptionResult(jobId, {
      deepgram_raw_json: finalResult.rawJson,
      original_transcript: finalResult.fullTranscript,
      full_transcript: processedTranscript || finalResult.fullTranscript,
      original_integrity_hash: integrityHash,
      words: finalResult.words,
      segments: finalResult.segments,
      speakers: finalResult.speakers,
    });

    // --- STAGE 5: EXTRACTING FLAGS ---
    await updateTranscriptionStatus(jobId, 'EXTRACTING_FLAGS', 85);

    // Extract flagged (low-confidence) words
    await extractFlaggedWords(jobId, finalResult.words, 0.85);

    // Calculate and store confidence analytics (Feature Deep Dive Enhancement 1.2 & 1.3)
    await calculateAndStoreAnalytics(jobId, {
      words: finalResult.words,
      segments: finalResult.segments,
    });

    // --- STAGE 5.5: HYDRATE transcript_words + FORMAT ---
    const supabase = createAdminClient();
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', jobId)
      .single();
    const { data: job } = transcription
      ? await supabase.from('jobs').select('firm_id').eq('id', jobId).single()
      : { data: null };

    if (transcription?.id && job?.firm_id) {
      try {
        await hydrateWords(transcription.id, job.firm_id, finalResult.words);
        await formatTranscriptWithAdmin(transcription.id);
        console.warn(`Formatter pipeline complete for transcription ${transcription.id}`);
      } catch (formatErr: any) {
        console.error(`Formatter failed (non-fatal): ${formatErr.message}`);
      }
    }

    // --- STAGE 6: COMPLETE ---
    await updateTranscriptionStatus(jobId, 'COMPLETE', 100);

    // Update job status to AI_COMPLETE
    await updateJobStatus(jobId, 'AI_COMPLETE');

    // Log audit event
    await logAuditEvent(jobId, 'TRANSCRIPTION_COMPLETED');

    console.warn(`Pipeline complete for job ${jobId}`);

  } catch (error: any) {
    console.error(`Pipeline failed for job ${jobId}:`, error.message);

    // Set failure status
    await updateTranscriptionStatus(jobId, 'PIPELINE_FAILED', 0, null, null, error.message);
    await updateJobStatus(jobId, 'FAILED');
    await logProcessingError(jobId, error.message);

  } finally {
    // ALWAYS clean up temp files
    if (chunks.length > 0) {
      try {
        await cleanupChunks(chunks);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

    // Clean up normalized audio file
    if (normalizedPath) {
      try {
        cleanupPreprocessedFile(normalizedPath);
      } catch { /* ignore cleanup errors */ }
    }

    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch { /* ignore cleanup errors */ }
    }
  }
}

// === Helper Functions ===

async function downloadAudioFromStorage(audioFileUrl: string, tempDir: string): Promise<string> {
  const supabase = createAdminClient();

  try {
    // Extract storage path from URL
    // audioFileUrl format: https://{project}.supabase.co/storage/v1/object/public/depo-audio/{path}
    // OR just the path: depo-audio/{path}
    let storagePath: string;

    if (audioFileUrl.includes('supabase.co/storage')) {
      const urlParts = audioFileUrl.split('/depo-audio/');
      storagePath = urlParts[1] || audioFileUrl;
    } else if (audioFileUrl.startsWith('depo-audio/')) {
      storagePath = audioFileUrl.replace('depo-audio/', '');
    } else {
      storagePath = audioFileUrl;
    }

    console.warn(`Downloading audio from storage: ${storagePath}`);

    const { data, error } = await supabase.storage
      .from('depo-audio')
      .download(storagePath);

    if (error) {
      throw new Error(`Storage download error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from storage');
    }

    // Convert Blob to Buffer
    const buffer = Buffer.from(await data.arrayBuffer());

    // Determine file extension from path
    const ext = path.extname(storagePath) || '.mp3';
    const outputPath = path.join(tempDir, `audio-original${ext}`);

    // Write to temp file
    fs.writeFileSync(outputPath, buffer);

    console.warn(`Audio downloaded: ${outputPath} (${buffer.length} bytes)`);

    return outputPath;
  } catch (error: any) {
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

async function updateTranscriptionStatus(
  jobId: string,
  status: TranscriptionPipelineStatus,
  progress: number,
  _currentChunk: number | null = null,
  _totalChunks: number | null = null,
  _error: string | null = null
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // First, get or create transcription record
    const { data: existing } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (existing) {
      // Update existing
      await supabase
        .from('transcriptions')
        .update({
          status: status as any,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId);
    } else {
      // Create new transcription record
      await supabase
        .from('transcriptions')
        .insert({
          job_id: jobId,
          status: status as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    console.warn(`  Status: ${status} (${progress}%)`);
  } catch (error: any) {
    console.error('Failed to update transcription status:', error.message);
  }
}

async function updateJobAudioMetadata(
  jobId: string,
  metadata: { audio_duration_seconds: number; audio_format: string }
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('jobs')
    .update({
      audio_duration_seconds: metadata.audio_duration_seconds,
      audio_format: metadata.audio_format as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

async function createChunkRecords(jobId: string, chunks: AudioChunk[]): Promise<void> {
  const supabase = createAdminClient();

  // Get transcription ID
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (!transcription) {
    throw new Error('Transcription record not found');
  }

  const transcriptionId = transcription.id;

  // Insert chunk records
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

  console.warn(`Created ${chunkRecords.length} chunk records`);
}

async function getChunkResult(jobId: string, chunkIndex: number): Promise<DeepgramResult | null> {
  const supabase = createAdminClient();

  try {
    // Get transcription ID
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (!transcription) {
      return null;
    }

    // Get chunk record
    const { data: chunk } = await supabase
      .from('transcription_chunks')
      .select('*')
      .eq('transcription_id', transcription.id)
      .eq('chunk_index', chunkIndex)
      .eq('status', 'COMPLETE')
      .single();

    if (!chunk || !chunk.deepgram_response) {
      return null;
    }

    // Reconstruct DeepgramResult from stored response
    const rawJson = chunk.deepgram_response as any;
    return rawJson as DeepgramResult;
  } catch {
    return null;
  }
}

async function storeChunkResult(jobId: string, chunkIndex: number, result: DeepgramResult): Promise<void> {
  const supabase = createAdminClient();

  // Get transcription ID
  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (!transcription) {
    throw new Error('Transcription record not found');
  }

  // Update chunk record
  await supabase
    .from('transcription_chunks')
    .update({
      deepgram_response: result as any,
      word_count: result.words.length,
      status: 'COMPLETE' as any,
      updated_at: new Date().toISOString(),
    })
    .eq('transcription_id', transcription.id)
    .eq('chunk_index', chunkIndex);
}


async function storeTranscriptionResult(jobId: string, data: {
  deepgram_raw_json: any;
  original_transcript: string;
  full_transcript: string;
  original_integrity_hash: string;
  words: any[];
  segments: any[];
  speakers: any[];
}): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('transcriptions')
    .update({
      deepgram_raw_json: data.deepgram_raw_json as any,
      original_transcript: data.original_transcript,
      full_transcript: data.full_transcript,
      original_integrity_hash: data.original_integrity_hash,
      current_integrity_hash: data.original_integrity_hash,
      words: data.words as any,
      segments: data.segments as any,
      speakers: data.speakers as any,
      total_word_count: data.words.length,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId);
}

async function extractFlaggedWords(
  jobId: string,
  words: any[],
  confidenceThreshold: number
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Get transcription ID
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (!transcription) {
      throw new Error('Transcription not found');
    }

    // Try calling extract_flagged_words SQL function
    const { error } = await supabase.rpc('extract_flagged_words', {
      p_transcription_id: transcription.id,
      p_threshold: confidenceThreshold,
    });

    if (error) {
      console.error('extract_flagged_words RPC error:', error.message);
      // Fall back to manual extraction
      await extractFlaggedWordsManually(transcription.id, words, confidenceThreshold);
    } else {
      console.warn('Flagged words extracted via SQL function');
    }
  } catch (error: any) {
    console.error('Failed to extract flagged words:', error.message);
    // Don't throw — this is not critical enough to fail the pipeline
  }
}

async function extractFlaggedWordsManually(
  transcriptionId: string,
  words: any[],
  confidenceThreshold: number
): Promise<void> {
  const supabase = createAdminClient();

  const flaggedWords = words.filter(w => w.confidence < confidenceThreshold);

  if (flaggedWords.length === 0) {
    console.warn('No flagged words found');
    return;
  }

  console.warn(`Extracting ${flaggedWords.length} flagged words manually...`);

  const records = flaggedWords.map((word, idx) => {
    // Get context (5 words before and after)
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
      segment_index: null,
      original_word: word.word,
      confidence: word.confidence,
      start_time: word.start,
      end_time: word.end,
      speaker: word.speaker,
      context_before: contextBefore,
      context_after: contextAfter,
      alternatives: null,
      status: 'PENDING' as any,
      sort_order: idx,
    };
  });

  // Insert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    await supabase.from('flagged_words').insert(batch);
  }

  console.warn(`Inserted ${records.length} flagged words`);
}

async function updateJobStatus(jobId: string, status: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('jobs')
    .update({
      status: status as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

async function logProcessingError(jobId: string, errorMessage: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Try calling SQL function
    await supabase.rpc('log_processing_error', {
      p_job_id: jobId,
      p_error_type: 'TRANSCRIPTION_ERROR',
      p_error_message: errorMessage,
    });
  } catch {
    // Fall back to direct insert
    await supabase.from('processing_errors').insert({
      job_id: jobId,
      error_type: 'TRANSCRIPTION_ERROR' as any,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
  }
}

async function logAuditEvent(jobId: string, action: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Get job to find user IDs
    const { data: job } = await supabase
      .from('jobs')
      .select('reporter_id')
      .eq('id', jobId)
      .single();

    if (!job) {
      return;
    }

    await supabase.from('audit_log').insert({
      action: action as any,
      actor_id: job.reporter_id,
      target_id: jobId,
      target_type: 'job',
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to log audit event:', error.message);
  }
}

/**
 * Update transcription metadata (audio quality, etc.)
 * Merges with existing metadata to avoid overwriting.
 */
async function updateTranscriptionMetadata(
  jobId: string,
  newMetadata: Record<string, any>
): Promise<void> {
  const supabase = createAdminClient();

  try {
    const { data: existing } = await supabase
      .from('transcriptions')
      .select('metadata')
      .eq('job_id', jobId)
      .single();

    const merged = { ...(existing?.metadata as Record<string, any> || {}), ...newMetadata };

    await supabase
      .from('transcriptions')
      .update({
        metadata: merged as any,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);
  } catch (error: any) {
    console.error('Failed to update transcription metadata:', error.message);
  }
}

/**
 * Calculate and store confidence analytics and risk score
 * Feature Deep Dive v2: Enhancement 1.2 & 1.3
 */
async function calculateAndStoreAnalytics(
  jobId: string,
  data: {
    words: any[];
    segments: any[];
  }
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Get transcription with flagged word count
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id, total_word_count, flagged_word_count, words, segments')
      .eq('job_id', jobId)
      .single();

    if (!transcription) {
      console.error('Transcription not found for analytics calculation');
      return;
    }

    // Get flagged words for category breakdown
    const { data: flaggedWords } = await supabase
      .from('flagged_words')
      .select('original_word, corrected_word')
      .eq('transcription_id', transcription.id);

    // Calculate confidence analytics
    const analytics = calculateConfidenceAnalytics({
      words: data.words,
      flagged_words: flaggedWords || [],
      word_count: transcription.total_word_count,
      flagged_word_count: transcription.flagged_word_count,
    });

    // Extract risk inputs and calculate risk score
    const riskInputs = extractRiskInputs({
      word_count: transcription.total_word_count,
      flagged_word_count: transcription.flagged_word_count,
      words: data.words,
      segments: data.segments,
    });

    const riskScore = calculateRiskScore(riskInputs);

    // Store in metadata column
    await supabase
      .from('transcriptions')
      .update({
        metadata: {
          confidence_analytics: analytics,
          risk_score_result: riskScore,
        } as any,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);

    console.warn(`Analytics stored: Risk Score = ${riskScore.score} (${riskScore.label}), Flagged = ${analytics.flagged_percentage}%`);
  } catch (error: any) {
    console.error('Failed to calculate analytics:', error.message);
    // Don't throw — this is not critical enough to fail the pipeline
  }
}
