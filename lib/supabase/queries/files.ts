// ═══════════════════════════════════════════════════════════════
// FILE QUERY FUNCTIONS
// lib/supabase/queries/files.ts
// ═══════════════════════════════════════════════════════════════
// All database access for files goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get file by ID
 */
export async function getFileById(
  supabase: SupabaseClient,
  fileId: string
) {
  const { data, error } = await supabase
    .from('job_files')
    .select('*')
    .eq('id', fileId)
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
 * List files for a job
 */
export async function listFilesForJob(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from('job_files')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create a file record
 */
export async function createFile(
  supabase: SupabaseClient,
  fileData: {
    job_id: string;
    file_name: string;
    type: string;
    file_size: number;
    storage_url?: string | null;
    storage_path?: string | null;
    mime_type?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('job_files')
    .insert(fileData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a file record
 */
export async function updateFile(
  supabase: SupabaseClient,
  fileId: string,
  updates: {
    file_name?: string;
    storage_url?: string | null;
    storage_path?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('job_files')
    .update(updates)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete a file record
 */
export async function deleteFile(
  supabase: SupabaseClient,
  fileId: string
) {
  const { error } = await supabase
    .from('job_files')
    .delete()
    .eq('id', fileId);

  if (error) {
    throw error;
  }
}
