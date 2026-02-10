/**
 * Proper Nouns Query Layer for Depo-Pro v1.3
 *
 * NOTE: Proper nouns feature out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get proper noun by ID (stub)
 */
export async function getProperNounById(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * List proper nouns by job (stub)
 */
export async function listProperNounsByJob(
  supabaseOrJobId: any,
  maybeJobId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create proper noun (stub)
 */
export async function createProperNoun(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * Update proper noun (stub)
 */
export async function updateProperNoun(
  supabaseOrId: any,
  idOrUpdates?: any,
  maybeUpdates?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * Delete proper noun (stub)
 */
export async function deleteProperNoun(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}
