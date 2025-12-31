import { NextRequest, NextResponse } from 'next/server';

/**
 * Dictionary API - Redirects to proper-nouns API for backward compatibility
 * This endpoint is kept for legacy support but forwards to the new proper-nouns endpoint
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const jobId = url.pathname.split('/')[3]; // Extract jobId from /api/jobs/[id]/dictionary
  
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  // Redirect to proper-nouns endpoint
  return NextResponse.redirect(new URL(`/api/jobs/${jobId}/proper-nouns`, request.url));
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const jobId = url.pathname.split('/')[3];
  
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  // Forward request to proper-nouns endpoint
  const body = await request.json().catch(() => ({}));
  const response = await fetch(new URL(`/api/jobs/${jobId}/proper-nouns`, request.url), {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  });

  return NextResponse.json(await response.json(), { status: response.status });
}
