import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

type BillingConfig = {
  perMinute: string;
  perPage: string;
  rushMultiplier: string;
  source: 'database' | 'placeholder';
};

export default async function BillingRatesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (!isAdminRole(currentUser.role)) {
    redirect('/unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  let firmName = 'Your Firm';
  let billing: BillingConfig = {
    perMinute: '$2.50',
    perPage: '$5.00',
    rushMultiplier: '1.5x',
    source: 'placeholder',
  };

  if (currentUser.firmId) {
    const { data: firm } = await supabase
      .from('firms')
      .select('name')
      .eq('id', currentUser.firmId)
      .maybeSingle();

    if (firm?.name) {
      firmName = firm.name;
    }
  }

  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'firms');

  const availableColumns = new Set((columns || []).map((c: any) => String(c.column_name)));
  const minuteColumn = ['billing_rate_per_minute', 'transcription_rate_per_minute'].find((name) =>
    availableColumns.has(name)
  );
  const pageColumn = ['billing_rate_per_page', 'court_reporter_rate_per_page'].find((name) =>
    availableColumns.has(name)
  );
  const rushColumn = ['rush_rate_multiplier', 'billing_rush_multiplier'].find((name) =>
    availableColumns.has(name)
  );

  if (currentUser.firmId && (minuteColumn || pageColumn || rushColumn)) {
    const selectParts = [minuteColumn, pageColumn, rushColumn].filter(Boolean).join(', ');

    if (selectParts) {
      const { data: billingData } = await supabase
        .from('firms')
        .select(selectParts)
        .eq('id', currentUser.firmId)
        .maybeSingle();

      if (billingData) {
        // Dynamic select string produces GenericStringError type — safe to cast via unknown
        const firmBilling = billingData as unknown;
        const record = firmBilling as Record<string, unknown>;
        const minuteValue = minuteColumn ? record[minuteColumn] : null;
        const pageValue = pageColumn ? record[pageColumn] : null;
        const rushValue = rushColumn ? record[rushColumn] : null;

        billing = {
          perMinute: typeof minuteValue === 'number' ? `$${minuteValue.toFixed(2)}` : billing.perMinute,
          perPage: typeof pageValue === 'number' ? `$${pageValue.toFixed(2)}` : billing.perPage,
          rushMultiplier: typeof rushValue === 'number' ? `${rushValue.toFixed(1)}x` : billing.rushMultiplier,
          source: 'database',
        };
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Billing Rates — {firmName}</h1>
      <p className="mb-6 text-sm text-gray-600">Read-only billing configuration reference.</p>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Standard Rates</h2>
        <dl className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <dt>Per audio minute (transcription)</dt>
            <dd className="font-medium">{billing.perMinute}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Per page (court reporter)</dt>
            <dd className="font-medium">{billing.perPage}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Rush rate multiplier</dt>
            <dd className="font-medium">{billing.rushMultiplier}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Note: Rates shown here are for reference only. Update requests must be submitted through the billing portal or by contacting Depo-Pro support at info@depo-pro.com.
      </p>
      {billing.source === 'placeholder' && (
        <p className="mt-2 text-xs text-gray-500">
          Firm-specific billing columns were not detected; placeholder reference values are shown.
        </p>
      )}
    </div>
  );
}
