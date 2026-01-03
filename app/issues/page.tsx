// =============================================================================
// ISSUES PAGE (STUB)
// app/issues/page.tsx
//
// Issue tracking coming soon
// =============================================================================

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function IssuesPage() {
  return (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-4">Issues</h1>
      <p className="text-gray-600 mb-6">
        Issue tracking is coming in a future release.
      </p>
      <Link
        href="/dashboard"
        className="text-indigo-600 hover:underline font-semibold"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
