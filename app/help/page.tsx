import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { Mic, Upload, FileText, Download, MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Help & Support</h1>
      <p className="mb-8 text-sm text-gray-600">Quick workflow guidance for Depo-Pro users.</p>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <Upload className="mb-3 h-6 w-6 text-indigo-600" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Creating a Job</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
            <li>Go to Jobs → New Job</li>
            <li>Enter case style and deponent details</li>
            <li>Upload the deposition audio file</li>
            <li>Wait for transcription completion</li>
            <li>Assign a scopist or start review</li>
          </ol>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <Mic className="mb-3 h-6 w-6 text-indigo-600" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Transcript Review</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
            <li>Open job details and select Review Transcript</li>
            <li>Inspect flagged low-confidence words</li>
            <li>Click a word to jump audio</li>
            <li>Apply correction and save</li>
            <li>Submit review when pending count is zero</li>
          </ol>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <FileText className="mb-3 h-6 w-6 text-indigo-600" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between"><span>Play / Pause</span><kbd className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">Space</kbd></div>
            <div className="flex justify-between"><span>Rewind 5s</span><kbd className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">←</kbd></div>
            <div className="flex justify-between"><span>Forward 5s</span><kbd className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">→</kbd></div>
            <div className="flex justify-between"><span>Next flagged word</span><kbd className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">Tab</kbd></div>
            <div className="flex justify-between"><span>Mark reviewed</span><kbd className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">Ctrl+Enter</kbd></div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <Download className="mb-3 h-6 w-6 text-indigo-600" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Exporting Transcripts</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
            <li>Complete transcript review</li>
            <li>Open Finalize for the job</li>
            <li>Select format (DOCX/PDF/TXT)</li>
            <li>Download generated export</li>
          </ol>
        </section>
      </div>

      <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
        <MessageCircle className="mb-2 h-6 w-6 text-indigo-600" />
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Need More Help?</h2>
        <p className="mb-2 text-sm text-gray-600">
          For technical support or billing questions, contact:
        </p>
        <a href="mailto:info@depo-pro.com" className="text-sm font-medium text-indigo-600 hover:underline">
          info@depo-pro.com
        </a>
      </section>
    </div>
  );
}
