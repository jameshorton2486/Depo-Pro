/**
 * Transcription Query Layer for Depo-Pro v1.3
 *
 * Handles transcription records, words, segments, and status
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TranscriptionStatus } from '@/types/schema-enums';
import type { Database } from '@/types/supabase-generated';
import type {
  TranscriptionWord,
  TranscriptionSegment,
  SpeakerInfo,
  ChunkingConfig,
  DeepgramConfig,
} from '@/types/transcription';

type TranscriptionInsert = Database['public']['Tables']['transcriptions']['Insert'];
type TranscriptionUpdate = Database['public']['Tables']['transcriptions']['Update'];

/**
 * Get full transcription with all data
 */
export async function getTranscription(transcriptionId: string) {
  const supabase = await createClient();

  return await supabase
    .from('transcriptions')
    .select(`
      *,
      job:jobs(
        id,
        case_name,
        case_number,
        deposition_date,
        case_metadata
      )
    `)
    .eq('id', transcriptionId)
    .single();
}

/**
 * Get transcription status for progress tracking
 */
export async function getTranscriptionStatus(transcriptionId: string) {
  const supabase = await createClient();

  return await supabase
    .from('transcriptions')
    .select('id, status, progress, error_message, updated_at')
    .eq('id', transcriptionId)
    .single();
}

/**
 * Get transcription by job ID
 */
export async function getTranscriptionByJobId(jobId: string) {
  const supabase = await createClient();

  return await supabase
    .from('transcriptions')
    .select('*')
    .eq('job_id', jobId)
    .single();
}

/**
 * Create a new transcription record
 * Called when starting the transcription pipeline
 */
export async function createTranscription(data: {
  job_id: string;
  audio_url: string;
  source: 'BATCH_UPLOAD' | 'BATCH_MULTICHANNEL' | 'LIVE_STREAM';
  chunking_config?: ChunkingConfig;
  deepgram_config?: DeepgramConfig;
}) {
  const supabase = await createAdminClient();

  const chunking = data.chunking_config || {
    chunkDurationSeconds: 1800,
    overlapSeconds: 5,
    outputFormat: 'mp3' as const,
    outputBitrate: '128k' as const,
  };
  const deepgram = data.deepgram_config || {
    model: 'nova-3',
    language: 'en',
    punctuate: true,
    diarize: true,
    smart_format: true,
    paragraphs: true,
    utterances: true,
  };
  const transcriptionData: TranscriptionInsert = {
    job_id: data.job_id,
    source: data.source,
    status: TranscriptionStatus.AWAITING_AUDIO,
    chunking_config: chunking as unknown as import('@/types/supabase-generated').Json,
    deepgram_config: deepgram as unknown as import('@/types/supabase-generated').Json,
    created_at: new Date().toISOString(),
  };

  return await supabase
    .from('transcriptions')
    .insert(transcriptionData)
    .select()
    .single();
}

/**
 * Update transcription fields
 * Used during pipeline processing
 */
export async function updateTranscription(
  transcriptionId: string,
  updates: TranscriptionUpdate
) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcriptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transcriptionId)
    .select()
    .single();
}

/**
 * Update transcription status and progress
 * Called frequently during pipeline execution
 */
export async function updateTranscriptionStatus(
  transcriptionId: string,
  status: TranscriptionStatus,
  progress: number,
  errorMessage?: string
) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcriptions')
    .update({
      status,
      progress,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
      ...(status === TranscriptionStatus.COMPLETE && {
        completed_at: new Date().toISOString(),
      }),
    })
    .eq('id', transcriptionId)
    .select()
    .single();
}

/**
 * Update transcription words array
 * Called after reassembly
 */
export async function updateTranscriptionWords(
  transcriptionId: string,
  words: TranscriptionWord[]
) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcriptions')
    .update({
      words,
      word_count: words.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transcriptionId)
    .select()
    .single();
}

/**
 * Update transcription segments array
 * Called after reassembly
 */
export async function updateTranscriptionSegments(
  transcriptionId: string,
  segments: TranscriptionSegment[]
) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcriptions')
    .update({
      segments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transcriptionId)
    .select()
    .single();
}

/**
 * Update speaker information
 * Called after reassembly
 */
export async function updateTranscriptionSpeakers(
  transcriptionId: string,
  speakers: SpeakerInfo[]
) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcriptions')
    .update({
      speakers,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transcriptionId)
    .select()
    .single();
}

/**
 * Update full transcript text
 * Called after reassembly
 */
export async function updateTranscriptionFullText(
  transcriptionId: string,
  fullTranscript: string,
  durationSeconds: number
) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcriptions')
    .update({
      full_transcript: fullTranscript,
      duration_seconds: durationSeconds,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transcriptionId)
    .select()
    .single();
}

/**
 * Get transcription chunks for a transcription
 */
export async function getTranscriptionChunks(transcriptionId: string) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcription_chunks')
    .select('*')
    .eq('transcription_id', transcriptionId)
    .order('chunk_index', { ascending: true });
}

/**
 * Create a transcription chunk record
 */
export async function createTranscriptionChunk(data: {
  transcription_id: string;
  chunk_index: number;
  audio_start_seconds: number;
  audio_end_seconds: number;
  overlap_seconds: number;
}) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcription_chunks')
    .insert({
      ...data,
      status: 'PENDING',
      attempts: 0,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
}

/**
 * Update chunk with Deepgram response
 */
export async function updateTranscriptionChunk(
  chunkId: string,
  data: {
    deepgram_response?: any;
    word_count?: number;
    duration_seconds?: number;
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
    error_message?: string;
    processing_time_ms?: number;
  }
) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcription_chunks')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chunkId)
    .select()
    .single();
}

/**
 * Get failed chunks for retry
 */
export async function getFailedChunks(transcriptionId: string) {
  const supabase = await createAdminClient();

  return await supabase
    .from('transcription_chunks')
    .select('*')
    .eq('transcription_id', transcriptionId)
    .eq('status', 'FAILED')
    .lt('attempts', 3)
    .order('chunk_index', { ascending: true });
}

/**
 * Log processing error using RPC
 */
export async function logProcessingError(
  transcriptionId: string,
  stage: string,
  errorMessage: string,
  errorDetails?: any
) {
  const supabase = await createAdminClient();

  return await supabase.rpc('log_processing_error', {
    p_transcription_id: transcriptionId,
    p_stage: stage,
    p_error_message: errorMessage,
    p_error_details: errorDetails,
  });
}
