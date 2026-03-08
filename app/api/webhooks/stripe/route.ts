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

  switch (event.type) {
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.voided':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // TODO: Implement billing event handlers when Stripe billing goes live
      logger.info('Stripe event received (handler pending)', { type: event.type });
      break;
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
