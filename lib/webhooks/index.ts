// =============================================================================
// WEBHOOK DISPATCHER
// =============================================================================
// Main webhook dispatch functionality
// =============================================================================

import { db as prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { enqueueJob } from '@/lib/jobs/queue';
import { JobType, NotificationWebhookPayload } from '@/lib/jobs/types';
import {
  WebhookEvent,
  WebhookEvents,
} from './types';
import { createSignedPayload, getWebhookHeaders } from './sign';
import crypto from 'crypto';

// Re-export types and utilities
export * from './types';
export * from './sign';

// =============================================================================
// WEBHOOK DISPATCH
// =============================================================================

/**
 * Dispatch a webhook event to all registered endpoints
 * Queues the webhook for async delivery
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>,
  firmId?: string
): Promise<void> {
  logger.info('Dispatching webhook', { event, firmId });
  
  try {
    // Find all active webhooks for this event
    const webhooks = await prisma.webhookConfig.findMany({
      where: {
        isActive: true,
        ...(firmId && { firmId }),
        events: { has: event },
      },
    });
    
    if (webhooks.length === 0) {
      logger.debug('No webhooks registered for event', { event, firmId });
      return;
    }
    
    // Queue webhook delivery for each endpoint
    for (const webhook of webhooks) {
      await enqueueJob<NotificationWebhookPayload>(
        JobType.NOTIFICATION_WEBHOOK,
        {
          webhookUrl: webhook.url,
          event,
          payload: data,
          firmId: webhook.firmId,
        },
        {
          maxAttempts: 3,
          idempotencyKey: `webhook:${webhook.id}:${event}:${Date.now()}`,
        }
      );
    }
    
    logger.info('Webhooks queued', { event, count: webhooks.length });
    
  } catch (error) {
    logger.error('Failed to dispatch webhooks', error as Error, { event, firmId });
    // Don't throw - webhook failures shouldn't break the main flow
  }
}

/**
 * Send a webhook immediately (sync)
 * Use for critical events that need immediate delivery
 */
export async function sendWebhookSync(
  url: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
  secret: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const { body, signature, timestamp } = createSignedPayload(event, data, secret);
    const headers = getWebhookHeaders(signature, timestamp, event);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    return { success: true, statusCode: response.status };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// =============================================================================
// CONVENIENCE DISPATCHERS
// =============================================================================

/**
 * Dispatch job created event
 */
export async function dispatchJobCreated(job: {
  id: string;
  caseName: string;
  firmId: string;
  createdById: string;
}): Promise<void> {
  await dispatchWebhook(
    WebhookEvents.JOB_CREATED,
    {
      jobId: job.id,
      caseName: job.caseName,
      createdById: job.createdById,
      firmId: job.firmId,
    },
    job.firmId
  );
}

/**
 * Dispatch job completed event
 */
export async function dispatchJobCompleted(job: {
  id: string;
  caseName: string;
  firmId: string;
}): Promise<void> {
  await dispatchWebhook(
    WebhookEvents.JOB_COMPLETED,
    {
      jobId: job.id,
      caseName: job.caseName,
      firmId: job.firmId,
      completedAt: new Date().toISOString(),
    },
    job.firmId
  );
}

/**
 * Dispatch share created event
 */
export async function dispatchShareCreated(share: {
  id: string;
  transcriptId: string;
  sharedById: string;
  recipientEmail?: string;
  recipientId?: string | null;
  accessLevel: string;
  expiresAt?: Date | null;
  firmId: string;
}): Promise<void> {
  await dispatchWebhook(
    WebhookEvents.SHARE_CREATED,
    {
      shareId: share.id,
      transcriptId: share.transcriptId,
      sharedById: share.sharedById,
      recipientEmail: share.recipientEmail,
      recipientId: share.recipientId,
      accessLevel: share.accessLevel,
      expiresAt: share.expiresAt?.toISOString(),
    },
    share.firmId
  );
}

/**
 * Dispatch share revoked event
 */
export async function dispatchShareRevoked(share: {
  id: string;
  transcriptId: string;
  revokedById: string;
  firmId: string;
}): Promise<void> {
  await dispatchWebhook(
    WebhookEvents.SHARE_REVOKED,
    {
      shareId: share.id,
      transcriptId: share.transcriptId,
      revokedById: share.revokedById,
    },
    share.firmId
  );
}

// =============================================================================
// WEBHOOK REGISTRATION
// =============================================================================

/**
 * Register a new webhook endpoint
 */
export async function registerWebhook(config: {
  firmId: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
}): Promise<{ id: string; secret: string }> {
  const secret = config.secret || generateWebhookSecret();
  
  const webhook = await prisma.webhookConfig.create({
    data: {
      firmId: config.firmId,
      url: config.url,
      events: config.events,
      secret,
      isActive: true,
    },
  });
  
  logger.info('Webhook registered', { webhookId: webhook.id, firmId: config.firmId });
  
  return { id: webhook.id, secret };
}

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Test a webhook endpoint
 */
export async function testWebhook(webhookId: string): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
}> {
  const webhook = await prisma.webhookConfig.findUnique({
    where: { id: webhookId },
  });
  
  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }
  
  return sendWebhookSync(
    webhook.url,
    'test.ping' as WebhookEvent,
    { message: 'Webhook test', timestamp: new Date().toISOString() },
    webhook.secret
  );
}
