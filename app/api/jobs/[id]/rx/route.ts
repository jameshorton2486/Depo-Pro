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

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  evaluateRXEligibilityForJob,
  requestRXAdminApprovalForJob,
  validateProcessingModeChange,
} from '@/lib/services/rx-eligibility-service';
import {
  createRXSession,
  getActiveRXSession,
} from '@/lib/services/rx-session-service';

// -----------------------------------------------------------------------------
// GET /api/jobs/[id]/rx - Check RX Eligibility
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // Check eligibility
    const eligibility = await evaluateRXEligibilityForJob(
      jobId,
      session.id,
      false, // userRequested - this is just a check
      false  // adminOverride
    );

    // Get active session if exists
    const activeSession = await getActiveRXSession(jobId);

    return NextResponse.json({
      eligibility,
      activeSession,
    });
  } catch (error) {
    console.error('Error checking RX eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check RX eligibility' },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// POST /api/jobs/[id]/rx - Request RX Processing
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only reporters and admins can request RX
    if (user.role !== 'REPORTER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only reporters and admins can request RX processing' },
        { status: 403 }
      );
    }

    const { id: jobId } = await params;
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
  } catch (error) {
    console.error('Error creating RX session:', error);
    return NextResponse.json(
      { error: 'Failed to create RX session' },
      { status: 500 }
    );
  }
}
