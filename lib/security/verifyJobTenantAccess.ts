import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser } from '@/lib/auth/session';

export interface JobAccessRecord {
  id: string;
  firm_id: string;
  reporter_id: string | null;
  scopist_id: string | null;
  created_by_id: string | null;
  status: string | null;
}

export class JobAccessError extends Error {
  constructor(
    public readonly statusCode: 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = 'JobAccessError';
  }
}

/**
 * Verifies that a job exists and belongs to the caller's firm.
 *
 * Throws JobAccessError (404) if the job is not found.
 * Throws JobAccessError (403) if the job belongs to a different firm.
 *
 * Returns the job record on success so the handler can continue.
 */
export async function verifyJobTenantAccess({
  jobId,
  user,
  supabase,
}: {
  jobId: string;
  user: SessionUser;
  supabase: SupabaseClient;
}): Promise<JobAccessRecord> {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, firm_id, reporter_id, scopist_id, created_by_id, status')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    throw new JobAccessError(404, 'Job not found');
  }

  const userFirmId = user.firmId ?? null;

  if (!userFirmId || job.firm_id !== userFirmId) {
    throw new JobAccessError(403, 'Forbidden');
  }

  return job as JobAccessRecord;
}
