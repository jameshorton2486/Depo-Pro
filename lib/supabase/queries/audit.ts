/**
 * Audit Log Query Layer for Depo-Pro v1.3
 *
 * Handles audit log queries
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Create audit log entry
 */
export async function createAuditLog(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  const supabase = isOldPattern ? supabaseOrData : await createAdminClient();
  const data = isOldPattern ? maybeData : supabaseOrData;

  const result = await supabase
    .from('audit_log')
    .insert(data)
    .select()
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * List audit logs with pagination
 */
export async function listAuditLogs(
  supabaseOrFilters: any,
  maybeFilters?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrFilters === 'object' && supabaseOrFilters.from;
  const supabase = isOldPattern ? supabaseOrFilters : await createClient();
  const filters = isOldPattern ? maybeFilters : supabaseOrFilters;

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false });

  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }

  if (filters?.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const result = await query;
  return isOldPattern ? result.data : result;
}

/**
 * Get audit logs for export
 */
export async function getAuditLogsForExport(
  supabaseOrFilters: any,
  maybeFilters?: any
): Promise<any> {
  return listAuditLogs(supabaseOrFilters, maybeFilters);
}
