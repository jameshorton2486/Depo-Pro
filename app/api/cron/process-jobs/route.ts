// =============================================================================
// CRON JOB PROCESSOR API ROUTE
// =============================================================================
// Called by Vercel Cron or external scheduler to process queued jobs
// 
// Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/process-jobs",
//     "schedule": "* * * * *"
//   }]
// }
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { processJobs } from '@/lib/jobs/queue';
import { logger } from '@/lib/logger';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  
  // In production, verify cron secret
  if (process.env.NODE_ENV === 'production') {
    if (!CRON_SECRET) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron not configured' },
        { status: 500 }
      );
    }
    
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }
  
  const start = performance.now();
  
  try {
    // Process up to 10 jobs per invocation
    const results = await processJobs();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info('Cron job processing complete', {
      processed: results.length,
      successful,
      failed,
      durationMs: Math.round(performance.now() - start),
    });
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results: results.map(r => ({
        jobId: r.jobId,
        success: r.success,
        duration: (r as any).duration,
        error: r.error,
      })),
    });
    
  } catch (error) {
    logger.error('Cron job processing failed', error as Error);
    
    return NextResponse.json(
      { error: 'Job processing failed' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}


