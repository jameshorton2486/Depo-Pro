// lib/services/impact-weighted-risk.ts
// Accuracy Intelligence Plan - Step 3: Impact-Weighted Risk Scoring
// Not all errors matter equally - legal impact drives the weighting

import { categorizeWord } from '@/lib/services/confidence-analytics';

/**
 * Impact weights by word category
 *
 * Rationale:
 * - Numbers/currency (4x): "$500,000" vs "$50,000" changes the entire case
 * - Medical terms (3x): "L4-L5" vs "L4-S5" changes diagnosis
 * - Proper nouns (3x): Wrong doctor, facility, plaintiff creates evidentiary problems
 * - Legal terms (2x): "Negligence" vs "negligent" may matter in specific contexts
 * - General words (1x): Common words are low-impact even when wrong
 */
const IMPACT_WEIGHTS: Record<string, number> = {
  number_date: 4,
  medical: 3,
  proper_noun: 3,
  legal: 2,
  general: 1,
};

export interface ImpactRiskInput {
  flaggedWords: Array<{
    word: string;
    confidence: number;
    word_index: number;
  }>;
  totalWords: number;
  speakerChangeCount: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  weight: number;
  contribution: number; // count * weight * avg_deficit
}

export interface ImpactRiskResult {
  rawScore: number; // unweighted (current system)
  impactScore: number; // weighted by legal importance
  label: string;
  color: string;
  highImpactCount: number; // medical + number + proper noun flagged words
  breakdown: CategoryBreakdown[];
}

/**
 * Calculate impact-weighted risk score
 *
 * Unlike the raw risk score (which treats all errors equally),
 * this score weights errors by their legal significance.
 *
 * A transcript with 10 wrong medical terms is riskier than
 * a transcript with 50 wrong filler words.
 */
export function calculateImpactWeightedRisk(
  input: ImpactRiskInput
): ImpactRiskResult {
  const { flaggedWords, totalWords, speakerChangeCount } = input;

  if (totalWords === 0) {
    return {
      rawScore: 0,
      impactScore: 0,
      label: 'No Data',
      color: 'gray',
      highImpactCount: 0,
      breakdown: [],
    };
  }

  // Group flagged words by category
  const byCategory: Record<string, { count: number; totalDeficit: number }> = {};

  for (const w of flaggedWords) {
    const cat = categorizeWord(w.word);
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, totalDeficit: 0 };
    }
    byCategory[cat].count += 1;
    byCategory[cat].totalDeficit += (0.85 - w.confidence); // deficit from threshold
  }

  // Calculate impact-weighted score
  let impactScore = 0;
  const breakdown: CategoryBreakdown[] = [];

  for (const [cat, data] of Object.entries(byCategory)) {
    const weight = IMPACT_WEIGHTS[cat] || 1;
    const avgDeficit = data.count > 0 ? data.totalDeficit / data.count : 0;
    const contribution = data.count * weight * avgDeficit * 100;

    impactScore += contribution;

    breakdown.push({
      category: cat,
      count: data.count,
      weight,
      contribution: Math.round(contribution),
    });
  }

  // Normalize to 0-100 scale
  // Formula accounts for both weighted errors and speaker complexity
  const normalized = Math.min(
    100,
    Math.round(
      (impactScore / Math.max(totalWords, 1)) * 200 +
      (speakerChangeCount * 0.1)
    )
  );

  // Count high-impact errors (medical, numbers, names)
  const highImpactCount = flaggedWords.filter(w => {
    const cat = categorizeWord(w.word);
    return cat === 'medical' || cat === 'number_date' || cat === 'proper_noun';
  }).length;

  // Generate label based on impact score
  const label =
    normalized >= 75
      ? 'Critical — High Legal Sensitivity'
      : normalized >= 50
        ? 'High Risk — Contains Impact-Sensitive Errors'
        : normalized >= 25
          ? 'Medium Risk'
          : 'Low Risk';

  const color =
    normalized >= 75
      ? 'red'
      : normalized >= 50
        ? 'orange'
        : normalized >= 25
          ? 'yellow'
          : 'green';

  // Calculate raw unweighted score for comparison
  const rawScore = Math.min(
    100,
    Math.round((flaggedWords.length / Math.max(totalWords, 1)) * 200)
  );

  return {
    rawScore,
    impactScore: normalized,
    label,
    color,
    highImpactCount,
    breakdown: breakdown.sort((a, b) => b.contribution - a.contribution),
  };
}

/**
 * Get the display label for a category
 */
export function getCategoryDisplayName(category: string): string {
  const labels: Record<string, string> = {
    number_date: 'Numbers & Dates',
    medical: 'Medical Terms',
    proper_noun: 'Names & Places',
    legal: 'Legal Terms',
    general: 'General Words',
  };
  return labels[category] || category;
}

/**
 * Get color for a category (for UI display)
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    number_date: 'red',
    medical: 'orange',
    proper_noun: 'yellow',
    legal: 'blue',
    general: 'gray',
  };
  return colors[category] || 'gray';
}
