// =============================================================================
// UNAUTHORIZED PAGE
// app/unauthorized/page.tsx
//
// Unauthorized access page
// =============================================================================

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mt-4 mb-2">Unauthorized</h2>
        <p className="text-gray-600 mt-2 mb-6">
          Please sign in to access this page.
        </p>
        <Link
          href="/login"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
