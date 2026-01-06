/**
 * Transcript Status Service
 * Handles transcript status transitions
 */

export type TranscriptStatus = 
  | 'DRAFT'
  | 'PROCESSING'
  | 'REVIEW'
  | 'FINALIZED'
  | 'ARCHIVED';

export interface TransitionResult {
  success: boolean;
  error?: string;
}

/**
 * Transition transcript status
 */
export async function transitionTranscriptStatus(
  transcriptId: string,
  newStatus: string,
  userRole: string,
  _reason?: string
): Promise<TransitionResult> {
  console.log('[TranscriptStatus] transitionTranscriptStatus', { 
    transcriptId, 
    newStatus, 
    userRole 
  });
  
  return { success: true };
}

/**
 * Check if status transition is allowed
 */
export function canTransition(
  currentStatus: string,
  newStatus: string,
  userRole: string
): boolean {
  // Admins can transition to any status
  if (userRole === 'ADMIN') return true;
  
  // Define allowed transitions
  const transitions: Record<string, string[]> = {
    DRAFT: ['PROCESSING'],
    PROCESSING: ['REVIEW', 'DRAFT'],
    REVIEW: ['FINALIZED', 'PROCESSING'],
    FINALIZED: ['ARCHIVED'],
    ARCHIVED: [],
  };
  
  return transitions[currentStatus]?.includes(newStatus) ?? false;
}
