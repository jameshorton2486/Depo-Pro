// ═══════════════════════════════════════════════════════════════
// RX QUEUE LIST
// app/api/rx-queue/route.ts
//
// List all jobs in the RX queue
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AudioEnhancementService } from '@/lib/services/audio-enhancement-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and operators can view queue
    if (session.user.role !== 'ADMIN' && session.user.role !== 'REPORTER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const _status = searchParams.get('status') as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | undefined;
    const firmId = searchParams.get('firmId') || undefined;

    const queue = await AudioEnhancementService.getRxQueue();

    // Filter by firm if specified (for non-admin users)
    const filteredQueue = firmId
      ? queue.filter(() => {
          // Would need to fetch job firmId - for now return all if admin
          return session.user.role === 'ADMIN' || true; // TODO: Filter by firmId
        })
      : queue;

    return NextResponse.json({ queue: filteredQueue });
  } catch (error) {
    console.error('[RX Queue] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 },
    );
  }
}
