// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT VIEWER COMPONENT
// ═══════════════════════════════════════════════════════════════
// Read-only transcript display with annotation support

'use client';

import { useMemo } from 'react';
import { AttorneyTranscript, TranscriptLine } from '@/types/attorney-transcript';
import { TranscriptAnnotation } from '@/types/issue-code';

interface TranscriptViewerProps {
  transcript: AttorneyTranscript;
  annotations?: TranscriptAnnotation[];
  onLineClick?: (page: number, line: number) => void;
}

export function TranscriptViewer({
  transcript,
  annotations = [],
  onLineClick,
}: TranscriptViewerProps) {
  // Build annotation map for quick lookup
  const annotationMap = useMemo(() => {
    const map = new Map<string, TranscriptAnnotation[]>();
    annotations.forEach((ann) => {
      // Create key for each line in the range
      for (let page = ann.pageStart; page <= ann.pageEnd; page++) {
        const startLine = page === ann.pageStart ? ann.lineStart : 1;
        const endLine = page === ann.pageEnd ? ann.lineEnd : 9999;
        for (let line = startLine; line <= endLine; line++) {
          const key = `${page}-${line}`;
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key)!.push(ann);
        }
      }
    });
    return map;
  }, [annotations]);

  const getLineAnnotations = (page: number, line: number): TranscriptAnnotation[] => {
    return annotationMap.get(`${page}-${line}`) || [];
  };

  const getLineHighlightStyle = (page: number, line: number): React.CSSProperties => {
    const lineAnnotations = getLineAnnotations(page, line);
    if (lineAnnotations.length === 0) return {};

    // Use the first annotation's color (if multiple, use first)
    const primaryAnnotation = lineAnnotations[0];
    return {
      backgroundColor: `${primaryAnnotation.issueCode.color}20`, // 20% opacity
      borderLeft: `3px solid ${primaryAnnotation.issueCode.color}`,
      paddingLeft: '8px',
    };
  };

  return (
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
            {page.lines.map((line) => {
              const lineAnnotations = getLineAnnotations(line.page, line.line);
              const highlightStyle = getLineHighlightStyle(line.page, line.line);

              return (
                <div
                  key={`${line.page}-${line.line}`}
                  className="flex gap-4 py-1 text-sm leading-relaxed select-text group relative"
                  style={highlightStyle}
                  onClick={() => onLineClick?.(line.page, line.line)}
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

                  {/* Annotation Indicators */}
                  {lineAnnotations.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {lineAnnotations.map((ann) => (
                        <span
                          key={ann.id}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ann.issueCode.color }}
                          title={ann.issueCode.label}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

