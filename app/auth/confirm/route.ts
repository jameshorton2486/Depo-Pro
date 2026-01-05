// app/auth/confirm/route.ts
// ═══════════════════════════════════════════════════════════════
// EMAIL CONFIRMATION HANDLER
// ═══════════════════════════════════════════════════════════════
// Handles email confirmation links from Supabase
// Verifies email and redirects to login

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/login?confirmed=true';

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    
    // Verify the token
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (error) {
      console.error('Email confirmation error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }

    // Success - redirect to login with confirmation message
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Missing parameters - redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}
