import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from 'node:process';

export const runtime = 'nodejs';

function getSafeNextPath(nextParam: string | null): string {
  if (
    nextParam &&
    nextParam.startsWith('/') &&
    !nextParam.startsWith('//') &&
    !nextParam.includes('://')
  ) {
    return nextParam;
  }

  return '/dashboard';
}

export async function GET(request: NextRequest) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const nextParam = request.nextUrl.searchParams.get('next');
  const nextPath = getSafeNextPath(nextParam);

  const cookieStore = await cookies();
  const supabaseResponse = NextResponse.redirect(new URL(nextPath, siteUrl));

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let error: Error | null = null;

  if (code) {
    const exchangeResult = await supabase.auth.exchangeCodeForSession(code);
    error = exchangeResult.error;
  } else if (tokenHash && type) {
    const verifyResult = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    error = verifyResult.error;
  } else {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', siteUrl)
    );
  }

  if (error) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', siteUrl)
    );
  }

  return supabaseResponse;
}
