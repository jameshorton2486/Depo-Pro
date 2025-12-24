// ═══════════════════════════════════════════════════════════════
// EXHIBIT LINKER COMPONENT
// ═══════════════════════════════════════════════════════════════
// Allows attorneys to link exhibits to transcript annotations

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Link as LinkIcon, FileText } from 'lucide-react';
import { Exhibit } from '@/types/exhibits';

interface ExhibitLinkerProps {
  annotationId: string;
  caseId: string;
  linkedExhibitIds?: string[];
  onLink?: (exhibitIds: string[]) => void;
  onUnlink?: (exhibitId: string) => void;
}

export function ExhibitLinker({
  annotationId,
  caseId,
  linkedExhibitIds = [],
  onLink,
  onUnlink,
}: ExhibitLinkerProps) {
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExhibits, setSelectedExhibits] = useState<string[]>(linkedExhibitIds);

  // Fetch exhibits for this case
  useEffect(() => {
    async function fetchExhibits() {
      try {
        setLoading(true);
        const response = await fetch(`/api/attorney/exhibits?caseId=${caseId}`);
        if (!response.ok) throw new Error('Failed to fetch exhibits');
        const data = await response.json();
        setExhibits(data.exhibits || []);
      } catch (error) {
        console.error('Error fetching exhibits:', error);
      } finally {
        setLoading(false);
      }
    }

    if (caseId) {
      fetchExhibits();
    }
  }, [caseId]);

  // Filter exhibits by search
  const filteredExhibits = exhibits.filter((ex) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ex.exhibitLabel.toLowerCase().includes(query) ||
      ex.description.toLowerCase().includes(query)
    );
  });

  // Toggle exhibit selection
  const handleToggleExhibit = (exhibitId: string) => {
    setSelectedExhibits((prev) => {
      if (prev.includes(exhibitId)) {
        return prev.filter((id) => id !== exhibitId);
      } else {
        return [...prev, exhibitId];
      }
    });
  };

  // Link selected exhibits
  const handleLinkExhibits = async () => {
    if (selectedExhibits.length === 0) return;

    try {
      const response = await fetch(`/api/attorney/annotations/${annotationId}/exhibits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhibitIds: selectedExhibits }),
      });

      if (!response.ok) throw new Error('Failed to link exhibits');

      onLink?.(selectedExhibits);
      setSelectedExhibits([]);
    } catch (error) {
      console.error('Error linking exhibits:', error);
    }
  };

  // Unlink exhibit
  const handleUnlinkExhibit = async (exhibitId: string) => {
    try {
      const response = await fetch(
        `/api/attorney/annotations/${annotationId}/exhibits/${exhibitId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) throw new Error('Failed to unlink exhibit');

      onUnlink?.(exhibitId);
    } catch (error) {
      console.error('Error unlinking exhibit:', error);
    }
  };

  // Get linked exhibits
  const linkedExhibits = exhibits.filter((ex) => linkedExhibitIds.includes(ex.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Link Exhibits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Linked Exhibits */}
        {linkedExhibits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Linked Exhibits</h4>
            <div className="space-y-2">
              {linkedExhibits.map((exhibit) => (
                <div
                  key={exhibit.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {exhibit.exhibitLabel}
                      </span>
                      <p className="text-xs text-gray-600">{exhibit.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkExhibit(exhibit.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div>
          <Input
            placeholder="Search exhibits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Available Exhibits */}
        {loading ? (
          <div className="text-sm text-gray-500">Loading exhibits...</div>
        ) : filteredExhibits.length === 0 ? (
          <div className="text-sm text-gray-500">No exhibits found</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredExhibits.map((exhibit) => {
              const isLinked = linkedExhibitIds.includes(exhibit.id);
              const isSelected = selectedExhibits.includes(exhibit.id);

              return (
                <div
                  key={exhibit.id}
                  className={`p-2 rounded-md border cursor-pointer transition-colors ${
                    isLinked
                      ? 'bg-blue-50 border-blue-200'
                      : isSelected
                        ? 'bg-gray-100 border-gray-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => !isLinked && handleToggleExhibit(exhibit.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {exhibit.exhibitLabel}
                          </span>
                          {isLinked && (
                            <Badge variant="outline" className="text-xs">
                              Linked
                            </Badge>
                          )}
                          {isSelected && !isLinked && (
                            <Badge variant="secondary" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{exhibit.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Link Button */}
        {selectedExhibits.length > 0 && (
          <Button
            onClick={handleLinkExhibits}
            className="w-full"
            size="sm"
          >
            Link {selectedExhibits.length} Exhibit{selectedExhibits.length !== 1 ? 's' : ''}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

