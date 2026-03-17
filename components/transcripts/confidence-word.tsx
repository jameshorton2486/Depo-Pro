// components/transcripts/confidence-word.tsx
// Feature 3: Inline Confidence Heatmap (Workflow Intelligence Plan)
// Step 6: High-Impact Zone Highlighting (Accuracy Intelligence Plan)
// Uses impact-aware thresholds for legally intelligent highlighting

'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { isHighImpactFlagged, getImpactSeverity, getThresholdForWord } from '@/lib/services/impact-thresholds';
import { categorizeWord } from '@/lib/services/confidence-analytics';
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
 * Renders a single word with impact-aware confidence highlighting
 *
 * ACCURACY INTELLIGENCE: Uses category-specific thresholds:
 * - Numbers/currency: 95% threshold (e.g., "$500,000" at 92% gets flagged)
 * - Medical terms: 90% threshold (e.g., "L4-L5" at 88% gets flagged)
 * - Proper nouns: 85% threshold
 * - General words: 75% threshold (e.g., "the" at 78% does NOT get flagged)
 *
 * This makes the heatmap legally intelligent, not just statistically noisy.
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
  const displayWord = word.punctuated_word || word.word;

  // ACCURACY INTELLIGENCE: Use impact-aware thresholds
  const isFlaggedByImpact = isHighImpactFlagged(displayWord, confidence);
  const severity = getImpactSeverity(displayWord, confidence);
  const threshold = getThresholdForWord(displayWord);
  const category = categorizeWord(displayWord);

  // Get confidence class based on heatmap setting
  const getConfidenceClass = () => {
    if (!showHeatmap) {
      return 'text-slate-200';
    }

    // Heatmap enabled - color by severity for impact-flagged, or by raw confidence for others
    if (isFlaggedByImpact) {
    switch (severity) {
      case 'critical':
        // Critical: major confidence deficit - RED background + underline
        return 'bg-red-500/30 text-red-100 underline decoration-red-400 decoration-2';
      case 'high':
        // High: significant deficit - ORANGE background + dashed underline
        return 'bg-orange-500/25 text-orange-100 underline decoration-dashed decoration-orange-400';
      case 'medium':
        // Medium: moderate deficit - YELLOW background
        return 'bg-yellow-500/20 text-yellow-100';
      case 'low':
        return 'bg-blue-500/15 text-blue-100';
      default:
        return 'text-slate-200';
    }
    }

    // Heatmap ON but not impact-flagged: color by raw confidence
    if (confidence >= 0.95) return 'text-emerald-300';
    if (confidence >= 0.85) return 'text-slate-200';
    if (confidence >= 0.75) return 'text-yellow-300';
    if (confidence >= 0.6) return 'text-amber-400';
    return 'text-red-300';
  };

  const confidencePercentage = Math.round(confidence * 100);

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
                confidencePercentage >= threshold * 100 ? 'text-green-400' :
                severity === 'critical' ? 'text-red-400' :
                severity === 'high' ? 'text-orange-400' :
                severity === 'medium' ? 'text-yellow-400' :
                'text-blue-400'
              )}>
                {confidencePercentage}%
              </span>
            </div>
            {/* Show category and threshold for flagged words */}
            {isFlaggedByImpact && (
              <div className="text-slate-400 text-xs">
                Category: {category} (threshold: {Math.round(threshold * 100)}%)
              </div>
            )}
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
