/**
 * Lock Query Layer for Depo-Pro v1.3
 *
 * Manages exclusive job locks to prevent concurrent editing
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase-generated';

/**
 * Acquire a lock on a job
 * Returns the lock if successful, or the existing lock if held by another user
 */
export async function acquireJobLock(
  jobId: string,
  userId: string,
  timeoutMinutes: number = 120
) {
  const supabase = await createClient();

  return await supabase.rpc('acquire_job_lock', {
    p_job_id: jobId,
    p_user_id: userId,
    p_timeout_minutes: timeoutMinutes,
  });
}

/**
 * Release a lock on a job
 * Only the lock holder can release their lock
 */
export async function releaseJobLock(jobId: string, userId: string) {
  const supabase = await createClient();

  return await supabase.rpc('release_job_lock', {
    p_job_id: jobId,
    p_user_id: userId,
  });
}

/**
 * Get current lock status for a job
 * Returns null if no lock, or the lock record if locked
 */
export async function getJobLockStatus(jobId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('job_locks')
    .select(`
      *,
      user:profiles!job_locks_user_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('job_id', jobId)
    .single();

  // No lock exists - this is valid
  if (error?.code === 'PGRST116') {
    return { data: null, error: null };
  }

  return { data, error };
}

/**
 * Check if a job is locked by a specific user
 */
export async function isJobLockedByUser(jobId: string, userId: string) {
  const { data, error } = await getJobLockStatus(jobId);

  if (error || !data) return false;

  return data.user_id === userId;
}

/**
 * Check if a job is locked by another user
 */
export async function isJobLockedByOther(jobId: string, userId: string) {
  const { data, error } = await getJobLockStatus(jobId);

  if (error || !data) return false;

  return data.user_id !== userId;
}

/**
 * Extend lock timeout (heartbeat)
 * Keeps the lock alive while user is actively working
 */
export async function extendJobLock(
  jobId: string,
  userId: string,
  additionalMinutes: number = 30
) {
  const supabase = await createClient();

  const { data: lockData, error: lockError } = await getJobLockStatus(jobId);

  if (lockError || !lockData) {
    return { data: null, error: lockError || new Error('No lock found') };
  }

  if (lockData.user_id !== userId) {
    return { data: null, error: new Error('Lock held by another user') };
  }

  const newExpiresAt = new Date(
    new Date().getTime() + additionalMinutes * 60 * 1000
  ).toISOString();

  return await supabase
    .from('job_locks')
    .update({
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .select()
    .single();
}

/**
 * Force release a lock (admin only)
 * Should only be used in exceptional circumstances
 */
export async function forceReleaseJobLock(jobId: string) {
  const supabase = await createAdminClient();

  return await supabase
    .from('job_locks')
    .delete()
    .eq('job_id', jobId);
}

/**
 * Get all active locks for a user
 */
export async function getUserLocks(userId: string) {
  const supabase = await createClient();

  return await supabase
    .from('job_locks')
    .select(`
      *,
      job:jobs(
        id,
        case_name,
        case_number,
        status
      )
    `)
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false });
}

/**
 * Get all expired locks (for cleanup)
 * This is used by the pg_cron job
 */
export async function getExpiredLocks() {
  const supabase = await createAdminClient();

  return await supabase
    .from('job_locks')
    .select('*')
    .lt('expires_at', new Date().toISOString());
}

/**
 * Clean up expired locks manually
 * Normally handled by pg_cron, but can be called manually
 */
export async function cleanupExpiredLocks() {
  const supabase = await createAdminClient();

  return await supabase.rpc('cleanup_expired_locks');
}
