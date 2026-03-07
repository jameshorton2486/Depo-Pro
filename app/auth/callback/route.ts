// =============================================================================
// AUTH CALLBACK HANDLER
// =============================================================================
// Handles Supabase PKCE code exchange, OAuth callbacks,
// magic links, email confirmation, recovery, and invites
// Server-only, App Router compatible, lint-safe
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const redirectTo = searchParams.get('redirectTo');
  const next = searchParams.get('next');
  const targetPath =
    (redirectTo && redirectTo.startsWith('/') ? redirectTo :
      next && next.startsWith('/') ? next : '/dashboard');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // ---------------------------------------------------------------------------
  // Handle upstream auth errors (OAuth provider, Supabase redirects)
  // ---------------------------------------------------------------------------
  if (error) {
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set(
      'error',
      errorDescription || error || 'Authentication failed',
    );
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();

    // -------------------------------------------------------------------------
    // PKCE code exchange (OAuth, magic link, recovery)
    // -------------------------------------------------------------------------
    if (code) {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        const redirectUrl = new URL('/login', origin);
        redirectUrl.searchParams.set(
          'error',
          'Failed to authenticate. Please try again.',
        );
        return NextResponse.redirect(redirectUrl);
      }

      // Password recovery via PKCE
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', origin));
      }

      return NextResponse.redirect(new URL(targetPath, origin));
    }

    // -------------------------------------------------------------------------
    // Legacy / OTP flows (email confirmation, invite, recovery)
    // -------------------------------------------------------------------------
    if (tokenHash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as
          | 'signup'
          | 'recovery'
          | 'email'
          | 'invite'
          | 'magiclink'
          | 'email_change',
      });

      if (verifyError) {
        const redirectUrl = new URL('/login', origin);
        redirectUrl.searchParams.set(
          'error',
          'Link expired or invalid. Please request a new one.',
        );
        return NextResponse.redirect(redirectUrl);
      }

      // Password recovery
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', origin));
      }

      // Email confirmation or email change
      if (type === 'email' || type === 'signup' || type === 'email_change') {
        const dashboardUrl = new URL('/dashboard', origin);
        dashboardUrl.searchParams.set(
          'message',
          'Email confirmed successfully',
        );
        return NextResponse.redirect(dashboardUrl);
      }

      // Invite acceptance
      if (type === 'invite') {
        const inviteUrl = new URL('/dashboard', origin);
        inviteUrl.searchParams.set(
          'message',
          'Welcome! Your account is now active.',
        );
        return NextResponse.redirect(inviteUrl);
      }

      return NextResponse.redirect(new URL(targetPath, origin));
    }

    // -------------------------------------------------------------------------
    // Fallback — no valid auth parameters
    // -------------------------------------------------------------------------
    return NextResponse.redirect(new URL('/login', origin));

  } catch {
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set(
      'error',
      'An unexpected error occurred. Please try again.',
    );
    return NextResponse.redirect(redirectUrl);
  }
}
