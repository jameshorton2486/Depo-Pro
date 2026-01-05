// ═══════════════════════════════════════════════════════════════
// USER REGISTRATION API ENDPOINT
// ═══════════════════════════════════════════════════════════════
// Handles new user registration and optional firm creation

import { NextResponse } from 'next/server';

// Legacy password-based registration is disabled in favor of Supabase auth.
export async function POST() {
  return NextResponse.json(
    { error: 'Legacy registration is disabled. Use Supabase sign-up.' },
    { status: 410 },
  );
}
