// =============================================================================
// FIRM CACHED QUERIES
// =============================================================================
// Cached queries for firm-related data
// Firms change infrequently - safe to cache aggressively
// =============================================================================

import { 
  createCachedQuery, 
  createRequestCache,
  CACHE_TAGS, 
  CACHE_TTL,
} from './index';

// =============================================================================
// FIRM QUERIES
// =============================================================================

/**
 * Get firm by ID - cached for 15 minutes
 * INVALIDATION: Call invalidateEntityCache('firm', firmId) on firm update
 */
export const getCachedFirm = createCachedQuery(
  async (firmId: string) => {
    return prisma.firm.findUnique({
      where: { id: firmId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });
  },
  ['firm'],
  {
    tags: [CACHE_TAGS.FIRM],
    revalidate: CACHE_TTL.LONG,
  }
);

/**
 * Get firm settings - cached for 15 minutes
 * INVALIDATION: Call invalidateCache(CACHE_TAGS.FIRM_SETTINGS) on settings update
 */
export const getCachedFirmSettings = createCachedQuery(
  async (_firmId: string) => {
    // Settings field does not exist in the current Firm model
    return {};
  },
  ['firm-settings'],
  {
    tags: [CACHE_TAGS.FIRM_SETTINGS],
    revalidate: CACHE_TTL.LONG,
  }
);

/**
 * Get firm user count - cached for 5 minutes
 * INVALIDATION: Call on user add/remove from firm
 */
export const getCachedFirmUserCount = createCachedQuery(
  async (firmId: string) => {
    return prisma.user.count({
      where: { firmId },
    });
  },
  ['firm-user-count'],
  {
    tags: [CACHE_TAGS.FIRM, CACHE_TAGS.USER],
    revalidate: CACHE_TTL.MEDIUM,
  }
);

/**
 * Get firm with basic stats - request-scoped cache
 * Use when you need firm data multiple times in one request
 */
export const getRequestScopedFirm = createRequestCache(
  async (firmId: string) => {
    return prisma.firm.findUnique({
      where: { id: firmId },
      include: {
        _count: {
          select: {
            users: true,
            jobs: true,
          },
        },
      },
    });
  }
);

// =============================================================================
// FIRM LIST QUERIES
// =============================================================================

/**
 * Get all firms (admin only) - cached for 5 minutes
 * INVALIDATION: Call invalidateCache(CACHE_TAGS.FIRM) on firm create/delete
 */
export const getCachedFirmList = createCachedQuery(
  async () => {
    return prisma.firm.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            jobs: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },
  ['firm-list'],
  {
    tags: [CACHE_TAGS.FIRM],
    revalidate: CACHE_TTL.MEDIUM,
  }
);
