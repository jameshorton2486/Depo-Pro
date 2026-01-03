// =============================================================================
// BILLING PAGE (STUB)
// app/billing/page.tsx
//
// Billing features coming soon
// =============================================================================

import Link from 'next/link';
import { CreditCard } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-4">Billing</h1>
      <p className="text-gray-600 mb-6">
        Billing features are coming soon. For billing inquiries, please contact support.
      </p>
      <Link
        href="/contact"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
      >
        Contact Support
      </Link>
    </div>
  );
}
