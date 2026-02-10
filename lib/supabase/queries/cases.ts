/**
 * Cases Query Layer for Depo-Pro v1.3
 *
 * NOTE: Cases table removed in v1.3 - data merged into jobs
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * List cases (maps to jobs with case info)
 */
export async function listCases(
  supabaseOrFilters: any,
  maybeFilters?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrFilters === 'object' && supabaseOrFilters.from;
  const supabase = isOldPattern ? supabaseOrFilters : await createClient();
  const filters = isOldPattern ? maybeFilters : supabaseOrFilters;

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.firm_id) {
    query = query.eq('firm_id', filters.firm_id);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const result = await query;
  return isOldPattern ? result.data : result;
}

/**
 * Get case by ID (maps to job)
 */
export async function getCaseById(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const supabase = isOldPattern ? supabaseOrId : await createClient();
  const id = isOldPattern ? maybeId : supabaseOrId;

  const result = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Create case with initial job
 */
export async function createCaseWithInitialJob(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  const supabase = isOldPattern ? supabaseOrData : await createClient();
  const data = isOldPattern ? maybeData : supabaseOrData;

  // In v1.3, just create a job
  const result = await supabase
    .from('jobs')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  return isOldPattern ? result.data : result;
}
