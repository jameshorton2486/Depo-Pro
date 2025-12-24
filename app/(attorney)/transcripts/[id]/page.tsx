// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPT VIEWER
// ═══════════════════════════════════════════════════════════════
// Read-only transcript display with page/line numbers
// NO editing allowed - transcripts are immutable

import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User, ArrowLeft, Edit } from 'lucide-react';
import { AttorneyTranscript } from '@/types/attorney-transcript';
import Link from 'next/link';

// TODO: Replace with real data fetching
async function getTranscript(id: string): Promise<AttorneyTranscript | null> {
  // Mock data for MVP
  if (id === '1') {
    return {
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
          pageNumber: 1,
          lines: [
            { page: 1, line: 1, speaker: 'Q', text: 'Good morning, Mr. Walker. My name is Sarah Johnson, and I will be conducting this deposition today.' },
            { page: 1, line: 2, speaker: 'A', text: 'Good morning.' },
            { page: 1, line: 3, speaker: 'Q', text: 'Please state your full name for the record.' },
            { page: 1, line: 4, speaker: 'A', text: 'Aaron Michael Walker.' },
            { page: 1, line: 5, speaker: 'Q', text: 'And what is your current address?' },
            { page: 1, line: 6, speaker: 'A', text: '123 Main Street, New Orleans, Louisiana 70112.' },
          ],
        },
        {
          pageNumber: 2,
          lines: [
            { page: 2, line: 1, speaker: 'Q', text: 'Mr. Walker, were you present at the scene of the accident on December 15th, 2023?' },
            { page: 2, line: 2, speaker: 'A', text: 'Yes, I was there.' },
            { page: 2, line: 3, speaker: 'Q', text: 'Can you describe what you observed?' },
            { page: 2, line: 4, speaker: 'A', text: 'I saw a vehicle run a red light and collide with another car.' },
            { page: 2, line: 5, speaker: 'Q', text: 'And you are certain about this?' },
            { page: 2, line: 6, speaker: 'A', text: 'Yes, absolutely certain.' },
          ],
        },
      ],
    };
  }
  return null;
}

interface TranscriptViewerPageProps {
  params: Promise<{ id: string }>;
}

export default async function TranscriptViewerPage({ params }: TranscriptViewerPageProps) {
  const { id } = await params;
  const transcript = await getTranscript(id);

  if (!transcript) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link href="/attorney/transcripts">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transcripts
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{transcript.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {transcript.deponent}
            </span>
            {transcript.caseName && (
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {transcript.caseName}
              </span>
            )}
            {transcript.depositionDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(transcript.depositionDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              transcript.status === 'Complete'
                ? 'default'
                : transcript.status === 'In Progress'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {transcript.status}
          </Badge>
          <Link href={`/attorney/transcripts/${id}/review`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Review & Tag Issues
            </Button>
          </Link>
        </div>
      </div>

      {/* Transcript Content */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {transcript.pages.map((page) => (
              <div key={page.pageNumber} className="space-y-2">
                {/* Page Header */}
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">
                    Page {page.pageNumber}
                  </span>
                </div>

                {/* Lines */}
                <div className="space-y-1 pl-4">
                  {page.lines.map((line) => (
                    <div
                      key={`${line.page}-${line.line}`}
                      className="flex gap-4 py-1 text-sm leading-relaxed select-text"
                    >
                      {/* Line Number */}
                      <span className="text-gray-400 font-mono text-xs w-12 shrink-0">
                        {line.line}
                      </span>

                      {/* Speaker Label */}
                      <span className="font-semibold text-gray-700 w-16 shrink-0">
                        {line.speaker}:
                      </span>

                      {/* Text Content */}
                      <span className="flex-1 text-gray-900">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

