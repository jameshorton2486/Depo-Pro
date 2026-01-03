// =============================================================================
// 403 FORBIDDEN PAGE
// app/403/page.tsx
//
// Access denied error page
// =============================================================================

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-300 mb-2">403</h1>
        <h2 className="text-2xl font-bold mt-4 mb-2">Access Denied</h2>
        <p className="text-gray-600 mt-2 mb-6">
          You don't have permission to access this page.
        </p>
        <Link
          href="/dashboard"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
