// =============================================================================
// STRIPE WEBHOOK HANDLER
// =============================================================================
// Location: lib/stripe/webhook-handler.ts
// Purpose: Process Stripe webhook events
//
// SETUP REQUIRED:
// 1. Create webhook endpoint in Stripe Dashboard
// 2. Set STRIPE_WEBHOOK_SECRET environment variable
// 3. Enable events: invoice.paid, invoice.payment_failed, invoice.voided
// =============================================================================

import Stripe from 'stripe';
import { stripe } from './client';
import { markInvoicePaid } from './invoice-service';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface WebhookResult {
  success: boolean;
  eventType?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// Verify Webhook Signature
// -----------------------------------------------------------------------------

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !stripe) {
    console.warn('⚠️ Stripe webhook secret not configured');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Handle Webhook Event
// -----------------------------------------------------------------------------

export async function handleStripeWebhook(event: Stripe.Event): Promise<WebhookResult> {
  console.log(`📥 Processing Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      // Invoice Events
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'invoice.voided': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceVoided(invoice);
        break;
      }

      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFinalized(invoice);
        break;
      }

      // Customer Events
      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(customer);
        break;
      }

      // Charge Events (for additional tracking)
      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeSucceeded(charge);
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeFailed(charge);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
    }

    return { success: true, eventType: event.type };
  } catch (error) {
    console.error(`❌ Error handling webhook ${event.type}:`, error);
    return {
      success: false,
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log(`💰 Invoice paid: ${invoice.id}`);

  // Mark internal invoice as paid
  const success = await markInvoicePaid(invoice.id);

  if (success) {
    // Log the payment event
    await logWebhookEvent('invoice.paid', invoice.id, {
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      customerEmail: invoice.customer_email,
    });

    // TODO: Trigger notification to admin/customer
    // await sendPaymentConfirmationEmail(invoice);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log(`❌ Invoice payment failed: ${invoice.id}`);

  // Log the failure
  await logWebhookEvent('invoice.payment_failed', invoice.id, {
    attemptCount: invoice.attempt_count,
    nextAttempt: invoice.next_payment_attempt,
  });

  // TODO: Trigger notification to admin
  // await sendPaymentFailedNotification(invoice);
}

async function handleInvoiceVoided(invoice: Stripe.Invoice): Promise<void> {
  console.log(`🚫 Invoice voided: ${invoice.id}`);

  // Update internal invoice status
  await db.invoice.updateMany({
    where: { stripeInvoiceId: invoice.id },
    data: { status: 'VOID' },
  });

  await logWebhookEvent('invoice.voided', invoice.id, {});
}

async function handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
  console.log(`📄 Invoice finalized: ${invoice.id}`);

  // Update internal invoice status
  await db.invoice.updateMany({
    where: { stripeInvoiceId: invoice.id },
    data: { status: 'OPEN' },
  });

  await logWebhookEvent('invoice.finalized', invoice.id, {
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  });
}

async function handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
  console.log(`👤 Customer deleted: ${customer.id}`);

  // Clear Stripe customer ID from billing account
  await db.billingAccount.updateMany({
    where: { stripeCustomerId: customer.id },
    data: { stripeCustomerId: null },
  });

  await logWebhookEvent('customer.deleted', customer.id, {});
}

async function handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
  console.log(`✅ Charge succeeded: ${charge.id}`);
  
  await logWebhookEvent('charge.succeeded', charge.id, {
    amount: charge.amount,
    currency: charge.currency,
  });
}

async function handleChargeFailed(charge: Stripe.Charge): Promise<void> {
  console.log(`❌ Charge failed: ${charge.id}`);

  await logWebhookEvent('charge.failed', charge.id, {
    amount: charge.amount,
    failureCode: charge.failure_code,
    failureMessage: charge.failure_message,
  });
}

// -----------------------------------------------------------------------------
// Logging Helper
// -----------------------------------------------------------------------------

async function logWebhookEvent(
  eventType: string,
  resourceId: string,
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
        action: `stripe.${eventType}`,
        targetType: 'stripe_event',
        targetId: resourceId,
        actorUserId: systemUser?.id || undefined,
        metadata: {
          eventType,
          resourceId,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}
