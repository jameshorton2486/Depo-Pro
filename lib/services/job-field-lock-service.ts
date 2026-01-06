// lib/services/job-field-lock-service.ts
// STUB: Job field locking service

export async function safeUpdateJob(
  __jobId: string,
  _updates: Record<string, unknown>,
  __userId: string
) {
  console.log('[STUB] safeUpdateJob called');
  return { success: true, job: null };
}

export async function transitionJobStatus(
  _jobId: string,
  _newStatus: string,
  _userId: string
) {
  console.log('[STUB] transitionJobStatus called');
  return { success: true };
}

export function checkFieldLock(_jobStatus: string, _field: string) {
  return { locked: false, reason: null };
}
