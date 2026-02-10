/**
 * Job Query Layer for Depo-Pro v1.3
 *
 * All functions return { data, error } pattern
 * Uses schema v1.3 tables and enums
 */

import { createClient } from '@/lib/supabase/server';
import { JobStatus } from '@/types/schema-enums';
import type { Database } from '@/types/supabase-generated';

type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];

/**
 * Get job by ID with permission check
 */
export async function getJobById(jobId: string) {
  const supabase = await createClient();

  return await supabase
    .from('jobs')
    .select(`
      *,
      reporter:profiles!jobs_reporter_id_fkey(id, full_name, email),
      scopist:profiles!jobs_scopist_id_fkey(id, full_name, email),
      firm:firms(id, name),
      transcription:transcriptions(
        id,
        status,
        progress,
        word_count,
        duration_seconds,
        created_at,
        completed_at
      )
    `)
    .eq('id', jobId)
    .single();
}

/**
 * Get all jobs for a reporter
 * Uses reporter_job_dashboard view for optimized queries
 */
export async function getJobsForReporter(reporterId: string, filters?: {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('reporter_job_dashboard')
    .select('*', { count: 'exact' })
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  return await query;
}

/**
 * Get all jobs for a scopist
 * Uses scopist_review_queue view
 */
export async function getJobsForScopist(scopistId: string, filters?: {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('scopist_review_queue')
    .select('*', { count: 'exact' })
    .eq('scopist_id', scopistId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  return await query;
}

/**
 * Get all jobs for a law firm (for attorneys)
 * Uses attorney_shared_transcripts view
 */
export async function getJobsForFirm(firmId: string, filters?: {
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('attorney_shared_transcripts')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .order('shared_at', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  return await query;
}

/**
 * Create a new job
 * Automatically sets status to DRAFT and initializes metadata
 */
export async function createJob(data: JobInsert) {
  const supabase = await createClient();

  const jobData: JobInsert = {
    ...data,
    status: JobStatus.DRAFT,
    case_metadata: data.case_metadata || {},
    created_at: new Date().toISOString(),
  };

  return await supabase
    .from('jobs')
    .insert(jobData)
    .select()
    .single();
}

/**
 * Update job fields
 * Does NOT update status - use updateJobStatus for that
 */
export async function updateJob(jobId: string, updates: JobUpdate) {
  const supabase = await createClient();

  return await supabase
    .from('jobs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single();
}

/**
 * Update job status with audit logging
 * This uses the RPC function to ensure proper audit trail
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  userId: string,
  notes?: string
) {
  const supabase = await createClient();

  return await supabase.rpc('update_job_status', {
    p_job_id: jobId,
    p_new_status: newStatus,
    p_user_id: userId,
    p_notes: notes,
  });
}

/**
 * Assign a scopist to a job
 */
export async function assignScopist(
  jobId: string,
  scopistId: string,
  userId: string
) {
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('jobs')
    .update({
      scopist_id: scopistId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) return { data: null, error };

  // Audit log the assignment
  await supabase.from('audit_log').insert({
    action: 'JOB_ASSIGNED',
    entity_type: 'job',
    entity_id: jobId,
    user_id: userId,
    metadata: { scopist_id: scopistId },
  });

  return { data: job, error: null };
}

/**
 * Archive a job (soft delete)
 * Sets status to ARCHIVED
 */
export async function archiveJob(jobId: string, userId: string) {
  return updateJobStatus(jobId, JobStatus.ARCHIVED, userId, 'Job archived');
}

/**
 * Get job statistics for dashboard
 */
export async function getJobStats(firmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select('status', { count: 'exact' })
    .eq('firm_id', firmId);

  if (error) return { data: null, error };

  // Count by status
  const stats = {
    total: data?.length || 0,
    draft: 0,
    pending: 0,
    processing: 0,
    in_review: 0,
    completed: 0,
    failed: 0,
  };

  data?.forEach((job: any) => {
    const status = job.status as JobStatus;
    if (status === JobStatus.DRAFT) stats.draft++;
    else if (status === JobStatus.PENDING) stats.pending++;
    else if (status === JobStatus.PROCESSING) stats.processing++;
    else if (status === JobStatus.IN_REVIEW || status === JobStatus.FINAL_REVIEW) stats.in_review++;
    else if (status === JobStatus.COMPLETED) stats.completed++;
    else if (status === JobStatus.FAILED) stats.failed++;
  });

  return { data: stats, error: null };
}
