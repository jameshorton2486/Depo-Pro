'use client';

// ═══════════════════════════════════════════════════════════════
// FLAGGED WORD CARD - Individual word review card
// ═══════════════════════════════════════════════════════════════
// Features:
// - Display word with confidence percentage
// - Show surrounding context
// - Play button to seek audio
// - Edit mode for corrections
// - Mark as reviewed (OK) button
// - Loop button for repeated listening
// - Accessible with aria-label

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FlaggedWordWithContext } from '@/types/review';

interface FlaggedWordCardProps {
  flaggedWord: FlaggedWordWithContext;
  isActive: boolean;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onCorrect: (wordIndex: number, newWord: string) => void;
  onMarkReviewed: (wordIndex: number) => void;
  onLoop?: (start: number, end: number) => void;
}

export function FlaggedWordCard({
  flaggedWord,
  isActive,
  isPlaying,
  onSeek,
  onCorrect,
  onMarkReviewed,
  onLoop,
}: FlaggedWordCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(flaggedWord.correctedWord || flaggedWord.word);
  const inputRef = useRef<HTMLInputElement>(null);

  const confidencePercent = Math.round(flaggedWord.confidence * 100);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when flagged word changes
  useEffect(() => {
    setEditValue(flaggedWord.correctedWord || flaggedWord.word);
  }, [flaggedWord.correctedWord, flaggedWord.word]);

  const handlePlayClick = () => {
    // Seek to 2 seconds before the word for context
    const seekTime = Math.max(0, flaggedWord.start - 2);
    onSeek(seekTime);
  };

  const handleLoopClick = () => {
    if (onLoop) {
      // Loop from 1 second before to 1 second after
      const loopStart = Math.max(0, flaggedWord.start - 1);
      const loopEnd = flaggedWord.end + 1;
      onLoop(loopStart, loopEnd);
    }
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== flaggedWord.word) {
      onCorrect(flaggedWord.wordIndex, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(flaggedWord.correctedWord || flaggedWord.word);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidencePercent >= 80) return 'text-orange-500';
    if (confidencePercent >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  // Accessible label for the card
  const cardAriaLabel = `Word "${flaggedWord.word}", confidence ${confidencePercent}%${
    flaggedWord.reviewed ? ', reviewed' : ', needs review'
  }${flaggedWord.correctedWord ? `, corrected to "${flaggedWord.correctedWord}"` : ''}`;

  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : flaggedWord.reviewed
          ? 'border-gray-200 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      aria-label={cardAriaLabel}
      role="article"
    >
      {/* Header: Word and confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Reviewed indicator */}
          {flaggedWord.reviewed && (
            <span className="text-green-500" title="Reviewed" aria-label="Reviewed">
              ✓
            </span>
          )}

          {/* The word */}
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-32 h-8 font-mono text-lg"
              aria-label="Edit word"
            />
          ) : (
            <span
              className={`font-mono text-lg font-bold ${
                flaggedWord.correctedWord ? 'text-green-600' : 'text-gray-900'
              }`}
            >
              {flaggedWord.correctedWord || flaggedWord.word}
            </span>
          )}

          {/* Show original if corrected */}
          {flaggedWord.correctedWord && !isEditing && (
            <span className="text-sm text-gray-400 line-through">
              {flaggedWord.word}
            </span>
          )}
        </div>

        {/* Confidence badge */}
        <span
          className={`text-sm font-medium ${getConfidenceColor()}`}
          aria-label={`Confidence: ${confidencePercent}%`}
        >
          {confidencePercent}%
        </span>
      </div>

      {/* Context */}
      <div className="text-sm text-gray-600 mb-3 bg-gray-50 rounded px-2 py-1">
        <span className="text-gray-400">...</span>
        {flaggedWord.contextBefore}
        <span className="font-medium text-gray-900 mx-1 bg-yellow-100 px-1 rounded">
          {flaggedWord.correctedWord || flaggedWord.word}
        </span>
        {flaggedWord.contextAfter}
        <span className="text-gray-400">...</span>
      </div>

      {/* Alternatives (if available) */}
      {flaggedWord.alternatives && flaggedWord.alternatives.length > 0 && !isEditing && (
        <div className="text-xs text-gray-500 mb-3">
          <span className="font-medium">Suggestions: </span>
          {flaggedWord.alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => onCorrect(flaggedWord.wordIndex, alt)}
              className="inline-block bg-gray-100 hover:bg-gray-200 rounded px-1.5 py-0.5 mx-0.5 transition-colors"
              aria-label={`Use suggestion: ${alt}`}
            >
              {alt}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="flex-1"
              aria-label="Save correction"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              aria-label="Cancel editing"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            {/* Play button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlayClick}
              className="flex items-center gap-1"
              title="Play audio at this word (with 2s context)"
              aria-label={`Play audio for word "${flaggedWord.word}"`}
            >
              {isPlaying && isActive ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              Play
            </Button>

            {/* Loop button */}
            {onLoop && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLoopClick}
                title="Loop this word"
                aria-label={`Loop audio for word "${flaggedWord.word}"`}
              >
                🔁
              </Button>
            )}

            {/* Edit button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              aria-label={`Edit word "${flaggedWord.word}"`}
            >
              Edit
            </Button>

            {/* Mark OK button */}
            {!flaggedWord.reviewed && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkReviewed(flaggedWord.wordIndex)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                aria-label={`Mark word "${flaggedWord.word}" as correct`}
              >
                ✓ OK
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FlaggedWordCard;
