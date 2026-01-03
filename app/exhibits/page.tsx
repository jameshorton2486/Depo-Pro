// =============================================================================
// EXHIBITS PAGE (STUB)
// app/exhibits/page.tsx
//
// Exhibit management coming soon
// =============================================================================

import Link from 'next/link';
import { Folder } from 'lucide-react';

export default function ExhibitsPage() {
  return (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-4">Exhibits</h1>
      <p className="text-gray-600 mb-6">
        Exhibit management is coming in a future release.
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
