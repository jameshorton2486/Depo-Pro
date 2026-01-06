// =============================================================================
// RX SESSION SERVICE
// =============================================================================
// Location: lib/services/rx-session-service.ts
// Phase: 3 - RX Governance
// Fixes: B2 (RX escalation rules)
//
// CRITICAL PRINCIPLE:
// RX processing sessions are isolated, attributed, and logged.
// Each session requires operator attribution and records all actions.
//
// ⚠️ SCHEMA UPDATE REQUIRED:
// This service requires the AudioProcessingSession model to have these fields:
// - status (AudioSessionStatus enum)
// - operatorUserId (String?)
// - processingType (String)
// - processingStartedAt (DateTime?)
// - completedAt (DateTime?)
// - processingTimeMinutes (Int?)
// - operatorNotes (String?)
// - outputFileId (String?)
// - feeCents (Int?)
// - metadata (Json?)
// - cancelledAt (DateTime?)
// - cancelledByUserId (String?)
// - cancellationReason (String?)
//
// See AUDIT_REMEDIATION_IMPLEMENTATION_SUMMARY.md for complete schema definition.
// =============================================================================


// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RXSessionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface RXSessionCreateInput {
  jobId: string;
  operatorUserId: string;
  operatorNotes?: string;
}

export interface RXSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface RXSessionUpdateInput {
  operatorNotes?: string;
  outputFileId?: string;
  feeCents?: number;
  metadata?: Record<string, unknown>;
}

