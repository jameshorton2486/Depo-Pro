/**
 * Notes Query Layer for Depo-Pro v1.3
 *
 * NOTE: Notes system out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get note by ID (stub)
 */
export async function getNoteById(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}

/**
 * List notes by job (stub)
 */
export async function listNotesByJob(
  supabaseOrJobId: any,
  maybeJobId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create note (stub)
 */
export async function createNote(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}

/**
 * Update note (stub)
 */
export async function updateNote(
  supabaseOrId: any,
  idOrUpdates?: any,
  maybeUpdates?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}

/**
 * Delete note (stub)
 */
export async function deleteNote(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Notes feature not available in v1.3') };
}
