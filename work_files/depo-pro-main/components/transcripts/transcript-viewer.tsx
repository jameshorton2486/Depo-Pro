'use client';

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT VIEWER COMPONENT
// ═══════════════════════════════════════════════════════════════
// Read-only transcript display with export options

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface TranscriptViewerProps {
  transcriptId: string;
  showToolbar?: boolean;
  onEdit?: () => void;
}

export function TranscriptViewer({
  transcriptId,
  showToolbar = true,
  onEdit,
}: TranscriptViewerProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<{
    version: number;
    status: string;
    source: string;
    wordCount: number;
    jobId: string;
    caseNumber: string | null;
  } | null>(null);

  useEffect(() => {
    async function loadTranscript() {
      try {
        const res = await fetch(`/api/transcripts/${transcriptId}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.formattedText || data.rawText || '');
          
          const words = (data.formattedText || data.rawText || '').trim().split(/\s+/).filter(Boolean);
          setMetadata({
            version: data.version,
            status: data.status,
            source: data.source,
            wordCount: words.length,
            jobId: data.job.id,
            caseNumber: data.job.caseNumber,
          });
        } else {
          toast.error('Failed to load transcript');
        }
      } catch (error) {
        console.error('Error loading transcript:', error);
        toast.error('Failed to load transcript');
      } finally {
        setIsLoading(false);
      }
    }

    loadTranscript();
  }, [transcriptId]);

  const handleExport = async (format: 'txt' | 'ascii' | 'docx' | 'pdf') => {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript-${transcriptId}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported as ${format.toUpperCase()}`);
      } else {
        toast.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading transcript...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showToolbar && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transcript</span>
              {metadata && (
                <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
                  <span>Version {metadata.version}</span>
                  <span>{metadata.wordCount.toLocaleString()} words</span>
                  <span className="capitalize">{metadata.status.toLowerCase()}</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <Button onClick={onEdit} variant="default">
                  ✏️ Edit Transcript
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => handleExport('txt')}
              >
                📄 Export TXT
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('ascii')}
              >
                📋 Export ASCII
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('docx')}
                title="DOCX export (mock mode)"
              >
                📘 Export DOCX
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                title="PDF export (mock mode)"
              >
                📕 Export PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                🖨️ Print
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {content || 'No transcript content available.'}
          </pre>
        </CardContent>
      </Card>

      {metadata && (
        <Card>
          <CardContent className="py-2 px-4 text-sm text-muted-foreground flex justify-between">
            <span>Case: {metadata.caseNumber || 'N/A'}</span>
            <span>Source: {metadata.source}</span>
            <span>Job ID: {metadata.jobId}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
