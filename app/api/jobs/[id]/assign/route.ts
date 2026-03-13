// ═══════════════════════════════════════════════════════════════
// JOB ASSIGNMENT API ROUTE - /api/jobs/[id]/assign (STABILIZED)
// ═══════════════════════════════════════════════════════════════
// POST /api/jobs/[id]/assign - Assign scopist to job
// STABILIZATION: Added tenant isolation, audit logging, strict
// role checks at API boundary
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobForAccessCheck } from '@/lib/supabase/queries/jobs';
import { getUserById, getUsersByRole } from '@/lib/supabase/queries/users';
import { assignScopistSchema } from '@/lib/validations/job';
import { logAudit } from '@/lib/audit';
import { AuditAction, AuditEntityType } from '@/lib/enums';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

// ------------------------------------------------------------
// ALLOWED ROLES FOR ASSIGNMENT
// Strict role enforcement at API boundary
// ------------------------------------------------------------

const ASSIGNMENT_ALLOWED_ROLES = ['ADMIN', 'AGENCY', 'COURT_REPORTER'] as const;

// ------------------------------------------------------------
// POST - Assign scopist to job
// ------------------------------------------------------------

const POSTHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  try {
    // 1. AUTHENTICATION CHECK
    const currentUser = (context as any)?.user ?? await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: jobId } = context.params;

    // 2. GET USER WITH FIRM CONTEXT (Tenant Isolation)
    const supabase = (context as any)?.supabase ?? await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 403 }
      );
    }

    const user = {
      id: userData.id,
      role: userData.user_metadata?.role as string,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id as string | null,
    };

    const userFirmId = currentUser.firm_id ?? (currentUser as any).firmId ?? null;
    if (!userFirmId) {
      return NextResponse.json(
        { error: 'User not associated with a firm', code: 'NO_FIRM' },
        { status: 403 }
      );
    }

    // 3. ROLE CHECK AT API BOUNDARY (Server-side enforcement)
    // Only Admin, Agency, and Court Reporter can assign scopists
    if (!ASSIGNMENT_ALLOWED_ROLES.includes(user.role as typeof ASSIGNMENT_ALLOWED_ROLES[number])) {
      return NextResponse.json(
        { error: 'Insufficient permissions to assign scopists', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 4. FETCH JOB WITH TENANT ISOLATION
    const job = await getJobForAccessCheck(supabase, jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. ADDITIONAL PERMISSION CHECK
    // Admin/Agency can assign to any job in their firm
    // Court Reporter can only assign to their own jobs
    const canAssign =
      isAdminRole(user.role) ||
      user.role === 'AGENCY' ||
      (job as any).created_by_id === currentUser.id;

    if (!canAssign) {
      return NextResponse.json(
        { error: 'You can only assign scopists to your own jobs', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 6. VALIDATE REQUEST BODY
    const body = await request.json();
    const validation = assignScopistSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validation.error.issues },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // 7. SCOPIST VALIDATION WITH TENANT ISOLATION
    // Scopist must exist, have SCOPIST role, AND belong to the same firm
    const scopists = await getUsersByRole(supabase, 'SCOPIST', userFirmId);
    const scopistData = scopists.find((s: any) => s.id === validatedData.scopistId);

    if (!scopistData) {
      return NextResponse.json(
        { error: 'Invalid scopist: User not found, not a scopist, or not in your firm', code: 'INVALID_SCOPIST' },
        { status: 400 }
      );
    }

    const scopist = {
      id: scopistData.id,
      firstName: scopistData.user_metadata?.firstName || '',
      lastName: scopistData.user_metadata?.lastName || '',
      email: scopistData.email || '',
      role: scopistData.user_metadata?.role as string,
    };

    // 8. CHECK FOR EXISTING ASSIGNMENT
    const { data: existingAssignment } = await supabase
      .from('job_assignment')
      .select()
      .eq('job_id', jobId)
      .eq('scopist_id', validatedData.scopistId)
      .maybeSingle();

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Scopist already assigned to this job', code: 'ALREADY_ASSIGNED' },
        { status: 400 }
      );
    }

    // 9. CREATE ASSIGNMENT
    const { data: assignment, error: assignError } = await supabase
      .from('job_assignment')
      .insert({
        job_id: jobId,
        scopist_id: validatedData.scopistId,
        status: 'INVITED',
        scopist_notes: validatedData.notes || null,
      })
      .select()
      .single();

    if (assignError || !assignment) {
      return NextResponse.json(
        { error: 'Failed to create assignment', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    // 10. AUDIT LOG - MANDATORY
    await logAudit({
      userId: currentUser.id,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.Job,
      entityId: jobId,
      details: {
        action: 'SCOPIST_ASSIGNED',
        assignmentId: assignment.id,
        scopistId: scopist.id,
        scopistName: `${scopist.firstName} ${scopist.lastName}`,
        scopistEmail: scopist.email,
        jobCaseName: (job as any).case_name || (job as any).caseName || '',
        notes: validatedData.notes,
      },
    });

    logger.info(`Assignment created: ${assignment.id} for job ${jobId} by user ${currentUser.id}`);

    return NextResponse.json(
      {
        message: 'Scopist assigned successfully',
        assignment: {
          ...assignment,
          jobId: assignment.job_id,
          scopistId: assignment.scopist_id,
          scopistNotes: assignment.scopist_notes,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: error },
        { status: 400 }
      );
    }

    logger.error('POST /api/jobs/[id]/assign', error as Error);
    return NextResponse.json(
      { error: 'Failed to create assignment', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// DELETE - Remove scopist assignment
// ------------------------------------------------------------

const DELETEHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  try {
    // 1. AUTHENTICATION CHECK
    const currentUser = (context as any)?.user ?? await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: jobId } = context.params;
    const url = new URL(request.url);
    const scopistId = url.searchParams.get('scopistId');

    if (!scopistId) {
      return NextResponse.json(
        { error: 'scopistId query parameter is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 2. GET USER WITH FIRM CONTEXT
    const supabase = (context as any)?.supabase ?? await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 403 }
      );
    }

    const _user = {
      id: userData.id,
      role: userData.user_metadata?.role as string,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id as string | null,
    };

    if (!currentUser.firm_id && !(currentUser as any).firmId) {
      return NextResponse.json(
        { error: 'User not associated with a firm', code: 'NO_FIRM' },
        { status: 403 }
      );
    }

    // 3. ROLE CHECK AT API BOUNDARY
    if (!ASSIGNMENT_ALLOWED_ROLES.includes(currentUser.role as typeof ASSIGNMENT_ALLOWED_ROLES[number])) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove assignments', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 4. FETCH JOB WITH TENANT ISOLATION
    const job = await getJobForAccessCheck(supabase, jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. FIND AND DELETE ASSIGNMENT
    const { data: assignment } = await supabase
      .from('job_assignment')
      .select()
      .eq('job_id', jobId)
      .eq('scopist_id', scopistId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('job_assignment')
      .delete()
      .eq('id', assignment.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete assignment', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    // 6. AUDIT LOG - MANDATORY
    await logAudit({
      userId: currentUser.id,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.Job,
      entityId: jobId,
      details: {
        action: 'SCOPIST_UNASSIGNED',
        assignmentId: assignment.id,
        scopistId: assignment.scopist_id,
        scopistName: assignment.scopist
          ? `${assignment.scopist.firstName} ${assignment.scopist.lastName}`
          : 'Unknown',
      },
    });

    logger.info(`Assignment deleted: ${assignment.id} for job ${jobId} by user ${currentUser.id}`);

    return NextResponse.json({
      message: 'Assignment removed successfully',
    });

  } catch (error) {
    logger.error('DELETE /api/jobs/[id]/assign', error as Error);
    return NextResponse.json(
      { error: 'Failed to remove assignment', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
};



export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  POSTHandler
);

export const DELETE = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  DELETEHandler
);
