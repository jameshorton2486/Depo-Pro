'use client';

/**
 * Review Progress Indicator
 *
 * Visual progress indicator showing:
 * - Segments reviewed vs total
 * - Percentage complete
 * - Estimated time remaining
 * - Quality score improvement (if corrections made)
 */

import { useMemo } from 'react';
import { CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewProgressProps {
  /** Total number of flagged segments */
  total: number;

  /** Number of segments reviewed */
  reviewed: number;

  /** Number of segments corrected */
  corrected?: number;

  /** Average review time per segment (seconds) */
  averageReviewTime?: number;

  /** Initial quality score (before corrections) */
  initialQualityScore?: number;

  /** Current quality score (after corrections) */
  currentQualityScore?: number;

  /** Show detailed breakdown */
  showDetails?: boolean;

  className?: string;
}

export function ReviewProgress({
  total,
  reviewed,
  corrected = 0,
  averageReviewTime,
  initialQualityScore,
  currentQualityScore,
  showDetails = true,
  className,
}: ReviewProgressProps) {
  const percentComplete = total > 0 ? Math.round((reviewed / total) * 100) : 100;
  const pending = total - reviewed;

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (!averageReviewTime || pending === 0) return null;

    const secondsRemaining = pending * averageReviewTime;
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = Math.floor(secondsRemaining % 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [averageReviewTime, pending]);

  // Calculate quality improvement
  const qualityImprovement = useMemo(() => {
    if (!initialQualityScore || !currentQualityScore) return null;

    const improvement = currentQualityScore - initialQualityScore;
    if (improvement === 0) return null;

    return {
      value: improvement,
      percent: Math.round((improvement / initialQualityScore) * 100),
      isPositive: improvement > 0,
    };
  }, [initialQualityScore, currentQualityScore]);

  // Progress bar color based on completion
  const progressColor = useMemo(() => {
    if (percentComplete === 100) return 'bg-green-500';
    if (percentComplete >= 75) return 'bg-blue-500';
    if (percentComplete >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  }, [percentComplete]);

  if (total === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-600', className)}>
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span>No flagged segments - excellent quality!</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Review Progress
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {reviewed} of {total} ({percentComplete}%)
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn('h-full rounded-full transition-all duration-300', progressColor)}
            style={{ width: `${percentComplete}%` }}
            role="progressbar"
            aria-valuenow={percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percentComplete}% complete`}
          />
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Reviewed Count */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {reviewed} Reviewed
              </div>
              {pending > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {pending} pending
                </div>
              )}
            </div>
          </div>

          {/* Corrected Count */}
          {corrected > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  {corrected} Corrected
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round((corrected / total) * 100)}% of total
                </div>
              </div>
            </div>
          )}

          {/* Estimated Time */}
          {estimatedTimeRemaining && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  Est. Time
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {estimatedTimeRemaining} remaining
                </div>
              </div>
            </div>
          )}

          {/* Quality Improvement */}
          {qualityImprovement && (
            <div className="flex items-center gap-2">
              <TrendingUp
                className={cn(
                  'w-4 h-4',
                  qualityImprovement.isPositive ? 'text-green-500' : 'text-red-500',
                )}
              />
              <div>
                <div
                  className={cn(
                    'font-medium',
                    qualityImprovement.isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {qualityImprovement.isPositive ? '+' : ''}
                  {qualityImprovement.value.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Quality improvement
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completion Message */}
      {percentComplete === 100 && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
            <CheckCircle2 className="w-5 h-5" />
            <span>Review Complete!</span>
          </div>
          {corrected && corrected > 0 && (
            <div className="mt-1 text-xs text-green-600 dark:text-green-300">
              {corrected} correction{corrected !== 1 ? 's' : ''} made
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewProgress;


