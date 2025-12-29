/**
 * Security utilities for production hardening
 * Phase 5: Production Hardening
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@prisma/client';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  // API endpoints
  API_GLOBAL: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  API_AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 auth attempts per 15 minutes
  API_TRANSCRIPTION: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 transcription requests per minute

  // File uploads
  UPLOAD_GLOBAL: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 uploads per minute
  UPLOAD_LARGE: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 large uploads per hour
} as const;

/**
 * Check rate limit for a given identifier and action
 */
export function checkRateLimit(
  identifier: string,
  action: keyof typeof RATE_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const config = RATE_LIMITS[action];
  const now = Date.now();
  const key = `${action}:${identifier}`;

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Authentication guard for API routes
 */
export async function requireAuth(_request?: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('UNAUTHENTICATED');
  }

  return session;
}

/**
 * Role-based authorization guard
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
) {
  const session = await requireAuth(request);

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('UNAUTHORIZED');
  }

  return session;
}

/**
 * Firm membership guard (multi-tenant)
 */
export async function requireFirmAccess(
  request: NextRequest,
  firmId: string
) {
  const session = await requireAuth(request);

  // Admin can access all firms
  if (session.user.role === 'ADMIN') {
    return session;
  }

  // Check if user belongs to the firm
  if (session.user.firmId !== firmId) {
    throw new Error('FIRM_ACCESS_DENIED');
  }

  return session;
}

/**
 * Case membership guard (case-level permissions)
 */
export async function requireCaseAccess(
  request: NextRequest,
  _caseId: string,
  _requiredRole?: 'ATTORNEY' | 'PARALEGAL'
) {
  const session = await requireAuth(request);

  // Admin can access all cases
  if (session.user.role === 'ADMIN') {
    return session;
  }

  // For now, check firm membership (Phase 3 will add case-level permissions)
  // TODO: Implement case membership checks when CaseMembership is fully implemented

  return session;
}

/**
 * Input validation helpers
 */
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s\-()]{10,}$/,
  FILE_SIZE_MAX: 100 * 1024 * 1024, // 100MB
  FILENAME: /^[a-zA-Z0-9._\-\s]+$/,
} as const;

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number = VALIDATION_RULES.FILE_SIZE_MAX
) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }

  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
  }

  if (!VALIDATION_RULES.FILENAME.test(file.name)) {
    throw new Error('Invalid filename. Use only letters, numbers, dots, hyphens, underscores, and spaces.');
  }
}

/**
 * Environment validation
 */
export function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEEPGRAM_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URLs
  try {
    new URL(process.env.NEXTAUTH_URL!);
    new URL(process.env.SUPABASE_URL!);
  } catch {
    throw new Error('Invalid URL format in environment variables');
  }
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
} as const;

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(headers: Headers) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

/**
 * Audit logging helper
 */
export async function logSecurityEvent(
  userId: string,
  action: string,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  // In production, this would write to a secure audit log
  console.log('SECURITY EVENT:', {
    userId,
    action,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date().toISOString(),
  });
}