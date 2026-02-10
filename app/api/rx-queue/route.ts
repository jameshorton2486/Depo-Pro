// ═══════════════════════════════════════════════════════════════
// RX QUEUE LIST
// app/api/rx-queue/route.ts
//
// List all jobs in the RX queue
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import { AudioEnhancementService } from '@/lib/services/audio-enhancement-service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
    const requestedFirmId = searchParams.get('firmId') || undefined;

    const queue = await AudioEnhancementService.getRxQueue();

    const effectiveFirmId = session.user.role === 'ADMIN'
      ? requestedFirmId
      : session.user.firmId || undefined;

    let filteredQueue = queue;

    if (effectiveFirmId && queue.length > 0) {
      const supabase = await createSupabaseServerClient();
      const jobIds = [...new Set(queue.map(item => item.jobId))];

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, firm_id')
        .in('id', jobIds);

      if (jobsError) {
        throw jobsError;
      }

      const firmByJobId = new Map((jobs || []).map(job => [job.id, job.firm_id]));
      filteredQueue = queue.filter(item => firmByJobId.get(item.jobId) === effectiveFirmId);
    }

    return NextResponse.json({ queue: filteredQueue });
  } catch (error) {
    logger.error('[RX Queue] Error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 },
    );
  }
}
