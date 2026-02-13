// components/transcripts/accuracy-delta-card.tsx
// Accuracy Intelligence Plan - Step 1: Accuracy Delta Display
// "Accuracy improved from 87% → 96%" - The single most powerful proof of value

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccuracyDeltaCardProps {
  preAccuracy: number;
  postAccuracy: number;
  uplift: number;
  preFlaggedPct: number;
  postFlaggedPct: number;
  flaggedReduction: number;
  reviewQuality: number;
}

/**
 * Display review impact metrics
 *
 * This is the ROI proof. When a firm admin asks "why are we paying for Depo-Pro?"
 * the answer is: "Your average accuracy improved from 87% to 96% with 85% reduction
 * in flagged words."
 *
 * No competitor shows this.
 */
export function AccuracyDeltaCard({
  preAccuracy,
  postAccuracy,
  uplift,
  preFlaggedPct,
  postFlaggedPct,
  flaggedReduction,
  reviewQuality,
}: AccuracyDeltaCardProps) {
  const qualityColor =
    reviewQuality >= 80
      ? 'text-green-600 dark:text-green-400'
      : reviewQuality >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

  const qualityBg =
    reviewQuality >= 80
      ? 'bg-green-50/30 border-green-200 dark:bg-green-950/30 dark:border-green-800'
      : reviewQuality >= 50
        ? 'bg-yellow-50/30 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
        : 'bg-red-50/30 border-red-200 dark:bg-red-950/30 dark:border-red-800';

  return (
    <Card className={cn('border', qualityBg)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className={cn('h-4 w-4', qualityColor)} />
          Review Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Accuracy uplift */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Accuracy</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {preAccuracy}%
            </span>
            {uplift >= 0 ? (
              <ArrowUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-bold text-green-700 dark:text-green-400">
              {postAccuracy}%
            </span>
            <span
              className={cn(
                'text-xs',
                uplift >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              ({uplift >= 0 ? '+' : ''}
              {uplift}%)
            </span>
          </div>
        </div>

        {/* Flagged reduction */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Flagged Words</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {preFlaggedPct}%
            </span>
            {flaggedReduction >= 0 ? (
              <ArrowDown className="h-3 w-3 text-green-600 dark:text-green-400 rotate-0" />
            ) : (
              <ArrowUp className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-bold text-green-700 dark:text-green-400">
              {postFlaggedPct.toFixed(1)}%
            </span>
            <span className="text-xs text-green-600 dark:text-green-400">
              (-{flaggedReduction}%)
            </span>
          </div>
        </div>

        {/* Quality score */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Review Quality</span>
          <div className="flex items-center gap-1">
            <CheckCircle2 className={cn('h-4 w-4', qualityColor)} />
            <span className={cn('text-sm font-bold', qualityColor)}>
              {reviewQuality}/100
            </span>
          </div>
        </div>

        {/* Explanation text */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          {reviewQuality >= 80 ? (
            <span className="text-green-600 dark:text-green-400">
              ✓ Excellent review coverage. All high-impact areas addressed.
            </span>
          ) : reviewQuality >= 50 ? (
            <span className="text-yellow-600 dark:text-yellow-400">
              ⚠ Good progress. Consider reviewing remaining flagged words.
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400">
              ⚠ Many words still need review. Continue reviewing for best accuracy.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for dashboards
 */
export function AccuracyDeltaBadge({
  preAccuracy,
  postAccuracy,
  uplift,
}: Pick<AccuracyDeltaCardProps, 'preAccuracy' | 'postAccuracy' | 'uplift'>) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
      <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
      <span className="text-xs font-medium text-green-700 dark:text-green-300">
        {preAccuracy}% → {postAccuracy}%
      </span>
      <span className="text-xs text-green-600 dark:text-green-400">
        (+{uplift}%)
      </span>
    </div>
  );
}
