// app/api/cron/cleanup/route.ts
// Daily cleanup job for old files and failed jobs

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    failedJobsReset: 0,
    oldTempFilesDeleted: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // Reset jobs stuck in PROCESSING for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stuckJobs = await prisma.job.updateMany({
      where: {
        status: 'TRANSCRIBING',
        updatedAt: { lt: oneHourAgo },
      },
      data: {
        status: 'CANCELLED',
        errorMessage: 'Job timed out during processing',
      },
    });

    results.failedJobsReset = stuckJobs.count;

    // Log cleanup results
    console.log('Cleanup job completed:', results);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Cleanup job failed:', error);
    return NextResponse.json(
      { error: 'Cleanup job failed' },
      { status: 500 },
    );
  }
}
