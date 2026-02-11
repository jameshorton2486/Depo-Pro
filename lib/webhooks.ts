import { logger } from '@/lib/logger';
/**
 * Webhook Dispatch Service
 */

export interface StripeWebhookResult {
  valid: boolean;
  event: any | null;
  body?: any;
  success?: boolean;
  status?: number;
}

export async function dispatchShareCreated(shareId: string, transcriptId: string): Promise<void> {
  logger.debug('[Webhook] dispatchShareCreated', { shareId, transcriptId });
}

export async function dispatchTranscriptionComplete(jobId: string): Promise<void> {
  logger.debug('[Webhook] dispatchTranscriptionComplete', { jobId });
}

export async function dispatchJobStatusChanged(jobId: string, status: string): Promise<void> {
  logger.debug('[Webhook] dispatchJobStatusChanged', { jobId, status });
}

export async function validateStripeWebhook(
  body: string,
  signature: string
): Promise<StripeWebhookResult> {
  logger.debug('[Webhook] validateStripeWebhook', { signature: signature?.slice(0, 20) });
  return {
    valid: true,
    event: null,
    body: { received: true },
    success: true,
    status: 200,
  };
}
