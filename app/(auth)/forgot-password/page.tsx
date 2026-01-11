'use client';

// =============================================================================
// FORGOT PASSWORD PAGE
// =============================================================================
// Supabase-only password reset flow
// =============================================================================

import { useState } from 'react';
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
import { AlertCircle, CheckCircle } from 'lucide-react';

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient();

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

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);

    console.group('[Password Reset] Attempt');
    console.log('Email:', data.email);
    console.log('Redirect To:', `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback?type=recovery`);
    console.groupEnd();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback?type=recovery`,
        }
      );

      if (resetError) {
        const parsed = parseAuthError(resetError);
        
        console.group('[Password Reset] Failed');
        console.error('Error:', parsed.technicalDetails);
        console.error('Code:', parsed.code);
        
        // Check if this is the email configuration issue
        if (parsed.technicalDetails.includes('recovery email') || 
            parsed.technicalDetails.includes('sending')) {
          console.warn('⚠️ This usually means Supabase email is not configured.');
          console.warn('Fix: Go to Supabase Dashboard → Authentication → Email Templates');
          console.warn('Enable either built-in Supabase email or configure SMTP.');
        }
        console.groupEnd();
        
        setError(parsed.userMessage);
        setIsLoading(false);
        return;
      }

      console.log('[Password Reset] Email sent successfully');
      // Always show success to avoid email enumeration
      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      const parsed = parseAuthError(err);
      
      console.group('[Password Reset] Exception');
      console.error('Error:', parsed.technicalDetails);
      console.groupEnd();
      
      setError(parsed.userMessage);
      setIsLoading(false);
    }
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
              Check Your Email
            </CardTitle>
            <CardDescription className="text-body text-slate">
              If an account exists with that email, a reset link has been sent.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-slate text-center">
              Please check your inbox (and spam folder). The link will expire shortly.
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
  // Form state
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-h2 font-bold text-center text-ink">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-center text-body text-slate">
            Enter your email address and we’ll send you a reset link
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
                <p className="text-xs text-danger">{errors.email.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending…' : 'Send Reset Link'}
            </Button>

            <div className="text-sm text-center text-slate">
              Remember your password?{' '}
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
