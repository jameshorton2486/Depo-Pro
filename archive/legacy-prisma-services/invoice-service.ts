// =============================================================================
// STRIPE INVOICE SERVICE
// =============================================================================
// Location: lib/stripe/invoice-service.ts
// Purpose: Create and manage Stripe invoices from internal invoices
//
// CRITICAL PRINCIPLE:
// Your database is the source of truth. Stripe only mirrors it.
// You never calculate prices inside Stripe.
// =============================================================================

import { stripe, isStripeEnabled } from './client';
import { getOrCreateStripeCustomer } from './customer-service';
import type { InvoiceStatus } from '@/types/database';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface StripeInvoiceResult {
  success: boolean;
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
  error?: string;
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  serviceType: string;
  jobId?: string;
}

// -----------------------------------------------------------------------------
// Create Stripe Invoice from Internal Invoice
// -----------------------------------------------------------------------------

export async function createStripeInvoice(invoiceId: string): Promise<StripeInvoiceResult> {
  // Fetch internal invoice with all relations
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      billingAccount: {
        include: {
          firm: true,
        },
      },
      lineItems: true,
    },
  });

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (invoice.status !== 'DRAFT' && invoice.status !== 'OPEN') {
    return { success: false, error: `Cannot create Stripe invoice for status: ${invoice.status}` };
  }

  if (invoice.stripeInvoiceId) {
    return { success: false, error: 'Stripe invoice already exists' };
  }

  // Check if Stripe is enabled
  if (!isStripeEnabled() || !stripe) {
    console.log('[MOCK] Would create Stripe invoice:', {
      invoiceId,
      totalCents: invoice.totalCents,
      lineItemCount: invoice.lineItems.length,
    });
    return {
      success: true,
      stripeInvoiceId: `in_mock_${invoiceId}`,
      stripeInvoiceUrl: `https://invoice.stripe.com/mock/${invoiceId}`,
    };
  }

  try {
    // Ensure Stripe customer exists
    let stripeCustomerId = invoice.billingAccount.stripeCustomerId;

    if (!stripeCustomerId) {
      const customerResult = await getOrCreateStripeCustomer({
        firmId: invoice.billingAccount.firmId,
        email: invoice.billingAccount.billingEmail,
        name: invoice.billingAccount.firm.name,
      });

      if (!customerResult.success || !customerResult.stripeCustomerId) {
        return { success: false, error: 'Failed to create Stripe customer' };
      }

      stripeCustomerId = customerResult.stripeCustomerId;
    }

    // Create Stripe invoice shell
    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: false, // Don't auto-finalize
      collection_method: 'charge_automatically',
      metadata: {
        internalInvoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        firmId: invoice.billingAccount.firmId,
      },
    });

    // Push line items to Stripe
    for (const item of invoice.lineItems) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        description: item.description,
        amount: item.unitPriceCents,
        quantity: Number(item.quantity),
        currency: 'usd', // Default to USD
        metadata: {
          serviceType: item.serviceType,
          jobId: item.jobId || '',
          lineItemId: item.id,
        },
      });
    }

    // Finalize the Stripe invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

    // Update internal invoice with Stripe ID
    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        stripeInvoiceId: finalizedInvoice.id,
        status: 'OPEN',
      },
    });

    console.log(`✅ Created Stripe invoice ${finalizedInvoice.id} for internal invoice ${invoice.id}`);

    return {
      success: true,
      stripeInvoiceId: finalizedInvoice.id,
      stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url || undefined,
    };
  } catch (error) {
    console.error('❌ Failed to create Stripe invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Mark Invoice as Paid (called from webhook)
// -----------------------------------------------------------------------------

export async function markInvoicePaid(stripeInvoiceId: string): Promise<boolean> {
  try {
    const invoice = await db.invoice.findFirst({
      where: { stripeInvoiceId },
    });

    if (!invoice) {
      console.warn(`No internal invoice found for Stripe invoice: ${stripeInvoiceId}`);
      return false;
    }

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Marked invoice ${invoice.id} as PAID`);
    return true;
  } catch (error) {
    console.error('❌ Failed to mark invoice as paid:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Void Invoice
// -----------------------------------------------------------------------------

export async function voidInvoice(invoiceId: string): Promise<StripeInvoiceResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (invoice.status === 'PAID') {
    return { success: false, error: 'Cannot void a paid invoice' };
  }

  if (invoice.status === 'VOID') {
    return { success: true }; // Already voided
  }

  try {
    // Void in Stripe if it exists
    if (invoice.stripeInvoiceId && isStripeEnabled() && stripe) {
      await stripe.invoices.voidInvoice(invoice.stripeInvoiceId);
    }

    // Update internal invoice
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'VOID',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Voided invoice ${invoiceId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to void invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Get Invoice Payment Link
// -----------------------------------------------------------------------------

export async function getInvoicePaymentUrl(invoiceId: string): Promise<string | null> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice?.stripeInvoiceId || !isStripeEnabled() || !stripe) {
    return null;
  }

  try {
    const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId);
    return stripeInvoice.hosted_invoice_url || null;
  } catch (error) {
    console.error('Failed to get invoice payment URL:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Sync Invoice Status from Stripe
// -----------------------------------------------------------------------------

export async function syncInvoiceStatus(stripeInvoiceId: string): Promise<void> {
  if (!isStripeEnabled() || !stripe) return;

  try {
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);
    
    const statusMap: Record<string, InvoiceStatus> = {
      draft: 'DRAFT',
      open: 'OPEN',
      paid: 'PAID',
      void: 'VOID',
      uncollectible: 'VOID',
    };

    const newStatus = statusMap[stripeInvoice.status || 'draft'] || 'DRAFT';

    await db.invoice.updateMany({
      where: { stripeInvoiceId },
      data: { status: newStatus },
    });

    console.log(`✅ Synced invoice status: ${stripeInvoiceId} → ${newStatus}`);
  } catch (error) {
    console.error('❌ Failed to sync invoice status:', error);
  }
}

// -----------------------------------------------------------------------------
// Send Invoice (triggers payment email)
// -----------------------------------------------------------------------------

export async function sendInvoice(invoiceId: string): Promise<StripeInvoiceResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice?.stripeInvoiceId) {
    // Create Stripe invoice first if it doesn't exist
    const createResult = await createStripeInvoice(invoiceId);
    if (!createResult.success) {
      return createResult;
    }
  }

  if (!isStripeEnabled() || !stripe) {
    return { success: true, stripeInvoiceId: invoice?.stripeInvoiceId || undefined };
  }

  try {
    // Refresh invoice data
    const updatedInvoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!updatedInvoice?.stripeInvoiceId) {
      return { success: false, error: 'No Stripe invoice ID' };
    }

    // Send the invoice
    await stripe.invoices.sendInvoice(updatedInvoice.stripeInvoiceId);

    console.log(`✅ Sent invoice ${updatedInvoice.stripeInvoiceId}`);
    return {
      success: true,
      stripeInvoiceId: updatedInvoice.stripeInvoiceId,
    };
  } catch (error) {
    console.error('❌ Failed to send invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
