'use client';

// =============================================================================
// LOGIN PAGE
// =============================================================================
// Supabase-only email/password authentication
// Build-safe, App Router compatible
// =============================================================================

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { loginSchema, type LoginInput } from '@/lib/validations/user';
import { supabase } from '@/lib/supabase/client';
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

// Inner component that uses useSearchParams
function LoginForm() {
  const searchParams = useSearchParams();
  // Use canonical browser client

  // Check for error from URL params (auth callback redirects)
  const errorParam = searchParams.get('error');
  const [error, setError] = useState<string | null>(errorParam);
  const [isLoading, setIsLoading] = useState(false);
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

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    setShowResendConfirmation(false);
    setResendSuccess(false);
    setLastAttemptedEmail(data.email);

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        const parsed = parseAuthError(signInError);

        // Check if it's an email confirmation error
        if (signInError.message.includes('Email not confirmed')) {
          setError(parsed.userMessage);
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
        setError('Login failed: No session created');
        setIsLoading(false);
        return;
      }

      // Supabase handles cookies automatically
      // Wait a moment for cookies to be set, then redirect
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

      // Small delay to ensure cookies are set before redirect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use window.location for hard redirect to ensure middleware sees new session
      window.location.href = callbackUrl;
    } catch (err) {
      console.error('[Login] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!lastAttemptedEmail) return;

    setIsLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
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
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-h2 font-bold text-center text-ink">
          Welcome to Depo-Pro
        </CardTitle>
        <CardDescription className="text-center text-body text-slate">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-danger/10 p-3 text-sm text-danger border border-danger/20">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="rounded-md bg-success/10 p-3 text-sm text-success border border-success/20">
              Confirmation email sent! Please check your inbox and click the link to verify your account.
            </div>
          )}

          {showResendConfirmation && !resendSuccess && (
            <div className="rounded-md bg-warning/10 p-3 border border-warning/20">
              <p className="text-sm text-warning mb-2">
                Your email address hasn't been verified yet.
              </p>
              <Button
                type="button"
                onClick={handleResendConfirmation}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Resend Confirmation Email'}
              </Button>
            </div>
          )}

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
              <p className="text-sm text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-accent hover:text-accent-hover"
            >
              Forgot password?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-ink hover:bg-ink/90"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>

          <div className="text-sm text-center text-slate">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-accent hover:text-accent-hover"
            >
              Create an account
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

// Loading fallback for Suspense
function LoginSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-h2 font-bold text-center text-ink">
          Welcome to Depo-Pro
        </CardTitle>
        <CardDescription className="text-center text-body text-slate">
          Loading...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
