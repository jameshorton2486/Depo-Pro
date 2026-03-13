// app/api/transcripts/[id]/certify/route.ts
// Certification gate — final quality check before export is unlocked.

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { runPreflightChecks, PreflightError } from '@/lib/export';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

const POSTHandler = async (
  _request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const transcriptId = params.id;

  try {
    // 1. Run pre-flight checks
    try {
      await runPreflightChecks(transcriptId);
    } catch (error) {
      if (error instanceof PreflightError) {
        return NextResponse.json(
          { error: 'Certification blocked — pre-flight checks failed', checks: error.checks },
          { status: 422 },
        );
      }
      throw error;
    }

    // 2. Verify transcript exists and belongs to user's org
    const { data: transcript, error: fetchError } = await supabase
      .from('transcriptions')
      .select('id, status, job_id')
      .eq('id', transcriptId)
      .single();

    if (fetchError || !transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check access via job
    const { data: job } = await supabase
      .from('jobs')
      .select('firm_id, created_by_id')
      .eq('id', transcript.job_id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Associated job not found' }, { status: 404 });
    }

    const isOwner = job.created_by_id === user.id;
    const isSameFirm = job.firm_id === user.firm_id;
    const isAdmin = isAdminRole(user.role);
    if (!isOwner && !isSameFirm && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Prevent re-certification
    if (transcript.status === 'CERTIFIED') {
      return NextResponse.json({ error: 'Transcript is already certified' }, { status: 400 });
    }

    // 4. Atomic update
    const certifiedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        status: 'CERTIFIED',
        certified_by: user.id,
        certified_at: certifiedAt,
        updated_at: certifiedAt,
      })
      .eq('id', transcriptId);

    if (updateError) {
      logger.error('[certify] Failed to certify transcript', updateError, { transcriptId });
      return NextResponse.json({ error: 'Certification failed' }, { status: 500 });
    }

    logger.info('[certify] Transcript certified', { transcriptId, userId: user.id });

    return NextResponse.json({
      certified: true,
      certified_at: certifiedAt,
    });
  } catch (error) {
    logger.error('[certify] Unexpected error', error instanceof Error ? error : new Error(String(error)), { transcriptId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler,
);
