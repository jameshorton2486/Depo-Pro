import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import {
  generateInvoiceNumber,
  calculateJobPrice,
  calculateInvoiceTotal,
  generateInvoicePDF,
  type InvoiceData,
} from '@/lib/invoice';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// POST /api/jobs/[id]/invoice - Generate invoice for job
// ═══════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user || session.user.role !== 'ADMIN') {
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

    // Verify user is the creator
    if ((job as any).created_by_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate pricing
    const pageCount = 0; // Mock - would come from transcript
    const durationMinutes = 60; // Mock - would come from audio file metadata
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

    // TODO: Save invoice to database
    // const invoice = await db.invoice.create({
    //   data: {
    //     invoiceNumber,
    //     jobId,
    //     amount: totals.total,
    //     dueDate: invoiceData.dueDate,
    //     status: 'PENDING',
    //   },
    // });

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
      invoice: invoiceData,
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
