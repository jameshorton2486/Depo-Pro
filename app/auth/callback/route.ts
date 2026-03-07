import { createServerClient } from '@supabase/ssr';
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
  const nextParam = request.nextUrl.searchParams.get('next');
  const nextPath = getSafeNextPath(nextParam);

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', siteUrl)
    );
  }

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

  const {
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', siteUrl)
    );
  }

  return supabaseResponse;
}
