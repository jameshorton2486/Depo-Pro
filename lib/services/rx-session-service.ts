/**
 * RX Session Service
 * Manages RX processing sessions
 */

export interface RxSessionParams {
  jobId: string;
  userId?: string;
  operatorUserId?: string;
}

export interface RxSession {
  id: string;
  jobId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  sessionId?: string;
  success?: boolean;
  error?: string;
}

/**
 * Create an RX session - accepts object or individual params
 */
export async function createRxSession(
  jobIdOrParams: string | RxSessionParams,
  userId?: string
): Promise<RxSession> {
  const params: RxSessionParams = typeof jobIdOrParams === 'string'
    ? { jobId: jobIdOrParams, userId: userId || 'unknown' }
    : jobIdOrParams;
  
  // Handle operatorUserId as userId if provided
  const resolvedUserId = params.userId || params.operatorUserId || 'unknown';
  
  console.log('[RX] createRxSession called - stub', params);
  
  const sessionId = `rx-session-${Date.now()}`;
  return {
    id: sessionId,
    jobId: params.jobId,
    userId: resolvedUserId,
    status: 'ACTIVE',
    createdAt: new Date(),
    sessionId,
    success: true,
  };
}

// Alias for backward compatibility
export const createRXSession = createRxSession;

/**
 * Get active RX session for a job
 */
export async function getActiveRXSession(jobId: string): Promise<RxSession | null> {
  console.log('[RX] getActiveRXSession called - stub', { jobId });
  return null;
}

/**
 * End an RX session
 */
export async function endRxSession(sessionId: string): Promise<{ success: boolean }> {
  console.log('[RX] endRxSession called - stub', { sessionId });
  return { success: true };
}
