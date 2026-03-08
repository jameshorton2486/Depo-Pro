'use client';

// =============================================================================
// RESET PASSWORD PAGE
// =============================================================================
// Session is established by /auth/callback BEFORE the user arrives here.
// This page ONLY shows a new-password form and calls updateUser({ password }).
// No token verification, no session checking, no spinner.
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // ---------------------------------------------------------------------------
  // Submit — just call updateUser({ password })
  // ---------------------------------------------------------------------------
  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

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
  // Form
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
