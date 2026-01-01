// =============================================================================
// INVOICE SERVICE
// =============================================================================
// Location: lib/services/invoice-service.ts
// Phase: 4 - Billing Completion
// Fixes: B4 (invoice generation)
//
// CRITICAL PRINCIPLE:
// This service wraps the invoice generator and provides a clean interface
// for creating, finalizing, and managing invoices.
// =============================================================================

import { db } from '@/lib/db';
import { generateInvoiceForJob } from '@/lib/billing/invoice-generator';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CreateInvoiceInput {
  jobId: string;
  firmId: string;
  createdByUserId: string;
}

export interface InvoiceServiceResult {
  success: boolean;
  invoiceId?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// Create Invoice
// -----------------------------------------------------------------------------

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<InvoiceServiceResult> {
  try {
    const result = await generateInvoiceForJob(
      input.jobId,
      {
        periodStart: new Date(),
        periodEnd: new Date(),
        sendToStripe: false,
      }
    );

    if (!result.success || !result.invoiceId) {
      return {
        success: false,
        error: result.error || 'Failed to generate invoice',
      };
    }

    return {
      success: true,
      invoiceId: result.invoiceId,
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
// Finalize Invoice
// -----------------------------------------------------------------------------

export async function finalizeInvoice(
  invoiceId: string,
  actorUserId: string
): Promise<InvoiceServiceResult> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (invoice.status !== 'DRAFT') {
      return {
        success: false,
        error: `Invoice is already ${invoice.status}`,
      };
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'OPEN',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'invoice.finalized',
        targetType: 'invoice',
        targetId: invoiceId,
        actorUserId,
        metadata: {
          finalizedAt: new Date().toISOString(),
        },
      },
    });

    return { success: true, invoiceId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Mark Invoice as Paid
// -----------------------------------------------------------------------------

export async function markInvoicePaid(
  invoiceId: string,
  actorUserId: string,
  paymentMethod?: string
): Promise<InvoiceServiceResult> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (invoice.status === 'PAID') {
      return { success: false, error: 'Invoice is already paid' };
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'invoice.paid',
        targetType: 'invoice',
        targetId: invoiceId,
        actorUserId,
        metadata: {
          paidAt: new Date().toISOString(),
          paymentMethod,
        },
      },
    });

    return { success: true, invoiceId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Void Invoice
// -----------------------------------------------------------------------------

export async function voidInvoice(
  invoiceId: string,
  actorUserId: string,
  reason: string
): Promise<InvoiceServiceResult> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (invoice.status === 'PAID') {
      return {
        success: false,
        error: 'Cannot void a paid invoice',
      };
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'VOID',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'invoice.voided',
        targetType: 'invoice',
        targetId: invoiceId,
        actorUserId,
        metadata: {
          voidedAt: new Date().toISOString(),
          reason,
        },
      },
    });

    return { success: true, invoiceId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// -----------------------------------------------------------------------------
// Get Invoice
// -----------------------------------------------------------------------------

export async function getInvoice(invoiceId: string) {
  return db.invoice.findUnique({
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
}

// -----------------------------------------------------------------------------
// Verify Invoice Integrity
// -----------------------------------------------------------------------------

export async function verifyInvoiceIntegrity(invoiceId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: true,
    },
  });

  if (!invoice) {
    return { valid: false, errors: ['Invoice not found'] };
  }

  // Check line items sum matches total
  const lineItemsTotal = invoice.lineItems.reduce(
    (sum, item) => sum + item.totalCents,
    0
  );

  if (lineItemsTotal !== invoice.totalCents) {
    errors.push(
      `Line items total (${lineItemsTotal}) does not match invoice total (${invoice.totalCents})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
