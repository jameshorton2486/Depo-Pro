// =============================================================================
// LIVE TRANSCRIPTION PAGE (STUB)
// app/transcription/live/[jobId]/page.tsx
//
// Stub page for live transcription feature
// =============================================================================

import Link from 'next/link';
import { Mic } from 'lucide-react';

export default function LiveTranscriptionPage() {
  return (
    <div className="max-w-xl mx-auto p-6 text-center">
      <Mic className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-4">Live Transcription</h1>
      <p className="text-gray-600 mb-6">
        Real-time transcription is coming in a future release.
      </p>
      <Link
        href="/transcription/upload"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
      >
        Upload Audio Instead
      </Link>
    </div>
  );
}
