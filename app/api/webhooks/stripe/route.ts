// =============================================================================
// STRIPE WEBHOOK HANDLER
// Phase 6: Billing & Time Tracking
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
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

