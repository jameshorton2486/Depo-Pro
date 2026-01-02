// ═══════════════════════════════════════════════════════════════
// ATTORNEY REPORTS PAGE
// ═══════════════════════════════════════════════════════════════
// Generate and download trial-ready reports

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCheck, Download, Plus, Loader2 } from 'lucide-react';
import {
  generateImpeachmentReport,
  generateContradictionsSummary,
  generateAdmissionsList,
  generateDOCXReport,
  type ReportData,
} from '@/lib/reports/attorney-reports';
import { TranscriptAnnotation } from '@/types/issue-code';
import { AttorneyTranscript } from '@/types/attorney-transcript';

// TODO: Replace with real data fetching
const mockAnnotations: TranscriptAnnotation[] = [
  {
    id: '1',
    transcriptId: '1',
    issueCode: { code: 'PERJURY', label: 'Perjury', color: 'hsl(0, 84%, 60%)' },
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
    issueCode: { code: 'CONTRADICTION', label: 'Contradiction', color: 'hsl(45, 93%, 47%)' },
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
    issueCode: { code: 'ADMISSION', label: 'Admission', color: 'hsl(142, 76%, 36%)' },
    pageStart: 10,
    lineStart: 5,
    pageEnd: 10,
    lineEnd: 5,
    note: 'Admits knowledge of safety violation',
    createdById: 'user-1',
    createdAt: '2024-12-18',
  },
];

const mockTranscripts = new Map<string, AttorneyTranscript>([
  [
    '1',
    {
      id: '1',
      name: 'Walker v. A&H Foods - Deposition of Aaron Walker',
      deponent: 'Aaron Walker',
      caseName: 'Walker v. A&H Foods, LLC',
      depositionDate: '2024-12-18',
      uploadedAt: '2024-12-18',
      status: 'In Progress',
      totalPages: 45,
      totalLines: 1200,
      pages: [
        {
          pageNumber: 2,
          lines: [
            { page: 2, line: 2, speaker: 'A', text: 'Yes, I was there.' },
          ],
        },
        {
          pageNumber: 10,
          lines: [
            { page: 10, line: 5, speaker: 'A', text: 'I knew about the safety issue.' },
          ],
        },
      ],
    },
  ],
  [
    '2',
    {
      id: '2',
      name: 'Estopinal v. A&H Foods - Deposition of Sarah Johnson',
      deponent: 'Sarah Johnson',
      caseName: 'Estopinal v. A&H Foods, LLC',
      depositionDate: '2024-12-15',
      uploadedAt: '2024-12-15',
      status: 'Complete',
      totalPages: 30,
      totalLines: 800,
      pages: [
        {
          pageNumber: 5,
          lines: [
            { page: 5, line: 12, speaker: 'A', text: 'I was not present at that time.' },
            { page: 5, line: 13, speaker: 'A', text: 'I had already left the building.' },
            { page: 5, line: 14, speaker: 'A', text: 'The incident occurred after I left.' },
            { page: 5, line: 15, speaker: 'A', text: 'I cannot confirm what happened.' },
          ],
        },
      ],
    },
  ],
]);

const mockReports: Array<{
  id: string;
  name: string;
  transcriptName: string;
  generatedDate: string;
  issueCount: number;
}> = [
  {
    id: '1',
    name: 'Walker v. A&H Foods - Issue Summary',
    transcriptName: 'Deposition of Aaron Walker',
    generatedDate: '2024-12-18',
    issueCount: 5,
  },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);

  const handleGeneratePreview = async () => {
    if (!reportType) return;

    setIsGenerating(true);
    try {
      let reportData: ReportData;

      switch (reportType) {
        case 'impeachment':
          reportData = generateImpeachmentReport(mockAnnotations, mockTranscripts);
          break;
        case 'contradictions':
          reportData = generateContradictionsSummary(mockAnnotations, mockTranscripts);
          break;
        case 'admissions':
          reportData = generateAdmissionsList(mockAnnotations, mockTranscripts);
          break;
        default:
          return;
      }

      setPreviewData(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!previewData) return;

    setIsGenerating(true);
    try {
      const buffer = await generateDOCXReport(previewData);
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${previewData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-2">
            Generate trial-ready reports from tagged issues
          </p>
        </div>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Report Type
            </label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="impeachment">Impeachment Report</SelectItem>
                <SelectItem value="contradictions">Contradictions Summary</SelectItem>
                <SelectItem value="admissions">Admissions List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGeneratePreview}
            disabled={!reportType || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Generate Preview
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview: {previewData.title}</CardTitle>
              <Button onClick={handleDownload} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download DOCX
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Generated: {previewData.generatedDate.toLocaleDateString()}</p>
                <p>Entries: {previewData.entries.length}</p>
              </div>

              {previewData.entries.length === 0 ? (
                <p className="text-sm text-gray-500">No entries match this report type.</p>
              ) : (
                <div className="space-y-3">
                  {previewData.entries.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">{entry.transcriptName}</p>
                          <p className="text-xs text-gray-500">
                            {entry.deponent} • Page {entry.page}, Line {entry.line}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                          {entry.issueType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{entry.quotedText}</p>
                      {entry.attorneyNote && (
                        <p className="text-xs text-gray-500 italic">Note: {entry.attorneyNote}</p>
                      )}
                    </div>
                  ))}
                  {previewData.entries.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      ... and {previewData.entries.length - 5} more entries
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previously Generated Reports */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Previously Generated Reports</h2>
        {mockReports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileCheck className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reports generated yet
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Generate your first report by selecting a report type above and clicking &quot;Generate Preview&quot;.
                Reports are created from tagged issues in your transcripts.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {mockReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {report.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{report.transcriptName}</span>
                        <span>•</span>
                        <span>
                          Generated: {new Date(report.generatedDate).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{report.issueCount} issues included</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
