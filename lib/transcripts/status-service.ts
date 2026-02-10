import { logger } from '@/lib/logger';
// lib/transcripts/status-service.ts
// STUB: Transcript status transitions

const STATUS_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['TRANSCRIBING', 'CANCELLED'],
  TRANSCRIBING: ['READY_FOR_EDIT', 'FAILED'],
  READY_FOR_EDIT: ['IN_EDIT', 'CANCELLED'],
  IN_EDIT: ['SUBMITTED_FOR_REVIEW', 'CANCELLED'],
  SUBMITTED_FOR_REVIEW: ['IN_REVIEW', 'IN_EDIT'],
  IN_REVIEW: ['REVIEW_COMPLETE', 'IN_EDIT'],
  REVIEW_COMPLETE: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: ['CREATED'],
};

export function getValidTransitions(currentStatus: string): string[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

export async function transitionStatus(
  _transcriptId: string,
  _newStatus: string,
  _userId: string
) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[TranscriptStatusService] transitionStatus is not implemented. ' +
      'This is a stubbed service - implement real transcript status transitions before production deployment.'
    );
  }
  logger.debug('[STUB] transitionStatus called');
  return { success: true };
}
