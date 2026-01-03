// =============================================================================
// TRANSCRIPTION STATUS PAGE
// app/transcription/status/[jobId]/page.tsx
//
// Real-time status updates for transcription job
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

interface TranscriptionStatus {
  status: string;
  progress?: number;
  error?: string;
  transcriptId?: string;
}

export default function TranscriptionStatusPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const [status, setStatus] = useState<TranscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/status`);
        if (!res.ok) {
          throw new Error('Failed to fetch status');
        }
        const data = await res.json();
        setStatus(data);
        setLoading(false);

        // Stop polling if job is complete or failed
        return data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'FINALIZED';
      } catch (err) {
        console.error('Error fetching status:', err);
        setLoading(false);
        return false; // Stop polling on error
      }
    };

    // Initial fetch
    void fetchStatus();

    // Set up polling
    const interval = setInterval(async () => {
      const shouldStop = await fetchStatus();
      if (shouldStop) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  if (loading && !status) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
        <p>Loading status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Transcription Progress</h1>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        {status?.status === 'TRANSCRIBING' || status?.status === 'PROCESSING' ? (
          <>
            <Loader2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Processing Audio</h2>
            {status.progress !== undefined && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                  <div
                    className="bg-indigo-600 h-4 rounded-full transition-all"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
                <p className="text-gray-600">{status.progress}% complete</p>
              </>
            )}
          </>
        ) : status?.status === 'COMPLETED' || status?.status === 'READY_FOR_EDIT' ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Transcription Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your transcription is ready for review.
            </p>
            {status.transcriptId ? (
              <Link
                href={`/transcripts/${jobId}`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
              >
                View Transcript
              </Link>
            ) : (
              <Link
                href={`/jobs/${jobId}`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
              >
                View Job
              </Link>
            )}
          </>
        ) : status?.status === 'FAILED' ? (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Transcription Failed</h2>
            <p className="text-gray-600 mb-4">
              {status.error || 'An error occurred during transcription.'}
            </p>
            <Link
              href={`/transcription/upload`}
              className="text-indigo-600 hover:underline font-semibold"
            >
              Try Again
            </Link>
          </>
        ) : (
          <>
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Status: {status?.status || 'Unknown'}</h2>
            <p className="text-gray-600 mb-6">
              Your job is being processed. Check back soon.
            </p>
            <Link
              href={`/jobs/${jobId}`}
              className="text-indigo-600 hover:underline font-semibold"
            >
              View Job Details
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
