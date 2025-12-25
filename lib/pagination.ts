// =============================================================================
// PAGINATION UTILITIES
// Standardized pagination for all list endpoints
// =============================================================================

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction: 'forward' | 'backward';
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 25,
  maxLimit: 100,
} as const;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION_DEFAULTS.page),
  limit: z.coerce.number().int().positive().max(PAGINATION_DEFAULTS.maxLimit).default(PAGINATION_DEFAULTS.limit),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(PAGINATION_DEFAULTS.maxLimit).default(PAGINATION_DEFAULTS.limit),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const result = paginationSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  });

  if (!result.success) {
    return {
      page: PAGINATION_DEFAULTS.page,
      limit: PAGINATION_DEFAULTS.limit,
      skip: 0,
    };
  }

  return {
    page: result.data.page,
    limit: result.data.limit,
    skip: (result.data.page - 1) * result.data.limit,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    },
  };
}

export function parseCursorParams(searchParams: URLSearchParams): CursorPaginationParams {
  const result = cursorPaginationSchema.safeParse({
    cursor: searchParams.get('cursor'),
    limit: searchParams.get('limit'),
    direction: searchParams.get('direction'),
  });

  if (!result.success) {
    return {
      limit: PAGINATION_DEFAULTS.limit,
      direction: 'forward',
    };
  }

  return result.data;
}

export function createCursorResponse<T extends { id: string }>(
  data: T[],
  params: CursorPaginationParams,
  hasMore: boolean
): CursorPaginatedResponse<T> {
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;
  const prevCursor = data.length > 0 ? data[0].id : null;

  return {
    data,
    pagination: {
      nextCursor,
      prevCursor: params.cursor ? prevCursor : null,
      hasMore,
    },
  };
}

export function getPrismaPagination(params: PaginationParams) {
  return {
    take: params.limit,
    skip: params.skip,
  };
}

export function getPrismaCursorPagination(params: CursorPaginationParams) {
  return {
    take: params.limit + 1,
    ...(params.cursor && {
      cursor: { id: params.cursor },
      skip: 1,
    }),
  };
}
