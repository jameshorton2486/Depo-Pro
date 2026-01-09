import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
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
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assignmentId } = await params;

    const supabase = await createSupabaseServerClient();

    // Get assignment details with related data
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: { job: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const job = assignment.job as any;

    // Verify job creator matches session user
    if (job?.created_by_id !== session.user.id) {
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
      caseNumber: (job as any).case_number || (job as any).caseNumber || 'N/A',
      depositionDate: (job as any).deposition_date || (job as any).depositionDate || undefined,
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
