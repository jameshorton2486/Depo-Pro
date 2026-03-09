// app/api/jobs/[id]/review/submit/route.ts
// Complete the review for a job — transitions job to SCOPIST_COMPLETE

import type { NextRequest } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { captureError } from '@/lib/error-capture';

function getJobAccessResult(
  job: { created_by_id?: string | null; reporter_id?: string | null; scopist_id?: string | null; firm_id?: string | null },
  user: ProtectedContext['user'],
) {
  const userFirmId = user.firm_id || (user as ProtectedContext['user'] & { firmId?: string | null }).firmId || null;
  if (user.role === 'ADMIN') {
    return { allowed: true as const };
  }

  const isReporterOwner = job.created_by_id === user.id || job.reporter_id === user.id;
  if (isReporterOwner) {
    return { allowed: true as const };
  }

  const sameFirm = Boolean(job.firm_id && userFirmId && job.firm_id === userFirmId);
  if (!sameFirm) {
    return { allowed: false as const, status: 403, error: 'Forbidden' };
  }

  if (user.role === 'SCOPIST' && job.scopist_id && job.scopist_id !== user.id) {
    return { allowed: false as const, status: 403, error: 'Forbidden - not assigned to this job' };
  }

  return { allowed: true as const };
}

const POSTHandler = async (
  req: NextRequest,
  context: ProtectedContext,
) => {
  const startTime = performance.now();
  try {
    const { user, supabase } = context;
    const resolvedParams = typeof (context.params as any)?.then === 'function'
      ? await (context.params as any)
      : context.params;
    const { id: jobId } = resolvedParams as Record<string, string>;
    const body = await req.json().catch(() => ({}));
    const { expectedVersion } = body as { expectedVersion?: string };

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, created_by_id, firm_id, reporter_id, scopist_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const access = getJobAccessResult(job, user);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Get the transcription for this job
    const { data: transcription, error: transError } = await supabase
      .from('transcriptions')
      .select('id, updated_at')
      .eq('job_id', jobId)
      .maybeSingle();

    if (transError || !transcription) {
      return NextResponse.json({ error: 'No transcription found for this job' }, { status: 400 });
    }

    // --- Optimistic Locking Check ---
    if (expectedVersion) {
      if (transcription.updated_at !== expectedVersion) {
        return NextResponse.json(
          {
            error: 'Conflict — this transcript was modified by another user since you loaded it. Please reload the page to see the latest version.',
            code: 'CONFLICT',
            serverVersion: transcription.updated_at,
            clientVersion: expectedVersion,
          },
          { status: 409 },
        );
      }
    }
    // --- End Optimistic Locking Check ---

    // Check for pending flagged words — block completion if any remain
    const { count: pendingCount, error: pendingError } = await supabase
      .from('flagged_words')
      .select('*', { count: 'exact', head: true })
      .eq('transcription_id', transcription.id)
      .eq('status', 'PENDING');

    if (pendingError) {
      console.error('Error checking pending words:', pendingError);
      return NextResponse.json({ error: 'Failed to check review status' }, { status: 500 });
    }

    if ((pendingCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: 'Review incomplete',
          code: 'PENDING_WORDS',
          message: `${pendingCount ?? 0} flagged word(s) still require review before submitting.`,
          pendingCount: pendingCount ?? 0,
        },
        { status: 409 },
      );
    }

    // Update job status to SCOPIST_COMPLETE
    const { error: jobUpdateError } = await supabase
      .from('jobs')
      .update({ status: 'SCOPIST_COMPLETE', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (jobUpdateError) {
      console.error('Error updating job status:', jobUpdateError);
      return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
    }

    // Release transcription lock (non-fatal)
    try {
      await supabase
        .from('transcription_locks')
        .update({ is_active: false })
        .eq('transcription_id', transcription.id)
        .eq('locked_by_id', user.id);
    } catch (_lockErr) {
      console.error('Failed to release lock on submit — continuing anyway');
    }

    return NextResponse.json({
      success: true,
      jobId,
      newStatus: 'SCOPIST_COMPLETE',
      message: 'Review submitted successfully.',
      updatedAt: transcription.updated_at,
    });
  } catch (error) {
    captureError(error, { route: 'POST /api/jobs/[id]/review/submit' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    const duration = Math.round(performance.now() - startTime);
    if (duration > 2000) {
      console.warn(`[perf:slow] POST /api/jobs/[id]/review/submit ${duration}ms`);
    }
  }
};

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.SCOPIST, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 10, windowMs: 60_000 },
  },
  POSTHandler
);
