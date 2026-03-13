import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEnvironment, getRequiredEnv } from '@/lib/config/env';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

function configStatus(key: string): string {
  try {
    const value = getRequiredEnv(key);
    return value ? 'Configured ✅' : 'Missing ❌';
  } catch {
    return 'Missing ❌';
  }
}

export default async function SystemReportPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (!isAdminRole(currentUser.role)) {
    redirect('/unauthorized');
  }

  const supabase = await createSupabaseServerClient();

  const [jobsResult, usersResult] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  const envInfo = {
    nodeEnv: getEnvironment(),
    supabaseUrl: configStatus('NEXT_PUBLIC_SUPABASE_URL'),
    deepgramConfigured: configStatus('DEEPGRAM_API_KEY'),
    anthropicConfigured: configStatus('ANTHROPIC_API_KEY'),
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Report</h1>
        <p className="mt-1 text-sm text-gray-600">Infrastructure status and operational summary.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Supabase Connection</p>
          <p className="mt-1 text-xl font-semibold">Connected ✅</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Jobs</p>
          <p className="mt-1 text-xl font-semibold">{jobsResult.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="mt-1 text-xl font-semibold">{usersResult.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Storage Buckets</p>
          <p className="mt-1 text-sm text-gray-700">depo-audio, depo-files, depo-exports, depo-chunks</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Environment</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>Node Environment: {envInfo.nodeEnv}</li>
          <li>Supabase URL: {envInfo.supabaseUrl}</li>
          <li>Deepgram API: {envInfo.deepgramConfigured}</li>
          <li>Anthropic API: {envInfo.anthropicConfigured}</li>
        </ul>
      </div>

      <Link href="/reports" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
        Back to Reports
      </Link>
    </div>
  );
}
