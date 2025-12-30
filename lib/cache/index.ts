// =============================================================================
// CACHING UTILITIES
// =============================================================================
// Server-side caching with React cache() and unstable_cache
// Use for frequently read, infrequently changed data
// =============================================================================

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

export const CACHE_TAGS = {
  // Firm-related
  FIRM: 'firm',
  FIRM_SETTINGS: 'firm-settings',
  
  // User-related
  USER: 'user',
  USER_PERMISSIONS: 'user-permissions',
  
  // Job-related
  JOB: 'job',
  JOB_LIST: 'job-list',
  JOB_COUNTS: 'job-counts',
  
  // Transcript-related
  TRANSCRIPT: 'transcript',
  TRANSCRIPT_META: 'transcript-meta',
  
  // Calendar-related
  CALENDAR: 'calendar',
  CALENDAR_SUMMARY: 'calendar-summary',
  
  // Dashboard
  DASHBOARD: 'dashboard',
  DASHBOARD_STATS: 'dashboard-stats',
} as const;

export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS];

// Revalidation times in seconds
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - for semi-dynamic data
  MEDIUM: 300,         // 5 minutes - for dashboard stats
  LONG: 900,           // 15 minutes - for firm settings
  VERY_LONG: 3600,     // 1 hour - for rarely changing data
} as const;

// =============================================================================
// CACHE WRAPPER HELPERS
// =============================================================================

/**
 * Create a cached function with automatic tagging
 * Use for data that changes infrequently
 */
export function createCachedQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  options: {
    tags?: CacheTag[];
    revalidate?: number;
  } = {}
): T {
  const { tags = [], revalidate = CACHE_TTL.MEDIUM } = options;
  
  return unstable_cache(
    fn,
    keyParts,
    {
      tags,
      revalidate,
    }
  ) as T;
}

/**
 * Create a request-scoped cached function
 * Use for data accessed multiple times in single request
 */
export function createRequestCache<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return cache(fn) as T;
}

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

import { revalidateTag, revalidatePath } from 'next/cache';

export function invalidateCache(tag: CacheTag | CacheTag[]): void {
  const tags = Array.isArray(tag) ? tag : [tag];
  tags.forEach(t => {
    try {
      // Cast to bypass signature mismatch in specific Next.js versions
      (revalidateTag as unknown as (tag: string) => void)(t);
    } catch (error) {
      console.warn(`Failed to revalidate tag: ${t}`, error);
    }
  });
}

/**
 * Invalidate cache for a specific entity
 */
export function invalidateEntityCache(
  entityType: 'firm' | 'user' | 'job' | 'transcript',
  _entityId: string
): void {
  const tagMap: Record<string, CacheTag[]> = {
    firm: [CACHE_TAGS.FIRM, CACHE_TAGS.FIRM_SETTINGS],
    user: [CACHE_TAGS.USER, CACHE_TAGS.USER_PERMISSIONS],
    job: [CACHE_TAGS.JOB, CACHE_TAGS.JOB_LIST, CACHE_TAGS.JOB_COUNTS, CACHE_TAGS.DASHBOARD_STATS],
    transcript: [CACHE_TAGS.TRANSCRIPT, CACHE_TAGS.TRANSCRIPT_META],
  };
  
  invalidateCache(tagMap[entityType] || []);
}

/**
 * Invalidate dashboard cache
 */
export function invalidateDashboardCache(): void {
  invalidateCache([
    CACHE_TAGS.DASHBOARD,
    CACHE_TAGS.DASHBOARD_STATS,
    CACHE_TAGS.JOB_COUNTS,
  ]);
}

/**
 * Invalidate path-based cache
 */
export function invalidatePath(path: string): void {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn(`Failed to revalidate path: ${path}`, error);
  }
}

// =============================================================================
// CACHE KEY BUILDERS
// =============================================================================

export function buildCacheKey(...parts: (string | number)[]): string {
  return parts.filter(Boolean).join(':');
}

export const CacheKeys = {
  firm: (firmId: string) => buildCacheKey('firm', firmId),
  firmSettings: (firmId: string) => buildCacheKey('firm', firmId, 'settings'),
  user: (userId: string) => buildCacheKey('user', userId),
  userPermissions: (userId: string) => buildCacheKey('user', userId, 'permissions'),
  jobCounts: (firmId: string) => buildCacheKey('jobs', firmId, 'counts'),
  jobList: (firmId: string, status?: string) => buildCacheKey('jobs', firmId, 'list', status || 'all'),
  transcriptMeta: (transcriptId: string) => buildCacheKey('transcript', transcriptId, 'meta'),
  dashboardStats: (firmId: string) => buildCacheKey('dashboard', firmId, 'stats'),
  calendarSummary: (userId: string, month: string) => buildCacheKey('calendar', userId, month),
};
