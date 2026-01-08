import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAdmin();
    
    const supabase = await createSupabaseServerClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get job statistics
    const { data: jobStats } = await supabase
      .from('Job')
      .select('status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get transcription statistics
    const { data: transcriptionStats } = await supabase
      .from('Transcription')
      .select('status, confidence_score, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get user statistics
    const { data: userStats } = await supabase
      .from('profiles')
      .select('role, created_at');

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
