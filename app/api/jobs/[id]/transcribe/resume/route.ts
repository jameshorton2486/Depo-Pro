// app/api/jobs/[id]/transcribe/resume/route.ts
// Resume a failed transcription pipeline

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import { resumePipeline } from '@/lib/transcription/scheduler';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;

    // Get base URL for chaining
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;

    // Resume pipeline
    const result = await resumePipeline(jobId, baseUrl);

    return NextResponse.json({
      success: true,
      message: 'Pipeline resumed successfully',
      jobId,
      resumedFromChunk: result.resumedFromChunk,
    });
  } catch (error: any) {
    console.error('Error resuming pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume pipeline' },
      { status: 500 }
    );
  }
}
