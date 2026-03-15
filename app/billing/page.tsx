// app/billing/page.tsx
// Billing dashboard — invoice history and payment status

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminRole } from '@/lib/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    PAID:          { label: 'Paid',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
    OPEN:          { label: 'Open',    className: 'bg-blue-100 text-blue-700 border-blue-200',         icon: Clock },
    DRAFT:         { label: 'Draft',   className: 'bg-slate-100 text-slate-600 border-slate-200',      icon: FileText },
    VOID:          { label: 'Void',    className: 'bg-red-100 text-red-600 border-red-200',            icon: AlertCircle },
    UNCOLLECTIBLE: { label: 'Overdue', className: 'bg-orange-100 text-orange-700 border-orange-200',   icon: AlertCircle },
  };

  const entry = config[status] ?? config.DRAFT;
  const Icon = entry.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${entry.className}`}>
      <Icon className="h-3 w-3" />
      {entry.label}
    </span>
  );
}

export default async function BillingPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect('/login');
  if (!isAdminRole(currentUser.role) && currentUser.role !== 'REPORTER' && currentUser.role !== 'COURT_REPORTER') {
    redirect('/dashboard');
  }

  const supabase = await createSupabaseServerClient();

  let invoices: any[] = [];
  let billingAccount: any = null;
  let totalPaid = 0;
  let totalOutstanding = 0;

  if (currentUser.firmId) {
    const { data: account } = await supabase
      .from('billing_accounts')
      .select('id, billing_email, currency')
      .eq('firm_id', currentUser.firmId)
      .maybeSingle();

    billingAccount = account;

    if (account) {
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*, invoice_line_items(*)')
        .eq('billing_account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(50);

      invoices = invoiceData || [];
      totalPaid = invoices
        .filter((inv: any) => inv.status === 'PAID')
        .reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0);
      totalOutstanding = invoices
        .filter((inv: any) => inv.status === 'OPEN' || inv.status === 'DRAFT')
        .reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0);
    }
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Billing</h1>
        <p className="mt-1 text-muted-foreground">Invoice history and payment status</p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-semibold text-slate-700">No invoices yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Invoices are generated automatically when a deposition job is completed.
              </p>
              <Link
                href="/jobs"
                className="mt-4 inline-block text-sm text-blue-600 hover:underline"
              >
                View all depositions →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 pr-4">Invoice #</th>
                    <th className="pb-3 pr-4">Period</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-mono font-medium text-slate-800">
                        {invoice.invoice_number}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {invoice.period_start
                          ? new Date(invoice.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-800">
                        {formatCurrency(invoice.total_cents || 0)}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/api/billing/invoices/${invoice.id}/pdf`}
                          className="text-xs text-blue-600 hover:underline"
                          target="_blank"
                        >
                          Download PDF
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {billingAccount && (
        <p className="mt-4 text-xs text-muted-foreground">
          Billing account: {billingAccount.billing_email}
        </p>
      )}
    </div>
  );
}
