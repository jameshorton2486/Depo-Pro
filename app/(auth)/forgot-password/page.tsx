'use client';

// =============================================================================
// FORGOT PASSWORD PAGE
// =============================================================================
// Supabase-only password reset flow with lazy client initialization
// =============================================================================

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { parseAuthError } from '@/lib/supabase/parse-auth-error';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // ---------------------------------------------------------------------------
  // Form Submit Handler
  // ---------------------------------------------------------------------------

  const onSubmit = useCallback(async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get client lazily - ensures env vars are loaded
      const supabase = getSupabaseBrowserClient();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        }
      );

      if (resetError) {
        const parsed = parseAuthError(resetError);
        setError(parsed.userMessage);
        setIsLoading(false);
        return;
      }

      // Always show success to avoid email enumeration
      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      console.error('[ForgotPassword] Error:', err);
      
      // Check if it's an env var error
      if (err instanceof Error && err.message.includes('SUPABASE')) {
        setError('Configuration error. Please contact support.');
      } else {
        const parsed = parseAuthError(err);
        setError(parsed.userMessage);
      }
      
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Success State
  // ---------------------------------------------------------------------------

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Check Your Email
            </CardTitle>
            <CardDescription>
              If an account exists with that email, a reset link has been sent.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Please check your inbox (and spam folder). The link will expire in 60 minutes.
            </p>
          </CardContent>

          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Return to Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Form State
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
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
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="text-sm text-center text-gray-600">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
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
