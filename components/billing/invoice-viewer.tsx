'use client';

// ═══════════════════════════════════════════════════════════════
// INVOICE VIEWER
// components/billing/invoice-viewer.tsx
//
// Displays invoice details with line items and status
// Supports PDF export and status updates
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText,
  Download,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Building,
  Calendar,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface InvoiceLineItem {
  id: string;
  serviceType: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  totalCents: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  totalCents: number;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';
  createdAt: string;
  lineItems: InvoiceLineItem[];
  billingAccount?: {
    billingEmail: string;
    firm?: {
      name: string;
      address?: string;
    };
  };
}

interface InvoiceViewerProps {
  invoiceId?: string;
  invoice?: Invoice;
  onStatusChange?: (invoiceId: string, status: Invoice['status']) => void;
  showActions?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const formatCurrency = (cents: number): string => {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusBadge = (status: Invoice['status']) => {
  const config = {
    DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Draft' },
    OPEN: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: 'Open' },
    PAID: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Paid' },
    VOID: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Void' },
  };
  
  const { color, icon: Icon, label } = config[status];
  
  return (
    <Badge className={`${color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const formatServiceType = (serviceType: string): string => {
  const labels: Record<string, string> = {
    TRANSCRIPTION_AUTOMATED: 'Automated Transcription',
    MODEL_UPGRADE: 'Enhanced ASR Model',
    HUMAN_REVIEW_CONFIDENCE: 'Confidence-Based Review',
    HUMAN_REVIEW_FULL: 'Full Scopist Review',
    FORENSIC_AUDIO_RX: 'Forensic Audio Enhancement',
  };
  return labels[serviceType] || serviceType;
};

const formatUnit = (unit: string): string => {
  const labels: Record<string, string> = {
    PER_MINUTE: 'min',
    PER_WORD: 'words',
    PER_FILE: 'file',
    PER_HOUR: 'hr',
  };
  return labels[unit] || unit;
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InvoiceViewer({
  invoiceId,
  invoice: propInvoice,
  onStatusChange,
  showActions = true,
}: InvoiceViewerProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(propInvoice || null);
  const [loading, setLoading] = useState(!propInvoice && !!invoiceId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propInvoice) {
      setInvoice(propInvoice);
      return;
    }

    if (!invoiceId) return;

    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/billing/invoices/${invoiceId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch invoice');
        }
        
        const data = await response.json();
        setInvoice(data.invoice);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, propInvoice]);

  const handleStatusChange = async (status: Invoice['status']) => {
    if (!invoice) return;

    try {
      const response = await fetch(`/api/billing/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setInvoice({ ...invoice, status });
      onStatusChange?.(invoice.id, status);
      toast.success(`Invoice marked as ${status.toLowerCase()}`);
    } catch (_err) {
      toast.error('Failed to update invoice status');
    }
  };

  const handleExportPDF = async () => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`/api/billing/invoices/${invoice.id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Invoice downloaded');
    } catch (_err) {
      toast.error('Failed to download invoice');
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No invoice
  if (!invoice) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>No invoice to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {invoice.invoiceNumber}
            </CardTitle>
            <CardDescription className="mt-1">
              {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(invoice.status)}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <Separator className="my-1" />
                  {invoice.status === 'DRAFT' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('OPEN')}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark as Open
                    </DropdownMenuItem>
                  )}
                  {invoice.status === 'OPEN' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('PAID')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </DropdownMenuItem>
                  )}
                  {invoice.status !== 'VOID' && invoice.status !== 'PAID' && (
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange('VOID')}
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Void Invoice
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Firm Information */}
        {invoice.billingAccount?.firm && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{invoice.billingAccount.firm.name}</p>
                {invoice.billingAccount.firm.address && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.billingAccount.firm.address}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {invoice.billingAccount.billingEmail}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Invoice #
            </p>
            <p className="font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Issue Date
            </p>
            <p className="font-medium">{formatDate(invoice.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Period Start</p>
            <p className="font-medium">{formatDate(invoice.periodStart)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Period End</p>
            <p className="font-medium">{formatDate(invoice.periodEnd)}</p>
          </div>
        </div>

        <Separator />

        {/* Line Items Table */}
        <div>
          <h4 className="font-medium mb-3">Line Items</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatServiceType(item.serviceType)}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.quantity).toFixed(2)} {formatUnit(item.unit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPriceCents)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.totalCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/50">
        <div className="w-full flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {invoice.lineItems.length} item{invoice.lineItems.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Due</p>
            <p className="text-2xl font-bold">{formatCurrency(invoice.totalCents)}</p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export default InvoiceViewer;
