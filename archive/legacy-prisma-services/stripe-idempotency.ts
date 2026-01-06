/**
 * Stripe Webhook Idempotency Service
 * 
 * Prevents duplicate processing of Stripe webhook events by tracking
 * processed event IDs in the database.
 */


export interface ProcessedWebhook {
  eventId: string;
  processedAt: Date;
  eventType: string;
}

/**
 * Check if a webhook event has already been processed
 */
export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  try {
    // Check in audit log for webhook events
    const existing = await db.auditLog.findFirst({
      where: {
        targetType: 'STRIPE_WEBHOOK',
        targetId: eventId,
      },
    });
    return !!existing;
  } catch (error) {
    console.error('Error checking webhook idempotency:', error);
    // On error, assume not processed to allow retry
    return false;
  }
}

/**
 * Mark a webhook event as processed
 */
export async function markWebhookProcessed(
  eventId: string,
  eventType: string,
  actorUserId?: string,
  firmId?: string,
): Promise<void> {
  try {
    // Store in audit log for idempotency tracking
    await db.auditLog.create({
      data: {
        action: 'STRIPE_WEBHOOK_PROCESSED',
        targetType: 'STRIPE_WEBHOOK',
        targetId: eventId,
        actorUserId,
        firmId,
        metadata: {
          eventType,
          processedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error marking webhook as processed:', error);
    // Log but don't throw - idempotency failure shouldn't break webhook processing
  }
}
