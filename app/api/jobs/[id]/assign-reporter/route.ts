// ============================================================
// ASSIGN REPORTER TO JOB API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { canAssignReporter } from '@/lib/rbac';
import { AuditAction, AuditEntityType } from '@/lib/enums';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const assignReporterSchema = z.object({
  reporterId: z.string().min(1, 'Reporter ID is required'),
});

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();
    const validation = assignReporterSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const { reporterId } = validation.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true, firstName: true, lastName: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, firmId: true, assignedToId: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!canAssignReporter(user.role, user.firmId, job.firmId ?? '', user.id, reporterId)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const reporter = await db.user.findUnique({
      where: { id: reporterId },
      select: { id: true, role: true, firmId: true, firstName: true, lastName: true, email: true },
    });

    if (!reporter || reporter.role !== 'REPORTER') {
      return NextResponse.json({ error: 'Invalid reporter' }, { status: 400 });
    }

    if (reporter.firmId !== job.firmId) {
      return NextResponse.json({ error: 'Reporter firm mismatch' }, { status: 403 });
    }

    const previousAssignedToId = job.assignedToId;

    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: { assignedToId: reporterId },
    });

    await db.calendarEvent.updateMany({
      where: { jobId: jobId },
      data: { assignedReporterId: reporterId },
    });

    await logAudit({
      userId: session.user.id,
      action: AuditAction.JOB_ASSIGN_REPORTER,
      entityType: AuditEntityType.Job,
      entityId: jobId,
      details: {
        previousReporterId: previousAssignedToId,
        newReporterId: reporterId,
        reporterName: `${reporter.firstName} ${reporter.lastName}`,
      },
    });

    return NextResponse.json({
      success: true,
      job: { id: updatedJob.id, assignedToId: updatedJob.assignedToId },
      reporter: { id: reporter.id, name: `${reporter.firstName} ${reporter.lastName}` },
    });

  } catch (error) {
    console.error('Assign reporter error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true, firstName: true, lastName: true },
    });

    if (!user?.firmId || !['ADMIN', 'AGENCY'].includes(user.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, firmId: true, assignedToId: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && user.firmId !== job.firmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const previousReporterId = job.assignedToId;

    await db.job.update({
      where: { id: jobId },
      data: { assignedToId: null },
    });

    await db.calendarEvent.updateMany({
      where: { jobId: jobId },
      data: { assignedReporterId: null },
    });

    await logAudit({
      userId: session.user.id,
      action: AuditAction.JOB_UNASSIGN_REPORTER,
      entityType: AuditEntityType.Job,
      entityId: jobId,
      details: { previousReporterId },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unassign reporter error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

