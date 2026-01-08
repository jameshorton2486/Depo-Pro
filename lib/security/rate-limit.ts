// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// Prevents abuse and ensures fair resource usage
// ═══════════════════════════════════════════════════════════════════════════

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn?: number;
}

// In-memory store (for single-instance deployments)
// For production with multiple instances, use Redis or similar
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  authentication: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  transcription: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 transcriptions per hour
  fileUpload: { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 uploads per hour
  api: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  export: { windowMs: 60 * 60 * 1000, maxRequests: 20 }, // 20 exports per hour
};

/**
 * Check if a request should be rate limited
 * @param clientId - Unique identifier for the client (user ID, IP address, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and remaining requests
 */
export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = clientId;
  const record = rateLimitStore.get(key);

  // No record or expired - create new
  if (!record || record.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
  };
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(
  clientId: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = clientId;
  const record = rateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    return { allowed: true, remaining: config.maxRequests };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
  };
}

/**
 * Reset rate limit for a client (admin function)
 */
export function resetRateLimit(clientId: string): void {
  rateLimitStore.delete(clientId);
}

/**
 * Get client ID from request (IP address or user ID)
 */
export function getClientId(request: { headers: Headers }, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}
