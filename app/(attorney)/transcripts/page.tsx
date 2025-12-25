// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPT LIST
// ═══════════════════════════════════════════════════════════════
// List of uploaded transcripts with status and issue counts

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';

// TODO: Replace with real data fetching
const mockTranscripts = [
  {
    id: '1',
    name: 'Walker v. A&H Foods - Deposition of Aaron Walker',
    deponent: 'Aaron Walker',
    uploadedDate: '2024-12-18',
    status: 'In Progress',
    issueCount: 5,
  },
  {
    id: '2',
    name: 'Estopinal v. A&H Foods - Deposition of Sarah Johnson',
    deponent: 'Sarah Johnson',
    uploadedDate: '2024-12-15',
    status: 'Complete',
    issueCount: 12,
  },
  {
    id: '3',
    name: 'Smith v. Corporation - Deposition of John Smith',
    deponent: 'John Smith',
    uploadedDate: '2024-12-10',
    status: 'Not Reviewed',
    issueCount: 0,
  },
];

export default function TranscriptsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transcripts</h1>
          <p className="text-gray-600 mt-2">
            Review finalized transcripts and tag issues
          </p>
        </div>
        {/* TODO: Phase 2 - Add upload functionality */}
        <Button disabled className="flex items-center gap-2" title="Coming in Phase 2">
          <Plus className="h-4 w-4" />
          Upload Transcript
        </Button>
      </div>

      {/* Transcripts List */}
      {mockTranscripts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No transcripts yet
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              Transcripts will appear here once they are finalized and made available for review.
              You can tag issues, link exhibits, and generate reports from completed transcripts.
            </p>
            <Button disabled title="Coming in Phase 2">
              <Plus className="h-4 w-4 mr-2" />
              Upload Transcript
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mockTranscripts.map((transcript) => (
            <Card key={transcript.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {transcript.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Deponent: {transcript.deponent}</span>
                      <span>•</span>
                      <span>
                        Uploaded: {new Date(transcript.uploadedDate).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{transcript.issueCount} issues tagged</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                        transcript.status === 'Complete'
                          ? 'bg-green-100 text-green-800'
                          : transcript.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {transcript.status}
                    </span>
                    <Link href={`/attorney/transcripts/${transcript.id}`}>
                      <Button>Open Transcript</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TODO: Add pagination */}
    </div>
  );
}

