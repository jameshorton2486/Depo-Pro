// app/api/jobs/[id]/transcribe/process-chunk/route.ts
// Process a single transcription chunk (serverless-friendly)

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { processChunk } from '@/lib/transcription/scheduler';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && !INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Internal API secret not configured' }, { status: 500 });
    }
    if (INTERNAL_API_SECRET && authHeader !== `Bearer ${INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();
    const { chunkIndex } = body;

    if (typeof chunkIndex !== 'number') {
      return NextResponse.json(
        { error: 'chunkIndex is required and must be a number' },
        { status: 400 }
      );
    }

    // Get base URL for chaining
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;

    // Process this chunk
    const result = await processChunk(jobId, chunkIndex, baseUrl);

    return NextResponse.json({
      success: true,
      chunkIndex,
      completed: result.completed,
      nextChunkIndex: result.nextChunkIndex,
    });
  } catch (error: any) {
    console.error('Error processing chunk:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chunk' },
      { status: 500 }
    );
  }
}
