// =============================================================================
// STRIPE WEBHOOK API ROUTE
// =============================================================================
// Location: app/api/webhooks/stripe/route.ts
// Purpose: Handle Stripe webhook events
//
// SETUP:
// 1. Create webhook endpoint in Stripe Dashboard
// 2. Point to: https://yourdomain.com/api/webhooks/stripe
// 3. Enable events: invoice.paid, invoice.payment_failed, invoice.voided
// 4. Copy signing secret to STRIPE_WEBHOOK_SECRET
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { processWebhookRequest } from '@/lib/services/webhook-verification-service';

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️ Stripe not configured - webhook ignored');
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  try {
    // Get the raw body
    const rawBody = await request.text();

    // Get the signature header
    const signature = request.headers.get('stripe-signature');

    // Process webhook using verification service (Phase 4.4: Billing Completion)
    const result = await processWebhookRequest(rawBody, signature);

    return NextResponse.json(result.body || { received: result.success }, { status: result.status });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler (for webhook verification)
// =============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/stripe',
    configured: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
    message: 'Stripe webhook endpoint is active',
  });
}
