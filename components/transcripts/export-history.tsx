'use client';

// =============================================================================
// EXPORT HISTORY
// components/transcripts/export-history.tsx
//
// Phase 3C-3: Display export history for a transcript
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, File, Archive } from 'lucide-react';
import { format } from 'date-fns';

interface ExportHistoryItem {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  format: string;
  profileId?: string;
  createdAt: string;
}

interface ExportHistoryProps {
  transcriptId: string;
}

const FORMAT_ICONS: Record<string, typeof FileText> = {
  docx: FileText,
  pdf: File,
  zip: Archive,
  txt: FileText,
};

export function ExportHistory({ transcriptId }: ExportHistoryProps) {
  const [exports, setExports] = useState<ExportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExports();
  }, [transcriptId]);

  const fetchExports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transcripts/${transcriptId}/exports`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setExports(data.exports || []);
    } catch (error) {
      console.error('Error fetching export history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (exports.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No exports yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {exports.map((exportItem) => {
            const Icon = FORMAT_ICONS[exportItem.format] || FileText;
            return (
              <div
                key={exportItem.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {exportItem.user.firstName} {exportItem.user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(exportItem.createdAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">
                    {exportItem.format}
                  </Badge>
                  {exportItem.profileId && (
                    <Badge variant="secondary" className="text-xs">
                      {exportItem.profileId}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
