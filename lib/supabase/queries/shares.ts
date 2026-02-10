/**
 * Shares Query Layer for Depo-Pro v1.3
 *
 * Manages transcript sharing with attorneys
 */

import { createClient } from '@/lib/supabase/server';
import { ShareAccessLevel } from '@/types/schema-enums';
import type { Database } from '@/types/supabase-generated';

type ShareInsert = Database['public']['Tables']['transcript_shares']['Insert'];

/**
 * Create a new share for an attorney
 * Returns the share record with access token
 */
export async function createShare(data: {
  job_id: string;
  attorney_id: string;
  shared_by: string;
  access_level?: ShareAccessLevel;
  expires_at?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();

  const shareData: ShareInsert = {
    job_id: data.job_id,
    shared_with: data.attorney_id,
    shared_by: data.shared_by,
    access_level: data.access_level || ShareAccessLevel.READ_ONLY,
    expires_at: data.expires_at || null,
    message: data.notes || null,
  };

  return await supabase
    .from('transcript_shares')
    .insert(shareData)
    .select()
    .single();
}

/**
 * Get all shares for a job
 * Used by reporters to see who has access
 */
export async function getSharesForJob(jobId: string) {
  const supabase = await createClient();

  return await supabase
    .from('transcript_shares')
    .select(`
      *,
      attorney:profiles!transcript_shares_attorney_id_fkey(
        id,
        full_name,
        email,
        firm_id
      ),
      shared_by_user:profiles!transcript_shares_shared_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('job_id', jobId)
    .is('revoked_at', null)
    .order('shared_at', { ascending: false });
}

/**
 * Get all shares for an attorney
 * Uses attorney_shared_transcripts view for optimized queries
 */
export async function getSharesForAttorney(
  attorneyId: string,
  options?: {
    includeExpired?: boolean;
    includeRevoked?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();

  let query = supabase
    .from('attorney_shared_transcripts')
    .select('*', { count: 'exact' })
    .eq('attorney_id', attorneyId);

  if (!options?.includeRevoked) {
    query = query.is('revoked_at', null);
  }

  if (!options?.includeExpired) {
    query = query.or(
      `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
    );
  }

  query = query.order('shared_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 20) - 1
    );
  }

  return await query;
}

/**
 * Get a share by ID
 */
export async function getShareById(shareId: string) {
  const supabase = await createClient();

  return await supabase
    .from('transcript_shares')
    .select(`
      *,
      job:jobs(
        id,
        case_name,
        case_number,
        deposition_date
      ),
      attorney:profiles!transcript_shares_attorney_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('id', shareId)
    .single();
}

/**
 * Get a share by access token
 * Used for public access via share link
 */
export async function getShareByToken(accessToken: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('transcript_shares')
    .select(`
      *,
      job:jobs(
        id,
        case_name,
        case_number,
        deposition_date,
        case_metadata
      )
    `)
    .eq('access_token', accessToken)
    .is('revoked_at', null)
    .single();

  if (error) return { data: null, error };

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return {
      data: null,
      error: new Error('Share link has expired'),
    };
  }

  return { data, error: null };
}

/**
 * Revoke a share
 * Soft delete - sets revoked_at timestamp
 */
export async function revokeShare(shareId: string, revokedBy: string) {
  const supabase = await createClient();

  return await supabase
    .from('transcript_shares')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq('id', shareId)
    .select()
    .single();
}

/**
 * Check if a share is active
 * Returns true if not revoked and not expired
 */
export async function isShareActive(shareId: string): Promise<boolean> {
  const { data, error } = await getShareById(shareId);

  if (error || !data) return false;

  // Check if revoked
  if (data.revoked_at) return false;

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Update share expiration
 */
export async function updateShareExpiration(
  shareId: string,
  expiresAt: string | null
) {
  const supabase = await createClient();

  return await supabase
    .from('transcript_shares')
    .update({ expires_at: expiresAt })
    .eq('id', shareId)
    .select()
    .single();
}

/**
 * Get share statistics for a job
 */
export async function getShareStats(jobId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('transcript_shares')
    .select('revoked_at, expires_at')
    .eq('job_id', jobId);

  if (error) return { data: null, error };

  const now = new Date();
  const stats = {
    total: data?.length || 0,
    active: 0,
    expired: 0,
    revoked: 0,
  };

  data?.forEach((share: any) => {
    if (share.revoked_at) {
      stats.revoked++;
    } else if (share.expires_at && new Date(share.expires_at) < now) {
      stats.expired++;
    } else {
      stats.active++;
    }
  });

  return { data: stats, error: null };
}

/**
 * Bulk revoke shares for a job
 * Used when archiving or deleting a job
 */
export async function revokeAllSharesForJob(jobId: string, revokedBy: string) {
  const supabase = await createClient();

  return await supabase
    .from('transcript_shares')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq('job_id', jobId)
    .is('revoked_at', null);
}
