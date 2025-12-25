// ═══════════════════════════════════════════════════════════════
// ATTORNEY ISSUES OVERVIEW PAGE
// ═══════════════════════════════════════════════════════════════
// Cross-transcript view of all tagged issues

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, Search, ExternalLink } from 'lucide-react';
import { TranscriptAnnotation, DEFAULT_ISSUE_CODES, getAllIssueCodes } from '@/types/issue-code';
import Link from 'next/link';

// TODO: Replace with real data fetching
const mockAnnotations: TranscriptAnnotation[] = [
  {
    id: '1',
    transcriptId: '1',
    issueCode: DEFAULT_ISSUE_CODES.PERJURY,
    pageStart: 2,
    lineStart: 2,
    pageEnd: 2,
    lineEnd: 2,
    note: 'Contradicts earlier testimony on page 23',
    createdById: 'user-1',
    createdAt: '2024-12-18',
  },
  {
    id: '2',
    transcriptId: '2',
    issueCode: DEFAULT_ISSUE_CODES.CONTRADICTION,
    pageStart: 5,
    lineStart: 12,
    pageEnd: 5,
    lineEnd: 15,
    note: 'Inconsistent statement about timeline',
    createdById: 'user-1',
    createdAt: '2024-12-15',
  },
  {
    id: '3',
    transcriptId: '1',
    issueCode: DEFAULT_ISSUE_CODES.ADMISSION,
    pageStart: 10,
    lineStart: 5,
    pageEnd: 10,
    lineEnd: 5,
    note: 'Admits knowledge of safety violation',
    createdById: 'user-1',
    createdAt: '2024-12-18',
  },
];

const mockTranscripts = [
  { id: '1', name: 'Walker v. A&H Foods - Deposition of Aaron Walker' },
  { id: '2', name: 'Estopinal v. A&H Foods - Deposition of Sarah Johnson' },
];

export default function IssuesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssueCode, setSelectedIssueCode] = useState<string>('all');
  const [selectedTranscript, setSelectedTranscript] = useState<string>('all');

  const allCodes = getAllIssueCodes();

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    return mockAnnotations.filter((ann) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNote = ann.note?.toLowerCase().includes(query);
        const matchesCode = ann.issueCode.label.toLowerCase().includes(query);
        if (!matchesNote && !matchesCode) return false;
      }

      // Issue code filter
      if (selectedIssueCode !== 'all' && ann.issueCode.code !== selectedIssueCode) {
        return false;
      }

      // Transcript filter
      if (selectedTranscript !== 'all' && ann.transcriptId !== selectedTranscript) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedIssueCode, selectedTranscript]);

  // Group by issue code
  const groupedByCode = useMemo(() => {
    const groups = new Map<string, TranscriptAnnotation[]>();
    filteredAnnotations.forEach((ann) => {
      const code = ann.issueCode.code;
      if (!groups.has(code)) {
        groups.set(code, []);
      }
      groups.get(code)!.push(ann);
    });
    return groups;
  }, [filteredAnnotations]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Issues</h1>
        <p className="text-gray-600 mt-2">
          Review and manage issue codes across all transcripts
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notes or issue codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Issue Type
              </label>
              <Select value={selectedIssueCode} onValueChange={setSelectedIssueCode}>
                <SelectTrigger>
                  <SelectValue placeholder="All issue types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issue Types</SelectItem>
                  {allCodes.map((code) => (
                    <SelectItem key={code.code} value={code.code}>
                      {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Transcript
              </label>
              <Select value={selectedTranscript} onValueChange={setSelectedTranscript}>
                <SelectTrigger>
                  <SelectValue placeholder="All transcripts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transcripts</SelectItem>
                  {mockTranscripts.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {filteredAnnotations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Flag className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No issues found
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              {searchQuery || selectedIssueCode !== 'all' || selectedTranscript !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No issues have been tagged yet. Open a transcript and use the review interface to tag issues like contradictions, admissions, or perjury.'}
            </p>
            {!(searchQuery || selectedIssueCode !== 'all' || selectedTranscript !== 'all') && (
              <Link href="/attorney/transcripts" className="mt-4">
                <Button>
                  View Transcripts
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Grouped by Issue Code */}
          {Array.from(groupedByCode.entries()).map(([code, annotations]) => {
            const issueCode = allCodes.find((c) => c.code === code)!;
            return (
              <Card key={code}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: issueCode.color }}
                    />
                    <CardTitle>
                      {issueCode.label} ({annotations.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {annotations.map((ann) => {
                      const transcript = mockTranscripts.find((t) => t.id === ann.transcriptId);
                      return (
                        <div
                          key={ann.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {transcript?.name || `Transcript ${ann.transcriptId}`}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Page {ann.pageStart}, Line {ann.lineStart}
                                  {ann.pageStart !== ann.pageEnd || ann.lineStart !== ann.lineEnd
                                    ? ` - Page ${ann.pageEnd}, Line ${ann.lineEnd}`
                                    : ''}
                                </span>
                              </div>
                              {ann.note && (
                                <p className="text-sm text-gray-700 mb-2">{ann.note}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                Tagged {new Date(ann.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Link href={`/attorney/transcripts/${ann.transcriptId}/review`}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
