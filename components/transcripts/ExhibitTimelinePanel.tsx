'use client';

/**
 * ExhibitTimelinePanel
 * Displays exhibits linked to a job in a timeline format
 * Used in transcript review page
 */

import { useState } from 'react';
import { FileText, Image, File, Clock } from 'lucide-react';
import type { JobExhibitRow } from '@/lib/supabase/queries/exhibits';

interface ExhibitTimelinePanelProps {
  jobId: string;
  exhibits?: JobExhibitRow[];
  currentAudioTime?: number;
  onSeekAudio?: (timestamp: number) => void;
  onAddExhibitMark?: (timestamp: number) => void;
  canEdit?: boolean;
  onRefresh?: () => void;
}

export function ExhibitTimelinePanel({
  jobId: _jobId,
  exhibits = [],
  currentAudioTime = 0,
  onSeekAudio,
  onAddExhibitMark,
  canEdit = false,
  onRefresh: _onRefresh,
}: ExhibitTimelinePanelProps) {
  const [_loading, _setLoading] = useState(false);

  // Get file type icon
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  // Format timestamp
  const formatTimestamp = (seconds?: number) => {
    if (!seconds && seconds !== 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle exhibit click
  const handleExhibitClick = (exhibit: JobExhibitRow) => {
    if (exhibit.timestamp !== undefined && onSeekAudio) {
      onSeekAudio(exhibit.timestamp);
    }
  };

  // Sort exhibits by exhibit number or timestamp
  const sortedExhibits = [...exhibits].sort((a, b) => {
    // Try numeric sort on exhibit_number
    const numA = parseInt(a.exhibit_number);
    const numB = parseInt(b.exhibit_number);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    // Fallback to string sort
    return a.exhibit_number.localeCompare(b.exhibit_number);
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Exhibits</h3>
          {canEdit && onAddExhibitMark && (
            <button
              onClick={() => onAddExhibitMark(currentAudioTime)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Clock className="h-3 w-3" />
              Mark at {formatTimestamp(currentAudioTime)}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {_loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-16 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : exhibits.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">No exhibits yet</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Exhibits linked to this job will appear here. You can mark exhibit references
              during transcript review.
            </p>
          </div>
        ) : (
          // Timeline list
          <div className="space-y-3">
            {sortedExhibits.map((exhibit) => {
              const hasTimestamp = exhibit.timestamp !== undefined;
              const isClickable = hasTimestamp && onSeekAudio;

              return (
                <div
                  key={exhibit.id}
                  onClick={() => isClickable && handleExhibitClick(exhibit)}
                  className={`
                    border border-gray-200 rounded-lg p-3 transition-all
                    ${isClickable ? 'cursor-pointer hover:border-blue-400 hover:shadow-sm' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getFileIcon(exhibit.file_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              Exhibit {exhibit.exhibit_number}
                            </span>
                            {hasTimestamp && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                                <Clock className="h-3 w-3" />
                                {formatTimestamp(exhibit.timestamp)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-900 line-clamp-2">
                            {exhibit.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      {!_loading && exhibits.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            {exhibits.length} exhibit{exhibits.length !== 1 ? 's' : ''} linked to this job
          </p>
        </div>
      )}
    </div>
  );
}
