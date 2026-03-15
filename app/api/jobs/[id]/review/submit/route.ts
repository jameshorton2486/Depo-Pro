// app/api/jobs/[id]/review/submit/route.ts
// Complete the review for a job — transitions job to SCOPIST_COMPLETE

import type { NextRequest } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { captureError } from '@/lib/error-capture';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminRole } from '@/lib/admin';
import { sendEmail, proofingCompleteEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteUser = {
  id: string;
  role: string;
  firm_id?: string | null;
  firmId?: string | null;
};

function getJobAccessResult(
  job: { created_by_id?: string | null; reporter_id?: string | null; scopist_id?: string | null; firm_id?: string | null },
  user: RouteUser,
) {
  const userFirmId = user.firm_id || (user as ProtectedContext['user'] & { firmId?: string | null }).firmId || null;
  if (!['ADMIN', 'SCOPIST', 'REPORTER', 'COURT_REPORTER'].includes(user.role)) {
    return { allowed: false as const, status: 403, error: 'Forbidden' };
  }
  if (isAdminRole(user.role)) {
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

  if (user.role === 'SCOPIST' && job.scopist_id !== user.id) {
    return { allowed: false as const, status: 403, error: 'Forbidden - not assigned to this job' };
  }

  return { allowed: true as const };
}

const POSTHandler = async (
  req: NextRequest,
  context?: ProtectedContext,
) => {
  const startTime = performance.now();
  try {
    const user = context?.user ?? await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = context?.supabase ?? await createSupabaseServerClient();
    const routeParams = context?.params as Record<string, string> | Promise<Record<string, string>> | undefined;
    const resolvedParams = typeof (routeParams as any)?.then === 'function'
      ? await (routeParams as any)
      : routeParams;
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

    // Count unresolved flagged words — warn reporter but do NOT block submission
    const { count: pendingCount, error: pendingError } = await supabase
      .from('flagged_words')
      .select('*', { count: 'exact', head: true })
      .eq('transcription_id', transcription.id)
      .eq('status', 'PENDING');

    if (pendingError) {
      console.error('Error checking pending words:', pendingError);
      return NextResponse.json({ error: 'Failed to check review status' }, { status: 500 });
    }

    // NOTE: pendingCount is included in the response for the reporter notification
    // but does NOT block submission. The reporter email will show the count.
    const unresolvedFlagCount = pendingCount ?? 0;

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

    // Send proofing complete notification — fire and forget, non-blocking
    setImmediate(async () => {
      try {
        const adminClient = createAdminClient();

        const { data: fullJob } = await adminClient
          .from('jobs')
          .select(`
            id, title, case_name, case_number, deposition_date, firm_id,
            reporter:profiles!jobs_reporter_id_fkey(id, full_name, email),
            scopist:profiles!jobs_scopist_id_fkey(id, full_name, email)
          `)
          .eq('id', jobId)
          .single();

        if (!fullJob) {
          console.warn('[notify] Could not fetch job data for proofing complete email');
          return;
        }

        const reporter = fullJob.reporter as any;
        const scopist = fullJob.scopist as any;

        if (!reporter?.email) {
          console.warn('[notify] No reporter email found for job', jobId);
          return;
        }

        const depositionDate = fullJob.deposition_date
          ? new Date(fullJob.deposition_date).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })
          : 'Date unknown';

        const emailOptions = proofingCompleteEmail({
          reporterName: reporter.full_name || reporter.email,
          reporterEmail: reporter.email,
          caseStyle: fullJob.case_name || fullJob.title || 'Unknown Case',
          causeNumber: fullJob.case_number || 'N/A',
          deponentName: fullJob.title?.replace('Deposition of ', '') || 'Unknown Deponent',
          depositionDate,
          scopistName: scopist?.full_name || scopist?.email || user.id,
          jobId,
          unresolvedFlagCount,
        });

        await sendEmail(emailOptions);
        console.warn(`[notify] Proofing complete email sent to ${reporter.email} for job ${jobId}`);
      } catch (notifyErr: any) {
        console.error('[notify] Failed to send proofing complete email:', notifyErr.message);
      }
    });

    return NextResponse.json({
      success: true,
      jobId,
      newStatus: 'SCOPIST_COMPLETE',
      message: 'Review submitted successfully.',
      updatedAt: transcription.updated_at,
      unresolvedFlagCount,
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
    requireFirm: true,
    rateLimit: { limit: 10, windowMs: 60_000 },
    auditAction: 'REVIEW_COMPLETED',
  },
  POSTHandler
);
