/**
 * Confidence Scoring Utilities
 * Central source of truth for transcription confidence handling
 *
 * Industry Standard: 85% is typical threshold for "needs review"
 * Legal Standard: Some courts require 98%+ for certified transcripts
 *
 * @module lib/confidence
 */

// ============================================
// THRESHOLDS
// ============================================

/** Standard confidence threshold for flagging words */
export const CONFIDENCE_THRESHOLD = 0.85;

/** High confidence - word is almost certainly correct */
export const CONFIDENCE_HIGH = 0.95;

/** Medium confidence - likely correct but worth checking */
export const CONFIDENCE_MEDIUM = 0.85;

/** Low confidence - definitely needs human review */
export const CONFIDENCE_LOW = 0.70;

/** Very low confidence - likely wrong or inaudible */
export const CONFIDENCE_VERY_LOW = 0.50;

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ConfidenceLevel = 'very-high' | 'high' | 'medium' | 'low' | 'very-low';

export interface WordWithConfidence {
  word: string;
  confidence: number;
  start?: number;
  end?: number;
  speaker?: number;
  punctuatedWord?: string;
}

export interface ConfidenceStats {
  total: number;
  flagged: number;
  reviewed: number;
  corrected: number;
  averageConfidence: number;
  percentFlagged: number;
  percentReviewed: number;
  byLevel: Record<ConfidenceLevel, number>;
}