export interface RXSessionSummary {
  id: string;
  jobId: string;
  operatorUserId: string;
  status: RXSessionStatus;
  startedAt: Date;
  completedAt: Date | null;
  processingTimeMinutes: number | null;
  feeCents: number | null;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const RX_FLAT_FEE_CENTS = 15000; // $150 flat fee

// -----------------------------------------------------------------------------
// Create RX Session
// -----------------------------------------------------------------------------

export async function createRXSession(
  input: RXSessionCreateInput
): Promise<RXSessionResult> {
  try {
    // Verify job exists and is eligible
    const job = await db.job.findUnique({
      where: { id: input.jobId },
      select: {
        id: true,
        status: true,
        audioProcessingMode: true,
      },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.audioProcessingMode !== 'MANUAL_RX') {
      return {
        success: false,
        error: 'Job is not set for manual RX processing',
      };
    }

    // Check for existing active session (using a simple check for now)
    // Note: Current schema doesn't have status field, so we'll track this differently
    const existingSessions = await db.audioProcessingSession.findMany({
      where: {
        jobId: input.jobId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });
    
    // If there's a recent session (within last hour), consider it active
    const existingSession = existingSessions[0];
    if (existingSession && 
        new Date().getTime() - existingSession.createdAt.getTime() < 3600000) {
      return {
        success: false,
        error: 'An active RX session already exists for this job',
      };
    }

    // Create session with new schema fields
    const session = await db.audioProcessingSession.create({
      data: {
        jobId: input.jobId,
        processingType: 'MANUAL_RX',
        status: 'PENDING',
        operatorUserId: input.operatorUserId,
        operatorNotes: input.operatorNotes,
        // Legacy fields for backward compatibility
        enhancementType: 'MANUAL_RX',
        durationMinutes: 0, // Will be updated when completed
        provider: 'MANUAL_RX_OPERATOR',
      },
    });
    
    // Store operator info in job internalNotes for now
    // TODO: Update schema to include operatorUserId and status fields
    await db.job.update({
      where: { id: input.jobId },
      data: {
        internalNotes: JSON.stringify({
          rxSessionId: session.id,
          operatorUserId: input.operatorUserId,
          operatorNotes: input.operatorNotes,
          status: 'PENDING',
        }),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'rx_session.created',
        targetType: 'audio_processing_session',
        targetId: session.id,
        actorUserId: input.operatorUserId,
        metadata: {
          jobId: input.jobId,
          operatorUserId: input.operatorUserId,
          createdAt: new Date().toISOString(),
        },
      },
    });

    console.log(`📝 RX session created: ${session.id} for job ${input.jobId}`);

    return {
      success: true,
      sessionId: session.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Start RX Session
// -----------------------------------------------------------------------------

export async function startRXSession(
  sessionId: string,
  actorUserId: string
): Promise<RXSessionResult> {
  try {
    const session = await db.audioProcessingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== 'PENDING') {
      return {
        success: false,
        error: `Session is not pending (current status: ${session.status})`,
      };
    }

    if (session.operatorUserId !== actorUserId) {
      return {
        success: false,
        error: 'Only the assigned operator can start the session',
      };
    }

    await db.audioProcessingSession.update({
      where: { id: sessionId },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'rx_session.started',
        targetType: 'audio_processing_session',
        targetId: sessionId,
        actorUserId,
        metadata: {
          startedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`▶️ RX session started: ${sessionId}`);

    return { success: true, sessionId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Complete RX Session
// -----------------------------------------------------------------------------

export async function completeRXSession(
  sessionId: string,
  actorUserId: string,
  input: RXSessionUpdateInput
): Promise<RXSessionResult> {
  try {
    const session = await db.audioProcessingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== 'PROCESSING') {
      return {
        success: false,
        error: `Session is not processing (current status: ${session.status})`,
      };
    }

    if (session.operatorUserId !== actorUserId) {
      return {
        success: false,
        error: 'Only the assigned operator can complete the session',
      };
    }

    const completedAt = new Date();
    const processingTimeMinutes = session.processingStartedAt
      ? Math.round((completedAt.getTime() - session.processingStartedAt.getTime()) / 60000)
      : null;

    await db.audioProcessingSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt,
        processingTimeMinutes,
        operatorNotes: input.operatorNotes || session.operatorNotes,
        outputFileId: input.outputFileId,
        feeCents: input.feeCents || session.feeCents || RX_FLAT_FEE_CENTS,
        metadata: input.metadata ? (input.metadata as any) : undefined,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'rx_session.completed',
        targetType: 'audio_processing_session',
        targetId: sessionId,
        actorUserId,
        metadata: {
          completedAt: completedAt.toISOString(),
          processingTimeMinutes,
          feeCents: input.feeCents || session.feeCents,
        },
      },
    });

    console.log(`✅ RX session completed: ${sessionId} (${processingTimeMinutes} minutes)`);

    return { success: true, sessionId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Cancel RX Session
// -----------------------------------------------------------------------------

export async function cancelRXSession(
  sessionId: string,
  actorUserId: string,
  reason: string
): Promise<RXSessionResult> {
  try {
    const session = await db.audioProcessingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      return {
        success: false,
        error: `Session cannot be cancelled (current status: ${session.status})`,
      };
    }

    await db.audioProcessingSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByUserId: actorUserId,
        cancellationReason: reason,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'rx_session.cancelled',
        targetType: 'audio_processing_session',
        targetId: sessionId,
        actorUserId,
        metadata: {
          cancelledAt: new Date().toISOString(),
          reason,
        },
      },
    });

    console.log(`❌ RX session cancelled: ${sessionId} - ${reason}`);

    return { success: true, sessionId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Get RX Sessions for Job
// -----------------------------------------------------------------------------

export async function getRXSessionsForJob(jobId: string): Promise<RXSessionSummary[]> {
  const sessions = await db.audioProcessingSession.findMany({
    where: {
      jobId,
      processingType: 'MANUAL_RX',
    },
    include: {
      operator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return sessions.map(session => ({
    id: session.id,
    jobId: session.jobId,
    operatorUserId: session.operatorUserId || '',
    status: (session.status as RXSessionStatus) || 'PENDING',
    startedAt: session.startedAt,
    completedAt: session.completedAt || null,
    processingTimeMinutes: session.processingTimeMinutes || null,
    feeCents: session.feeCents || null,
  }));
}

// -----------------------------------------------------------------------------
// Get Active RX Session
// -----------------------------------------------------------------------------

export async function getActiveRXSession(jobId: string): Promise<RXSessionSummary | null> {
  const session = await db.audioProcessingSession.findFirst({
    where: {
      jobId,
      processingType: 'MANUAL_RX',
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    include: {
      operator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    jobId: session.jobId,
    operatorUserId: session.operatorUserId || '',
    status: session.status as RXSessionStatus,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    processingTimeMinutes: session.processingTimeMinutes,
    feeCents: session.feeCents,
  };
}

// -----------------------------------------------------------------------------
// Calculate Total RX Fees for Job
// -----------------------------------------------------------------------------

export async function calculateTotalRXFeesForJob(jobId: string): Promise<number> {
  const sessions = await db.audioProcessingSession.findMany({
    where: {
      jobId,
      processingType: 'MANUAL_RX',
      status: 'COMPLETED',
    },
    select: {
      feeCents: true,
    },
  });

  return sessions.reduce((total, session) => total + (session.feeCents || 0), 0);
}
