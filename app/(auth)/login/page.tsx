// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════
// User authentication page with email/password login

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { loginSchema, type LoginInput } from '@/lib/validations/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate environment variables before attempting login
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setError('Configuration error: Missing Supabase credentials. Please check your .env.local file and restart the dev server.');
        console.error('Missing Supabase environment variables:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey,
        });
        setIsLoading(false);
        return;
      }

      // Check for common issues with env vars
      if (supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
        setError('Configuration error: Supabase credentials are empty. Please check your .env.local file.');
        setIsLoading(false);
        return;
      }

      // Check for quotes (common mistake)
      if (supabaseUrl.startsWith('"') || supabaseUrl.endsWith('"') || 
          supabaseAnonKey.startsWith('"') || supabaseAnonKey.endsWith('"')) {
        setError('Configuration error: Environment variables contain quotes. Remove quotes from .env.local and restart the dev server.');
        setIsLoading(false);
        return;
      }

      // Create Supabase client with error handling
      let supabase;
      try {
        supabase = getSupabaseBrowserClient();
      } catch (clientError) {
        const errorMessage = clientError instanceof Error ? clientError.message : 'Unknown error';
        setError(`Configuration error: ${errorMessage}`);
        console.error('Failed to create Supabase client:', clientError);
        setIsLoading(false);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        // Provide more specific error messages
        if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid API key')) {
          if (signInError.message.includes('Invalid API key')) {
            setError('Configuration error: Invalid API key. Please check your environment variables and restart the dev server.');
            console.error('Invalid API key error - check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
          } else {
            setError('Invalid email or password. Please try again.');
          }
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account before logging in.');
        } else {
          setError(signInError.message || 'Login failed. Please try again.');
        }
        console.error('Login error:', signInError);
        return;
      }

      // Verify session was created
      if (!signInData.session) {
        setError('Login succeeded but no session was created. Please try again.');
        return;
      }

      // Redirect to dashboard on success
      // The @supabase/ssr client automatically handles cookie setting
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
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
            {/* Error message */}
            {error && (
              <div className="rounded-md bg-danger/10 p-3 text-sm text-danger border border-danger/20">
                {error}
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-danger">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
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
              {isLoading ? 'Signing in...' : 'Sign In'}
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
    </div>
  );
}
