// ═══════════════════════════════════════════════════════════════════════════
// QUERY OPTIMIZATION UTILITIES
// Helpers for efficient database queries
// ═══════════════════════════════════════════════════════════════════════════

// Pagination helper
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function getPaginationRange(params: PaginationParams): { from: number; to: number } {
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;
  return { from, to };
}

export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
}

// Query timing helper
export async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    
    if (duration > 1000) {
      console.warn(`[Slow Query] ${name}: ${duration.toFixed(2)}ms`);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[Query] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Query Error] ${name}: ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

// Batch loader for avoiding N+1 queries
export class BatchLoader<K, V> {
  private batch: Map<K, Array<{ resolve: (v: V) => void; reject: (e: Error) => void }>> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private readonly batchFn: (keys: K[]) => Promise<Map<K, V>>;
  private readonly delayMs: number;

  constructor(batchFn: (keys: K[]) => Promise<Map<K, V>>, delayMs = 10) {
    this.batchFn = batchFn;
    this.delayMs = delayMs;
  }

  async load(key: K): Promise<V> {
    return new Promise((resolve, reject) => {
      const existing = this.batch.get(key);
      if (existing) {
        existing.push({ resolve, reject });
      } else {
        this.batch.set(key, [{ resolve, reject }]);
      }

      if (!this.timer) {
        this.timer = setTimeout(() => this.executeBatch(), this.delayMs);
      }
    });
  }

  private async executeBatch() {
    this.timer = null;
    const currentBatch = this.batch;
    this.batch = new Map();

    const keys = Array.from(currentBatch.keys());
    try {
      const results = await this.batchFn(keys);
      for (const [key, handlers] of currentBatch) {
        const value = results.get(key);
        handlers.forEach(({ resolve, reject }) => {
          if (value !== undefined) {
            resolve(value);
          } else {
            reject(new Error(`No result for key: ${key}`));
          }
        });
      }
    } catch (error) {
      for (const handlers of currentBatch.values()) {
        handlers.forEach(({ reject }) => reject(error as Error));
      }
    }
  }
}
