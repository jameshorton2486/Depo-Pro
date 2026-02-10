/**
 * Proper Nouns Query Layer for Depo-Pro v1.3
 *
 * NOTE: Proper nouns feature out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get proper noun by ID (stub)
 * Supports: getProperNounById(supabase, id, options) or getProperNounById(id)
 */
export async function getProperNounById(
  supabaseOrId: any,
  idOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * List proper nouns by job (stub)
 * Supports: listProperNounsByJob(supabase, jobId, options) or listProperNounsByJob(jobId)
 */
export async function listProperNounsByJob(
  supabaseOrJobId: any,
  jobIdOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create proper noun (stub)
 * Supports: createProperNoun(supabase, data, options) or createProperNoun(data)
 */
export async function createProperNoun(
  supabaseOrData: any,
  dataOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * Update proper noun (stub)
 * Supports: updateProperNoun(supabase, id, updates, options) or updateProperNoun(id, updates)
 */
export async function updateProperNoun(
  supabaseOrId: any,
  idOrUpdates?: any,
  updatesOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * Delete proper noun (stub)
 * Supports: deleteProperNoun(supabase, id, options) or deleteProperNoun(id)
 */
export async function deleteProperNoun(
  supabaseOrId: any,
  idOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}
