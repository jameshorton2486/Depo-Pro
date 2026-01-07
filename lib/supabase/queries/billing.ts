// ═══════════════════════════════════════════════════════════════
// BILLING QUERY FUNCTIONS
// lib/supabase/queries/billing.ts
// ═══════════════════════════════════════════════════════════════
// All database access for billing and invoices goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get invoice by ID
 */
export async function getInvoiceById(
  supabase: SupabaseClient,
  invoiceId: string
) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * List invoices for a firm
 */
export async function listInvoicesByFirm(
  supabase: SupabaseClient,
  firmId: string,
  options?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }

  query = query.order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    invoices: data || [],
    totalCount: count || 0,
  };
}

/**
 * Create an invoice
 */
export async function createInvoice(
  supabase: SupabaseClient,
  invoiceData: {
    firm_id: string;
    job_id: string;
    amount: number;
    currency?: string;
    status?: string;
    due_date?: string;
    metadata?: Record<string, unknown> | null;
  }
) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      ...invoiceData,
      currency: invoiceData.currency || 'USD',
      status: invoiceData.status || 'DRAFT',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  supabase: SupabaseClient,
  invoiceId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get usage metrics for a firm
 */
export async function getUsageByFirm(
  supabase: SupabaseClient,
  firmId: string,
  period: 'month' | 'year' | 'all'
) {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0); // All time
  }

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, status, created_at, completed_at')
    .eq('firm_id', firmId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    throw error;
  }

  const completedJobs = (jobs || []).filter(j => j.status === 'COMPLETED');
  const totalJobs = jobs?.length || 0;
  const totalMinutes = completedJobs.reduce((sum, job) => {
    if (job.completed_at && job.created_at) {
      const minutes = Math.floor(
        (new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / (1000 * 60)
      );
      return sum + minutes;
    }
    return sum;
  }, 0);

  return {
    totalJobs,
    completedJobs: completedJobs.length,
    averageTurnaroundMinutes: completedJobs.length > 0
      ? Math.round(totalMinutes / completedJobs.length)
      : 0,
    totalMinutes,
  };
}
