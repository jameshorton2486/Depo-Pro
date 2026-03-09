'use client';

// =============================================================================
// LOGIN PAGE
// =============================================================================
// Supabase-only email/password authentication
// Uses lazy client initialization to avoid env var timing issues
// =============================================================================

import { useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { loginSchema, type LoginInput } from '@/lib/validations/user';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { parseAuthError } from '@/lib/supabase/parse-auth-error';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

// -----------------------------------------------------------------------------
// Login Form Component
// -----------------------------------------------------------------------------

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error/message from URL params (auth callback redirects)
  const errorParam = searchParams.get('error');
  const messageParam = searchParams.get('message');

  const [error, setError] = useState<string | null>(errorParam);
  const [successMessage, setSuccessMessage] = useState<string | null>(messageParam);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [lastAttemptedEmail, setLastAttemptedEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // ---------------------------------------------------------------------------
  // Form Submit Handler
  // ---------------------------------------------------------------------------

  const onSubmit = useCallback(async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowResendConfirmation(false);
    setResendSuccess(false);
    setLastAttemptedEmail(data.email);

    try {
      // Get client lazily - ensures env vars are loaded
      const supabase = createSupabaseBrowserClient();

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        const parsed = parseAuthError(signInError);

        // Check if it's an email confirmation error
        if (
          signInError.message.toLowerCase().includes('email not confirmed') ||
          signInError.message.toLowerCase().includes('email_not_confirmed')
        ) {
          setError('Please verify your email address before signing in.');
          setShowResendConfirmation(true);
        } else {
          setError(parsed.userMessage);
          setShowResendConfirmation(false);
        }

        setIsLoading(false);
        return;
      }

      // Verify session was created
      if (!authData.session) {
        setError('Login failed: No session created. Please try again.');
        setIsLoading(false);
        return;
      }

      const redirectTo = searchParams.get('redirectTo');
      const safePath =
        redirectTo?.startsWith('/') &&
        !redirectTo.startsWith('//') &&
        !redirectTo.includes('://')
          ? redirectTo
          : '/dashboard';

      // Small delay to ensure cookies are set before redirect
      await new Promise(resolve => setTimeout(resolve, 150));

      router.push(safePath);
    } catch (err) {
      console.error('[Login] Unexpected error:', err);

      // Check if it's an env var error
      if (err instanceof Error && err.message.includes('SUPABASE')) {
        setError('Configuration error. Please contact support.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }

      setIsLoading(false);
    }
  }, [router, searchParams]);

  // ---------------------------------------------------------------------------
  // Resend Confirmation Email
  // ---------------------------------------------------------------------------

  const handleResendConfirmation = useCallback(async () => {
    if (!lastAttemptedEmail) return;

    setIsLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: lastAttemptedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) {
        const parsed = parseAuthError(resendError);
        setError(parsed.userMessage);
      } else {
        setResendSuccess(true);
        setShowResendConfirmation(false);
      }
    } catch (_err) {
      setError('Failed to resend confirmation email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [lastAttemptedEmail]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Welcome to Depo-Pro
        </CardTitle>
        <CardDescription className="text-center">
          The complete platform for the deposition process — from audio to certified transcript.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="rounded-md bg-green-50 p-3 border border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 border border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Resend Success */}
          {resendSuccess && (
            <div className="rounded-md bg-green-50 p-3 border border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Confirmation email sent! Please check your inbox and click the link to verify your account.
                </p>
              </div>
            </div>
          )}

          {/* Resend Confirmation Button */}
          {showResendConfirmation && !resendSuccess && (
            <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
              <p className="text-sm text-amber-800 mb-2">
                Your email address hasn&apos;t been verified yet.
              </p>
              <Button
                type="button"
                onClick={handleResendConfirmation}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Confirmation Email'
                )}
              </Button>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled={isLoading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="text-sm text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Create an account
            </Link>
          </div>
        </CardFooter>
      </form>
      <p className="text-xs text-center text-slate-500 mt-1 px-6 pb-4">
        Secure access — all transcripts are encrypted and access-controlled.
      </p>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Loading Skeleton
// -----------------------------------------------------------------------------

function LoginSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Welcome to Depo-Pro
        </CardTitle>
        <CardDescription className="text-center">
          Loading...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Main Page Export
// -----------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
