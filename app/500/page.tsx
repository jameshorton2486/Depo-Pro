// =============================================================================
// 500 SERVER ERROR PAGE
// app/500/page.tsx
//
// Internal server error page
// =============================================================================

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function ServerErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-300 mb-2">500</h1>
        <h2 className="text-2xl font-bold mt-4 mb-2">Server Error</h2>
        <p className="text-gray-600 mt-2 mb-6">
          Something went wrong on our end. Please try again later.
        </p>
        <Link
          href="/"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
