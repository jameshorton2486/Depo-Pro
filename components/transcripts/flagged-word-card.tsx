'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Check, Edit2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FlaggedSegment {
  wordIndex: number;
  word: string;
  confidence: number;
  start: number;
  end: number;
  context: string;
  alternatives: string[];
}

interface FlaggedWordCardProps {
  segment: FlaggedSegment;
  isReviewed: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  onPlay: () => void;
  onEdit: (newWord: string) => void;
  onMarkReviewed: () => void;
  onSelect: () => void;
}

function getConfidenceColor(confidence: number): string {
  if (confidence < 0.5) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (confidence < 0.7) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
}

export function FlaggedWordCard({
  segment,
  isReviewed,
  isPlaying,
  isSelected,
  onPlay,
  onEdit,
  onMarkReviewed,
  onSelect,
}: FlaggedWordCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(segment.word);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleConfirmEdit = () => {
    if (editValue.trim() && editValue !== segment.word) {
      onEdit(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(segment.word);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleAlternativeClick = (alt: string) => {
    onEdit(alt);
    onMarkReviewed();
  };

  // Highlight the flagged word in context
  const formattedContext = segment.context.replace(
    /\[([^\]]+)\]/,
    '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium">$1</mark>',
  );

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg p-4 transition-all cursor-pointer',
        'border-l-4',
        isReviewed
          ? 'bg-slate-50 dark:bg-slate-900 border-l-green-500 opacity-75'
          : 'bg-white dark:bg-slate-800 border-l-amber-500 shadow-sm hover:shadow-md',
        isPlaying && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20',
        isSelected && !isPlaying && 'ring-2 ring-slate-400',
      )}
    >
      {/* Header: Word and Confidence */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Play audio from this point"
          >
            <Volume2 className={cn('w-4 h-4', isPlaying ? 'text-blue-600' : 'text-slate-500')} />
          </button>

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCancelEdit}
              className="px-2 py-1 border rounded text-lg font-medium w-40 dark:bg-slate-700 dark:border-slate-600"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-lg font-medium text-slate-900 dark:text-slate-100">
              &quot;{segment.word}&quot;
            </span>
          )}
        </div>

        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getConfidenceColor(segment.confidence))}>
          {Math.round(segment.confidence * 100)}%
        </span>
      </div>

      {/* Context */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Context:</div>
        <div
          className="text-sm text-slate-700 dark:text-slate-300 italic"
          dangerouslySetInnerHTML={{ __html: formattedContext }}
        />
      </div>

      {/* Alternatives */}
      {segment.alternatives.length > 0 && !isReviewed && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Suggestions:</div>
          <div className="flex flex-wrap gap-2">
            {segment.alternatives.map((alt, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAlternativeClick(alt);
                }}
                className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmEdit();
              }}
              className="flex items-center gap-1 px-2 py-1 text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200"
            >
              <Check className="w-3 h-3" /> Save
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
              className="flex items-center gap-1 px-2 py-1 text-sm bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded hover:bg-slate-200"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            disabled={isReviewed}
            className="flex items-center gap-1 px-2 py-1 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkReviewed();
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors',
            isReviewed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
          )}
        >
          <Check className="w-3 h-3" />
          {isReviewed ? 'Reviewed' : 'Mark Done'}
        </button>
      </div>
    </div>
  );
}

export default FlaggedWordCard;

