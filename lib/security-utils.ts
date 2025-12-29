// =============================================================================
// SECURITY UTILITIES
// =============================================================================
// Server-side security checks and validation
// 
// RULES:
// - All access checks are server-side (NEVER trust client)
// - No PII in logs or error messages
// - Fail secure (deny by default)
// =============================================================================

import { createAuditLog, AuditAction, AuditTargetType } from './audit-service';
import { logger } from '@/lib/logger';

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export const SecurityConfig = {
  // Session settings
  SESSION_MAX_AGE: 24 * 60 * 60,  // 24 hours
  SESSION_REFRESH_THRESHOLD: 60 * 60,  // Refresh if < 1 hour remaining
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60,  // 15 minutes
  
  // Password requirements
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,
  
  // Token settings
  INVITE_TOKEN_EXPIRY: 7 * 24 * 60 * 60,  // 7 days
  RESET_TOKEN_EXPIRY: 60 * 60,  // 1 hour
  
  // Data settings
  MAX_EXPORT_RECORDS: 10000,
  AUDIT_RETENTION_DAYS: 365 * 7,  // 7 years for legal compliance
} as const;

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;
  
  if (password.length < SecurityConfig.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SecurityConfig.PASSWORD_MIN_LENGTH} characters`);
  } else {
    score++;
  }
  
  if (SecurityConfig.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score++;
  }
  
  if (SecurityConfig.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score++;
  }
  
  if (SecurityConfig.PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score++;
  }
  
  if (SecurityConfig.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score++;
  }
  
  // Check for common patterns
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot be all the same character');
  }
  
  if (/^(123|abc|qwerty)/i.test(password)) {
    errors.push('Password cannot start with common sequences');
  }
  
  const strength = score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak';
  
  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')  // Remove angle brackets
    .replace(/javascript:/gi, '')  // Remove javascript: protocol
    .replace(/on\w+=/gi, '')  // Remove event handlers
    .trim();
}

/**
 * Sanitize object for logging (remove sensitive fields)
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey', 'creditCard']
): T {
  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field as keyof T] = '[REDACTED]' as any;
    }
  }
  
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// =============================================================================
// SECURE COMPARISON
// =============================================================================

/**
 * Timing-safe string comparison
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// =============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// =============================================================================

interface SuspiciousActivityCheck {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}

/**
 * Check for suspicious patterns in request
 */
export function detectSuspiciousActivity(
  request: Request,
  context?: {
    userId?: string;
    recentActions?: { action: string; timestamp: Date }[];
  }
): SuspiciousActivityCheck[] {
  const suspicious: SuspiciousActivityCheck[] = [];
  
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  
  // Check for SQL injection patterns
  const sqlPatterns = /(\b(union|select|insert|update|delete|drop|exec)\b)/i;
  if (sqlPatterns.test(url.search)) {
    suspicious.push({
      type: 'SQL_INJECTION_ATTEMPT',
      severity: 'high',
      details: { pattern: 'sql', url: url.pathname },
    });
  }
  
  // Check for XSS patterns
  const xssPatterns = /(<script|javascript:|on\w+=)/i;
  if (xssPatterns.test(url.search)) {
    suspicious.push({
      type: 'XSS_ATTEMPT',
      severity: 'high',
      details: { pattern: 'xss', url: url.pathname },
    });
  }
  
  // Check for path traversal
  if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
    suspicious.push({
      type: 'PATH_TRAVERSAL_ATTEMPT',
      severity: 'high',
      details: { path: url.pathname },
    });
  }
  
  // Check for bot patterns
  const botPatterns = /(bot|crawler|spider|scraper)/i;
  if (botPatterns.test(userAgent)) {
    suspicious.push({
      type: 'BOT_DETECTED',
      severity: 'low',
      details: { userAgent: userAgent.substring(0, 100) },
    });
  }
  
  // Check for rapid actions (if context provided)
  if (context?.recentActions && context.recentActions.length > 50) {
    const last5Minutes = context.recentActions.filter(
      a => new Date().getTime() - a.timestamp.getTime() < 5 * 60 * 1000
    );
    
    if (last5Minutes.length > 100) {
      suspicious.push({
        type: 'RAPID_ACTIONS',
        severity: 'medium',
        details: { actionsIn5Min: last5Minutes.length },
      });
    }
  }
  
  return suspicious;
}

/**
 * Log and handle suspicious activity
 */
export async function handleSuspiciousActivity(
  checks: SuspiciousActivityCheck[],
  context: {
    userId?: string;
    firmId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  if (checks.length === 0) return;
  
  const highSeverity = checks.filter(c => 
    c.severity === 'high' || c.severity === 'critical'
  );
  
  // Log all suspicious activity
  for (const check of checks) {
    await createAuditLog({
      actorUserId: context.userId,
      firmId: context.firmId,
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      targetType: AuditTargetType.SYSTEM,
      targetId: 'security',
      metadata: {
        type: check.type,
        severity: check.severity,
        ...check.details,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
  
  // Alert on high severity
  if (highSeverity.length > 0) {
    logger.warn('High severity suspicious activity detected', {
      userId: context.userId,
      ipAddress: context.ipAddress,
      checks: highSeverity,
    });
    
    // TODO: Send alert to admin
    // await sendSecurityAlert(highSeverity, context);
  }
}

// =============================================================================
// DATA MASKING
// =============================================================================

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Mask name for partial display
 */
export function maskName(name: string): string {
  const parts = name.split(' ');
  return parts.map(part => 
    part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : '*'
  ).join(' ');
}

// =============================================================================
// EXPORT SECURITY
// =============================================================================

/**
 * Validate export request
 */
export function validateExportRequest(
  userId: string,
  firmId: string,
  recordCount: number
): { allowed: boolean; reason?: string } {
  if (recordCount > SecurityConfig.MAX_EXPORT_RECORDS) {
    return {
      allowed: false,
      reason: `Export limited to ${SecurityConfig.MAX_EXPORT_RECORDS} records`,
    };
  }
  
  return { allowed: true };
}

// =============================================================================
// HELPERS
// =============================================================================

import crypto from 'crypto';

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for storage
 */
export async function hashSensitiveData(data: string): Promise<string> {
  return crypto.createHash('sha256').update(data).digest('hex');
}
