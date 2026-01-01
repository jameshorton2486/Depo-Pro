// =============================================================================
// WEBHOOK VERIFICATION SERVICE
// =============================================================================
// Location: lib/services/webhook-verification-service.ts
// Phase: 4 - Billing Completion
// Fixes: B4 (webhook verification)
//
// CRITICAL PRINCIPLE:
// All webhook events must be:
// 1. Signature verified
// 2. Logged to audit trail
// 3. Idempotent (safe to replay)
// 4. Processed atomically
// =============================================================================

import { verifyWebhookSignature, handleStripeWebhook } from '@/lib/stripe/webhook-handler';
import { db } from '@/lib/db';
import { isWebhookProcessed, markWebhookProcessed } from '@/lib/services/stripe-idempotency';
import type Stripe from 'stripe';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface WebhookVerificationResult {
  success: boolean;
  event?: Stripe.Event;
  error?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  eventType?: string;
  error?: string;
  body?: unknown;
  status: number;
}

// -----------------------------------------------------------------------------
// Get Stripe Client
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Verify Webhook Signature
// -----------------------------------------------------------------------------

export async function verifyWebhookSignatureSafe(
  rawBody: string | Buffer,
  signature: string | null
): Promise<WebhookVerificationResult> {
  if (!signature) {
    return {
      success: false,
      error: 'Missing Stripe signature header',
    };
  }

  const event = verifyWebhookSignature(rawBody, signature);
  
  if (!event) {
    return {
      success: false,
      error: 'Invalid webhook signature',
    };
  }

  return {
    success: true,
    event,
  };
}

// -----------------------------------------------------------------------------
// Log Webhook Event
// -----------------------------------------------------------------------------

export async function logWebhookEvent(
  eventType: string,
  eventId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    // Find a system admin user ID for the audit log (optional)
    const systemUser = await db.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    await db.auditLog.create({
      data: {
        action: `stripe.webhook.${eventType}`,
        targetType: 'stripe_event',
        targetId: eventId,
        actorUserId: systemUser?.id || undefined,
        metadata: {
          eventType,
          eventId,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}

// -----------------------------------------------------------------------------
// Check for Duplicate Events
// -----------------------------------------------------------------------------

export async function isDuplicateEvent(eventId: string): Promise<boolean> {
  // Use the dedicated idempotency service
  return await isWebhookProcessed(eventId);
}

// -----------------------------------------------------------------------------
// Handle Webhook Event
// -----------------------------------------------------------------------------

export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  // Check for duplicates
  if (await isDuplicateEvent(event.id)) {
    console.log(`⚠️ Duplicate webhook event detected: ${event.id}`);
    return {
      success: true,
      eventType: event.type,
      status: 200,
      body: { received: true, duplicate: true },
    };
  }

  // Mark as processed for idempotency
  await markWebhookProcessed(event.id, event.type);

  // Log the event
  await logWebhookEvent(event.type, event.id, {
    livemode: event.livemode,
    apiVersion: event.api_version,
  });

  // Process the event
  const result = await handleStripeWebhook(event);

  if (!result.success) {
    return {
      success: false,
      eventType: event.type,
      error: result.error,
      status: 500,
    };
  }

  return {
    success: true,
    eventType: event.type,
    status: 200,
    body: { received: true },
  };
}

// -----------------------------------------------------------------------------
// Individual Event Handlers (delegated to webhook-handler.ts)
// -----------------------------------------------------------------------------

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // This is handled by handleStripeWebhook
  // But we can add additional logic here if needed
  console.log(`💰 Invoice paid: ${invoice.id}`);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log(`❌ Invoice payment failed: ${invoice.id}`);
}

export async function handleInvoiceVoided(invoice: Stripe.Invoice): Promise<void> {
  console.log(`🚫 Invoice voided: ${invoice.id}`);
}

export async function handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
  console.log(`📄 Invoice finalized: ${invoice.id}`);
}

export async function handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
  console.log(`👤 Customer deleted: ${customer.id}`);
}

export async function handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
  console.log(`✅ Charge succeeded: ${charge.id}`);
}

export async function handleChargeFailed(charge: Stripe.Charge): Promise<void> {
  console.log(`❌ Charge failed: ${charge.id}`);
}

// -----------------------------------------------------------------------------
// Process Webhook Request (Main Entry Point)
// -----------------------------------------------------------------------------

export async function processWebhookRequest(
  rawBody: string | Buffer,
  signature: string | null
): Promise<WebhookProcessingResult> {
  // Verify signature
  const verification = await verifyWebhookSignatureSafe(rawBody, signature);
  
  if (!verification.success || !verification.event) {
    return {
      success: false,
      error: verification.error || 'Webhook verification failed',
      status: 401,
    };
  }

  // Handle the event
  return handleWebhookEvent(verification.event);
}
