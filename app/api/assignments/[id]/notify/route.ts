// Migrated from Prisma to Supabase queries — PASS 2A
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { getAssignmentById, getJobById } from '@/lib/supabase/queries/jobs';
import { getUserById } from '@/lib/supabase/queries/users';
import { sendEmail, jobAssignedEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// POST /api/assignments/[id]/notify - Send assignment notification
// ═══════════════════════════════════════════════════════════════

const postHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const assignmentId = params.id;

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
    if (job?.created_by_id !== user.id) {
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

  } catch (err) {
    logger.error(`Failed to send assignment notification - error: ${err}`);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 },
    );
  }
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER], requireFirm: true },
  postHandler,
);
