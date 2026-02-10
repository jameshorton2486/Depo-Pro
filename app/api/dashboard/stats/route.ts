// =============================================================================
// DASHBOARD STATS API
// app/api/dashboard/stats/route.ts
// =============================================================================
// Returns firm-scoped dashboard job stats for the authenticated user.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PENDING_TRANSCRIPTION_STATUSES = [
  'CREATED',
  'FILES_UPLOADED',
  'ENHANCING_AUDIO',
  'TRANSCRIBING',
  'AI_REVIEWING',
];

const WITH_SCOPIST_STATUSES = [
  'READY_FOR_EDIT',
  'ASSIGNED',
  'IN_EDIT',
  'SCOPIST_COMPLETE',
];

const IN_REVIEW_STATUSES = [
  'SUBMITTED_FOR_REVIEW',
  'IN_REVIEW',
  'REVIEW_COMPLETE',
];

async function countJobsByStatus(firmId: string, statuses: string[]) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .in('status', statuses);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function countJobs(firmId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', firmId);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function countCompletedThisMonth(firmId: string) {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .eq('status', 'COMPLETED')
    .gte('completed_at', startOfMonth.toISOString())
    .lt('completed_at', startOfNextMonth.toISOString());

  if (error) {
    throw error;
  }

  return count || 0;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const firmId = session.user.firmId;

  if (!firmId) {
    return NextResponse.json({ error: 'Firm context required' }, { status: 403 });
  }

  try {
    const [
      totalJobs,
      pendingTranscription,
      withScopist,
      inReview,
      completedThisMonth,
    ] = await Promise.all([
      countJobs(firmId),
      countJobsByStatus(firmId, PENDING_TRANSCRIPTION_STATUSES),
      countJobsByStatus(firmId, WITH_SCOPIST_STATUSES),
      countJobsByStatus(firmId, IN_REVIEW_STATUSES),
      countCompletedThisMonth(firmId),
    ]);

    return NextResponse.json({
      totalJobs,
      pendingTranscription,
      withScopist,
      completedThisMonth,
      inReview,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard stats' },
      { status: 500 }
    );
  }
}
