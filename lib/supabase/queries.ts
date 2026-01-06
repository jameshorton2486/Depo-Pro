// ═══════════════════════════════════════════════════════════════
// SUPABASE QUERY HELPERS
// ═══════════════════════════════════════════════════════════════
// Common database query patterns to replace Prisma

import { SupabaseClient } from '@supabase/supabase-js';
// Note: Using types/database.ts instead of generated Supabase types
// For full type safety, generate types with: npx supabase gen types typescript

// Using types from types/database.ts
import type { User } from '@/types/database';

/**
 * Find user by ID
 */
export async function findUserById(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find user by email
 */
export async function findUserByEmail(
  supabase: SupabaseClient,
  email: string
) {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data || null;
}

/**
 * Find user with firm
 */
export async function findUserWithFirm(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('User')
    .select(`
      *,
      firm:Firm(*)
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user
 */
export async function updateUser(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Omit<User, 'id' | 'created_at'>>
) {
  const { data, error } = await supabase
    .from('User')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find job by ID
 */
export async function findJobById(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from('Job')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find job with creator and firm
 */
export async function findJobWithRelations(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from('Job')
    .select(`
      *,
      created_by:User!Job_created_by_id_fkey(*),
      firm:Firm(*)
    `)
    .eq('id', jobId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find jobs for user's firm
 */
export async function findJobsByFirm(
  supabase: SupabaseClient,
  firmId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('Job')
    .select('*, created_by:User!Job_created_by_id_fkey(*)', { count: 'exact' })
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

/**
 * Update job status
 */
export async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('Job')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check user access to firm
 */
export async function userHasFirmAccess(
  supabase: SupabaseClient,
  userId: string,
  firmId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('User')
    .select('firm_id')
    .eq('id', userId)
    .eq('firm_id', firmId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

/**
 * Check user access to job
 */
export async function userHasJobAccess(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<boolean> {
  const { data: job, error: jobError } = await supabase
    .from('Job')
    .select('firm_id, created_by_id')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  const { data: user, error: userError } = await supabase
    .from('User')
    .select('firm_id, role')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  // User has access if:
  // 1. They're in the same firm as the job
  // 2. OR they created the job
  // 3. OR they're an ADMIN
  return (
    user.firm_id === job.firm_id ||
    job.created_by_id === userId ||
    user.role === 'ADMIN'
  );
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  log: {
    actor_user_id: string | null;
    firm_id: string | null;
    action: string;
    target_type: string;
    target_id: string;
    metadata?: any;
    ip_address?: string;
    user_agent?: string;
  }
) {
  const { data, error } = await supabase
    .from('AuditLog')
    .insert({
      ...log,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Transaction helper - Supabase doesn't have native transactions like Prisma
 * Use RPC for complex operations that need atomicity
 */
export async function withTransaction<T>(
  supabase: SupabaseClient,
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Note: Supabase doesn't have the same transaction model as Prisma
  // For true ACID transactions, use Postgres RPC functions
  // For now, this is a pass-through that maintains the same API
  return callback(supabase);
}
