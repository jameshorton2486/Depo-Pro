// ═══════════════════════════════════════════════════════════════
// INVOICE PDF GENERATION
// app/api/billing/invoices/[id]/pdf/route.ts
//
// Generate PDF for an invoice
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import PDFDocument from 'pdfkit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        billingAccount: {
          include: { firm: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    
    // Header
    doc.fontSize(24).text('INVOICE', { align: 'right' });
    doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // From/To
    doc.text('From: Depo-Pro Services');
    doc.moveDown();
    doc.text(`To: ${invoice.billingAccount?.firm?.name || 'Client'}`);
    doc.text(`Email: ${invoice.billingAccount?.billingEmail}`);
    doc.moveDown(2);

    // Period
    doc.text(`Period: ${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()}`);
    doc.moveDown();

    // Line Items Table
    doc.fontSize(10);
    const tableTop = doc.y;
    
    // Header row
    doc.text('Service', 50, tableTop);
    doc.text('Quantity', 250, tableTop);
    doc.text('Unit Price', 350, tableTop);
    doc.text('Total', 450, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let y = tableTop + 25;
    for (const item of invoice.lineItems) {
      doc.text(item.description.substring(0, 40), 50, y);
      doc.text(Number(item.quantity).toFixed(2), 250, y);
      doc.text(`$${(item.unitPriceCents / 100).toFixed(2)}`, 350, y);
      doc.text(`$${(item.totalCents / 100).toFixed(2)}`, 450, y);
      y += 20;
    }

    // Total
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;
    doc.fontSize(12).text(`Total Due: $${(invoice.totalCents / 100).toFixed(2)}`, 350, y);

    doc.end();

    // Wait for PDF to finish
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[Invoice PDF] Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
