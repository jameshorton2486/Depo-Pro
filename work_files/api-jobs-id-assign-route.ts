// ═══════════════════════════════════════════════════════════════
// JOB ASSIGNMENT API ROUTE - /api/jobs/[id]/assign (STABILIZED)
// ═══════════════════════════════════════════════════════════════
// POST /api/jobs/[id]/assign - Assign scopist to job
// STABILIZATION: Added tenant isolation, audit logging, strict
// role checks at API boundary
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assignScopistSchema } from '@/lib/validations/job';
import { logAudit } from '@/lib/audit';
import { AuditAction, AuditEntityType } from '@/lib/enums';
import { logger } from '@/lib/logger';

// ------------------------------------------------------------
// ROUTE PARAMS TYPE
// ------------------------------------------------------------

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ------------------------------------------------------------
// ALLOWED ROLES FOR ASSIGNMENT
// Strict role enforcement at API boundary
// ------------------------------------------------------------

const ASSIGNMENT_ALLOWED_ROLES = ['ADMIN', 'AGENCY', 'COURT_REPORTER'] as const;

// ------------------------------------------------------------
// POST - Assign scopist to job
// ------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    // 1. AUTHENTICATION CHECK
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const { id: jobId } = await params;

    // 2. GET USER WITH FIRM CONTEXT (Tenant Isolation)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 403 }
      );
    }

    if (!user.firmId) {
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
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        firmId: user.firmId, // CRITICAL: Tenant boundary check
      },
      select: {
        id: true,
        createdById: true,
        firmId: true,
        caseName: true,
        status: true,
      },
    });

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
      user.role === 'ADMIN' ||
      user.role === 'AGENCY' ||
      job.createdById === user.id;

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
    const scopist = await db.user.findFirst({
      where: {
        id: validatedData.scopistId,
        firmId: user.firmId, // CRITICAL: Same tenant check
        role: 'SCOPIST',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!scopist) {
      return NextResponse.json(
        { error: 'Invalid scopist: User not found, not a scopist, or not in your firm', code: 'INVALID_SCOPIST' },
        { status: 400 }
      );
    }

    // 8. CHECK FOR EXISTING ASSIGNMENT
    const existingAssignment = await db.jobAssignment.findFirst({
      where: {
        jobId,
        scopistId: validatedData.scopistId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Scopist already assigned to this job', code: 'ALREADY_ASSIGNED' },
        { status: 400 }
      );
    }

    // 9. CREATE ASSIGNMENT
    const assignment = await db.jobAssignment.create({
      data: {
        jobId,
        scopistId: validatedData.scopistId,
        status: 'INVITED',
        scopistNotes: validatedData.notes,
      },
      include: {
        scopist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // 10. AUDIT LOG - MANDATORY
    await logAudit({
      userId: user.id,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.Job,
      entityId: jobId,
      details: {
        action: 'SCOPIST_ASSIGNED',
        assignmentId: assignment.id,
        scopistId: scopist.id,
        scopistName: `${scopist.firstName} ${scopist.lastName}`,
        scopistEmail: scopist.email,
        jobCaseName: job.caseName,
        notes: validatedData.notes,
      },
    });

    logger.info(`Assignment created: ${assignment.id} for job ${jobId} by user ${user.id}`);

    return NextResponse.json(
      {
        message: 'Scopist assigned successfully',
        assignment,
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

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    // 1. AUTHENTICATION CHECK
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const { id: jobId } = await params;
    const url = new URL(request.url);
    const scopistId = url.searchParams.get('scopistId');

    if (!scopistId) {
      return NextResponse.json(
        { error: 'scopistId query parameter is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 2. GET USER WITH FIRM CONTEXT
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json(
        { error: 'User not associated with a firm', code: 'NO_FIRM' },
        { status: 403 }
      );
    }

    // 3. ROLE CHECK AT API BOUNDARY
    if (!ASSIGNMENT_ALLOWED_ROLES.includes(user.role as typeof ASSIGNMENT_ALLOWED_ROLES[number])) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove assignments', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 4. FETCH JOB WITH TENANT ISOLATION
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        firmId: user.firmId, // TENANT ISOLATION
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 5. FIND AND DELETE ASSIGNMENT
    const assignment = await db.jobAssignment.findFirst({
      where: {
        jobId,
        scopistId,
      },
      include: {
        scopist: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await db.jobAssignment.delete({
      where: { id: assignment.id },
    });

    // 6. AUDIT LOG - MANDATORY
    await logAudit({
      userId: user.id,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.Job,
      entityId: jobId,
      details: {
        action: 'SCOPIST_UNASSIGNED',
        assignmentId: assignment.id,
        scopistId: assignment.scopistId,
        scopistName: assignment.scopist
          ? `${assignment.scopist.firstName} ${assignment.scopist.lastName}`
          : 'Unknown',
      },
    });

    logger.info(`Assignment deleted: ${assignment.id} for job ${jobId} by user ${user.id}`);

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
}
