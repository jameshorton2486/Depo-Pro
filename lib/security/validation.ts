// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION & SANITIZATION
// Prevents injection attacks and ensures data integrity
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const schemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  
  email: z.string()
    .email('Invalid email address')
    .transform(s => s.toLowerCase().trim())
    .refine(s => s.length <= 255, 'Email too long'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  caseName: z.string()
    .min(1, 'Case name is required')
    .max(200, 'Case name must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-.,()&']+$/, 'Case name contains invalid characters'),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .refine(
      (name) => !name.includes('..') && !/[<>:"/\\|?*]/.test(name),
      'Filename contains invalid characters'
    ),
  
  url: z.string()
    .url('Invalid URL format')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must use http:// or https://'
    ),
  
  timestamp: z.string()
    .datetime('Invalid timestamp format')
    .or(z.date()),
};

/**
 * Sanitize string input - removes HTML tags and normalizes whitespace
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 10000); // Max length
}

/**
 * Sanitize filename - removes path traversal and invalid characters
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'unnamed';
  }
  
  return filename
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .trim()
    .slice(0, 255) || 'unnamed';
}

/**
 * Sanitize SQL input (for display only - always use parameterized queries)
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove SQL injection patterns (for display only)
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJson<T>(input: unknown): T | null {
  try {
    if (typeof input === 'string') {
      return JSON.parse(input) as T;
    }
    return input as T;
  } catch {
    return null;
  }
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate phone number (E.164 format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Escape HTML entities for safe display
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate file size (in bytes)
 */
export function validateFileSize(size: number, maxSizeBytes: number): boolean {
  return size >= 0 && size <= maxSizeBytes;
}

/**
 * Validate file type by MIME type
 */
export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(ext) : false;
}
