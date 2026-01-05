// =============================================================================
// FORGOT PASSWORD API
// app/api/auth/forgot-password/route.ts
//
// Handle password reset requests
// =============================================================================

import { NextResponse } from 'next/server';

// Legacy password reset is disabled; use Supabase resetPasswordForEmail.
export async function POST() {
  return NextResponse.json(
    { error: 'Password reset is handled by Supabase. Legacy route disabled.' },
    { status: 410 }
  );
}
