import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const ACTIVE_INTEGRATIONS = [
  { name: 'Deepgram Nova-3', status: 'Active', purpose: 'Speech-to-text transcription' },
  { name: 'Anthropic Claude', status: 'Active', purpose: 'Medical term extraction' },
  { name: 'Resend', status: 'Active', purpose: 'Transactional email delivery' },
];

const ROADMAP = ['Zoom Live Transcription', 'Clio (legal case management)', 'iManage', 'DocuSign'];

export default async function IntegrationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Integrations</h1>
      <p className="mb-6 text-sm text-gray-600">Current integration status and near-term roadmap.</p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="p-3">Integration</th>
              <th className="p-3">Status</th>
              <th className="p-3">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {ACTIVE_INTEGRATIONS.map((row) => (
              <tr key={row.name}>
                <td className="p-3 font-medium text-gray-900">{row.name}</td>
                <td className="p-3">✅ {row.status}</td>
                <td className="p-3 text-gray-700">{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Roadmap (Coming Soon)</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-500">
          {ROADMAP.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
