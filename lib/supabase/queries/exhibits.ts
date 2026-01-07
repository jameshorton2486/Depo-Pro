// ═══════════════════════════════════════════════════════════════
// EXHIBIT QUERY FUNCTIONS
// lib/supabase/queries/exhibits.ts
// ═══════════════════════════════════════════════════════════════
// All database access for exhibits goes through these functions

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get exhibit by ID
 */
export async function getExhibitById(
  supabase: SupabaseClient,
  exhibitId: string
) {
  const { data, error } = await supabase
    .from('exhibits')
    .select('*')
    .eq('id', exhibitId)
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
 * List exhibits for a job
 */
export async function listExhibitsByJob(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from('exhibits')
    .select('*')
    .eq('job_id', jobId)
    .order('exhibit_number', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * List exhibits for a case
 */
export async function listExhibitsByCase(
  supabase: SupabaseClient,
  caseId: string
) {
  const { data, error } = await supabase
    .from('exhibits')
    .select('*')
    .eq('case_id', caseId)
    .order('exhibit_number', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get exhibits by transcript
 */
export async function getExhibitsByTranscript(
  supabase: SupabaseClient,
  transcriptId: string
) {
  // Get transcript's job_id
  const { data: transcript } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) {
    return [];
  }

  // Get exhibits for the job
  return listExhibitsByJob(supabase, transcript.job_id);
}

/**
 * Create an exhibit
 */
export async function createExhibit(
  supabase: SupabaseClient,
  exhibitData: {
    case_id: string;
    job_id: string;
    exhibit_label: string;
    exhibit_number: number;
    description: string;
    original_file_url: string;
    stamped_file_url?: string | null;
    file_type: string;
    mime_type: string;
    file_name: string;
    file_size: number;
    stamped: boolean;
    uploaded_by_role: string;
    created_by_id: string;
  }
) {
  const { data, error } = await supabase
    .from('exhibits')
    .insert(exhibitData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update an exhibit
 */
export async function updateExhibit(
  supabase: SupabaseClient,
  exhibitId: string,
  updates: {
    description?: string;
    exhibit_label?: string;
    exhibit_number?: number;
    stamped_file_url?: string | null;
    stamped?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('exhibits')
    .update(updates)
    .eq('id', exhibitId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete an exhibit
 */
export async function deleteExhibit(
  supabase: SupabaseClient,
  exhibitId: string
) {
  const { error } = await supabase
    .from('exhibits')
    .delete()
    .eq('id', exhibitId);

  if (error) {
    throw error;
  }
}
