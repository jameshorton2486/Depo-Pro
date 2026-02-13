// lib/services/effort-estimate.ts
// Feature 4: Estimated Review Effort Calculation
// Workflow Intelligence Plan - Phase A

export interface EffortEstimate {
  minutes: number;
  label: string; // "~10 min", "~25 min", "60+ min"
  confidence: string; // "Based on 0 prior reviews" or "Based on 47 prior reviews"
}

/**
 * Estimate how long a transcript review will take
 *
 * Phase A: Heuristic model based on risk score and flagged count
 * Phase B: Will be replaced with regression model trained on actual review data
 *
 * @param riskScore - 0-100 risk score
 * @param flaggedCount - Number of flagged words
 * @param totalWords - Total words in transcript
 * @param historicalAvg - Average review time from firm history (Phase B)
 * @returns Effort estimate with label and confidence
 */
export function estimateReviewEffort(
  riskScore: number,
  flaggedCount: number,
  totalWords: number,
  historicalAvg?: number // Phase B: firm-specific average
): EffortEstimate {
  // Phase B: If we have historical data, use it (adaptive model)
  if (historicalAvg && historicalAvg > 0) {
    const adjustedMinutes = historicalAvg * (riskScore / 50); // Scale by risk
    return {
      minutes: Math.round(adjustedMinutes),
      label: `~${Math.round(adjustedMinutes)} min`,
      confidence: "Based on your firm's review history",
    };
  }

  // Phase A: Heuristic model
  // Assumptions:
  // - Experienced scopist: ~2 seconds per flagged word for correction
  // - Audio context listening: +3 seconds per word
  // - Risk multiplier: Higher risk = more audio replays, more uncertainty

  const baseMinutes = (flaggedCount * 2) / 60; // 2 sec per word
  const audioOverhead = (flaggedCount * 3) / 60; // 3 sec audio context per word

  // Risk multiplier
  const riskMultiplier = riskScore >= 75 ? 2.0 : riskScore >= 50 ? 1.5 : riskScore >= 25 ? 1.2 : 1.0;

  const minutes = Math.round((baseMinutes + audioOverhead) * riskMultiplier);

  // Format label
  if (minutes <= 10)
    return { minutes, label: '~10 min', confidence: 'Estimated (no review history yet)' };
  if (minutes <= 30)
    return {
      minutes,
      label: `~${Math.round(minutes / 5) * 5} min`,
      confidence: 'Estimated',
    };
  if (minutes <= 60)
    return {
      minutes,
      label: `~${Math.round(minutes / 5) * 5} min`,
      confidence: 'Estimated',
    };

  return { minutes, label: '60+ min', confidence: 'Estimated' };
}

/**
 * Calculate total estimated effort for a list of jobs
 * Used for scopist queue summary: "Est. X minutes today"
 */
export function calculateTotalEffort(
  jobs: Array<{
    riskScore?: { score: number };
    confidenceAnalytics?: { flagged_count: number; total_words: number };
  }>
): number {
  return jobs.reduce((total, job) => {
    if (!job.riskScore || !job.confidenceAnalytics) return total;

    const estimate = estimateReviewEffort(
      job.riskScore.score,
      job.confidenceAnalytics.flagged_count,
      job.confidenceAnalytics.total_words
    );

    return total + estimate.minutes;
  }, 0);
}
