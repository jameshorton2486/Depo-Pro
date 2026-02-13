// lib/services/accuracy-delta.ts
// Accuracy Intelligence Plan - Step 1: Post-Review Accuracy Delta
// "Accuracy improved from 87.2% → 96.1%" - This is the ROI proof

export interface AccuracyDeltaResult {
  // Before review (captured at session start)
  preAccuracy: number;          // e.g., 87.2
  preFlaggedPct: number;        // e.g., 14.3
  preVeryLowCount: number;      // words < 0.5 confidence

  // After review (captured at session end)
  postCorrections: number;      // words corrected
  postConfirmations: number;    // words confirmed
  postSkips: number;            // words skipped
  postRemainingFlagged: number; // unreviewed flagged words
  postAccuracy: number;         // e.g., 96.1

  // Computed metrics
  confidenceUplift: number;     // 96.1 - 87.2 = 8.9
  flaggedReduction: number;     // % reduction in flagged words
  reviewQuality: number;        // composite score 0-100
}

/**
 * Calculate accuracy improvement from scopist review
 *
 * This quantifies the human + AI synergy:
 * - Pre-review: AI confidence levels
 * - Post-review: Human-verified accuracy
 *
 * The uplift proves value: "Your accuracy improved from 87% to 96%"
 *
 * @param allWords - All transcript words with confidence scores
 * @param flaggedWords - Words flagged for review
 * @param corrections - Words that were corrected
 * @param confirmations - Word indices that were confirmed (no change needed)
 * @param skips - Word indices that were skipped
 */
export function calculateAccuracyDelta(
  allWords: Array<{ confidence: number; word_index: number }>,
  flaggedWords: Array<{ word_index: number; confidence: number; status: string }>,
  corrections: Array<{ word_index: number; corrected_word: string }>,
  confirmations: Set<number>,
  skips: Set<number>
): AccuracyDeltaResult {
  const totalWords = allWords.length;

  if (totalWords === 0) {
    return {
      preAccuracy: 0,
      preFlaggedPct: 0,
      preVeryLowCount: 0,
      postCorrections: 0,
      postConfirmations: 0,
      postSkips: 0,
      postRemainingFlagged: 0,
      postAccuracy: 0,
      confidenceUplift: 0,
      flaggedReduction: 0,
      reviewQuality: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // PRE-REVIEW METRICS
  // ─────────────────────────────────────────────────────────────
  const preAvgConf =
    allWords.reduce((sum, w) => sum + w.confidence, 0) / totalWords;
  const preFlaggedCount = flaggedWords.length;
  const preFlaggedPct = (preFlaggedCount / totalWords) * 100;
  const preVeryLowCount = allWords.filter(w => w.confidence < 0.5).length;

  // ─────────────────────────────────────────────────────────────
  // POST-REVIEW METRICS
  // ─────────────────────────────────────────────────────────────
  // Build correction set for fast lookup
  const correctionSet = new Set(corrections.map(c => c.word_index));

  // Post-review confidence calculation:
  // - Corrected words get confidence = 1.0 (human-verified)
  // - Confirmed words get confidence = 1.0 (human-verified original)
  // - Skipped words retain original confidence
  // - Unreviewed words retain original confidence
  const postConfidences = allWords.map(w => {
    if (correctionSet.has(w.word_index)) return 1.0; // corrected = verified
    if (confirmations.has(w.word_index)) return 1.0; // confirmed = verified
    return w.confidence; // unchanged
  });

  const postAvgConf =
    postConfidences.reduce((a, b) => a + b, 0) / totalWords;

  // Recalculate flagged count with post-review confidence
  // (using standard 0.85 threshold)
  const postFlaggedCount = postConfidences.filter(c => c < 0.85).length;

  // ─────────────────────────────────────────────────────────────
  // COMPUTED METRICS
  // ─────────────────────────────────────────────────────────────
  const uplift = postAvgConf - preAvgConf;

  const flaggedReduction =
    preFlaggedCount > 0
      ? ((preFlaggedCount - postFlaggedCount) / preFlaggedCount) * 100
      : 0;

  // Review quality score (0-100)
  const reviewedCount =
    corrections.length + confirmations.size + skips.size;
  const reviewCompletion =
    preFlaggedCount > 0 ? reviewedCount / preFlaggedCount : 1;
  const correctionRatio =
    reviewedCount > 0 ? corrections.length / reviewedCount : 0;

  // Weighted combination:
  // - 50% for completing the review (did they review all flagged words?)
  // - 30% for flagged reduction (how much did the flagged count drop?)
  // - 20% for making corrections (were actual corrections made?)
  const reviewQuality = Math.round(
    reviewCompletion * 50 +
    flaggedReduction * 0.3 +
    correctionRatio * 20
  );

  return {
    // Pre-review
    preAccuracy: Math.round(preAvgConf * 1000) / 10,
    preFlaggedPct: Math.round(preFlaggedPct * 10) / 10,
    preVeryLowCount,

    // Post-review
    postCorrections: corrections.length,
    postConfirmations: confirmations.size,
    postSkips: skips.size,
    postRemainingFlagged: postFlaggedCount,
    postAccuracy: Math.round(postAvgConf * 1000) / 10,

    // Computed
    confidenceUplift: Math.round(uplift * 1000) / 10,
    flaggedReduction: Math.round(flaggedReduction * 10) / 10,
    reviewQuality: Math.min(100, Math.max(0, reviewQuality)),
  };
}

/**
 * Format accuracy delta for display
 */
export function formatAccuracyDelta(delta: AccuracyDeltaResult): {
  accuracyChange: string;
  flaggedChange: string;
  qualityBadge: { text: string; color: string };
} {
  const accuracyChange =
    delta.confidenceUplift >= 0
      ? `+${delta.confidenceUplift}%`
      : `${delta.confidenceUplift}%`;

  const flaggedChange =
    delta.flaggedReduction >= 0
      ? `-${delta.flaggedReduction}%`
      : `+${Math.abs(delta.flaggedReduction)}%`;

  const qualityBadge =
    delta.reviewQuality >= 80
      ? { text: 'Excellent', color: 'green' }
      : delta.reviewQuality >= 60
        ? { text: 'Good', color: 'blue' }
        : delta.reviewQuality >= 40
          ? { text: 'Fair', color: 'yellow' }
          : { text: 'Needs Review', color: 'red' };

  return {
    accuracyChange,
    flaggedChange,
    qualityBadge,
  };
}
