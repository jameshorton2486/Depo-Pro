/**
 * Exhibits Query Layer for Depo-Pro v1.3
 *
 * NOTE: Exhibits are out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * List exhibits by job (stub)
 */
export async function listExhibitsByJob(
  supabaseOrJobId: any,
  maybeJobId?: string
): Promise<any[]> {
  // Exhibits not in v1.3 schema - return empty array
  return [];
}

/**
 * Get exhibit by ID (stub)
 */
export async function getExhibitById(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  // Exhibits not in v1.3 schema - return null
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: null };
}

/**
 * Create exhibit (stub)
 */
export async function createExhibit(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  const error = new Error('Exhibits feature not available in v1.3');
  return isOldPattern ? null : { data: null, error };
}

/**
 * Update exhibit (stub)
 */
export async function updateExhibit(
  supabaseOrId: any,
  idOrUpdates?: any,
  maybeUpdates?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const error = new Error('Exhibits feature not available in v1.3');
  return isOldPattern ? null : { data: null, error };
}

/**
 * Delete exhibit (stub)
 */
export async function deleteExhibit(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const error = new Error('Exhibits feature not available in v1.3');
  return isOldPattern ? null : { data: null, error };
}
