'use client';

/**
 * Confidence Stats Component
 * Displays transcript quality metrics and review progress
 *
 * @module components/transcripts/confidence-stats
 */

import { useMemo } from 'react';
import {
  calculateConfidenceStats,
  formatConfidence,
  estimateReviewTime,
  getQualityAssessment,
  getConfidenceLabel,
  type ConfidenceStats as _ConfidenceStatsType,
} from '@/lib/confidence';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface WordData {
  confidence: number;
  reviewed?: boolean;
  isReviewed?: boolean;
  correctedWord?: string;
  isCorrected?: boolean;
}

interface ConfidenceStatsProps {
  words: WordData[];
  threshold?: number;
  showDistribution?: boolean;
  showQualityGrade?: boolean;
  showTimeEstimate?: boolean;
  compact?: boolean;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function ConfidenceStats({
  words,
  threshold = 0.85,
  showDistribution = true,
  showQualityGrade = true,
  showTimeEstimate = true,
  compact = false,
  className = '',
}: ConfidenceStatsProps) {
  // Calculate all statistics
  const stats = useMemo(
    () => calculateConfidenceStats(words, threshold),
    [words, threshold]
  );

  const reviewTime = useMemo(
    () => estimateReviewTime(stats.flagged - stats.reviewed),
    [stats]
  );

  const quality = useMemo(
    () => getQualityAssessment(
      Math.round(stats.averageConfidence * 100)
    ),
    [stats]
  );

  // Compact version for inline display
  if (compact) {
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        <span className="text-gray-600">
          Confidence:{' '}
          <span className="font-medium text-gray-900">
            {formatConfidence(stats.averageConfidence, 1)}
          </span>
        </span>
        <span className="text-gray-600">
          Flagged:{' '}
          <span className="font-medium text-orange-600">
            {stats.flagged}
          </span>
        </span>
        {stats.flagged > 0 && (
          <span className="text-gray-600">
            Reviewed:{' '}
            <span className="font-medium text-green-600">
              {stats.percentReviewed.toFixed(0)}%
            </span>
          </span>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className={cn('bg-white rounded-lg border p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Transcript Quality</h3>
        {showQualityGrade && (
          <div
            className={cn(
              'px-3 py-1 rounded-full text-sm font-bold',
              quality.grade === 'A' && 'bg-green-100 text-green-800',
              quality.grade === 'B' && 'bg-lime-100 text-lime-800',
              quality.grade === 'C' && 'bg-yellow-100 text-yellow-800',
              quality.grade === 'D' && 'bg-orange-100 text-orange-800',
              quality.grade === 'F' && 'bg-red-100 text-red-800'
            )}
            title={quality.description}
          >
            Grade: {quality.grade}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Average Confidence */}
        <div>
          <p className="text-gray-500 mb-1">Average Confidence</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatConfidence(stats.averageConfidence, 1)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {getConfidenceLabel(stats.averageConfidence)}
          </p>
        </div>

        {/* Flagged Words */}
        <div>
          <p className="text-gray-500 mb-1">Words Flagged</p>
          <p className="text-2xl font-bold text-orange-600">
            {stats.flagged}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.percentFlagged.toFixed(1)}% of {stats.total.toLocaleString()} words
          </p>
        </div>

        {/* Review Progress */}
        <div>
          <p className="text-gray-500 mb-1">Review Progress</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-green-600">
              {stats.percentReviewed.toFixed(0)}%
            </p>
            {stats.corrected > 0 && (
              <span className="text-sm text-blue-600">
                ({stats.corrected} corrected)
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats.reviewed} of {stats.flagged} reviewed
          </p>
        </div>

        {/* Time Estimate */}
        {showTimeEstimate && (
          <div>
            <p className="text-gray-500 mb-1">Est. Time Remaining</p>
            <p className="text-2xl font-bold text-blue-600">
              {reviewTime.formatted}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              ~10 sec per word
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {stats.flagged > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Review Progress</span>
            <span>
              {stats.reviewed} / {stats.flagged}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${stats.percentReviewed}%` }}
            />
          </div>
        </div>
      )}

      {/* Confidence Distribution */}
      {showDistribution && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500 mb-2">Confidence Distribution</p>
          <div className="flex gap-1 h-3">
            {Object.entries(stats.byLevel).map(([level, count]) => {
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              if (percent === 0) return null;

              return (
                <div
                  key={level}
                  className={cn(
                    'rounded-sm transition-all cursor-help',
                    level === 'very-high' && 'bg-green-500',
                    level === 'high' && 'bg-lime-500',
                    level === 'medium' && 'bg-yellow-500',
                    level === 'low' && 'bg-orange-500',
                    level === 'very-low' && 'bg-red-500'
                  )}
                  style={{ width: `${percent}%` }}
                  title={`${level}: ${count} words (${percent.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Excellent</span>
            <span>Needs Review</span>
          </div>
        </div>
      )}

      {/* Quality Assessment */}
      {showQualityGrade && !quality.passesLegalThreshold && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="font-medium text-yellow-800">
            ⚠️ Quality Warning
          </p>
          <p className="text-yellow-700 mt-1">
            {quality.description}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// MINI VERSION
// ============================================

interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  showLabel = false,
  size = 'md',
  className = '',
}: ConfidenceBadgeProps) {
  const label = getConfidenceLabel(confidence);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const colorClasses = cn(
    confidence >= 0.95 && 'bg-green-100 text-green-800',
    confidence >= 0.85 && confidence < 0.95 && 'bg-lime-100 text-lime-800',
    confidence >= 0.70 && confidence < 0.85 && 'bg-orange-100 text-orange-800',
    confidence < 0.70 && 'bg-red-100 text-red-800'
  );

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClasses[size],
        colorClasses,
        className
      )}
      title={`Confidence: ${formatConfidence(confidence, 1)} - ${label}`}
    >
      {formatConfidence(confidence, 0)}
      {showLabel && <span className="opacity-75">({label})</span>}
    </span>
  );
}

// ============================================
// PROGRESS RING VERSION
// ============================================

interface ConfidenceRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

export function ConfidenceRing({
  value,
  size = 80,
  strokeWidth = 8,
  showPercentage = true,
  className = '',
}: ConfidenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    // Use HSL colors from status-colors utility
    if (value >= 90) return 'hsl(142, 76%, 36%)'; // green
    if (value >= 75) return 'hsl(84, 81%, 44%)';  // lime
    if (value >= 60) return 'hsl(45, 93%, 47%)';   // yellow
    if (value >= 40) return 'hsl(24, 95%, 53%)';   // orange
    return 'hsl(0, 84%, 60%)';                     // red
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(220, 13%, 91%)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">
            {value.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default ConfidenceStats;
