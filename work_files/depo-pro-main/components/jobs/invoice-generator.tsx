'use client';

// ═══════════════════════════════════════════════════════════════
// INVOICE GENERATOR COMPONENT
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { InvoiceData, InvoiceItem } from '@/lib/invoice';

interface InvoiceGeneratorProps {
  jobId: string;
  caseNumber?: string;
  totalPages?: number;
  rushOrder?: boolean;
}

export function InvoiceGenerator({
  jobId,
  caseNumber,
  totalPages = 0,
  rushOrder = false,
}: InvoiceGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatePDF: false }),
      });

      if (res.ok) {
        const data = await res.json();
        setInvoiceData(data.invoice);
        toast.success('Invoice generated successfully');
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatePDF: true }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceData?.invoiceNumber || 'new'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Invoice downloaded');
      } else {
        toast.error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Case Number:</span>
                <div className="font-medium">{caseNumber || 'N/A'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Pages:</span>
                <div className="font-medium">{totalPages}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Rush Order:</span>
                <div className="font-medium">{rushOrder ? 'Yes (+50%)' : 'No'}</div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Generating...' : '🧾 Generate Invoice'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {invoiceData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Invoice {invoiceData.invoiceNumber}</span>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                📥 Download PDF
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h4 className="font-semibold mb-2">Bill To:</h4>
                <div className="text-sm">
                  <div>{invoiceData.clientName || 'Client Name'}</div>
                  <div className="text-muted-foreground">
                    {invoiceData.clientContact || 'client@example.com'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Items:</h4>
                <div className="space-y-2">
                  {invoiceData.items.map((item: InvoiceItem, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <div>{item.description}</div>
                        <div className="text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <div className="font-medium">{formatCurrency(item.total)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoiceData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(invoiceData.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(invoiceData.total)}</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <div>Due Date: {new Date(invoiceData.dueDate).toLocaleDateString()}</div>
                {invoiceData.notes && <div className="mt-2">{invoiceData.notes}</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
