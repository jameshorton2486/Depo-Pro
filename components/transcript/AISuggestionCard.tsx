'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AISuggestion {
  id: string;
  transcription_id: string;
  word_id: string;
  original_word: string;
  suggested_word: string;
  confidence: number;
  model: string;
  reasoning: string;
}

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onApplied?: (suggestionId: string) => void;
  onDismissed?: (suggestionId: string) => void;
}

export function AISuggestionCard({ suggestion, onApplied, onDismissed }: AISuggestionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<'applied' | 'dismissed' | null>(null);

  const handleAction = async (action: 'apply' | 'dismiss') => {
    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/transcripts/${suggestion.transcription_id}/suggestions/${suggestion.id}?action=${action}`,
        { method: 'POST' },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action}`);
      }

      setResult(action === 'apply' ? 'applied' : 'dismissed');
      if (action === 'apply') {
        onApplied?.(suggestion.id);
      } else {
        onDismissed?.(suggestion.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} suggestion:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <div
        className={cn(
          'p-3 rounded-lg border text-sm',
          result === 'applied'
            ? 'border-green-500/30 bg-green-500/10 text-green-400'
            : 'border-gray-500/30 bg-gray-500/10 text-muted-foreground',
        )}
      >
        {result === 'applied' ? 'Applied' : 'Dismissed'}:{' '}
        <span className="font-medium">{suggestion.original_word}</span>
        {result === 'applied' && (
          <>
            {' \u2192 '}
            <span className="font-medium">{suggestion.suggested_word}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
      {/* AI badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium">
          AI Suggestion
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round(suggestion.confidence * 100)}% confidence
        </span>
      </div>

      {/* Word comparison */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-red-400 line-through">{suggestion.original_word}</span>
        <span className="text-muted-foreground">{'\u2192'}</span>
        <span className="text-green-400 font-medium">{suggestion.suggested_word}</span>
      </div>

      {/* Reasoning */}
      <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('apply')}
          disabled={isProcessing}
          className="flex-1 py-1.5 text-xs font-medium rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={() => handleAction('dismiss')}
          disabled={isProcessing}
          className="flex-1 py-1.5 text-xs font-medium rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
