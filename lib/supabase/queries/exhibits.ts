/**
 * Exhibits Query Layer for Depo-Pro v1.3
 *
 * NOTE: Exhibits are out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * JobExhibitRow type - stub for exhibits feature
 */
export interface JobExhibitRow {
  id: string;
  job_id: string;
  exhibit_number: string;
  description: string;
  file_url: string;
  file_type: string;
  timestamp?: number;
  created_at: string;
}

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
 * Supports: getExhibitById(supabase, id, options) or getExhibitById(id)
 */
export async function getExhibitById(
  supabaseOrId: any,
  idOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  // Exhibits not in v1.3 schema - return null
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: null };
}

/**
 * Create exhibit (stub)
 * Supports: createExhibit(supabase, data, options) or createExhibit(data)
 */
export async function createExhibit(
  supabaseOrData: any,
  dataOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  const error = new Error('Exhibits feature not available in v1.3');
  return isOldPattern ? null : { data: null, error };
}

/**
 * Update exhibit (stub)
 * Supports: updateExhibit(supabase, id, updates, options) or updateExhibit(id, updates)
 */
export async function updateExhibit(
  supabaseOrId: any,
  idOrUpdates?: any,
  updatesOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const error = new Error('Exhibits feature not available in v1.3');
  return isOldPattern ? null : { data: null, error };
}

/**
 * Delete exhibit (stub)
 * Supports: deleteExhibit(supabase, id, options) or deleteExhibit(id)
 */
export async function deleteExhibit(
  supabaseOrId: any,
  idOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const error = new Error('Exhibits feature not available in v1.3');
  return isOldPattern ? null : { data: null, error };
}

/**
 * List exhibits by case (alias for listExhibitsByJob - cases merged into jobs in v1.3)
 */
export async function listExhibitsByCase(
  supabaseOrCaseId: any,
  maybeCaseId?: string
): Promise<any[]> {
  return listExhibitsByJob(supabaseOrCaseId, maybeCaseId);
}
