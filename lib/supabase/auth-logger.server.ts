/**
 * Supabase Auth Logger
 * Wraps auth operations with detailed logging for debugging
 */

import type { SupabaseClient, AuthError } from '@supabase/supabase-js';
import { enhancedLogger } from '@/lib/logger/enhanced-logger.server';

// Sanitize sensitive data for logging
function sanitizeEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.substring(0, 2)}***@${domain}`;
}

// Parse Supabase auth errors into user-friendly messages
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

// Create logged auth wrapper
export function createLoggedAuthClient(supabase: SupabaseClient) {
  const originalAuth = supabase.auth;

  return {
    ...originalAuth,

    async signInWithPassword(credentials: { email: string; password: string }) {
      const startTime = Date.now();
      const sanitizedEmail = sanitizeEmail(credentials.email);

      enhancedLogger.auth.info('Login attempt started', {
        email: sanitizedEmail,
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await originalAuth.signInWithPassword(credentials);
        const duration = Date.now() - startTime;

        if (result.error) {
          const parsed = parseAuthError(result.error);
          enhancedLogger.auth.error('Login failed', {
            email: sanitizedEmail,
            error: parsed.technicalDetails,
            code: parsed.code,
            duration,
          });
          return result;
        }

        enhancedLogger.auth.info('Login successful', {
          email: sanitizedEmail,
          userId: result.data.user?.id,
          duration,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsed = parseAuthError(error);

        enhancedLogger.auth.error('Login exception', {
          email: sanitizedEmail,
          error: parsed.technicalDetails,
          duration,
        });

        throw error;
      }
    },

    async signUp(credentials: { email: string; password: string; options?: any }) {
      const startTime = Date.now();
      const sanitizedEmail = sanitizeEmail(credentials.email);

      enhancedLogger.auth.info('Signup attempt started', {
        email: sanitizedEmail,
      });

      try {
        const result = await originalAuth.signUp(credentials);
        const duration = Date.now() - startTime;

        if (result.error) {
          const parsed = parseAuthError(result.error);
          enhancedLogger.auth.error('Signup failed', {
            email: sanitizedEmail,
            error: parsed.technicalDetails,
            code: parsed.code,
            duration,
          });
          return result;
        }

        enhancedLogger.auth.info('Signup successful', {
          email: sanitizedEmail,
          userId: result.data.user?.id,
          emailConfirmationRequired: !result.data.user?.email_confirmed_at,
          duration,
        });

        return result;
      } catch (error) {
        enhancedLogger.auth.error('Signup exception', {
          email: sanitizedEmail,
          error: parseAuthError(error).technicalDetails,
        });
        throw error;
      }
    },

    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
      const startTime = Date.now();
      const sanitizedEmail = sanitizeEmail(email);

      enhancedLogger.auth.info('Password reset requested', {
        email: sanitizedEmail,
        redirectTo: options?.redirectTo,
      });

      try {
        const result = await originalAuth.resetPasswordForEmail(email, options);
        const duration = Date.now() - startTime;

        if (result.error) {
          const parsed = parseAuthError(result.error);
          enhancedLogger.auth.error('Password reset failed', {
            email: sanitizedEmail,
            error: parsed.technicalDetails,
            code: parsed.code,
            duration,
            // Include hint for common fix
            hint: parsed.technicalDetails.includes('recovery email')
              ? 'Check Supabase Dashboard → Authentication → Email Templates → Enable SMTP or Supabase email'
              : undefined,
          });
          return result;
        }

        enhancedLogger.auth.info('Password reset email sent', {
          email: sanitizedEmail,
          duration,
        });

        return result;
      } catch (error) {
        enhancedLogger.auth.error('Password reset exception', {
          email: sanitizedEmail,
          error: parseAuthError(error).technicalDetails,
        });
        throw error;
      }
    },

    async signOut() {
      enhancedLogger.auth.info('Signout requested');

      try {
        const result = await originalAuth.signOut();

        if (result.error) {
          enhancedLogger.auth.error('Signout failed', {
            error: parseAuthError(result.error).technicalDetails,
          });
        } else {
          enhancedLogger.auth.info('Signout successful');
        }

        return result;
      } catch (error) {
        enhancedLogger.auth.error('Signout exception', {
          error: parseAuthError(error).technicalDetails,
        });
        throw error;
      }
    },

    async getUser() {
      try {
        const result = await originalAuth.getUser();

        if (result.error) {
          enhancedLogger.auth.warn('Get user failed', {
            error: parseAuthError(result.error).technicalDetails,
          });
        } else {
          enhancedLogger.auth.debug('User retrieved', {
            hasUser: !!result.data.user,
            userId: result.data.user?.id,
          });
        }

        return result;
      } catch (error) {
        enhancedLogger.auth.error('Get user exception', {
          error: parseAuthError(error).technicalDetails,
        });
        throw error;
      }
    },

    async updateUser(updates: { password?: string; data?: Record<string, unknown> }) {
      const startTime = Date.now();

      enhancedLogger.auth.info('User update requested', {
        hasPasswordUpdate: !!updates.password,
        hasDataUpdate: !!updates.data,
      });

      try {
        const result = await originalAuth.updateUser(updates);
        const duration = Date.now() - startTime;

        if (result.error) {
          const parsed = parseAuthError(result.error);
          enhancedLogger.auth.error('User update failed', {
            error: parsed.technicalDetails,
            code: parsed.code,
            duration,
          });
          return result;
        }

        enhancedLogger.auth.info('User update successful', {
          userId: result.data.user?.id,
          duration,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        enhancedLogger.auth.error('User update exception', {
          error: parseAuthError(error).technicalDetails,
          duration,
        });
        throw error;
      }
    },
  };
}
