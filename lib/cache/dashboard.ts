/**
 * Dashboard Cache Service
 * Stub implementation - TODO: Add Redis caching
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface JobCounts {
  total: number;
  pending: number;
  processing: number;
  inProgress: number;
  completed: number;
  failed: number;
}

/**
 * Get cached job counts for a firm
 * @param firmId - The firm ID
 * @param userId - Optional user ID for user-specific counts
 */
export async function getCachedJobCounts(firmId: string, userId?: string): Promise<JobCounts> {
  logger.debug('[Cache] getCachedJobCounts called - using direct query (no cache)', { firmId, userId });
  
  try {
    const supabase = await createSupabaseServerClient();
    
    let query = supabase.from('jobs').select('status', { count: 'exact' });
    if (firmId) query = query.eq('firm_id', firmId);
    
    const { data, count } = await query;
    
    const statusCounts = (data || []).reduce((acc: Record<string, number>, job: { status: string }) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: count || 0,
      pending: statusCounts['CREATED'] || 0,
      processing: statusCounts['TRANSCRIBING'] || statusCounts['ENHANCING_AUDIO'] || 0,
      inProgress: statusCounts['IN_EDIT'] || statusCounts['IN_REVIEW'] || 0,
      completed: statusCounts['COMPLETED'] || 0,
      failed: statusCounts['FAILED'] || 0,
    };
  } catch (error) {
    console.error('[Cache] Error getting job counts:', error);
    return { total: 0, pending: 0, processing: 0, inProgress: 0, completed: 0, failed: 0 };
  }
}

export interface RecentJob {
  id: string;
  title: string;
  caseName: string;
  status: string;
  updatedAt: string;
}

/**
 * Get cached recent jobs for a firm
 * @param firmId - The firm ID
 * @param limit - Number of jobs to return (as string or number)
 */
export async function getCachedRecentJobs(firmId: string, limit: number | string = 5): Promise<RecentJob[]> {
  logger.debug('[Cache] getCachedRecentJobs called - using direct query (no cache)', { firmId, limit });
  
  try {
    const supabase = await createSupabaseServerClient();
    const numLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    
    const { data } = await supabase
      .from('jobs')
      .select('id, title, case_name, status, updated_at')
      .eq('firm_id', firmId)
      .order('updated_at', { ascending: false })
      .limit(numLimit);
    
    return (data || []).map((job: { id: string; title: string; case_name: string; status: string; updated_at: string }) => ({
      id: job.id,
      title: job.title || '',
      caseName: job.case_name || '',
      status: job.status,
      updatedAt: job.updated_at,
    }));
  } catch (error) {
    console.error('[Cache] Error getting recent jobs:', error);
    return [];
  }
}

/**
 * Invalidate dashboard cache for a firm
 */
export async function invalidateDashboardCache(firmId: string): Promise<void> {
  logger.debug('[Cache] invalidateDashboardCache called - no-op (no cache)', { firmId });
  // TODO: Implement Redis cache invalidation
}
