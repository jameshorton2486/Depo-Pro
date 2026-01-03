// =============================================================================
// TRANSCRIPT FINALIZE PAGE
// app/transcripts/[jobId]/finalize/page.tsx
//
// Review summary and finalization confirmation
// =============================================================================

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function TranscriptFinalizePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFinalize() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/transcripts/${jobId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to finalize');
      }

      router.push(`/transcripts/${jobId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize transcript');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Finalize Transcript</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <h2 className="font-semibold text-yellow-800">Warning</h2>
            <p className="text-yellow-700 mt-1">
              Once finalized, this transcript cannot be edited without admin approval.
              Please ensure all corrections have been made before proceeding.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">Summary</h3>
        <p className="text-gray-600">
          You are about to finalize this transcript. This action will lock the transcript
          and prevent further edits.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href={`/transcripts/${jobId}`}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors text-center"
        >
          Cancel
        </Link>
        <button
          onClick={handleFinalize}
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Finalizing...' : 'Finalize Transcript'}
        </button>
      </div>
    </div>
  );
}
