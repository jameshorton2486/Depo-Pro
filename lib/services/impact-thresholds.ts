// lib/services/impact-thresholds.ts
// Accuracy Intelligence Plan - Step 6: High-Impact Zone Highlighting
// Category-specific confidence thresholds based on legal sensitivity

import { categorizeWord } from '@/lib/services/confidence-analytics';

/**
 * Impact-aware confidence thresholds by category
 *
 * Not all words need the same confidence level:
 * - Numbers/currency must be near-perfect (95%)
 * - Medical terms need high confidence (90%)
 * - Proper nouns at standard threshold (85%)
 * - General words have lower bar (75%)
 *
 * This makes the heatmap legally intelligent, not just statistically noisy.
 */
export const IMPACT_THRESHOLDS: Record<string, number> = {
  number_date: 0.95,    // "$500,000" needs near-perfect confidence
  medical: 0.90,        // "L4-L5" needs high confidence
  proper_noun: 0.85,    // Names at standard threshold
  legal: 0.85,          // Legal terms at standard threshold
  general: 0.75,        // "the" vs "that" rarely changes meaning
};

/**
 * Determine if a word should be flagged based on impact-aware thresholds
 *
 * @param word - The word text
 * @param confidence - Deepgram confidence score (0-1)
 * @returns true if word is below its category's threshold
 *
 * @example
 * isHighImpactFlagged("$500,000", 0.92) // true (below 0.95)
 * isHighImpactFlagged("the", 0.78)      // false (above 0.75)
 */
export function isHighImpactFlagged(word: string, confidence: number): boolean {
  const category = categorizeWord(word);
  const threshold = IMPACT_THRESHOLDS[category] || 0.85;
  return confidence < threshold;
}

/**
 * Get the confidence threshold for a specific word
 *
 * @param word - The word text
 * @returns The threshold value (0-1)
 */
export function getThresholdForWord(word: string): number {
  const category = categorizeWord(word);
  return IMPACT_THRESHOLDS[category] || 0.85;
}

/**
 * Get the severity level for a flagged word
 *
 * @param word - The word text
 * @param confidence - Deepgram confidence score
 * @returns Severity level: 'critical' | 'high' | 'medium' | 'low' | null
 */
export function getImpactSeverity(
  word: string,
  confidence: number
): 'critical' | 'high' | 'medium' | 'low' | null {
  if (!isHighImpactFlagged(word, confidence)) {
    return null; // Not flagged
  }

  const category = categorizeWord(word);
  const threshold = IMPACT_THRESHOLDS[category] || 0.85;
  const deficit = threshold - confidence;

  // Critical: major confidence deficit
  if (deficit >= 0.3) return 'critical';

  // High: significant deficit
  if (deficit >= 0.15) return 'high';

  // Medium: moderate deficit
  if (deficit >= 0.05) return 'medium';

  // Low: minor deficit
  return 'low';
}

/**
 * Calculate how many high-impact words are flagged
 *
 * @param words - Array of words with confidence scores
 * @returns Count of high-impact flagged words
 */
export function countHighImpactFlags(
  words: Array<{ word: string; confidence: number }>
): number {
  let count = 0;

  for (const w of words) {
    const category = categorizeWord(w.word);
    if (
      (category === 'medical' ||
        category === 'number_date' ||
        category === 'proper_noun') &&
      isHighImpactFlagged(w.word, w.confidence)
    ) {
      count++;
    }
  }

  return count;
}

/**
 * Get color for severity level (for UI)
 */
export function getSeverityColor(
  severity: 'critical' | 'high' | 'medium' | 'low' | null
): string {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'blue';
    default:
      return 'gray';
  }
}
