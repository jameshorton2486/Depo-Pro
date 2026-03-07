// app/api/transcribe/live/route.ts
// WebSocket-style live transcription endpoint.
//
// Next.js does not natively support WebSocket upgrades in App Router.
// This route uses Server-Sent Events (SSE) for server->client word streaming
// and accepts audio chunks via POST for client->server streaming.
// For true WebSocket support, a custom server or middleware upgrade is needed.

export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createLiveSession } from '@/lib/transcription/liveStream';
import type { ParsedWord } from '@/lib/transcription/liveStream';
import { logger } from '@/lib/logger';

// In-memory session store (single-server only; use Redis for multi-instance)
const liveSessions = new Map<string, ReturnType<typeof createLiveSession>>();

/**
 * POST /api/transcribe/live
 * Start a live session or send an audio chunk.
 *
 * Body (JSON for start): { action: 'start', transcriptId: string }
 * Body (binary for chunk): raw audio bytes with header X-Session-Id
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  const sessionId = request.headers.get('x-session-id');

  // --- Send audio chunk ---
  if (sessionId && (contentType.includes('octet-stream') || contentType.includes('audio'))) {
    const session = liveSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const arrayBuffer = await request.arrayBuffer();
    session.send(Buffer.from(arrayBuffer));
    return NextResponse.json({ received: true });
  }

  // --- Start new session ---
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'start' || !body.transcriptId) {
    return NextResponse.json({ error: 'Invalid request. Send { action: "start", transcriptId }' }, { status: 400 });
  }

  const { transcriptId } = body;
  const supabase = await createSupabaseServerClient();

  // Verify transcript exists and user has access
  const { data: transcript } = await supabase
    .from('transcriptions')
    .select('id, job_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) {
    return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
  }

  const newSessionId = `live_${user.id}_${Date.now()}`;

  // Update status to indicate live transcription in progress
  await supabase
    .from('transcriptions')
    .update({ status: 'TRANSCRIBING', updated_at: new Date().toISOString() })
    .eq('id', transcriptId);

  const wordQueue: ParsedWord[] = [];

  const session = createLiveSession(
    newSessionId,
    transcriptId,
    (word) => {
      wordQueue.push(word);
    },
    (error) => {
      logger.error('[live] Session error', error, { sessionId: newSessionId });
    },
  );

  liveSessions.set(newSessionId, session);

  logger.info('[live] Live session started', { sessionId: newSessionId, transcriptId, userId: user.id });

  return NextResponse.json({
    sessionId: newSessionId,
    transcriptId,
    message: 'Live session started. Send audio chunks via POST with X-Session-Id header.',
  });
}

/**
 * GET /api/transcribe/live?sessionId=...
 * Poll for new words (SSE alternative).
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  if (!liveSessions.has(sessionId)) {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  }

  return NextResponse.json({ active: true, sessionId });
}

/**
 * DELETE /api/transcribe/live?sessionId=...
 * Stop a live session.
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const session = liveSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  await session.close();
  liveSessions.delete(sessionId);

  logger.info('[live] Live session stopped', { sessionId, userId: user.id });

  return NextResponse.json({ stopped: true, sessionId });
}
