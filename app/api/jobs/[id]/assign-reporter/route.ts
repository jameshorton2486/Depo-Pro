// ============================================================
// ASSIGN REPORTER TO JOB API
// ============================================================

import type { NextRequest} from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById, updateJob } from '@/lib/supabase/queries/jobs';
import { getUserById } from '@/lib/supabase/queries/users';
import { logAudit } from '@/lib/audit';
import { canAssignReporter } from '@/lib/permissions/rbac';
import { AuditAction, AuditEntityType } from '@/lib/enums';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const assignReporterSchema = z.object({
  reporterId: z.string().min(1, 'Reporter ID is required'),
});

const POSTHandler = async (
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();
    const validation = assignReporterSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const { reporterId } = validation.data;

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    const _user = {
      id: userData.id,
      role: userData.user_metadata?.role as string,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id as string | null,
      firstName: userData.user_metadata?.firstName || '',
      lastName: userData.user_metadata?.lastName || '',
    };

    if (!currentUser.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobFirmId = (job as any).firm_id || (job as any).firmId;
    if (!canAssignReporter(currentUser.role, currentUser.firmId, jobFirmId ?? '', currentUser.id, reporterId)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const reporterData = await getUserById(supabase, reporterId);

    if (!reporterData || reporterData.user_metadata?.role !== 'REPORTER') {
      return NextResponse.json({ error: 'Invalid reporter' }, { status: 400 });
    }

    const reporterFirmId = reporterData.user_metadata?.firmId || reporterData.user_metadata?.firm_id;
    if (reporterFirmId !== jobFirmId) {
      return NextResponse.json({ error: 'Reporter firm mismatch' }, { status: 403 });
    }

    const reporter = {
      id: reporterData.id,
      role: reporterData.user_metadata?.role as string,
      firmId: reporterFirmId,
      firstName: reporterData.user_metadata?.firstName || '',
      lastName: reporterData.user_metadata?.lastName || '',
      email: reporterData.email || '',
    };

    const previousAssignedToId = (job as any).assigned_to_id || (job as any).assignedToId;

    const updatedJob = await updateJob(supabase, jobId, {
      assigned_to_id: reporterId,
    });

    // Update calendar events
    const { error: calendarError } = await supabase
      .from('calendar_events')
      .update({ assigned_reporter_id: reporterId })
      .eq('job_id', jobId);

    if (calendarError) {
      console.error('Error updating calendar events:', calendarError);
    }

    await logAudit({
      userId: currentUser.id,
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    const _user = {
      id: userData.id,
      role: userData.user_metadata?.role as string,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id as string | null,
      firstName: userData.user_metadata?.firstName || '',
      lastName: userData.user_metadata?.lastName || '',
    };

    if (!currentUser.firmId || !['ADMIN', 'AGENCY'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobFirmId = (job as any).firm_id || (job as any).firmId;
    if (currentUser.role !== 'ADMIN' && currentUser.firmId !== jobFirmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const previousReporterId = (job as any).assigned_to_id || (job as any).assignedToId;

    await updateJob(supabase, jobId, {
      assigned_to_id: null,
    });

    // Update calendar events
    const { error: calendarError } = await supabase
      .from('calendar_events')
      .update({ assigned_reporter_id: null })
      .eq('job_id', jobId);

    if (calendarError) {
      console.error('Error updating calendar events:', calendarError);
    }

    await logAudit({
      userId: currentUser.id,
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




export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [GuardRole.ADMIN, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  async (request, { params }) => ((POSTHandler) as any)(request, { params: Promise.resolve(params as any) })
);
