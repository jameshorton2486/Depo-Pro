// ═══════════════════════════════════════════════════════════════
// TRANSCRIPTION QUERY FUNCTIONS
// lib/supabase/queries/transcription.ts
// ═══════════════════════════════════════════════════════════════
// All database access for transcription-related routes goes here.
// NOTE: This module is currently focused on the /api/transcribe/start route.

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface TranscriptionJob {
  id: string;
  created_by_id: string;
}

/**
 * Fetch a job for transcription start, scoped to minimal fields needed
 * for access checks. Returns null if the job does not exist or if any
 * error occurs while fetching it.
 */
export async function getJobForTranscription(
  jobId: string,
): Promise<TranscriptionJob | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('Job')
    .select('id, created_by_id')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    // The route currently treats both "not found" and "error" as 404,
    // so we deliberately collapse both cases to `null` here.
    return null;
  }

  return data as TranscriptionJob;
}

/**
 * Mark a job as having files uploaded as part of starting transcription.
 * This mirrors the existing route behavior, which did not surface Supabase
 * errors to the caller.
 */
export async function markJobFilesUploaded(jobId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await supabase
    .from('Job')
    .update({
      status: 'FILES_UPLOADED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

