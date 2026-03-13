import type { NextRequest} from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import {
  generateInvoiceNumber,
  calculateJobPrice,
  calculateInvoiceTotal,
  generateInvoicePDF,
  type InvoiceData,
} from '@/lib/invoice';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

// ═══════════════════════════════════════════════════════════════
// POST /api/jobs/[id]/invoice - Generate invoice for job
// ═══════════════════════════════════════════════════════════════

const POSTHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { generatePDF = false } = body;

    const supabase = await createSupabaseServerClient();

    // Get job details
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Calculate pricing from real job/transcription data
    const transcription = await getTranscriptByJobId(supabase, jobId);
    const wordCount = transcription?.word_count ?? null;
    const pageCount = transcription?.page_count ?? (wordCount ? Math.ceil(wordCount / 250) : 0);
    const durationMinutes =
      (job as any).audio_duration_minutes ??
      ((job as any).audio_duration_seconds
        ? Math.ceil((job as any).audio_duration_seconds / 60)
        : transcription?.duration
          ? Math.ceil(transcription.duration / 60)
          : 0);
    const items = calculateJobPrice(pageCount, durationMinutes, false);
    const totals = calculateInvoiceTotal(items);

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    // Prepare invoice data
    const invoiceData: InvoiceData = {
      invoiceNumber,
      jobId,
      caseNumber: (job as any).case_number || (job as any).caseNumber || undefined,
      clientName: undefined,
      clientContact: undefined,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: 'Payment due within 30 days. Thank you for your business.',
    };

    const firmId = (job as any).firm_id || (job as any).firmId || null;
    if (!firmId) {
      return NextResponse.json({ error: 'Job is missing firm association' }, { status: 400 });
    }

    const { data: billingAccount, error: billingAccountError } = await supabase
      .from('billing_accounts')
      .select('id')
      .eq('firm_id', firmId)
      .maybeSingle();

    let billingAccountId = billingAccount?.id || null;
    if (billingAccountError) {
      throw billingAccountError;
    }

    if (!billingAccountId) {
      const { data: createdBillingAccount, error: createBillingError } = await supabase
        .from('billing_accounts')
        .insert({
          firm_id: firmId,
          billing_email: currentUser.email || 'billing@depo-pro.com',
          currency: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createBillingError) {
        throw createBillingError;
      }

      billingAccountId = createdBillingAccount.id;
    }

    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0, 23, 59, 59));

    const { data: invoiceRecord, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        billing_account_id: billingAccountId,
        invoice_number: invoiceNumber,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        total_cents: totals.total,
        subtotal_cents: totals.subtotal,
        tax_cents: totals.tax,
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (invoiceError) {
      throw invoiceError;
    }

    if (items.length > 0) {
      const lineItems = items.map((item) => ({
        invoice_id: invoiceRecord.id,
        description: item.description,
        quantity: item.quantity,
        unit_price_cents: item.unitPrice,
        total_cents: item.total,
      }));

      const { error: lineItemError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems);

      if (lineItemError) {
        logger.warn('Failed to create invoice line items', {
          invoiceId: invoiceRecord.id,
          error: lineItemError.message,
        });
      }
    }

    logger.info(`Invoice generated - jobId: ${jobId}, invoiceNumber: ${invoiceNumber}`);

    if (generatePDF) {
      // Return PDF
      const pdfBuffer = await generateInvoicePDF(invoiceData);
      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      success: true,
      invoice: {
        ...invoiceData,
        id: invoiceRecord.id,
      },
    });

  } catch (error) {
    const { id } = await params;
    logger.error(`Failed to generate invoice - jobId: ${id}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 },
    );
  }
}


export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [GuardRole.ADMIN, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 10, windowMs: 60_000 },
  },
  async (request, { params }) => ((POSTHandler) as any)(request, { params: Promise.resolve(params as any) })
);
