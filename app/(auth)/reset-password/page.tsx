'use client';

// =============================================================================
// RESET PASSWORD PAGE
// =============================================================================
// Session is established by /auth/callback before redirect here.
// This page only presents the form and calls updateUser({ password }).
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { parseAuthError } from '@/lib/supabase/parse-auth-error';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // ---------------------------------------------------------------------------
  // Session is established by /auth/callback before redirect. Check for session.
  // If user landed with ?code= (old email link), redirect to callback to exchange it.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const code = searchParams.get('code');

    // Old flow: user landed with code in URL (e.g. from email before we fixed redirectTo)
    if (code) {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', '/reset-password');
      callbackUrl.searchParams.set('code', code);
      window.location.href = callbackUrl.toString();
      return;
    }

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        setError(null);
      }
      setIsCheckingSession(false);
    }

    checkSession();
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // Form submission with retry logic for AbortError
  // ---------------------------------------------------------------------------
  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (updateError) {
          const parsed = parseAuthError(updateError);

          // Check if it's an AbortError or network error (retryable)
          const isRetryableError =
            parsed.technicalDetails.toLowerCase().includes('abort') ||
            parsed.technicalDetails.toLowerCase().includes('network') ||
            parsed.technicalDetails.toLowerCase().includes('fetch') ||
            parsed.code === 'network_error';

          if (isRetryableError && attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          lastError = updateError;
          break;
        }

        // Success!
        setSuccess(true);
        setIsLoading(false);
        return;

      } catch (err) {
        lastError = err as Error;

        // Check if it's an AbortError by name or message
        const isAbortError =
          err instanceof Error &&
          (err.name === 'AbortError' ||
           err.message.toLowerCase().includes('abort') ||
           err.message.toLowerCase().includes('timeout'));

        if (isAbortError && attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }

    // All retries failed
    const parsed = parseAuthError(lastError);
    setError(parsed.userMessage || 'Failed to update password. Please try again.');
    setIsLoading(false);
  };

  // ---------------------------------------------------------------------------
  // Loading state while checking session
  // ---------------------------------------------------------------------------
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-accent animate-spin" />
            </div>
            <CardTitle className="text-h2 font-bold text-ink">
              Verifying Your Link
            </CardTitle>
            <CardDescription className="text-body text-slate">
              Please wait while we verify your password reset link...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // No valid session - show error
  // ---------------------------------------------------------------------------
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-danger" />
            </div>
            <CardTitle className="text-h2 font-bold text-ink">
              Link Invalid or Expired
            </CardTitle>
            <CardDescription className="text-body text-slate">
              {error || 'Your password reset link has expired or is invalid.'}
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              className="w-full"
              onClick={() => router.push('/forgot-password')}
            >
              Request New Reset Link
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Return to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------
  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-h2 font-bold text-ink">
              Password Updated
            </CardTitle>
            <CardDescription className="text-body text-slate">
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>

          <CardFooter>
            <Button
              className="w-full"
              onClick={() => router.replace('/login')}
            >
              Continue to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-h2 font-bold text-center text-ink">
            Set a New Password
          </CardTitle>
          <CardDescription className="text-center text-body text-slate">
            Enter and confirm your new password below
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-danger/10 p-3 border border-danger/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
              <p className="text-xs text-slate">
                Must be 8+ characters with uppercase, lowercase, and a number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-danger">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>

            <div className="text-sm text-center text-slate">
              Remembered your password?{' '}
              <Link
                href="/login"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
