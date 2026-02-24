// app/api/client-errors/route.ts
// Receives client-side error reports and logs them for Vercel log search
// No auth required — must accept unauthenticated POST to capture pre-auth errors

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log as structured JSON for Vercel log search
    console.error(JSON.stringify({
      severity: 'CLIENT_ERROR',
      timestamp: body.timestamp || new Date().toISOString(),
      message: String(body.message || 'Unknown client error').substring(0, 500),
      component: body.componentName,
      url: body.url,
      userAction: body.userAction,
      stack: typeof body.stack === 'string'
        ? body.stack.split('\n').slice(0, 3).join('\n')
        : undefined,
      userAgent: typeof body.userAgent === 'string'
        ? body.userAgent.substring(0, 200)
        : undefined,
    }));

    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    // Always return 200 — error reporting must never fail loudly
    return NextResponse.json({ received: false }, { status: 200 });
  }
}
