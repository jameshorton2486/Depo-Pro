// ═══════════════════════════════════════════════════════════════
// NOTE QUERY FUNCTIONS
// lib/supabase/queries/notes.ts
// ═══════════════════════════════════════════════════════════════
// All database access for notes goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * List notes for a job
 */
export async function listNotesForJob(
  supabase: SupabaseClient,
  jobId: string,
  options?: {
    type?: string;
    orderBy?: 'created_at' | 'updated_at';
    orderDirection?: 'asc' | 'desc';
  }
) {
  let query = supabase
    .from('deposition_notes')
    .select('*')
    .eq('job_id', jobId);

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  const orderBy = options?.orderBy || 'created_at';
  const orderDirection = options?.orderDirection || 'asc';

  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get note by ID
 */
export async function getNoteById(
  supabase: SupabaseClient,
  noteId: string,
  jobId: string
) {
  const { data, error } = await supabase
    .from('deposition_notes')
    .select('*')
    .eq('id', noteId)
    .eq('job_id', jobId)
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
 * Create a note
 */
export async function createNote(
  supabase: SupabaseClient,
  noteData: {
    job_id: string;
    reporter_id: string;
    content: string;
    type: string;
    audio_timestamp?: number | null;
    note_category?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('deposition_notes')
    .insert(noteData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a note
 */
export async function updateNote(
  supabase: SupabaseClient,
  noteId: string,
  jobId: string,
  updates: {
    content?: string;
    type?: string;
    audio_timestamp?: number | null;
    note_category?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('deposition_notes')
    .update(updates)
    .eq('id', noteId)
    .eq('job_id', jobId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete a note
 */
export async function deleteNote(
  supabase: SupabaseClient,
  noteId: string,
  jobId: string
) {
  const { error } = await supabase
    .from('deposition_notes')
    .delete()
    .eq('id', noteId)
    .eq('job_id', jobId);

  if (error) {
    throw error;
  }
}
