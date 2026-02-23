// =============================================================================
// RATE LIMITING SERVICE
// =============================================================================
// Lightweight, in-memory rate limiting for API protection
// For production scale, swap to Redis-backed implementation
// =============================================================================

import { logger } from '@/lib/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const RateLimitConfig = {
  // Per-user limits (requests per window)
  USER: {
    API_GENERAL: { requests: 100, windowMs: 60 * 1000 },      // 100/min
    API_SEARCH: { requests: 30, windowMs: 60 * 1000 },        // 30/min
    TRANSCRIPT_VIEW: { requests: 60, windowMs: 60 * 1000 },   // 60/min
    TRANSCRIPT_EXPORT: { requests: 10, windowMs: 60 * 1000 }, // 10/min
    TRANSCRIPTION: { requests: 5, windowMs: 60 * 1000 },      // 5/min
    LOGIN: { requests: 5, windowMs: 15 * 60 * 1000 },         // 5/15min
    PROFILE_UPDATE: { requests: 10, windowMs: 60 * 1000 },    // 10/min
    AI_REVIEW: { requests: 5, windowMs: 60 * 60 * 1000 },     // 5/hr
  },
  
  // Per-firm limits (aggregate across all users)
  FIRM: {
    API_GENERAL: { requests: 1000, windowMs: 60 * 1000 },     // 1000/min
    TRANSCRIPTION: { requests: 20, windowMs: 60 * 1000 },     // 20/min
    EXPORT: { requests: 50, windowMs: 60 * 1000 },            // 50/min
    WEBHOOK_DISPATCH: { requests: 100, windowMs: 60 * 1000 }, // 100/min
  },
  
  // Global limits (system-wide protection)
  GLOBAL: {
    TOTAL_REQUESTS: { requests: 10000, windowMs: 60 * 1000 }, // 10k/min
  },
} as const;

export type UserLimitType = keyof typeof RateLimitConfig.USER;
export type FirmLimitType = keyof typeof RateLimitConfig.FIRM;

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Simple in-memory store (replace with Redis for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Rate limit cleanup', { cleaned, remaining: rateLimitStore.size });
    }
  }, CLEANUP_INTERVAL);
}

// Start cleanup on module load
startCleanup();

// =============================================================================
// CORE RATE LIMIT FUNCTION
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check and increment rate limit
 */
export function checkRateLimit(
  key: string,
  limit: { requests: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + limit.windowMs,
    });
    
    return {
      allowed: true,
      remaining: limit.requests - 1,
      resetAt: now + limit.windowMs,
    };
  }
  
  // Check if over limit
  if (entry.count >= limit.requests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }
  
  // Increment count
  entry.count++;
  
  return {
    allowed: true,
    remaining: limit.requests - entry.count,
    resetAt: entry.resetAt,
  };
}

// =============================================================================
// USER RATE LIMITING
// =============================================================================

/**
 * Check rate limit for a specific user
 */
export function checkUserRateLimit(
  userId: string,
  limitType: UserLimitType
): RateLimitResult {
  const config = RateLimitConfig.USER[limitType];
  const key = `user:${userId}:${limitType}`;
  
  return checkRateLimit(key, config);
}

/**
 * Check rate limit by IP (for unauthenticated requests)
 */
export function checkIpRateLimit(
  ipAddress: string,
  limitType: UserLimitType
): RateLimitResult {
  const config = RateLimitConfig.USER[limitType];
  const key = `ip:${ipAddress}:${limitType}`;
  
  return checkRateLimit(key, config);
}

// =============================================================================
// FIRM RATE LIMITING
// =============================================================================

/**
 * Check rate limit for a firm (aggregate)
 */
export function checkFirmRateLimit(
  firmId: string,
  limitType: FirmLimitType
): RateLimitResult {
  const config = RateLimitConfig.FIRM[limitType];
  const key = `firm:${firmId}:${limitType}`;
  
  return checkRateLimit(key, config);
}

// =============================================================================
// COMBINED CHECK
// =============================================================================

export interface CombinedRateLimitResult {
  allowed: boolean;
  limitedBy?: 'user' | 'firm' | 'global';
  userResult: RateLimitResult;
  firmResult?: RateLimitResult;
  retryAfter?: number;
}

/**
 * Check both user and firm rate limits
 */
export function checkCombinedRateLimit(
  userId: string,
  firmId: string | undefined,
  userLimitType: UserLimitType,
  firmLimitType?: FirmLimitType
): CombinedRateLimitResult {
  // Check user limit
  const userResult = checkUserRateLimit(userId, userLimitType);
  
  if (!userResult.allowed) {
    return {
      allowed: false,
      limitedBy: 'user',
      userResult,
      retryAfter: userResult.retryAfter,
    };
  }
  
  // Check firm limit if applicable
  if (firmId && firmLimitType) {
    const firmResult = checkFirmRateLimit(firmId, firmLimitType);
    
    if (!firmResult.allowed) {
      return {
        allowed: false,
        limitedBy: 'firm',
        userResult,
        firmResult,
        retryAfter: firmResult.retryAfter,
      };
    }
    
    return {
      allowed: true,
      userResult,
      firmResult,
    };
  }
  
  return {
    allowed: true,
    userResult,
  };
}

// =============================================================================
// MIDDLEWARE HELPER
// =============================================================================

import { NextResponse } from 'next/server';

/**
 * Create rate limit response with headers
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
        'Retry-After': String(result.retryAfter || 60),
      },
    }
  );
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetAt));
  return response;
}

// =============================================================================
// ABUSE DETECTION
// =============================================================================

interface AbusePattern {
  userId: string;
  pattern: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

const abusePatterns = new Map<string, AbusePattern>();

/**
 * Track potential abuse patterns
 */
export function trackAbusePattern(
  userId: string,
  pattern: string
): void {
  const key = `${userId}:${pattern}`;
  const existing = abusePatterns.get(key);
  
  if (existing) {
    existing.count++;
    existing.lastSeen = new Date();
  } else {
    abusePatterns.set(key, {
      userId,
      pattern,
      count: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
    });
  }
}

/**
 * Check if user has abuse pattern
 */
export function hasAbusePattern(
  userId: string,
  pattern: string,
  threshold: number = 10
): boolean {
  const key = `${userId}:${pattern}`;
  const entry = abusePatterns.get(key);
  
  return entry ? entry.count >= threshold : false;
}

/**
 * Get all abuse patterns for reporting
 */
export function getAbusePatterns(): AbusePattern[] {
  return Array.from(abusePatterns.values());
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  totalEntries: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  
  for (const key of rateLimitStore.keys()) {
    const type = key.split(':').slice(-1)[0];
    byType[type] = (byType[type] || 0) + 1;
  }
  
  return {
    totalEntries: rateLimitStore.size,
    byType,
  };
}
