import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail, jobAssignedEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// POST /api/assignments/[id]/notify - Send assignment notification
// ═══════════════════════════════════════════════════════════════

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assignmentId } = await params;

    // Get assignment details with related data
    const assignment = await db.jobAssignment.findFirst({
      where: {
        id: assignmentId,
        job: {
          reporterId: session.user.id, // Only reporter can send notifications
        },
      },
      include: {
        scopist: {
          select: {
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            caseNumber: true,
            depoDate: true,
            reporter: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Send email notification
    const emailOptions = jobAssignedEmail({
      scopistName: assignment.scopist.name,
      scopistEmail: assignment.scopist.email,
      reporterName: assignment.job.reporter.name,
      caseNumber: assignment.job.caseNumber || 'N/A',
      depoDate: assignment.job.depoDate || undefined,
      notes: assignment.notes || undefined,
    });

    const result = await sendEmail(emailOptions);

    if (result.success) {
      logger.info(`Assignment notification sent - assignmentId: ${assignmentId}, to: ${assignment.scopist.email}`);
      
      return NextResponse.json({
        success: true,
        emailId: result.id,
        message: 'Notification sent successfully',
      });
    } else {
      logger.error(`Failed to send notification - assignmentId: ${assignmentId}, error: ${result.error}`);
      return NextResponse.json(
        { error: result.error || 'Failed to send notification' },
        { status: 500 }
      );
    }

  } catch (error) {
    const { id: assignmentId } = await params;
    logger.error(`Failed to send assignment notification - assignmentId: ${assignmentId}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
