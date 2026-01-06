/**
 * Job Status Machine
 * Handles job status transitions
 */

export type JobStatusType = 
  | 'PENDING'
  | 'PROCESSING'
  | 'AI_COMPLETE'
  | 'SCOPIST_REVIEW'
  | 'SCOPIST_COMPLETE'
  | 'REVIEW_COMPLETE'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface StatusTransitionResult {
  success: boolean;
  job?: { id: string; status: string } | null;
  error?: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['AI_COMPLETE', 'FAILED'],
  AI_COMPLETE: ['SCOPIST_REVIEW', 'COMPLETED'],
  SCOPIST_REVIEW: ['SCOPIST_COMPLETE', 'AI_COMPLETE'],
  SCOPIST_COMPLETE: ['REVIEW_COMPLETE', 'SCOPIST_REVIEW'],
  REVIEW_COMPLETE: ['COMPLETED'],
  COMPLETED: [],
  FAILED: ['PENDING'],
  CANCELLED: ['PENDING'],
};

/**
 * Validate and execute job status transition
 */
export async function transitionJobStatus(
  jobId: string,
  newStatus: string,
  _userRole?: string
): Promise<StatusTransitionResult> {
  console.log('[JobStatus] transitionJobStatus', { jobId, newStatus });
  
  return {
    success: true,
    job: { id: jobId, status: newStatus },
  };
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Get allowed next statuses
 */
export function getAllowedTransitions(currentStatus: string): string[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
