// Migrated from Prisma to Supabase queries — PASS 2A
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAssignmentById, getJobById } from '@/lib/supabase/queries/jobs';
import { getUserById } from '@/lib/supabase/queries/users';
import { sendEmail, jobAssignedEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// POST /api/assignments/[id]/notify - Send assignment notification
// ═══════════════════════════════════════════════════════════════

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assignmentId } = await params;

    const supabase = await createSupabaseServerClient();

    // Get assignment details
    const assignment = await getAssignmentById(supabase, assignmentId);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get job details
    const job = await getJobById(supabase, assignment.job_id, {
      includeCreatedBy: false,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify job creator matches session user
    if (job?.created_by_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reporterData = await getUserById(supabase, job?.created_by_id || '');

    if (!reporterData) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 });
    }

    // Get scopist data
    const scopistData = await getUserById(supabase, assignment.scopist_id);
    if (!scopistData) {
      return NextResponse.json({ error: 'Scopist not found' }, { status: 404 });
    }

    // Send email notification
    const emailOptions = jobAssignedEmail({
      scopistName: `${scopistData.user_metadata?.firstName || ''} ${scopistData.user_metadata?.lastName || ''}`,
      scopistEmail: scopistData.email || '',
      reporterName: `${reporterData.user_metadata?.firstName || ''} ${reporterData.user_metadata?.lastName || ''}`,
      caseNumber: job.case_number || 'N/A',
      depositionDate: job.deposition_date ? new Date(job.deposition_date) : undefined,
      notes: assignment.scopist_notes || undefined,
    });

    const result = await sendEmail(emailOptions);

    if (result.success) {
      logger.info(`Assignment notification sent - assignmentId: ${assignmentId}, to: ${scopistData.email}`);

      return NextResponse.json({
        success: true,
        emailId: result.id,
        message: 'Notification sent successfully',
      });
    } else {
      logger.error(`Failed to send notification - assignmentId: ${assignmentId}, error: ${result.error}`);
      return NextResponse.json(
        { error: result.error || 'Failed to send notification' },
        { status: 500 },
      );
    }

  } catch (error) {
    const { id: assignmentId } = await params;
    logger.error(`Failed to send assignment notification - assignmentId: ${assignmentId}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 },
    );
  }
}
