// =============================================================================
// DASHBOARD CACHED QUERIES
// =============================================================================
// Cached aggregates for dashboard display
// These are expensive queries that don't need real-time accuracy
// =============================================================================

import { JobStatus, UserRole } from '@/types/database';
import { 
  createCachedQuery, 
  CACHE_TAGS, 
  CACHE_TTL,
} from './index';

// =============================================================================
// JOB STATISTICS
// =============================================================================

/**
 * Get job counts by status for a firm - cached for 5 minutes
 * INVALIDATION: Call invalidateDashboardCache() on job status change
 */
export const getCachedJobCounts = createCachedQuery(
  async (firmId: string) => {
    const counts = await prisma.job.groupBy({
      by: ['status'],
      where: { firmId },
      _count: { status: true },
    });
    
    // Transform to object for easy access
    const result: Record<string, number> = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    
    counts.forEach(({ status, _count }: { status: JobStatus; _count: { status: number } }) => {
      result.total += _count.status;
      
      if (status === JobStatus.CREATED) {
        result.pending = _count.status;
      } else if (['PROCESSING', 'TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'ASSIGNED', 'IN_EDIT'].includes(status)) {
        result.processing += _count.status;
      } else if (status === JobStatus.COMPLETED) {
        result.completed = _count.status;
      } else if (status === JobStatus.CANCELLED) {
        result.failed = _count.status;
      }
    });
    
    return result;
  },
  ['job-counts'],
  {
    tags: [CACHE_TAGS.JOB_COUNTS, CACHE_TAGS.DASHBOARD_STATS],
    revalidate: CACHE_TTL.MEDIUM,
  }
);

/**
 * Get recent job activity for dashboard - cached for 1 minute
 */
export const getCachedRecentJobs = createCachedQuery(
  async (firmId: string, limit = 5) => {
    return prisma.job.findMany({
      where: { firmId },
      select: {
        id: true,
        caseName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  },
  ['recent-jobs'],
  {
    tags: [CACHE_TAGS.JOB_LIST, CACHE_TAGS.DASHBOARD],
    revalidate: CACHE_TTL.SHORT,
  }
);

// =============================================================================
// USER STATISTICS
// =============================================================================

/**
 * Get user counts by role for a firm - cached for 5 minutes
 */
export const getCachedUserCountsByRole = createCachedQuery(
  async (firmId: string) => {
    const counts = await prisma.user.groupBy({
      by: ['role'],
      where: { firmId },
      _count: { role: true },
    });
    
    const result: Record<string, number> = { total: 0 };
    counts.forEach(({ role, _count }: { role: UserRole; _count: { role: number } }) => {
      result[role.toLowerCase()] = _count.role;
      result.total += _count.role;
    });
    
    return result;
  },
  ['user-counts-by-role'],
  {
    tags: [CACHE_TAGS.USER, CACHE_TAGS.DASHBOARD_STATS],
    revalidate: CACHE_TTL.MEDIUM,
  }
);

// =============================================================================
// TRANSCRIPT STATISTICS
// =============================================================================

/**
 * Get transcript completion stats - cached for 5 minutes
 */
export const getCachedTranscriptStats = createCachedQuery(
  async (firmId: string) => {
    const jobs = await prisma.job.findMany({
      where: { firmId },
      select: {
        transcription: {
          select: {
            status: true,
            wordCount: true,
          },
        },
      },
    });
    
    let totalWords = 0;
    let completedCount = 0;
    let processingCount = 0;
    
    jobs.forEach(job => {
      if (job.transcription) {
        totalWords += job.transcription.wordCount || 0;
        if (job.transcription.status === 'COMPLETED') {
          completedCount++;
        } else if (job.transcription.status === 'PROCESSING') {
          processingCount++;
        }
      }
    });
    
    return {
      totalWords,
      completedCount,
      processingCount,
      totalJobs: jobs.length,
    };
  },
  ['transcript-stats'],
  {
    tags: [CACHE_TAGS.TRANSCRIPT, CACHE_TAGS.DASHBOARD_STATS],
    revalidate: CACHE_TTL.MEDIUM,
  }
);

// =============================================================================
// COMBINED DASHBOARD DATA
// =============================================================================

/**
 * Get all dashboard stats in one call - cached for 5 minutes
 * Use this for the main dashboard page
 */
export const getCachedDashboardStats = createCachedQuery(
  async (firmId: string) => {
    const [jobCounts, userCounts, transcriptStats, recentJobs] = await Promise.all([
      getCachedJobCounts(firmId),
      getCachedUserCountsByRole(firmId),
      getCachedTranscriptStats(firmId),
      getCachedRecentJobs(firmId, 5),
    ]);
    
    return {
      jobs: jobCounts,
      users: userCounts,
      transcripts: transcriptStats,
      recentJobs,
      generatedAt: new Date().toISOString(),
    };
  },
  ['dashboard-stats'],
  {
    tags: [CACHE_TAGS.DASHBOARD, CACHE_TAGS.DASHBOARD_STATS],
    revalidate: CACHE_TTL.MEDIUM,
  }
);
