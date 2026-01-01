// ═══════════════════════════════════════════════════════════════
// RX QUEUE START PROCESSING
// app/api/rx-queue/[jobId]/start/route.ts
//
// Start processing an RX queue item (assign to operator)
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

    // Start processing
    const result = await AudioEnhancementService.startRxProcessing(
      jobId,
      session.user.id,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RX Queue Start] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start processing' },
      { status: 500 },
    );
  }
}
