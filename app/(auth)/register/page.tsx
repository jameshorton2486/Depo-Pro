'use client';

// =============================================================================
// REGISTRATION PAGE
// =============================================================================
// Supabase-only user signup
// Roles and profiles are assigned server-side AFTER verification
// =============================================================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { registerSchema, type RegisterInput } from '@/lib/validations/user';
import { Role, ROLE_LABELS } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  // Use canonical browser client

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // Email confirmation redirect URL
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        // Metadata is NON-AUTHORITATIVE
        // Used only for onboarding review
        data: {
          requestedRole: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          agencyName: data.agencyName || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message || 'Registration failed.');
      setIsLoading(false);
      return;
    }

    // Always show success — email confirmation required
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
              Check Your Email
            </CardTitle>
            <CardDescription className="text-body text-slate">
              We've sent you a confirmation link to finish creating your account.
            </CardDescription>
          </CardHeader>

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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-h2 font-bold text-center text-ink">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-center text-body text-slate">
            Join Depo-Pro to manage your depositions and transcripts
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-danger/10 p-3 border border-danger/20 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register('firstName')} disabled={isLoading} />
              {errors.firstName && (
                <p className="text-sm text-danger">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register('lastName')} disabled={isLoading} />
              {errors.lastName && (
                <p className="text-sm text-danger">{errors.lastName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-danger">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                disabled={isLoading}
                onValueChange={(value) => setValue('role', value as RegisterInput['role'])}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.ATTORNEY}>
                    {ROLE_LABELS[Role.ATTORNEY]}
                  </SelectItem>
                  <SelectItem value={Role.COURT_REPORTER}>
                    {ROLE_LABELS[Role.COURT_REPORTER]}
                  </SelectItem>
                  <SelectItem value={Role.SCOPIST}>
                    {ROLE_LABELS[Role.SCOPIST]}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Roles are reviewed and assigned after verification.
              </p>
            </div>

            {selectedRole === Role.COURT_REPORTER && (
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency Name (optional)</Label>
                <Input id="agencyName" {...register('agencyName')} disabled={isLoading} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-danger">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-danger">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account…' : 'Create Account'}
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
