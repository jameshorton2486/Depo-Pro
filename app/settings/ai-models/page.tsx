import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AIModelsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (!isAdminRole(currentUser.role)) {
    redirect('/unauthorized');
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">AI Model Configuration</h1>
      <p className="mb-6 text-sm text-gray-600">Read-only reference for active AI processing configuration.</p>

      <div className="space-y-4">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Speech-to-Text Engine</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <div><dt className="font-medium">Provider</dt><dd>Deepgram</dd></div>
            <div><dt className="font-medium">Model</dt><dd>Nova-3 (Medical)</dd></div>
            <div><dt className="font-medium">Language</dt><dd>en-US</dd></div>
            <div><dt className="font-medium">Confidence Threshold</dt><dd>0.85 (words below this are flagged for review)</dd></div>
          </dl>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">AI Correction Engine</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <div><dt className="font-medium">Provider</dt><dd>Anthropic</dd></div>
            <div><dt className="font-medium">Model</dt><dd>Claude (Medical Term Extraction)</dd></div>
            <div className="sm:col-span-2"><dt className="font-medium">Purpose</dt><dd>Identifies and suggests corrections for medical terminology</dd></div>
          </dl>
        </section>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Configuration</h2>
          <p>
            Model settings are managed at the infrastructure level. Contact Depo-Pro support to request configuration changes.
          </p>
        </section>
      </div>
    </div>
  );
}
