// app/api/cron/cleanup/route.ts
// Daily cleanup job for old files and failed jobs

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendEmail, recordingNeededEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');

  if (process.env.NODE_ENV === 'production' && !CRON_SECRET) {
    logger.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    failedJobsReset: 0,
    oldTempFilesDeleted: 0,
    recordingReminders: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // Reset jobs stuck in PROCESSING for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const supabase = await createSupabaseServerClient();
    
    const { data: stuckJobs, error: stuckJobsError } = await supabase
      .from('jobs')
      .update({
        status: 'CANCELLED',
        error_message: 'Job timed out during processing',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'TRANSCRIBING')
      .lt('updated_at', oneHourAgo.toISOString())
      .select('id');

    if (stuckJobsError) {
      throw stuckJobsError;
    }

    results.failedJobsReset = stuckJobs?.length || 0;

    // --- RECORDING NEEDED: jobs past deposition date with no audio ---
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const adminClient = createAdminClient();

      const { data: overdueJobs } = await adminClient
        .from('jobs')
        .select(`
          id, title, case_name, case_number, deposition_date, firm_id,
          reporter:profiles!jobs_reporter_id_fkey(id, full_name, email)
        `)
        .eq('status', 'CREATED')
        .lt('deposition_date', today.toISOString().split('T')[0])
        .is('audio_file_url', null)
        .limit(50);

      if (overdueJobs && overdueJobs.length > 0) {
        for (const job of overdueJobs) {
          try {
            await adminClient
              .from('jobs')
              .update({ status: 'FILES_UPLOADED', updated_at: new Date().toISOString() })
              .eq('id', job.id);

            const reporter = job.reporter as any;
            if (reporter?.email) {
              const depositionDate = job.deposition_date
                ? new Date(job.deposition_date).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })
                : 'Unknown date';

              const emailOptions = recordingNeededEmail({
                recipientName: reporter.full_name || reporter.email,
                recipientEmail: reporter.email,
                caseStyle: job.case_name || job.title || 'Unknown Case',
                causeNumber: job.case_number || 'N/A',
                deponentName: job.title?.replace('Deposition of ', '') || 'Unknown Deponent',
                depositionDate,
                jobId: job.id,
              });

              await sendEmail(emailOptions);
              results.recordingReminders++;
              console.warn(`[cron] Recording reminder sent for job ${job.id}`);
            }
          } catch (jobErr: any) {
            console.error(`[cron] Failed to process overdue job ${job.id}:`, jobErr.message);
          }
        }
      }
    } catch (reminderErr: any) {
      console.error('[cron] Recording reminder sweep failed:', reminderErr.message);
    }

    // Log cleanup results
    logger.info('Cleanup job completed', results);

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

