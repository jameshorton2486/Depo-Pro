/**
 * Transcription start helpers — re-export and bridge for /api/transcribe/start
 * Uses v1.3 jobs table (not Prisma/Job).
 */

import { createClient } from '@/lib/supabase/server';

export interface TranscriptionJob {
  id: string;
  created_by_id: string;
}

/**
 * Fetch a job for transcription start (access checks).
 */
export async function getJobForTranscription(jobId: string): Promise<TranscriptionJob | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('id, created_by_id')
    .eq('id', jobId)
    .single();
  if (error || !data) return null;
  return data as TranscriptionJob;
}

/**
 * Mark job as FILES_UPLOADED when starting transcription.
 */
export async function markJobFilesUploaded(jobId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('jobs')
    .update({ status: 'FILES_UPLOADED', updated_at: new Date().toISOString() })
    .eq('id', jobId);
}
