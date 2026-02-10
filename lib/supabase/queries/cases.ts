/**
 * Cases Query Layer for Depo-Pro v1.3
 *
 * NOTE: Cases table removed in v1.3 - data merged into jobs
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Case filter type (legacy)
 */
export type CaseFilter = {
  firm_id?: string;
  status?: string;
  case_type?: string;
  role?: string;
  court_type?: string;
  state?: string;
  has_transcripts?: boolean;
  date_from?: Date;
  date_to?: Date;
  search?: string;
  limit?: number;
  offset?: number;
};

/**
 * Case sort type (legacy)
 */
export type CaseSort = {
  field: string;
  order: 'asc' | 'desc';
};

/**
 * List cases (maps to jobs with case info)
 * Supports: listCases(supabase, userId, email, filters, sort, pagination)
 */
export async function listCases(
  supabaseOrFilters: any,
  userIdOrFilters?: any,
  emailOrSort?: any,
  maybeFilters?: any,
  maybeSort?: any,
  maybePagination?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrFilters === 'object' && supabaseOrFilters.from;

  let supabase: any;
  let filters: any;
  let sort: any;
  let pagination: any;

  if (isOldPattern) {
    // Old pattern: listCases(supabase, userId, email, filters, sort, pagination)
    supabase = supabaseOrFilters;
    // userId and email are ignored in stub - v1.3 uses RLS
    filters = maybeFilters || {};
    sort = maybeSort;
    pagination = maybePagination || {};
  } else {
    // New pattern: listCases(filters)
    supabase = await createClient();
    filters = supabaseOrFilters || {};
    pagination = {};
  }

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.firm_id) {
    query = query.eq('firm_id', filters.firm_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (pagination?.limit) {
    query = query.limit(pagination.limit);
  }

  if (pagination?.skip) {
    const limit = pagination.limit || 20;
    query = query.range(pagination.skip, pagination.skip + limit - 1);
  }

  const result = await query;

  if (isOldPattern) {
    return {
      cases: result.data || [],
      totalCount: result.count || 0,
    };
  }
  return result;
}

/**
 * Get case by ID (maps to job)
 * Supports: getCaseById(supabase, id, options) or getCaseById(id)
 */
export async function getCaseById(
  supabaseOrId: any,
  idOrOptions?: string | any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;

  let supabase: any;
  let id: string;

  if (isOldPattern) {
    supabase = supabaseOrId;
    id = idOrOptions as string;
  } else {
    supabase = await createClient();
    id = supabaseOrId;
  }

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
