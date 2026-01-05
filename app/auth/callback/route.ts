// app/auth/callback/route.ts
// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK HANDLER
// Handles PKCE code exchange, OAuth callbacks, and email confirmations
// ═══════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  
  // Extract all possible callback parameters
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle OAuth/Auth errors
  if (error) {
    console.error('Auth callback error:', error, error_description);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', error_description || error);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();

    // ─────────────────────────────────────────────────────────────
    // Handle PKCE code exchange (OAuth and magic link flows)
    // ─────────────────────────────────────────────────────────────
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        const redirectUrl = new URL('/login', origin);
        redirectUrl.searchParams.set('error', 'Failed to authenticate. Please try again.');
        return NextResponse.redirect(redirectUrl);
      }

      // Successful auth - redirect to intended destination
      return NextResponse.redirect(new URL(next, origin));
    }

    // ─────────────────────────────────────────────────────────────
    // Handle token hash (email confirmation, password recovery)
    // ─────────────────────────────────────────────────────────────
    if (token_hash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'signup' | 'recovery' | 'email' | 'invite' | 'magiclink' | 'email_change',
      });

      if (verifyError) {
        console.error('OTP verification error:', verifyError);
        const redirectUrl = new URL('/login', origin);
        redirectUrl.searchParams.set('error', 'Link expired or invalid. Please try again.');
        return NextResponse.redirect(redirectUrl);
      }

      // Handle password recovery - redirect to update password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', origin));
      }

      // Handle email confirmation (signup or email change)
      if (type === 'email' || type === 'signup' || type === 'email_change') {
        // Redirect to dashboard with success message
        const dashboardUrl = new URL('/dashboard', origin);
        dashboardUrl.searchParams.set('message', 'Email confirmed successfully');
        return NextResponse.redirect(dashboardUrl);
      }

      // Handle invite acceptance
      if (type === 'invite') {
        const inviteUrl = new URL('/dashboard', origin);
        inviteUrl.searchParams.set('message', 'Welcome! Your account is now active.');
        return NextResponse.redirect(inviteUrl);
      }

      // Default: redirect to next URL
      return NextResponse.redirect(new URL(next, origin));
    }

    // No code or token - redirect to login
    console.warn('Auth callback called without code or token_hash');
    return NextResponse.redirect(new URL('/login', origin));

  } catch (err) {
    console.error('Auth callback error:', err);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.');
    return NextResponse.redirect(redirectUrl);
  }
}
