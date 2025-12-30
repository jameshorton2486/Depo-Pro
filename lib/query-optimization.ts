// =============================================================================
// QUERY OPTIMIZATION UTILITIES
// =============================================================================
// Prevent N+1 queries, unbounded lists, and expensive operations
// =============================================================================

import { logger } from '@/lib/logger';

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

export const QueryLimits = {
  // Default page sizes
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // List limits
  MAX_LIST_ITEMS: 1000,
  MAX_SEARCH_RESULTS: 100,
  
  // Relationship limits
  MAX_INCLUDES: 3,
  MAX_RELATION_DEPTH: 2,
  
  // JSON field limits
  MAX_JSON_SIZE_KB: 100,
  
  // Export limits
  MAX_EXPORT_RECORDS: 10000,
  MAX_BULK_OPERATIONS: 100,
} as const;

// =============================================================================
// SAFE PAGINATION
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface SafePagination {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Ensure pagination params are within safe bounds
 */
export function safePagination(params: PaginationParams): SafePagination {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(
    QueryLimits.MAX_PAGE_SIZE,
    Math.max(1, params.limit || QueryLimits.DEFAULT_PAGE_SIZE)
  );
  
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

/**
 * Cursor-based pagination (more efficient for large datasets)
 */
export function cursorPagination(
  cursor: string | undefined,
  limit: number = QueryLimits.DEFAULT_PAGE_SIZE
): { cursor?: { id: string }; take: number } {
  const safeLimit = Math.min(QueryLimits.MAX_PAGE_SIZE, Math.max(1, limit));
  
  if (cursor) {
    return {
      cursor: { id: cursor },
      take: safeLimit + 1, // Fetch one extra to check hasMore
    };
  }
  
  return { take: safeLimit + 1 };
}

// =============================================================================
// SELECT OPTIMIZATION
// =============================================================================

/**
 * Common select patterns to avoid over-fetching
 */
export const SelectPatterns = {
  // User - minimal fields for lists
  USER_LIST: {
    id: true,
    name: true,
    email: true,
    role: true,
  },
  
  // User - full profile
  USER_PROFILE: {
    id: true,
    name: true,
    email: true,
    role: true,
    firmId: true,
    createdAt: true,
    updatedAt: true,
  },
  
  // Job - list view
  JOB_LIST: {
    id: true,
    caseName: true,
    caseNumber: true,
    status: true,
    createdAt: true,
    dueDate: true,
    createdBy: {
      select: { id: true, name: true },
    },
  },
  
  // Job - detail view
  JOB_DETAIL: {
    id: true,
    caseName: true,
    caseNumber: true,
    status: true,
    depositionDate: true,
    dueDate: true,
    witnessName: true,
    createdAt: true,
    updatedAt: true,
    createdBy: {
      select: { id: true, name: true, email: true },
    },
    scopist: {
      select: { id: true, name: true, email: true },
    },
    transcript: {
      select: { id: true, status: true, wordCount: true },
    },
  },
  
  // Transcript - list view (no content)
  TRANSCRIPT_LIST: {
    id: true,
    status: true,
    wordCount: true,
    confidence: true,
    createdAt: true,
    updatedAt: true,
  },
  
  // Transcript - with content (expensive)
  TRANSCRIPT_FULL: {
    id: true,
    fullTranscript: true,
    words: true,
    speakers: true,
    status: true,
    wordCount: true,
    confidence: true,
    createdAt: true,
    updatedAt: true,
  },
} as const;

// =============================================================================
// N+1 PREVENTION
// =============================================================================

/**
 * Batch load related entities to prevent N+1
 */
export async function batchLoad<T, R>(
  items: T[],
  idExtractor: (item: T) => string,
  loader: (ids: string[]) => Promise<R[]>,
  resultIdExtractor: (result: R) => string
): Promise<Map<string, R>> {
  const ids = [...new Set(items.map(idExtractor).filter(Boolean))];
  
  if (ids.length === 0) {
    return new Map();
  }
  
  const results = await loader(ids);
  const map = new Map<string, R>();
  
  for (const result of results) {
    map.set(resultIdExtractor(result), result);
  }
  
  return map;
}

/**
 * Log potential N+1 query pattern
 */
export function warnN1Query(
  context: string,
  itemCount: number,
  queryType: string
): void {
  if (itemCount > 10) {
    logger.warn('Potential N+1 query pattern detected', {
      context,
      itemCount,
      queryType,
      suggestion: 'Use batch loading or includes',
    });
  }
}

// =============================================================================
// QUERY COMPLEXITY GUARD
// =============================================================================

interface QueryComplexity {
  estimatedRows: number;
  joinCount: number;
  whereClauseCount: number;
  hasUnboundedList: boolean;
}

/**
 * Estimate query complexity
 */
export function estimateQueryComplexity(query: {
  include?: Record<string, any>;
  where?: Record<string, any>;
  take?: number;
}): QueryComplexity {
  let joinCount = 0;
  let whereClauseCount = 0;
  
  // Count includes (joins)
  if (query.include) {
    joinCount = countNestedIncludes(query.include);
  }
  
  // Count where clauses
  if (query.where) {
    whereClauseCount = Object.keys(query.where).length;
  }
  
  // Check for unbounded list
  const hasUnboundedList = !query.take || query.take > QueryLimits.MAX_LIST_ITEMS;
  
  // Rough estimate of rows
  const estimatedRows = query.take || QueryLimits.MAX_LIST_ITEMS;
  
  return {
    estimatedRows,
    joinCount,
    whereClauseCount,
    hasUnboundedList,
  };
}

function countNestedIncludes(include: Record<string, any>, depth = 0): number {
  if (depth > QueryLimits.MAX_RELATION_DEPTH) {
    return 0;
  }
  
  let count = 0;
  
  for (const value of Object.values(include)) {
    count++;
    if (typeof value === 'object' && value.include) {
      count += countNestedIncludes(value.include, depth + 1);
    }
  }
  
  return count;
}

/**
 * Guard against expensive queries
 */
export function guardQuery(
  context: string,
  complexity: QueryComplexity
): { allowed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (complexity.hasUnboundedList) {
    warnings.push('Query has no limit or exceeds max list size');
  }
  
  if (complexity.joinCount > QueryLimits.MAX_INCLUDES) {
    warnings.push(`Query has ${complexity.joinCount} joins (max: ${QueryLimits.MAX_INCLUDES})`);
  }
  
  if (complexity.estimatedRows > QueryLimits.MAX_LIST_ITEMS) {
    warnings.push(`Query may return ${complexity.estimatedRows} rows (max: ${QueryLimits.MAX_LIST_ITEMS})`);
  }
  
  if (warnings.length > 0) {
    logger.warn('Query complexity warning', { context, complexity, warnings });
  }
  
  // Allow but warn (in production, you might block)
  return {
    allowed: true,
    warnings,
  };
}

// =============================================================================
// JSON SIZE GUARD
// =============================================================================

/**
 * Check JSON field size before storing
 */
export function guardJsonSize(
  fieldName: string,
  data: unknown
): { allowed: boolean; sizeKB: number; warning?: string } {
  const json = JSON.stringify(data);
  const sizeKB = Buffer.byteLength(json, 'utf8') / 1024;
  
  if (sizeKB > QueryLimits.MAX_JSON_SIZE_KB) {
    return {
      allowed: false,
      sizeKB,
      warning: `${fieldName} exceeds max size (${sizeKB.toFixed(1)}KB > ${QueryLimits.MAX_JSON_SIZE_KB}KB)`,
    };
  }
  
  if (sizeKB > QueryLimits.MAX_JSON_SIZE_KB * 0.8) {
    logger.warn('JSON field approaching size limit', { fieldName, sizeKB });
  }
  
  return { allowed: true, sizeKB };
}

// =============================================================================
// BULK OPERATION GUARD
// =============================================================================

/**
 * Guard bulk operations
 */
export function guardBulkOperation(
  operation: string,
  itemCount: number
): { allowed: boolean; batchSize: number; batchCount: number; warning?: string } {
  if (itemCount > QueryLimits.MAX_BULK_OPERATIONS) {
    return {
      allowed: false,
      batchSize: QueryLimits.MAX_BULK_OPERATIONS,
      batchCount: Math.ceil(itemCount / QueryLimits.MAX_BULK_OPERATIONS),
      warning: `Bulk ${operation} limited to ${QueryLimits.MAX_BULK_OPERATIONS} items per batch`,
    };
  }
  
  return {
    allowed: true,
    batchSize: itemCount,
    batchCount: 1,
  };
}

/**
 * Execute operation in batches
 */
export async function executeBatched<T, R>(
  items: T[],
  batchSize: number,
  executor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await executor(batch);
    results.push(...batchResults);
    
    // Small delay between batches to reduce pressure
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
