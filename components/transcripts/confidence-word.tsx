// components/transcripts/confidence-word.tsx
// Feature 3: Inline Confidence Heatmap
// Workflow Intelligence Plan - Phase A

'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { TranscriptWord } from './synced-transcript-viewer';

interface ConfidenceWordProps {
  word: TranscriptWord;
  isActive?: boolean;
  onClick?: () => void;
  showHeatmap: boolean;
  originalWord?: string; // If word was corrected, show original
  isFlagged?: boolean;
}

/**
 * Renders a single word with confidence-based color coding
 *
 * Color scale (when heatmap enabled):
 * - < 0.50: Red background + underline (critical risk)
 * - 0.50-0.70: Orange background + dashed underline (low confidence)
 * - 0.70-0.85: Yellow background (medium confidence, near threshold)
 * - > 0.85: No styling (high confidence)
 */
export function ConfidenceWord({
  word,
  isActive = false,
  onClick,
  showHeatmap,
  originalWord,
  isFlagged = false,
}: ConfidenceWordProps) {
  const confidence = word.confidence;

  // Get confidence class based on heatmap setting
  const getConfidenceClass = () => {
    if (!showHeatmap) {
      // Heatmap disabled - minimal styling
      return 'text-slate-200';
    }

    // Heatmap enabled - full color scale
    if (confidence < 0.5) {
      // Critical: <50% confidence - RED background + underline
      return 'bg-red-500/30 text-red-100 underline decoration-red-400 decoration-2';
    } else if (confidence < 0.7) {
      // Low: 50-70% confidence - ORANGE background + dashed underline
      return 'bg-orange-500/25 text-orange-100 underline decoration-dashed decoration-orange-400';
    } else if (confidence < 0.85) {
      // Medium: 70-85% confidence - YELLOW background (near threshold)
      return 'bg-yellow-500/20 text-yellow-100';
    } else {
      // High: >85% confidence - no special styling
      return 'text-slate-200';
    }
  };

  const confidencePercentage = Math.round(confidence * 100);
  const displayWord = word.punctuated_word || word.word;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={onClick}
            className={cn(
              'cursor-pointer transition-all duration-150 hover:bg-slate-700/50 rounded px-0.5',
              getConfidenceClass(),
              isActive && 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900 bg-blue-600/40',
              isFlagged && 'font-medium'
            )}
          >
            {displayWord}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Confidence:</span>
              <span className={cn(
                confidencePercentage >= 85 ? 'text-green-400' :
                confidencePercentage >= 70 ? 'text-yellow-400' :
                confidencePercentage >= 50 ? 'text-orange-400' :
                'text-red-400'
              )}>
                {confidencePercentage}%
              </span>
            </div>
            <div className="text-slate-400">
              Time: {word.start.toFixed(2)}s - {word.end.toFixed(2)}s
            </div>
            {originalWord && originalWord !== displayWord && (
              <div className="text-slate-400">
                Original: <span className="line-through">{originalWord}</span>
              </div>
            )}
            {isFlagged && (
              <div className="text-yellow-400 text-xs mt-1">
                🚩 Flagged for review
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
