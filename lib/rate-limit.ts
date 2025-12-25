// =============================================================================
// RATE LIMITING
// Simple in-memory rate limiter (use Redis in production at scale)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS = {
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  export: { windowMs: 60 * 1000, maxRequests: 10 },
  upload: { windowMs: 60 * 1000, maxRequests: 20 },
  transcription: { windowMs: 60 * 1000, maxRequests: 5 },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getRateLimitKey(
  identifier: string,
  endpoint: string
): string {
  return `${identifier}:${endpoint}`;
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function withRateLimit<T>(
  handler: () => Promise<T>,
  key: string,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<T | Response> {
  const result = checkRateLimit(key, config);
  
  if (!result.allowed) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
            retryAfter: result.retryAfter,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetAt),
            'Retry-After': String(result.retryAfter),
          },
        }
      )
    );
  }

  return handler();
}
