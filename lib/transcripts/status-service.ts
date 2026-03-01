import { logger } from '@/lib/logger';
// lib/transcripts/status-service.ts
// STUB: Transcript status transitions
void logger;

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

// Phase 2: Implement state machine with validation rules
export async function transitionStatus(
  transcriptId: string,
  newStatus: string,
  userId: string
) {
  const from = 'UNKNOWN';
  const to = newStatus;
  void userId;
  console.log('[TranscriptStatusService] Status transition', { transcriptId, from, to });
  return { success: true, previousStatus: from, newStatus: to };
}
