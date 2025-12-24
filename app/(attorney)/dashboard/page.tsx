// ═══════════════════════════════════════════════════════════════
// ATTORNEY DASHBOARD
// ═══════════════════════════════════════════════════════════════
// MVP Intelligence View - Summary cards and recent transcripts

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Flag, AlertTriangle, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// TODO: Replace with real data fetching
const mockSummaryData = {
  activeTranscripts: 12,
  totalIssuesTagged: 47,
  criticalIssues: 8, // Perjury + Contradiction
  reportsGenerated: 3,
};

const mockRecentTranscripts = [
  {
    id: '1',
    name: 'Walker v. A&H Foods - Deposition of Aaron Walker',
    deponent: 'Aaron Walker',
    date: '2024-12-18',
    issueCount: 5,
    status: 'In Progress',
  },
  {
    id: '2',
    name: 'Estopinal v. A&H Foods - Deposition of Sarah Johnson',
    deponent: 'Sarah Johnson',
    date: '2024-12-15',
    issueCount: 12,
    status: 'Complete',
  },
  {
    id: '3',
    name: 'Smith v. Corporation - Deposition of John Smith',
    deponent: 'John Smith',
    date: '2024-12-10',
    issueCount: 3,
    status: 'Not Reviewed',
  },
];

export default function AttorneyDashboardPage() {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Transcripts
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSummaryData.activeTranscripts}</div>
            <p className="text-xs text-gray-500 mt-1">Currently reviewing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Issues Tagged
            </CardTitle>
            <Flag className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSummaryData.totalIssuesTagged}</div>
            <p className="text-xs text-gray-500 mt-1">Across all transcripts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Critical Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockSummaryData.criticalIssues}
            </div>
            <p className="text-xs text-gray-500 mt-1">Perjury + Contradiction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Reports Generated
            </CardTitle>
            <FileCheck className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSummaryData.reportsGenerated}</div>
            <p className="text-xs text-gray-500 mt-1">Trial-ready documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Recently Analyzed Transcripts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Analyzed Transcripts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Transcript Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Deponent
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Issue Count
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
                {mockRecentTranscripts.map((transcript) => (
                  <tr key={transcript.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {transcript.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {transcript.deponent}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(transcript.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {transcript.issueCount}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          transcript.status === 'Complete'
                            ? 'bg-green-100 text-green-800'
                            : transcript.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {transcript.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/attorney/transcripts/${transcript.id}`}>
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
        </CardContent>
      </Card>
    </div>
  );
}

