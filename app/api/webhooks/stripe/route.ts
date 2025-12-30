// =============================================================================
// STRIPE WEBHOOK HANDLER
// Phase 6: Billing & Time Tracking
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

// Initialize Stripe only if API key is available (not during build)
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-10-29.clover",
  });
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 500 });
    }

    event = stripe.webhooks.constructEvent(
      body,
      sig,
      webhookSecret
    );
  } catch (_err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await db.invoice.update({
        where: { stripeInvoiceId: invoice.id },
        data: { status: "PAID" },
      });
      break;
    }

    case "invoice.voided": {
      const invoice = event.data.object as Stripe.Invoice;
      await db.invoice.update({
        where: { stripeInvoiceId: invoice.id },
        data: { status: "VOID" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

