import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AudioProcessingPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (!isAdminRole(currentUser.role)) {
    redirect('/unauthorized');
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Audio Processing Pipeline</h1>
      <p className="mb-6 text-sm text-gray-600">Read-only reference for deposition audio ingestion and transcription processing.</p>

      <div className="space-y-4">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Supported Formats</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
            <li>Input: MP3, MP4, M4A, WAV, FLAC, OGG, WEBM</li>
            <li>Target: 16kHz mono WAV (normalized before transcription)</li>
            <li>Max file size: 500MB</li>
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Processing Steps</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
            <li>File validation (format + size check)</li>
            <li>Audio extraction (video formats stripped to audio)</li>
            <li>Normalization (converted to 16kHz mono WAV)</li>
            <li>Deepgram Nova-3 transcription</li>
            <li>Word-level confidence scoring</li>
            <li>Low-confidence word flagging (threshold: 0.85)</li>
            <li>Transcript segments written to database</li>
          </ol>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Storage</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
            <li>Raw uploads: <code>depo-audio</code> bucket (Supabase Storage)</li>
            <li>Processed chunks: <code>depo-chunks</code> bucket</li>
            <li>Exported transcripts: <code>depo-exports</code> bucket</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
