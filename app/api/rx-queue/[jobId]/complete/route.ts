// ═══════════════════════════════════════════════════════════════
// RX QUEUE COMPLETE PROCESSING
// app/api/rx-queue/[jobId]/complete/route.ts
//
// Complete an RX processing job with results
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AudioEnhancementService } from '@/lib/services/audio-enhancement-service';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin or operator
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'REPORTER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { jobId } = await context.params;
    const body = await req.json();

    const {
      timeSpentMinutes,
      enhancedFileUrl,
      notes,
      toolsUsed,
      checklist,
    } = body;

    // Validate required fields
    if (!timeSpentMinutes || timeSpentMinutes <= 0) {
      return NextResponse.json(
        { error: 'Time spent is required' },
        { status: 400 },
      );
    }

    // Complete processing
    const result = await AudioEnhancementService.completeRxProcessing(
      jobId,
      session.user.id,
      {
        enhancedFileUrl: enhancedFileUrl || '',
        timeSpentMinutes,
        toolsUsed: toolsUsed || [],
        notes,
        checklist: checklist || {
          voiceDeNoise: false,
          dialogueIsolate: false,
          deReverb: false,
          spectralRepair: false,
          levelingCompression: false,
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RX Queue Complete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete processing' },
      { status: 500 },
    );
  }
}
