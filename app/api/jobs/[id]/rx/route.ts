// =============================================================================
// RX API ROUTES
// =============================================================================
// Location: app/api/jobs/[id]/rx/route.ts
// Phase: 3 - RX Governance
// Fixes: B2 (RX escalation rules)
//
// ENDPOINTS:
// GET  /api/jobs/[id]/rx - Check RX eligibility
// POST /api/jobs/[id]/rx - Request RX processing
// =============================================================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import {
  evaluateRXEligibilityForJob,
  requestRXAdminApprovalForJob,
  validateProcessingModeChange,
} from '@/lib/services/rx-eligibility-service';
import {
  createRXSession,
  getActiveRXSession,
} from '@/lib/services/rx-session-service';
import { isAdminRole } from '@/lib/admin';

// -----------------------------------------------------------------------------
// GET /api/jobs/[id]/rx - Check RX Eligibility
// -----------------------------------------------------------------------------

const getHandler = async (_request: NextRequest, { user, params }: ProtectedContext) => {
  try {
    const jobId = params.id;

    // Check eligibility
    const eligibility = await evaluateRXEligibilityForJob(
      jobId,
      user.id,
      false, // userRequested - this is just a check
      false  // adminOverride
    );

    // Get active session if exists
    const activeSession = await getActiveRXSession(jobId);

    return NextResponse.json({
      eligibility,
      activeSession,
    });
  } catch (err) {
    console.error('Error checking RX eligibility:', err);
    return NextResponse.json(
      { error: 'Failed to check RX eligibility' },
      { status: 500 }
    );
  }
};

// -----------------------------------------------------------------------------
// POST /api/jobs/[id]/rx - Request RX Processing
// -----------------------------------------------------------------------------

const postHandler = async (request: NextRequest, { user, params }: ProtectedContext) => {
  try {
    // Only reporters and admins can request RX
    if (user.role !== 'REPORTER' && !isAdminRole(user.role)) {
      return NextResponse.json(
        { error: 'Only reporters and admins can request RX processing' },
        { status: 403 }
      );
    }

    const jobId = params.id;
    const body = await request.json();
    const { justification } = body;

    // Validate processing mode change
    const validation = await validateProcessingModeChange(
      jobId,
      'MANUAL_RX',
      user.id
    );

    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }

    // Check eligibility
    const eligibility = await evaluateRXEligibilityForJob(
      jobId,
      user.id,
      true, // userRequested
      false // adminOverride
    );

    if (!eligibility.allowed) {
      if (eligibility.requiresApproval) {
        // Request admin approval
        const approvalRequest = await requestRXAdminApprovalForJob(
          jobId,
          user.id,
          justification || 'User requested RX processing'
        );

        if (!approvalRequest.success) {
          return NextResponse.json(
            { error: approvalRequest.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          requiresApproval: true,
          requestId: approvalRequest.requestId,
          message: 'RX request submitted for admin approval',
        });
      } else {
        return NextResponse.json(
          { error: eligibility.reason },
          { status: 400 }
        );
      }
    }

    // Create RX session
    const sessionResult = await createRXSession({
      jobId,
      operatorUserId: user.id,
    });

    if (!sessionResult.success) {
      return NextResponse.json(
        { error: sessionResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionResult.sessionId,
      message: 'RX session created successfully',
    });
  } catch (err) {
    console.error('Error creating RX session:', err);
    return NextResponse.json(
      { error: 'Failed to create RX session' },
      { status: 500 }
    );
  }
};

const JOB_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.ATTORNEY,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  getHandler,
);

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.REPORTER], requireFirm: true },
  postHandler,
);
