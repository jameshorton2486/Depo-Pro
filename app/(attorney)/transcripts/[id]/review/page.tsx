// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPT REVIEW PAGE
// ═══════════════════════════════════════════════════════════════
// Full review interface with issue coding UI

'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TranscriptViewer } from '@/components/attorney/transcript-viewer';
import { IssueCodePalette } from '@/components/attorney/issue-code-palette';
import { ExhibitLinker } from '@/components/attorney/exhibit-linker';
import { AttorneyTranscript } from '@/types/attorney-transcript';
import { IssueCode, TranscriptAnnotation } from '@/types/issue-code';
import { X } from 'lucide-react';

// TODO: Replace with real data fetching
const mockTranscript: AttorneyTranscript = {
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

export default function TranscriptReviewPage() {
  const params = useParams();
  const transcriptId = params.id as string;

  // Selection state
  const [selectedStart, setSelectedStart] = useState<{ page: number; line: number } | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<{ page: number; line: number } | null>(null);
  const [selectedCode, setSelectedCode] = useState<IssueCode | null>(null);
  const [note, setNote] = useState('');

  // Annotations (stored in local state for MVP)
  const [annotations, setAnnotations] = useState<TranscriptAnnotation[]>([]);

  // Selected annotation for exhibit linking
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Linked exhibits per annotation (mock data for MVP)
  const [annotationExhibits, setAnnotationExhibits] = useState<Record<string, string[]>>({});

  // Mock case ID - TODO: Get from transcript data
  const caseId = 'case-1';

  // Handle line click for selection
  const handleLineClick = useCallback((page: number, line: number) => {
    if (!selectedStart) {
      // Start selection
      setSelectedStart({ page, line });
      setSelectedEnd({ page, line });
    } else if (!selectedEnd || (selectedEnd.page === page && selectedEnd.line === line)) {
      // Update end of selection
      setSelectedEnd({ page, line });
    } else {
      // Reset selection
      setSelectedStart({ page, line });
      setSelectedEnd({ page, line });
    }
  }, [selectedStart, selectedEnd]);

  // Create annotation
  const handleCreateAnnotation = useCallback(() => {
    if (!selectedStart || !selectedEnd || !selectedCode) return;

    const newAnnotation: TranscriptAnnotation = {
      id: `ann-${Date.now()}`,
      transcriptId,
      issueCode: selectedCode,
      pageStart: Math.min(selectedStart.page, selectedEnd.page),
      lineStart: selectedStart.page === selectedEnd.page
        ? Math.min(selectedStart.line, selectedEnd.line)
        : selectedStart.page < selectedEnd.page ? selectedStart.line : 1,
      pageEnd: Math.max(selectedStart.page, selectedEnd.page),
      lineEnd: selectedStart.page === selectedEnd.page
        ? Math.max(selectedStart.line, selectedEnd.line)
        : selectedStart.page < selectedEnd.page ? 9999 : selectedEnd.line,
      note: note || undefined,
      createdById: 'current-user', // TODO: Get from session
      createdAt: new Date(),
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedStart(null);
    setSelectedEnd(null);
    setSelectedCode(null);
    setNote('');
  }, [selectedStart, selectedEnd, selectedCode, note, transcriptId]);

  // Delete annotation
  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
  }, []);

  // Check if selection is valid
  const isSelectionValid = selectedStart && selectedEnd && selectedCode;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Transcript View */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>{mockTranscript.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Selection Info */}
            {selectedStart && selectedEnd && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-gray-700">
                  Selected: Page {selectedStart.page}, Line {selectedStart.line}
                  {selectedStart.page !== selectedEnd.page || selectedStart.line !== selectedEnd.line
                    ? ` to Page ${selectedEnd.page}, Line ${selectedEnd.line}`
                    : ''}
                </p>
              </div>
            )}

            <TranscriptViewer
              transcript={mockTranscript}
              annotations={annotations}
              onLineClick={handleLineClick}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Issue Code Palette & Annotation Form */}
      <div className="lg:col-span-1 space-y-6">
        {/* Issue Code Palette */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tag Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <IssueCodePalette
              selectedCode={selectedCode}
              onSelectCode={setSelectedCode}
            />
          </CardContent>
        </Card>

        {/* Annotation Form */}
        {selectedStart && selectedEnd && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Annotation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Issue Code</Label>
                {selectedCode ? (
                  <div className="mt-1 flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedCode.color } as React.CSSProperties}
                    />
                    <span className="text-sm font-medium">{selectedCode.label}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Select an issue code above</p>
                )}
              </div>

              <div>
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add notes about this issue..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateAnnotation}
                  disabled={!isSelectionValid}
                  className="flex-1"
                >
                  Tag Issue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedStart(null);
                    setSelectedEnd(null);
                    setSelectedCode(null);
                    setNote('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Annotations */}
        {annotations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tagged Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {annotations.map((ann) => {
                  const linkedExhibits = annotationExhibits[ann.id] || [];
                  const isSelected = selectedAnnotationId === ann.id;

                  return (
                    <div
                      key={ann.id}
                      className={`p-3 border rounded-md transition-colors ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setSelectedAnnotationId(isSelected ? null : ann.id)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: ann.issueCode.color } as React.CSSProperties}
                            />
                            <span className="text-sm font-medium">{ann.issueCode.label}</span>
                            {linkedExhibits.length > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                                {linkedExhibits.length} exhibit{linkedExhibits.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Page {ann.pageStart}, Line {ann.lineStart}
                            {ann.pageStart !== ann.pageEnd || ann.lineStart !== ann.lineEnd
                              ? ` - Page ${ann.pageEnd}, Line ${ann.lineEnd}`
                              : ''}
                          </p>
                          {ann.note && (
                            <p className="text-sm text-gray-700 mt-1">{ann.note}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAnnotation(ann.id)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exhibit Linker - Show when annotation is selected */}
        {selectedAnnotationId && (
          <ExhibitLinker
            annotationId={selectedAnnotationId}
            caseId={caseId}
            linkedExhibitIds={annotationExhibits[selectedAnnotationId] || []}
            onLink={(exhibitIds) => {
              setAnnotationExhibits((prev) => ({
                ...prev,
                [selectedAnnotationId]: [
                  ...(prev[selectedAnnotationId] || []),
                  ...exhibitIds,
                ],
              }));
            }}
            onUnlink={(exhibitId) => {
              setAnnotationExhibits((prev) => ({
                ...prev,
                [selectedAnnotationId]: (prev[selectedAnnotationId] || []).filter(
                  (id) => id !== exhibitId,
                ),
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}

