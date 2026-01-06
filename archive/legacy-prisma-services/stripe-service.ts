// =============================================================================
// STRIPE SERVICE
// =============================================================================
// Location: lib/services/stripe-service.ts
// Phase: 4 - Billing Completion
// Fixes: B4 (Stripe integration)
//
// CRITICAL PRINCIPLE:
// This service wraps Stripe operations and provides a clean interface
// for customer and invoice management.
// =============================================================================

import { getOrCreateStripeCustomer } from '@/lib/stripe/customer-service';
import { createStripeInvoice, voidInvoice } from '@/lib/stripe/invoice-service';
import { stripe, isStripeEnabled } from '@/lib/stripe/client';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface StripeCustomerResult {
  success: boolean;
  stripeCustomerId?: string;
  error?: string;
}

export interface StripeInvoiceResult {
  success: boolean;
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// Get Stripe Client
// -----------------------------------------------------------------------------

export function getStripeClient() {
  return stripe;
}

export function isStripeEnabledCheck(): boolean {
  return isStripeEnabled();
}

// -----------------------------------------------------------------------------
// Get or Create Stripe Customer
// -----------------------------------------------------------------------------

export async function getOrCreateStripeCustomerForFirm(
  firmId: string,
  email: string,
  name: string
): Promise<StripeCustomerResult> {
  try {
    const result = await getOrCreateStripeCustomer({
      firmId,
      email,
      name,
    });

    return {
      success: result.success,
      stripeCustomerId: result.stripeCustomerId,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// -----------------------------------------------------------------------------
// Push Invoice to Stripe
// -----------------------------------------------------------------------------

export async function pushInvoiceToStripe(
  invoiceId: string
): Promise<StripeInvoiceResult> {
  try {
    const result = await createStripeInvoice(invoiceId);
    return {
      success: result.success,
      stripeInvoiceId: result.stripeInvoiceId,
      stripeInvoiceUrl: result.stripeInvoiceUrl,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// -----------------------------------------------------------------------------
// Void Stripe Invoice
// -----------------------------------------------------------------------------

export async function voidStripeInvoiceById(
  invoiceId: string
): Promise<StripeInvoiceResult> {
  try {
    const result = await voidInvoice(invoiceId);
    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// -----------------------------------------------------------------------------
// Sync Invoice Status from Stripe
// -----------------------------------------------------------------------------

export async function syncInvoiceStatusFromStripe(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isStripeEnabled() || !stripe) {
    return { success: false, error: 'Stripe not enabled' };
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { stripeInvoiceId: true },
    });

    if (!invoice?.stripeInvoiceId) {
      return { success: false, error: 'No Stripe invoice ID found' };
    }

    const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId);

    // Update invoice status based on Stripe status
    let status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' = 'DRAFT';
    if (stripeInvoice.status === 'paid') {
      status = 'PAID';
    } else if (stripeInvoice.status === 'void') {
      status = 'VOID';
    } else if (stripeInvoice.status === 'open') {
      status = 'OPEN';
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: status as 'DRAFT' | 'OPEN' | 'PAID' | 'VOID',
        paidAt: stripeInvoice.status === 'paid' && stripeInvoice.status_transitions?.paid_at 
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000) 
          : undefined,
      },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Get Stripe Invoice Details
// -----------------------------------------------------------------------------

export async function getStripeInvoiceDetails(
  invoiceId: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (!isStripeEnabled() || !stripe) {
    return { success: false, error: 'Stripe not enabled' };
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { stripeInvoiceId: true },
    });

    if (!invoice?.stripeInvoiceId) {
      return { success: false, error: 'No Stripe invoice ID found' };
    }

    const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId);

    return {
      success: true,
      data: stripeInvoice,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Send Invoice to Customer
// -----------------------------------------------------------------------------

export async function sendInvoiceToCustomer(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isStripeEnabled() || !stripe) {
    return { success: false, error: 'Stripe not enabled' };
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { stripeInvoiceId: true },
    });

    if (!invoice?.stripeInvoiceId) {
      return { success: false, error: 'No Stripe invoice ID found' };
    }

    await stripe.invoices.sendInvoice(invoice.stripeInvoiceId);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
