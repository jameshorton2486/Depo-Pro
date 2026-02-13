// lib/services/litigation-sensitivity.ts
// Accuracy Intelligence Plan - Step 8: Litigation Sensitivity Score
// Measures legal exposure, not just statistical confidence

import { categorizeWord } from '@/lib/services/confidence-analytics';

export interface LitigationSensitivity {
  score: number; // 0-100
  label: string;
  highImpactErrors: number;
  breakdown: {
    medical_errors: number;
    number_errors: number;
    name_errors: number;
    total_high_impact: number;
  };
}

/**
 * Calculate litigation sensitivity score
 *
 * Companion to risk score that specifically measures legal exposure.
 * Risk score measures statistical confidence; this measures how many errors
 * are in categories that change case outcomes.
 *
 * A transcript with 10 wrong medical terms is more legally sensitive than
 * a transcript with 50 wrong filler words.
 *
 * @param flaggedWords - Words flagged for review
 * @param totalWords - Total words in transcript
 * @returns Litigation sensitivity analysis
 */
export function calculateLitigationSensitivity(
  flaggedWords: Array<{ word: string; confidence: number }>,
  totalWords: number
): LitigationSensitivity {
  let medicalErrors = 0;
  let numberErrors = 0;
  let nameErrors = 0;

  // Count high-impact errors by category using impact-aware thresholds
  for (const w of flaggedWords) {
    const cat = categorizeWord(w.word);

    // Medical terms below 90% confidence
    if (cat === 'medical' && w.confidence < 0.90) {
      medicalErrors++;
    }

    // Numbers/dates below 95% confidence
    if (cat === 'number_date' && w.confidence < 0.95) {
      numberErrors++;
    }

    // Proper nouns below 85% confidence
    if (cat === 'proper_noun' && w.confidence < 0.85) {
      nameErrors++;
    }
  }

  const totalHighImpact = medicalErrors + numberErrors + nameErrors;

  // Weighted score: numbers are most critical in legal context
  // - Numbers: 4x weight (dollar amounts, dates, statutes of limitations)
  // - Medical: 3x weight (diagnosis, treatment, causation)
  // - Names: 2x weight (parties, providers, facilities)
  const rawScore = numberErrors * 4 + medicalErrors * 3 + nameErrors * 2;

  // Normalize to 0-100 scale
  const normalized = Math.min(
    100,
    Math.round((rawScore / Math.max(totalWords, 1)) * 1000)
  );

  // Generate label
  const label =
    normalized >= 60
      ? 'High Legal Sensitivity — Manual Review Strongly Recommended'
      : normalized >= 30
        ? 'Moderate Legal Sensitivity — Review High-Impact Sections'
        : normalized >= 10
          ? 'Low-Moderate Legal Sensitivity'
          : 'Low Legal Sensitivity';

  return {
    score: normalized,
    label,
    highImpactErrors: totalHighImpact,
    breakdown: {
      medical_errors: medicalErrors,
      number_errors: numberErrors,
      name_errors: nameErrors,
      total_high_impact: totalHighImpact,
    },
  };
}

/**
 * Get color for litigation sensitivity score
 */
export function getLitigationSensitivityColor(score: number): string {
  if (score >= 60) return 'red';
  if (score >= 30) return 'orange';
  if (score >= 10) return 'yellow';
  return 'green';
}

/**
 * Get icon for litigation sensitivity score
 */
export function getLitigationSensitivityIcon(score: number): string {
  if (score >= 60) return '⚠️';
  if (score >= 30) return '⚡';
  if (score >= 10) return '📋';
  return '✓';
}

/**
 * Format breakdown for display
 */
export function formatLitigationBreakdown(
  breakdown: LitigationSensitivity['breakdown']
): string[] {
  const parts: string[] = [];

  if (breakdown.number_errors > 0) {
    parts.push(`${breakdown.number_errors} number/date errors`);
  }

  if (breakdown.medical_errors > 0) {
    parts.push(`${breakdown.medical_errors} medical term errors`);
  }

  if (breakdown.name_errors > 0) {
    parts.push(`${breakdown.name_errors} name/place errors`);
  }

  return parts;
}
