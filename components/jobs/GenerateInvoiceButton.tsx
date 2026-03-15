'use client';

import { useState } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvoiceResult {
  id: string;
  invoiceNumber: string;
  total: number;
  subtotal: number;
}

interface GenerateInvoiceButtonProps {
  jobId: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function GenerateInvoiceButton({ jobId }: GenerateInvoiceButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function generate() {
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/jobs/${jobId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatePDF: false }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      setInvoice({
        id: data.invoice.id,
        invoiceNumber: data.invoice.invoiceNumber,
        total: data.invoice.total,
        subtotal: data.invoice.subtotal,
      });
      setState('done');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message);
    }
  }

  if (state === 'done' && invoice) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Invoice Generated — {invoice.invoiceNumber}
            </p>
            <p className="text-xs text-emerald-600">
              Total: {formatCurrency(invoice.total)}
            </p>
          </div>
        </div>
        <a
          href={`/api/billing/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <Download className="h-3 w-3" />
          Download PDF
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {state === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700">{errorMsg}</p>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={generate}
        disabled={state === 'loading'}
        className="w-full"
      >
        {state === 'loading' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
        ) : (
          <><FileText className="mr-2 h-4 w-4" />Generate Invoice</>
        )}
      </Button>
    </div>
  );
}