export interface ReviewTimeEstimate {
  seconds: number;
  minutes: number;
  formatted: string;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Check if a word is below the confidence threshold
 * @param word - Object with confidence property
 * @param threshold - Custom threshold (default: 0.85)
 * @returns true if word needs review
 */
export function isLowConfidence(
  word: { confidence: number },
  threshold: number = CONFIDENCE_THRESHOLD
): boolean {
  return word.confidence < threshold;
}

/**
 * Check if a word is high confidence (likely correct)
 * @param word - Object with confidence property
 * @returns true if word is high confidence
 */
export function isHighConfidence(word: { confidence: number }): boolean {
  return word.confidence >= CONFIDENCE_HIGH;
}

/**
 * Get confidence level classification
 * @param confidence - Confidence score (0.0 - 1.0)
 * @returns Confidence level category
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.98) return 'very-high';
  if (confidence >= CONFIDENCE_HIGH) return 'high';
  if (confidence >= CONFIDENCE_MEDIUM) return 'medium';
  if (confidence >= CONFIDENCE_LOW) return 'low';
  return 'very-low';
}

/**
 * Get display color for confidence level (hex color)
 * @param confidence - Confidence score (0.0 - 1.0)
 * @returns Hex color string
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);

  switch (level) {
    case 'very-high':
      return '#22c55e'; // green-500
    case 'high':
      return '#84cc16'; // lime-500
    case 'medium':
      return '#eab308'; // yellow-500
    case 'low':
      return '#f97316'; // orange-500
    case 'very-low':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get background color with opacity for confidence level
 * @param confidence - Confidence score (0.0 - 1.0)
 * @param opacity - Opacity value (0-100, default 20)
 * @returns RGBA color string
 */
export function getConfidenceBackgroundColor(
  confidence: number,
  opacity: number = 20
): string {
  const hex = getConfidenceColor(confidence);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

/**
 * Get Tailwind CSS classes for confidence styling
 * @param confidence - Confidence score (0.0 - 1.0)
 * @returns Tailwind class string
 */
export function getConfidenceClasses(confidence: number): string {
  const level = getConfidenceLevel(confidence);

  switch (level) {
    case 'very-high':
      return 'text-green-700 bg-green-50';
    case 'high':
      return 'text-lime-700 bg-lime-50';
    case 'medium':
      return 'text-yellow-700 bg-yellow-50';
    case 'low':
      return 'text-orange-700 bg-orange-100 border-b-2 border-orange-400';
    case 'very-low':
      return 'text-red-700 bg-red-100 border-b-2 border-red-500 font-medium';
    default:
      return '';
  }
}

/**
 * Get minimal Tailwind classes for inline word highlighting
 * @param confidence - Confidence score (0.0 - 1.0)
 * @returns Tailwind class string (minimal)
 */
export function getConfidenceHighlightClasses(confidence: number): string {
  if (confidence >= CONFIDENCE_HIGH) return '';
  if (confidence >= CONFIDENCE_MEDIUM) return 'bg-yellow-100';
  if (confidence >= CONFIDENCE_LOW) return 'bg-orange-100 underline decoration-orange-400';
  return 'bg-red-100 underline decoration-red-500 decoration-2';
}

/**
 * Get human-readable label for confidence level
 * @param confidence - Confidence score (0.0 - 1.0)
 * @returns Human-readable string
 */
export function getConfidenceLabel(confidence: number): string {
  const level = getConfidenceLevel(confidence);

  switch (level) {
    case 'very-high':
      return 'Excellent';
    case 'high':
      return 'Good';
    case 'medium':
      return 'Acceptable';
    case 'low':
      return 'Needs Review';
    case 'very-low':
      return 'Likely Incorrect';
    default:
      return 'Unknown';
  }
}

/**
 * Get icon/emoji for confidence level
 * @param confidence - Confidence score (0.0 - 1.0)
 * @returns Emoji string
 */
export function getConfidenceIcon(confidence: number): string {
  const level = getConfidenceLevel(confidence);

  switch (level) {
    case 'very-high':
      return '✓';
    case 'high':
      return '✓';
    case 'medium':
      return '?';
    case 'low':
      return '⚠';
    case 'very-low':
      return '✗';
    default:
      return '?';
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Filter words that need review
 * @param words - Array of words with confidence
 * @param threshold - Custom threshold (default: 0.85)
 * @returns Filtered array of low-confidence words
 */
export function getFlaggedWords<T extends { confidence: number }>(
  words: T[],
  threshold: number = CONFIDENCE_THRESHOLD
): T[] {
  return words.filter((word) => isLowConfidence(word, threshold));
}

/**
 * Filter words that are high confidence (don't need review)
 * @param words - Array of words with confidence
 * @returns Filtered array of high-confidence words
 */
export function getConfidentWords<T extends { confidence: number }>(
  words: T[]
): T[] {
  return words.filter((word) => isHighConfidence(word));
}

/**
 * Sort words by confidence (lowest first for review priority)
 * @param words - Array of words with confidence
 * @param ascending - Sort direction (default: true = lowest first)
 * @returns Sorted array (new array, does not mutate original)
 */
export function sortByConfidence<T extends { confidence: number }>(
  words: T[],
  ascending: boolean = true
): T[] {
  return [...words].sort((a, b) =>
    ascending ? a.confidence - b.confidence : b.confidence - a.confidence
  );
}

/**
 * Group words by confidence level
 * @param words - Array of words with confidence
 * @returns Object with arrays for each confidence level
 */
export function groupByConfidenceLevel<T extends { confidence: number }>(
  words: T[]
): Record<ConfidenceLevel, T[]> {
  const groups: Record<ConfidenceLevel, T[]> = {
    'very-high': [],
    high: [],
    medium: [],
    low: [],
    'very-low': [],
  };

  for (const word of words) {
    const level = getConfidenceLevel(word.confidence);
    groups[level].push(word);
  }

  return groups;
}

/**
 * Get words within a confidence range
 * @param words - Array of words with confidence
 * @param min - Minimum confidence (inclusive)
 * @param max - Maximum confidence (exclusive)
 * @returns Filtered array
 */
export function getWordsInRange<T extends { confidence: number }>(
  words: T[],
  min: number,
  max: number
): T[] {
  return words.filter((word) => word.confidence >= min && word.confidence < max);
}

// ============================================
// STATISTICS
// ============================================

/**
 * Calculate confidence statistics for a transcript
 * @param words - Array of words with confidence and optional reviewed/corrected flags
 * @param threshold - Custom threshold (default: 0.85)
 * @returns Statistics object
 */
export function calculateConfidenceStats(
  words: Array<{
    confidence: number;
    reviewed?: boolean;
    isReviewed?: boolean;
    correctedWord?: string;
    isCorrected?: boolean;
  }>,
  threshold: number = CONFIDENCE_THRESHOLD
): ConfidenceStats {
  if (words.length === 0) {
    return {
      total: 0,
      flagged: 0,
      reviewed: 0,
      corrected: 0,
      averageConfidence: 0,
      percentFlagged: 0,
      percentReviewed: 0,
      byLevel: {
        'very-high': 0,
        high: 0,
        medium: 0,
        low: 0,
        'very-low': 0,
      },
    };
  }

  const flagged = words.filter((w) => isLowConfidence(w, threshold));
  const reviewed = flagged.filter((w) => w.reviewed || w.isReviewed);
  const corrected = flagged.filter((w) => w.correctedWord || w.isCorrected);
  const totalConfidence = words.reduce((sum, w) => sum + w.confidence, 0);
  const grouped = groupByConfidenceLevel(words);

  return {
    total: words.length,
    flagged: flagged.length,
    reviewed: reviewed.length,
    corrected: corrected.length,
    averageConfidence: totalConfidence / words.length,
    percentFlagged: (flagged.length / words.length) * 100,
    percentReviewed:
      flagged.length > 0 ? (reviewed.length / flagged.length) * 100 : 100,
    byLevel: {
      'very-high': grouped['very-high'].length,
      high: grouped['high'].length,
      medium: grouped['medium'].length,
      low: grouped['low'].length,
      'very-low': grouped['very-low'].length,
    },
  };
}

/**
 * Calculate average confidence for a set of words
 * @param words - Array of words with confidence
 * @returns Average confidence (0-1) or 0 if empty
 */
export function calculateAverageConfidence(
  words: Array<{ confidence: number }>
): number {
  if (words.length === 0) return 0;
  const total = words.reduce((sum, w) => sum + w.confidence, 0);
  return total / words.length;
}

/**
 * Get confidence distribution percentages
 * @param words - Array of words with confidence
 * @returns Object with percentage for each level
 */
export function getConfidenceDistribution(
  words: Array<{ confidence: number }>
): Record<ConfidenceLevel, number> {
  const groups = groupByConfidenceLevel(words);
  const total = words.length || 1;

  return {
    'very-high': (groups['very-high'].length / total) * 100,
    high: (groups['high'].length / total) * 100,
    medium: (groups['medium'].length / total) * 100,
    low: (groups['low'].length / total) * 100,
    'very-low': (groups['very-low'].length / total) * 100,
  };
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format confidence as percentage string
 * @param confidence - Confidence score (0.0 - 1.0)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatConfidence(
  confidence: number,
  decimals: number = 0
): string {
  return `${(confidence * 100).toFixed(decimals)}%`;
}

/**
 * Format confidence as fraction string
 * @param confidence - Confidence score (0.0 - 1.0)
 * @returns Formatted fraction string (e.g., "85/100")
 */
export function formatConfidenceAsFraction(confidence: number): string {
  const percent = Math.round(confidence * 100);
  return `${percent}/100`;
}

// ============================================
// TIME ESTIMATION
// ============================================

/**
 * Estimate review time based on flagged word count
 * Assumes ~10 seconds per flagged word with audio playback
 * @param flaggedCount - Number of flagged words
 * @param secondsPerWord - Estimated seconds per word (default: 10)
 * @returns Time estimate object
 */
export function estimateReviewTime(
  flaggedCount: number,
  secondsPerWord: number = 10
): ReviewTimeEstimate {
  const totalSeconds = flaggedCount * secondsPerWord;
  const minutes = Math.ceil(totalSeconds / 60);

  let formatted: string;
  if (minutes === 0) {
    formatted = 'Less than 1 min';
  } else if (minutes < 60) {
    formatted = `~${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      formatted = `~${hours}h`;
    } else {
      formatted = `~${hours}h ${remainingMinutes}m`;
    }
  }

  return {
    seconds: totalSeconds,
    minutes,
    formatted,
  };
}

/**
 * Estimate remaining review time based on progress
 * @param totalFlagged - Total number of flagged words
 * @param reviewed - Number of words already reviewed
 * @param secondsPerWord - Estimated seconds per word (default: 10)
 * @returns Time estimate object
 */
export function estimateRemainingReviewTime(
  totalFlagged: number,
  reviewed: number,
  secondsPerWord: number = 10
): ReviewTimeEstimate {
  const remaining = Math.max(0, totalFlagged - reviewed);
  return estimateReviewTime(remaining, secondsPerWord);
}

// ============================================
// QUALITY SCORING
// ============================================

/**
 * Calculate overall transcript quality score (0-100)
 * Based on confidence distribution and thresholds
 * @param words - Array of words with confidence
 * @returns Quality score (0-100)
 */
export function calculateQualityScore(
  words: Array<{ confidence: number }>
): number {
  if (words.length === 0) return 0;

  const avg = calculateAverageConfidence(words);
  const flaggedPercent =
    getFlaggedWords(words).length / words.length;

  // Weight: 70% average confidence, 30% inverse of flagged percentage
  const avgScore = avg * 70;
  const flagScore = (1 - flaggedPercent) * 30;

  return Math.round(avgScore + flagScore);
}

/**
 * Get quality grade based on score
 * @param score - Quality score (0-100)
 * @returns Grade string (A, B, C, D, F)
 */
export function getQualityGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get quality assessment based on score
 * @param score - Quality score (0-100)
 * @returns Assessment object with grade and description
 */
export function getQualityAssessment(score: number): {
  score: number;
  grade: string;
  label: string;
  description: string;
  passesLegalThreshold: boolean;
} {
  const grade = getQualityGrade(score);

  const assessments: Record<
    string,
    { label: string; description: string; passes: boolean }
  > = {
    A: {
      label: 'Excellent',
      description: 'Transcript is highly accurate with minimal review needed.',
      passes: true,
    },
    B: {
      label: 'Good',
      description: 'Transcript is accurate with some words needing review.',
      passes: true,
    },
    C: {
      label: 'Acceptable',
      description: 'Transcript requires significant review before use.',
      passes: true,
    },
    D: {
      label: 'Poor',
      description:
        'Transcript has many low-confidence words. Consider re-recording.',
      passes: false,
    },
    F: {
      label: 'Unacceptable',
      description: 'Transcript quality is too low for professional use.',
      passes: false,
    },
  };

  const assessment = assessments[grade];

  return {
    score,
    grade,
    label: assessment.label,
    description: assessment.description,
    passesLegalThreshold: assessment.passes,
  };
}
