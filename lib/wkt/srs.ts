// ═══════════════════════════════════════════════════════════════
// SM-2 SPACED REPETITION ALGORITHM
// ═══════════════════════════════════════════════════════════════
// Implementation of the SM-2 algorithm for WKT flashcards

/**
 * Quality ratings for SM-2 algorithm:
 * - 0: Complete blackout, no memory
 * - 1: Incorrect, but remembered upon seeing answer
 * - 2: Incorrect, but answer seemed easy to recall
 * - 3: Correct with serious difficulty
 * - 4: Correct with some hesitation
 * - 5: Perfect response
 */
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface SRSResult {
  newEaseFactor: number;
  newInterval: number;
  nextReview: Date;
}

/**
 * Calculate next review date and updated SRS values using SM-2 algorithm
 *
 * @param currentEaseFactor - Current ease factor (default 2.5, minimum 1.3)
 * @param currentInterval - Current interval in days
 * @param quality - Quality rating (0-5)
 * @param attemptNumber - Number of times this question has been reviewed (1 = first review)
 * @returns Updated SRS values and next review date
 */
export function calculateNextReview(
  currentEaseFactor: number,
  currentInterval: number,
  quality: QualityRating,
  attemptNumber: number = 1
): SRSResult {
  let newEaseFactor = currentEaseFactor;
  let newInterval: number;

  // Update ease factor
  // EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  const easeFactorChange =
    0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  newEaseFactor = currentEaseFactor + easeFactorChange;

  // Minimum ease factor is 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  // Calculate new interval based on quality
  if (quality < 3) {
    // Failed - reset interval to 1 day
    newInterval = 1;
  } else {
    // Passed
    if (attemptNumber === 1) {
      // First review: interval = 1 day
      newInterval = 1;
    } else if (attemptNumber === 2) {
      // Second review: interval = 6 days
      newInterval = 6;
    } else {
      // Subsequent reviews: interval = previous interval * ease factor
      newInterval = Math.round(currentInterval * newEaseFactor);
    }
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    newEaseFactor,
    newInterval,
    nextReview,
  };
}

/**
 * Get quality rating from answer correctness
 * Simple version - can be enhanced later with response time
 *
 * @param isCorrect - Whether the answer was correct
 * @param responseTime - Optional response time in milliseconds (for future enhancement)
 * @returns Quality rating (0-5)
 */
export function getQualityFromAnswer(
  isCorrect: boolean,
  _responseTime?: number
): QualityRating {
  // Simple version:
  // - Correct = 4 (correct with some hesitation)
  // - Incorrect = 1 (incorrect but remembered upon seeing answer)
  // TODO: Enhance with response time thresholds
  if (isCorrect) {
    // Could use responseTime to differentiate between 4 and 5
    // For now, default to 4 (some hesitation)
    return 4;
  } else {
    return 1;
  }
}
