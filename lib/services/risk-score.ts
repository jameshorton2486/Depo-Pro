// lib/services/risk-score.ts
// Feature Deep Dive v2: Enhancement 1.3 - Review Risk Score
// Calculates a 0-100 risk score for transcripts to help scopists prioritize review

export interface RiskScoreInput {
  flagged_count: number;
  total_words: number;
  very_low_confidence_count: number; // words < 0.6
  speaker_change_count: number;
  audio_quality_score?: number; // from Deepgram (0-1)
}

export interface RiskScoreResult {
  score: number; // 0-100
  label: string; // Low / Medium / High / Critical
  color: string; // green / yellow / orange / red
  priority: 1 | 2 | 3 | 4; // for sorting
}

/**
 * Calculate transcript risk score based on multiple factors
 *
 * Risk factors:
 * - Flagged word density (weight: 2x)
 * - Very low confidence words (weight: 5x)
 * - Speaker complexity (weight: 0.1x per change)
 * - Audio quality issues (weight: 20x)
 *
 * @param input - Risk calculation inputs
 * @returns Risk score with label and color
 */
export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  const {
    flagged_count,
    total_words,
    very_low_confidence_count,
    speaker_change_count,
    audio_quality_score,
  } = input;

  // Avoid division by zero
  const safeWordCount = Math.max(total_words, 1);

  // Calculate ratios
  const flaggedRatio = flagged_count / safeWordCount;
  const veryLowRatio = very_low_confidence_count / safeWordCount;

  // Compute weighted score
  let score =
    flaggedRatio * 100 * 2 + // flagged word density (2x weight)
    veryLowRatio * 100 * 5 + // very low confidence amplifier (5x weight)
    speaker_change_count * 0.1 + // speaker complexity
    (audio_quality_score ? (1 - audio_quality_score) * 20 : 10); // audio quality penalty

  // Cap at 100
  score = Math.min(Math.round(score), 100);

  // Determine label, color, and priority
  if (score >= 75) {
    return {
      score,
      label: 'Critical — Full Review Required',
      color: 'red',
      priority: 4,
    };
  }

  if (score >= 50) {
    return {
      score,
      label: 'High Risk',
      color: 'orange',
      priority: 3,
    };
  }

  if (score >= 25) {
    return {
      score,
      label: 'Medium Risk',
      color: 'yellow',
      priority: 2,
    };
  }

  return {
    score,
    label: 'Low Risk',
    color: 'green',
    priority: 1,
  };
}

/**
 * Helper to extract risk score inputs from transcription data
 */
export function extractRiskInputs(transcription: {
  word_count?: number;
  flagged_word_count?: number;
  words?: Array<{ confidence?: number }>;
  segments?: Array<{ speaker?: number }>;
  metadata?: { audio_quality_score?: number };
}): RiskScoreInput {
  const total_words = transcription.word_count || 0;
  const flagged_count = transcription.flagged_word_count || 0;

  // Count very low confidence words (< 0.6)
  let very_low_confidence_count = 0;
  if (transcription.words) {
    very_low_confidence_count = transcription.words.filter(
      (w) => (w.confidence ?? 1) < 0.6
    ).length;
  }

  // Count speaker changes
  let speaker_change_count = 0;
  if (transcription.segments && transcription.segments.length > 1) {
    for (let i = 1; i < transcription.segments.length; i++) {
      if (
        transcription.segments[i].speaker !==
        transcription.segments[i - 1].speaker
      ) {
        speaker_change_count++;
      }
    }
  }

  const audio_quality_score = transcription.metadata?.audio_quality_score;

  return {
    flagged_count,
    total_words,
    very_low_confidence_count,
    speaker_change_count,
    audio_quality_score,
  };
}
