import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

/**
 * Dictionary API - Redirects to proper-nouns API for backward compatibility
 * This endpoint is kept for legacy support but forwards to the new proper-nouns endpoint
 */
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const jobId = url.pathname.split('/')[3]; // Extract jobId from /api/jobs/[id]/dictionary
  
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  // Redirect to proper-nouns endpoint
  return NextResponse.redirect(new URL(`/api/jobs/${jobId}/proper-nouns`, request.url));
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const jobId = url.pathname.split('/')[3];
  
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  // Forward request to proper-nouns endpoint
  const body = await request.json().catch(() => ({}));
  let response: Response;
  try {
    response = await fetch(new URL(`/api/jobs/${jobId}/proper-nouns`, request.url), {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error('Dictionary proxy failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to forward request' }, { status: 502 });
  }

  return NextResponse.json(await response.json(), { status: response.status });
}

