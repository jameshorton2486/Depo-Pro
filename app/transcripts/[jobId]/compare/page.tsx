// =============================================================================
// TRANSCRIPT COMPARE PAGE (STUB)
// app/transcripts/[jobId]/compare/page.tsx
//
// Version comparison feature (coming soon)
// =============================================================================

import Link from 'next/link';
import { GitCompare } from 'lucide-react';

export default function TranscriptComparePage() {
  return (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <GitCompare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-4">Version Comparison</h1>
      <p className="text-gray-600 mb-6">
        This feature is coming in a future release. You'll be able to compare
        different versions of transcripts side-by-side.
      </p>
      <Link
        href="/transcripts"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
      >
        Back to Transcripts
      </Link>
    </div>
  );
}
