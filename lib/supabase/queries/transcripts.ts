// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT QUERY FUNCTIONS
// lib/supabase/queries/transcripts.ts
// ═══════════════════════════════════════════════════════════════
// All database access for transcripts goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';
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
