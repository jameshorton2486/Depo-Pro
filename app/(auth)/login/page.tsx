'use client';

// =============================================================================
// LOGIN PAGE
// =============================================================================
// Supabase-only email/password authentication
// Build-safe, App Router compatible
// =============================================================================

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { loginSchema, type LoginInput } from '@/lib/validations/user';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  // Check for error from URL params (auth callback redirects)
  const errorParam = searchParams.get('error');
  const [error, setError] = useState<string | null>(errorParam);
  const [isLoading, setIsLoading] = useState(false);

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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Please confirm your email address before logging in.');
      } else {
        setError(signInError.message || 'Login failed. Please try again.');
      }

      setIsLoading(false);
      return;
    }

    // Supabase handles cookies automatically
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    router.replace(callbackUrl);
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
