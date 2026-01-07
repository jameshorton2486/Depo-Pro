// ═══════════════════════════════════════════════════════════════
// AUDIT QUERY FUNCTIONS
// lib/supabase/queries/audit.ts
// ═══════════════════════════════════════════════════════════════
// All database access for audit logs goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  entry: {
    actor_user_id: string;
    firm_id?: string | null;
    action: string;
    target_type: string;
    target_id: string;
    metadata?: Record<string, unknown> | null;
    ip_address?: string | null;
    user_agent?: string | null;
  }
) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      ...entry,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

/**
 * List audit logs with filtering
 */
export async function listAuditLogs(
  supabase: SupabaseClient,
  filters?: {
    actor_user_id?: string;
    firm_id?: string;
    target_type?: string;
    target_id?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  },
  pagination?: {
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (filters?.actor_user_id) {
    query = query.eq('actor_user_id', filters.actor_user_id);
  }

  if (filters?.firm_id) {
    query = query.eq('firm_id', filters.firm_id);
  }

  if (filters?.target_type) {
    query = query.eq('target_type', filters.target_type);
  }

  if (filters?.target_id) {
    query = query.eq('target_id', filters.target_id);
  }

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  query = query.order('created_at', { ascending: false });

  if (pagination?.limit) {
    query = query.limit(pagination.limit);
  }

  if (pagination?.offset) {
    query = query.range(pagination.offset, pagination.offset + (pagination.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    logs: data || [],
    totalCount: count || 0,
  };
}
