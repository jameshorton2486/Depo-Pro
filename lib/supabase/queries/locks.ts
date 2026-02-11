/**
 * Lock Query Layer for Depo-Pro v1.3
 *
 * Manages exclusive job locks to prevent concurrent editing
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
 * NOTE: Lock columns are on the jobs table, not a separate job_locks table
 */
export async function getJobLockStatus(jobId: string) {
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      id,
      locked_by,
      locked_at,
      lock_expires_at,
      user:profiles!jobs_locked_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('id', jobId)
    .single();

  if (error) {
    return { data: null, error };
  }

  // Check if lock is active (not null and not expired)
  const isLocked = job.locked_by && job.lock_expires_at && new Date(job.lock_expires_at) > new Date();

  if (!isLocked) {
    return { data: null, error: null };
  }

  // Return lock data in expected format
  return {
    data: {
      job_id: job.id,
      user_id: job.locked_by,
      locked_at: job.locked_at,
      lock_expires_at: job.lock_expires_at,
      user: job.user,
    },
    error: null,
  };
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
    .from('jobs')
    .update({
      lock_expires_at: newExpiresAt,
    })
    .eq('id', jobId)
    .eq('locked_by', userId)
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
    .from('jobs')
    .update({
      locked_by: null,
      locked_at: null,
      lock_expires_at: null,
    })
    .eq('id', jobId);
}

/**
 * Get all active locks for a user
 */
export async function getUserLocks(userId: string) {
  const supabase = await createClient();

  return await supabase
    .from('jobs')
    .select(`
      id,
      case_name,
      case_number,
      status,
      locked_by,
      locked_at,
      lock_expires_at
    `)
    .eq('locked_by', userId)
    .not('locked_by', 'is', null)
    .order('locked_at', { ascending: false });
}

/**
 * Get all expired locks (for cleanup)
 * This is used by the pg_cron job
 */
export async function getExpiredLocks() {
  const supabase = await createAdminClient();

  return await supabase
    .from('jobs')
    .select('id, locked_by, locked_at, lock_expires_at')
    .not('locked_by', 'is', null)
    .lt('lock_expires_at', new Date().toISOString());
}

/**
 * Clean up expired locks manually
 * Normally handled by pg_cron, but can be called manually
 */
export async function cleanupExpiredLocks() {
  const supabase = await createAdminClient();

  return await supabase.rpc('cleanup_expired_locks');
}
