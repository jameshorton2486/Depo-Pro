/**
 * Parse Supabase Auth Errors (Client-Safe)
 * Extracted from auth-logger to avoid server-only dependencies
 */

import type { AuthError } from '@supabase/supabase-js';

/**
 * Parse Supabase auth errors into user-friendly messages
 * Client-safe - no server-only dependencies
 */
export function parseAuthError(error: AuthError | Error | unknown): {
  userMessage: string;
  technicalDetails: string;
  code: string;
} {
  if (!error) {
    return {
      userMessage: 'An unknown error occurred',
      technicalDetails: 'Error object was null/undefined',
      code: 'UNKNOWN',
    };
  }
  
  const errorObj = error as AuthError;
  const message = errorObj.message || String(error);
  const code = errorObj.code || 'UNKNOWN';
  
  // Map known errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
    'Email not confirmed': 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
    'User not found': 'No account found with this email address.',
    'Invalid email': 'Please enter a valid email address.',
    'Signup disabled': 'New account registration is currently disabled.',
    'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
    'Error sending recovery email': 'Unable to send password reset email. Please check your Supabase email settings.',
    'Password too short': 'Password must be at least 6 characters long.',
    'User already registered': 'An account with this email already exists. Try signing in instead.',
    'Invalid API key': 'Authentication error. Please refresh the page and try again.',
    'JWT expired': 'Your session has expired. Please sign in again.',
  };
  
  // Find matching error message
  let userMessage = 'An error occurred. Please try again.';
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      userMessage = value;
      break;
    }
  }
  
  return {
    userMessage,
    technicalDetails: message,
    code,
  };
}
