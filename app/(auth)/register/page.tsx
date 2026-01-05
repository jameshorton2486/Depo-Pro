// ═══════════════════════════════════════════════════════════════
// REGISTRATION PAGE
// ═══════════════════════════════════════════════════════════════
// New user registration with role selection

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { registerSchema, type RegisterInput } from '@/lib/validations/user';
import { Role, ROLE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch by ensuring client-only render
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsLoading(true);
      setError(null);

      // 🔍 DIAGNOSTIC: Verify environment variables are loaded
      console.log('🔍 Diagnostic check:');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '❌ Missing');
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...' || '❌ Missing');

      let supabase;
      try {
        supabase = getSupabaseBrowserClient();
      } catch (clientError) {
        console.error('❌ Failed to create Supabase client:', clientError);
        setError('Configuration error: Missing Supabase environment variables. Please contact support.');
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
            firstName: data.firstName,
            lastName: data.lastName,
            agencyName: data.agencyName,
          },
        },
      });

      if (signUpError || !signUpData.user || !signUpData.session) {
        const errorMsg = signUpError?.message || 'Registration failed. Please try again.';

        // Provide more helpful error message for common issues
        if (errorMsg.includes('Invalid API key') || errorMsg.includes('Invalid JWT')) {
          setError('Configuration error: Invalid Supabase credentials. Please refresh and try again.');
          console.error('❌ Supabase API key error. Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
        } else {
          setError(errorMsg);
        }
        return;
      }

      // Persist profile in Prisma using the Supabase user id
      const profileResp = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${signUpData.session.access_token}`,
        },
        body: JSON.stringify({
          userId: signUpData.user.id,
          email: data.email,
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          agencyName: data.agencyName,
        }),
      });

      if (!profileResp.ok) {
        const errBody = await profileResp.json().catch(() => ({}));
        setError(errBody.error || 'Profile creation failed.');
        return;
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-h2 font-bold text-center text-ink">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-center text-body text-slate">
            Join Depo-Pro to manage your depositions and transcriptions
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

            {/* First Name field */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                autoComplete="given-name"
                disabled={isLoading}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name field */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                autoComplete="family-name"
                disabled={isLoading}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-sm text-danger">{errors.lastName.message}</p>
              )}
            </div>

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

            {/* Role selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                disabled={isLoading}
                onValueChange={(value) => setValue('role', value as Role)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.ATTORNEY}>
                    {ROLE_LABELS[Role.ATTORNEY]}
                  </SelectItem>
                  <SelectItem value={Role.REPORTER}>
                    {ROLE_LABELS[Role.REPORTER]}
                  </SelectItem>
                  <SelectItem value={Role.SCOPIST}>
                    {ROLE_LABELS[Role.SCOPIST]}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-danger">{errors.role.message}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Admin roles are assigned by invitation only</p>
            </div>

            {/* Optional Agency name for Reporters */}
            {selectedRole === Role.REPORTER && (
              <div className="space-y-2">
                <Label htmlFor="agencyName">
                  Agency Name <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="agencyName"
                  type="text"
                  placeholder="Your agency name"
                  disabled={isLoading}
                  {...register('agencyName')}
                />
              </div>
            )}

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-danger">{errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-ink hover:bg-ink/90"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="text-sm text-center text-slate">
              Already have an account?{' '}
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
