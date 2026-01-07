// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT QUERY FUNCTIONS
// lib/supabase/queries/transcripts.ts
// ═══════════════════════════════════════════════════════════════
// All database access for transcripts goes through these functions

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Get transcript with job details for export
 */
export async function getTranscriptForExport(
  supabase: SupabaseClient,
  transcriptId: string
) {
  // Get transcript
  const { data: transcript, error: transcriptError } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', transcriptId)
    .single();

  if (transcriptError) {
    if (transcriptError.code === 'PGRST116') {
      return null;
    }
    throw transcriptError;
  }

  if (!transcript) return null;

  // Get job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', transcript.job_id)
    .single();

  if (jobError) {
    throw jobError;
  }

  // Get createdBy user via Admin API
  const adminClient = getSupabaseAdminClient();
  const { data: userData } = await adminClient.auth.admin.getUserById(job.created_by_id);
  
  const createdBy = userData?.user ? {
    firstName: userData.user.user_metadata?.firstName || '',
    lastName: userData.user.user_metadata?.lastName || '',
  } : null;

  // Get firm
  let firm = null;
  if (job.firm_id) {
    const { data: firmData } = await supabase
      .from('firms')
      .select('id, name')
      .eq('id', job.firm_id)
      .single();
    firm = firmData;
  }

  return {
    ...transcript,
    job: {
      ...job,
      createdBy,
      firm,
    },
  };
}

/**
 * Get all edits for a transcript
 */
export async function getTranscriptEdits(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data: edits, error } = await supabase
    .from('transcription_edits')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return edits || [];
}

/**
 * Get transcript by ID
 */
export async function getTranscriptById(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', transcriptId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get transcript by job ID
 */
export async function getTranscriptByJobId(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Create a transcript
 */
export async function createTranscript(
  supabase: SupabaseClient,
  transcriptData: {
    job_id: string;
    status: string;
    full_transcript?: string | null;
    word_count?: number;
    created_by_id: string;
  }
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .insert(transcriptData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update transcript
 */
export async function updateTranscript(
  supabase: SupabaseClient,
  transcriptId: string,
  updates: {
    full_transcript?: string | null;
    word_count?: number;
    flagged_word_count?: number;
    status?: string;
  }
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .update(updates)
    .eq('id', transcriptId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update transcript status
 */
export async function updateTranscriptStatus(
  supabase: SupabaseClient,
  transcriptId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .update({ status })
    .eq('id', transcriptId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Lock transcript (stub - implement with actual locking table)
 */
export async function lockTranscript(
  _supabase: SupabaseClient,
  _transcriptId: string,
  _userId: string
) {
  // TODO: Implement actual locking mechanism
  // For now, just return success
  return { success: true };
}

/**
 * Unlock transcript (stub - implement with actual locking table)
 */
export async function unlockTranscript(
  _supabase: SupabaseClient,
  _transcriptId: string
) {
  // TODO: Implement actual unlocking mechanism
  // For now, just return success
  return { success: true };
}

/**
 * Get flagged words for a transcript
 */
export async function getFlaggedWords(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('flagged_words')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Update flagged word correction
 */
export async function updateFlaggedWord(
  supabase: SupabaseClient,
  wordId: string,
  correction: string
) {
  const { data, error } = await supabase
    .from('flagged_words')
    .update({ correction, corrected_at: new Date().toISOString() })
    .eq('id', wordId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get transcript versions
 */
export async function getTranscriptVersions(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('transcript_versions')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('version_number', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Restore transcript version (stub)
 */
export async function restoreTranscriptVersion(
  _supabase: SupabaseClient,
  _transcriptId: string,
  _version: number
) {
  // TODO: Implement version restoration
  // For now, just return success
  return { success: true };
}

/**
 * Get transcript shares
 */
export async function getTranscriptShares(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('transcript_shares')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create transcript share
 */
export async function createTranscriptShare(
  supabase: SupabaseClient,
  transcriptId: string,
  shareData: {
    email: string;
    expires_at?: string | null;
    created_by_id: string;
  }
) {
  const { data, error } = await supabase
    .from('transcript_shares')
    .insert({
      transcription_id: transcriptId,
      ...shareData,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
