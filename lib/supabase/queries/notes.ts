/**
 * Notes Query Layer for Depo-Pro v1.3
 *
 * NOTE: Notes system out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get note by ID (stub)
 * Supports: getNoteById(supabase, id, options) or getNoteById(id)
 */
export async function getNoteById(
  supabaseOrId: any,
  idOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}

/**
 * List notes by job (stub)
 * Supports: listNotesByJob(supabase, jobId, options) or listNotesByJob(jobId)
 */
export async function listNotesByJob(
  supabaseOrJobId: any,
  jobIdOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create note (stub)
 * Supports: createNote(supabase, data, options) or createNote(data)
 */
export async function createNote(
  supabaseOrData: any,
  dataOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}

/**
 * Update note (stub)
 * Supports: updateNote(supabase, id, updates, options) or updateNote(id, updates)
 */
export async function updateNote(
  supabaseOrId: any,
  idOrUpdates?: any,
  updatesOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}

/**
 * Delete note (stub)
 * Supports: deleteNote(supabase, id, options) or deleteNote(id)
 */
export async function deleteNote(
  supabaseOrId: any,
  idOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}

/**
 * List notes for job (alias for listNotesByJob)
 * Supports: listNotesForJob(supabase, jobId, options) or listNotesForJob(jobId)
 */
export async function listNotesForJob(
  supabaseOrJobId: any,
  jobIdOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  return listNotesByJob(supabaseOrJobId, jobIdOrOptions, maybeOptions);
}
