// =============================================================================
// STRIPE WEBHOOK API ROUTE
// =============================================================================
// FAIL-CLOSED: Stripe signature verification is mandatory.
// If STRIPE_WEBHOOK_SECRET is missing, all requests are rejected (503).
// If signature is invalid, request is rejected (401).
// =============================================================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  // FAIL-CLOSED: Missing config = reject all
  if (!stripeKey || !webhookSecret) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');

  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 401 });
  }

  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;

  try {
    // constructEvent throws on invalid signature — this IS the verification
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (err) {
    // FAIL-CLOSED: Invalid signature = immediate 401, no processing
    console.error(
      '[stripe-webhook] Signature verification failed:',
      err instanceof Error ? err.message : 'unknown',
    );
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 401 });
  }

  // Safe to process — signature verified
  logger.info('Stripe webhook verified', { type: event.type, id: event.id });

  const adminClient = createAdminClient();

  switch (event.type) {

    case 'invoice.paid': {
      const stripeInvoice = event.data.object as any;
      if (stripeInvoice.id) {
        const { error } = await adminClient
          .from('invoices')
          .update({
            status: 'PAID',
            paid_at: new Date(stripeInvoice.status_transitions?.paid_at * 1000 || Date.now()).toISOString(),
            stripe_invoice_id: stripeInvoice.id,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_invoice_id', stripeInvoice.id);

        if (error) {
          console.error('[stripe-webhook] Failed to update invoice to PAID:', error.message);
        } else {
          logger.info('Invoice marked PAID', { stripeInvoiceId: stripeInvoice.id });
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const stripeInvoice = event.data.object as any;
      if (stripeInvoice.id) {
        const { error } = await adminClient
          .from('invoices')
          .update({
            status: 'OPEN',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_invoice_id', stripeInvoice.id);

        if (error) {
          console.error('[stripe-webhook] Failed to update invoice on payment failure:', error.message);
        }
        logger.info('Invoice payment failed', { stripeInvoiceId: stripeInvoice.id });
      }
      break;
    }

    case 'invoice.voided': {
      const stripeInvoice = event.data.object as any;
      if (stripeInvoice.id) {
        await adminClient
          .from('invoices')
          .update({ status: 'VOID', updated_at: new Date().toISOString() })
          .eq('stripe_invoice_id', stripeInvoice.id);
        logger.info('Invoice voided', { stripeInvoiceId: stripeInvoice.id });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as any;
      if (subscription.customer) {
        await adminClient
          .from('billing_accounts')
          .update({
            stripe_customer_id: subscription.customer,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer);
        logger.info('Subscription updated', { customerId: subscription.customer, status: subscription.status });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      logger.info('Subscription cancelled', { customerId: subscription.customer });
      break;
    }

    default:
      logger.info('Unhandled Stripe event type', { type: event.type });
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/stripe',
    configured: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
  });
}
