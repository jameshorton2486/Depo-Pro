// ═══════════════════════════════════════════════════════════════
// ATTORNEY DASHBOARD
// ═══════════════════════════════════════════════════════════════
// MVP Intelligence View - Summary cards and recent transcripts

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Flag, CalendarClock, Scale } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyTranscripts } from '@/components/ui/empty-states';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  accessibleTranscripts: number;
  upcomingDepositions: number;
  annotations: {
    highlights: number;
    notes: number;
    bookmarks: number;
    total: number;
  };
}

interface RecentTranscript {
  id: string;
  accessLevel: string;
  grantedAt: string | null;
  lastAccessed: string | null;
  accessCount: number;
  expiresAt: string | null;
  job: {
    id: string;
    caseName: string | null;
    caseNumber: string | null;
    depositionDate: string | null;
    title: string | null;
    status: string | null;
  } | null;
}

const EMPTY_STATS: DashboardStats = {
  totalCases: 0,
  activeCases: 0,
  accessibleTranscripts: 0,
  upcomingDepositions: 0,
  annotations: {
    highlights: 0,
    notes: 0,
    bookmarks: 0,
    total: 0,
  },
};

export default function AttorneyDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentTranscripts, setRecentTranscripts] = useState<RecentTranscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/attorney/dashboard', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load attorney dashboard');
        }
        const data = await response.json();
        if (!isMounted) return;
        setStats(data.stats || EMPTY_STATS);
        setRecentTranscripts(data.recentTranscripts || []);
      } catch {
        if (!isMounted) return;
        setStats(EMPTY_STATS);
        setRecentTranscripts([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    return [
      {
        title: 'Accessible Transcripts',
        value: stats.accessibleTranscripts,
        description: 'Shared with you',
        icon: FileText,
      },
      {
        title: 'Total Issues Tagged',
        value: stats.annotations.total,
        description: 'Highlights + notes',
        icon: Flag,
      },
      {
        title: 'Active Cases',
        value: stats.activeCases,
        description: 'Cases in progress',
        icon: Scale,
      },
      {
        title: 'Upcoming Depositions',
        value: stats.upcomingDepositions,
        description: 'Next 30 days',
        icon: CalendarClock,
      },
    ];
  }, [stats]);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString();
  };

  const getTranscriptLabel = (item: RecentTranscript) => {
    const title = item.job?.title || item.job?.caseName || 'Untitled transcript';
    const caseNumber = item.job?.caseNumber ? ` (${item.job.caseNumber})` : '';
    return `${title}${caseNumber}`;
  };

  const getTranscriptHref = (item: RecentTranscript) => {
    if (item.job?.id) {
      return `/transcripts/${item.job.id}`;
    }
    return '/transcripts';
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attorney Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Review transcripts, tag issues, and generate trial-ready reports
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '—' : card.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recently Analyzed Transcripts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Analyzed Transcripts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading transcript activity…</div>
          ) : recentTranscripts.length === 0 ? (
            <EmptyTranscripts />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Transcript
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Deposition Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Access Level
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTranscripts.map((transcript) => (
                    <tr key={transcript.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {getTranscriptLabel(transcript)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(transcript.job?.depositionDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {transcript.accessLevel}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            transcript.job?.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : transcript.job?.status === 'IN_REVIEW'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {transcript.job?.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={getTranscriptHref(transcript)}>
                          <Button variant="outline" size="sm">
                            Open
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

