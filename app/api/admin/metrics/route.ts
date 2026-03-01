import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

async function GETHandler() {
  try {
    await requireAdmin();

    const supabase = await createSupabaseServerClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch independent metric sets in parallel and project only required columns.
    const [{ data: jobStats }, { data: transcriptionStats }, { data: userStats }] = await Promise.all([
      supabase
        .from('jobs')
        .select('status')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('transcriptions')
        .select('status, confidence_score')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('profiles')
        .select('role'),
    ]);

    // Calculate metrics
    const metrics = {
      jobs: {
        total: jobStats?.length || 0,
        byStatus: groupByKey(jobStats || [], 'status'),
        last30Days: jobStats?.length || 0,
      },
      transcriptions: {
        total: transcriptionStats?.length || 0,
        averageConfidence: calculateAverage(transcriptionStats || [], 'confidence_score'),
        byStatus: groupByKey(transcriptionStats || [], 'status'),
      },
      users: {
        total: userStats?.length || 0,
        byRole: groupByKey(userStats || [], 'role'),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('[metrics] Admin metrics fetched', {
      jobCount: metrics.jobs.total,
      transcriptionCount: metrics.transcriptions.total,
      userCount: metrics.users.total,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('[metrics] Failed to fetch metrics', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

function groupByKey<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, item) => {
    const value = String(item[key] || 'unknown');
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function calculateAverage<T>(arr: T[], key: keyof T): number {
  if (arr.length === 0) return 0;
  const values = arr
    .map(item => Number(item[key]))
    .filter(v => !isNaN(v) && isFinite(v));
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN] },
  GETHandler as any
);

