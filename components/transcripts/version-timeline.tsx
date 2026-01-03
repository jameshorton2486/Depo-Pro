'use client';

// =============================================================================
// VERSION TIMELINE
// components/transcripts/version-timeline.tsx
//
// Phase 4B-1: Version history sidebar with diff viewer
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, GitBranch, Eye, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface Version {
  id: string;
  version: number;
  versionType: string;
  wordCount: number;
  flaggedCount: number;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface VersionTimelineProps {
  transcriptId: string;
  onVersionSelect?: (version: number) => void;
  onRestore?: (version: number) => void;
}

export function VersionTimeline({
  transcriptId,
  onVersionSelect,
  onRestore: _onRestore,
}: VersionTimelineProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [transcriptId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transcripts/${transcriptId}/versions`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version: number) => {
    setSelectedVersion(version);
    onVersionSelect?.(version);
  };

  const handleRestore = async (version: number) => {
    if (!confirm(`Restore version ${version}? This will create a new version.`)) {
      return;
    }

    const reason = prompt('Reason for restore:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/transcripts/${transcriptId}/versions/${version}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error('Failed to restore');
      
      await fetchVersions();
      alert('Version restored successfully');
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version');
    }
  };

  const getVersionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      pre_ai: 'bg-gray-500',
      post_ai: 'bg-blue-500',
      edit: 'bg-green-500',
      final: 'bg-purple-500',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-500'}>
        {type.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No versions yet
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className={`p-3 border rounded-md transition-colors ${
                  selectedVersion === version.version
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">v{version.version}</span>
                    {getVersionTypeBadge(version.versionType)}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVersionClick(version.version)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {version.versionType !== 'final' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(version.version)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    {version.createdBy.firstName} {version.createdBy.lastName}
                  </div>
                  <div>{format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}</div>
                  <div className="flex gap-2 mt-1">
                    <span>{version.wordCount.toLocaleString()} words</span>
                    {version.flaggedCount > 0 && (
                      <span className="text-amber-600">
                        {version.flaggedCount} flagged
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
