/**
 * Admin Dashboard Page
 * Server-only, admin-guarded, read-only metrics display
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { MetricsCard } from '@/components/admin/MetricsCard';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';
import Link from 'next/link';

export const runtime = 'nodejs';

interface MetricBase {
  day: string;
}

interface CaseMetric extends MetricBase { cases_created: number }
interface CalendarMetric extends MetricBase { events_created: number }
interface SecurityMetric extends MetricBase { event_count: number }
interface IncidentMetric extends MetricBase { resolved: boolean }

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  // 1. Authentication Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    logger.warn('[admin/dashboard] Unauthorized access attempt');
    redirect('/login');
  }

  // 2. Authorization Check
  try {
    await requireAdmin();
  } catch (_error) {
    logger.warn('[admin/dashboard] Forbidden access attempt', { userId: user.id });
    redirect('/dashboard');
  }

  // 3. Data Fetching
  let results;
  try {
    const metricsPromises = [
      supabase.from('admin_case_metrics').select('*').order('day', { ascending: false }).limit(30),
      supabase.from('admin_calendar_metrics').select('*').order('day', { ascending: false }).limit(30),
      supabase.from('admin_security_metrics').select('*').order('day', { ascending: false }).limit(30),
      supabase.from('admin_incident_metrics').select('*').order('day', { ascending: false }).limit(30),
    ];

    results = await Promise.allSettled(metricsPromises);
  } catch (error) {
    logger.error('[admin/dashboard] Critical fetch error', error instanceof Error ? error : new Error(String(error)));
    throw error; // Let the nearest error.js handle critical failures
  }

  // 4. Data Extraction & Error Logging
  const viewNames = ['case', 'calendar', 'security', 'incident'];

  const caseMetrics = results[0].status === 'fulfilled' ? (results[0].value.data as CaseMetric[] || []) : [];
  const calendarMetrics = results[1].status === 'fulfilled' ? (results[1].value.data as CalendarMetric[] || []) : [];
  const securityMetrics = results[2].status === 'fulfilled' ? (results[2].value.data as SecurityMetric[] || []) : [];
  const incidentMetrics = results[3].status === 'fulfilled' ? (results[3].value.data as IncidentMetric[] || []) : [];

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(`[admin/dashboard] ${viewNames[index]} metrics unavailable`, result.reason);
    }
  });

  // 5. Metric Calculations
  const totalCases = caseMetrics.reduce((sum, m) => sum + (m.cases_created || 0), 0);
  const totalEvents = calendarMetrics.reduce((sum, m) => sum + (m.events_created || 0), 0);
  const totalSecurityEvents = securityMetrics.reduce((sum, m) => sum + (m.event_count || 0), 0);
  const unresolvedIncidents = incidentMetrics.filter((m) => !m.resolved).length;

  logger.info('[admin/dashboard] Dashboard accessed', { userId: user.id });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Cases Created"
          value={totalCases}
          subtitle="Last 30 days"
        />
        <MetricsCard
          title="Calendar Events"
          value={totalEvents}
          subtitle="Last 30 days"
        />
        <MetricsCard
          title="Security Events"
          value={totalSecurityEvents}
          subtitle="Last 30 days"
        />
        <MetricsCard
          title="Unresolved Incidents"
          value={unresolvedIncidents}
          subtitle="Requires attention"
        />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/audit"
            className="rounded-lg border border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Audit Logs</h3>
            <p className="text-sm text-gray-500 mt-1">View system audit logs</p>
          </Link>
          <Link
            href="/admin/metrics"
            className="rounded-lg border border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Metrics</h3>
            <p className="text-sm text-gray-500 mt-1">Detailed analytics</p>
          </Link>
          <Link
            href="/admin/incidents"
            className="rounded-lg border border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Incidents</h3>
            <p className="text-sm text-gray-500 mt-1">System incidents</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
