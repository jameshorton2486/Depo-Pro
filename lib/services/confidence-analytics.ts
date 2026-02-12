// lib/services/confidence-analytics.ts
// Feature Deep Dive v2: Enhancement 1.2 - Confidence Pattern Analytics
// Analyzes transcription confidence patterns for quality insights

export interface ConfidenceAnalytics {
  total_words: number;
  flagged_count: number;
  flagged_percentage: number;
  avg_confidence: number;
  category_breakdown: {
    medical: number; // % of corrections in medical terms
    proper_nouns: number; // % in names/places
    numbers_dates: number; // % in numbers/dates
    general: number; // % in common words
  };
  speaker_confidence: Record<string, number>; // speaker_id -> avg confidence
  risk_score: number;
}

/**
 * Calculate comprehensive confidence analytics for a transcription
 */
export function calculateConfidenceAnalytics(transcription: {
  words?: Array<{
    word: string;
    confidence?: number;
    speaker?: number;
  }>;
  flagged_words?: Array<{
    original_word: string;
    corrected_word?: string;
    category?: string;
  }>;
  word_count?: number;
  flagged_word_count?: number;
}): ConfidenceAnalytics {
  const words = transcription.words || [];
  const flaggedWords = transcription.flagged_words || [];

  // Basic metrics
  const total_words = transcription.word_count || words.length;
  const flagged_count = transcription.flagged_word_count || flaggedWords.length;
  const flagged_percentage =
    total_words > 0 ? (flagged_count / total_words) * 100 : 0;

  // Average confidence
  const confidenceSum = words.reduce(
    (sum, w) => sum + (w.confidence ?? 1),
    0
  );
  const avg_confidence = words.length > 0 ? confidenceSum / words.length : 1;

  // Category breakdown (from flagged words)
  const categoryBreakdown = {
    medical: 0,
    proper_nouns: 0,
    numbers_dates: 0,
    general: 0,
  };

  if (flaggedWords.length > 0) {
    flaggedWords.forEach((fw) => {
      const category = fw.category?.toLowerCase() || 'general';
      if (category.includes('medical') || category.includes('anatomical')) {
        categoryBreakdown.medical++;
      } else if (category.includes('name') || category.includes('place')) {
        categoryBreakdown.proper_nouns++;
      } else if (
        category.includes('number') ||
        category.includes('date') ||
        category.includes('time')
      ) {
        categoryBreakdown.numbers_dates++;
      } else {
        categoryBreakdown.general++;
      }
    });

    // Convert to percentages
    categoryBreakdown.medical = Math.round(
      (categoryBreakdown.medical / flaggedWords.length) * 100
    );
    categoryBreakdown.proper_nouns = Math.round(
      (categoryBreakdown.proper_nouns / flaggedWords.length) * 100
    );
    categoryBreakdown.numbers_dates = Math.round(
      (categoryBreakdown.numbers_dates / flaggedWords.length) * 100
    );
    categoryBreakdown.general = Math.round(
      (categoryBreakdown.general / flaggedWords.length) * 100
    );
  }

  // Speaker-level confidence
  const speakerConfidence: Record<string, { sum: number; count: number }> = {};

  words.forEach((w) => {
    const speakerId = `SPEAKER_${w.speaker ?? 0}`;
    if (!speakerConfidence[speakerId]) {
      speakerConfidence[speakerId] = { sum: 0, count: 0 };
    }
    speakerConfidence[speakerId].sum += w.confidence ?? 1;
    speakerConfidence[speakerId].count++;
  });

  const speaker_confidence: Record<string, number> = {};
  Object.keys(speakerConfidence).forEach((speakerId) => {
    speaker_confidence[speakerId] =
      speakerConfidence[speakerId].sum / speakerConfidence[speakerId].count;
  });

  return {
    total_words,
    flagged_count,
    flagged_percentage: Math.round(flagged_percentage * 10) / 10, // 1 decimal
    avg_confidence: Math.round(avg_confidence * 1000) / 1000, // 3 decimals
    category_breakdown: categoryBreakdown,
    speaker_confidence,
    risk_score: 0, // Computed separately via risk-score service
  };
}

/**
 * Generate confidence heatmap data for visualization
 * Divides transcript into chunks and calculates confidence per chunk
 */
export function generateConfidenceHeatmap(
  words: Array<{ confidence?: number }>,
  chunkSize: number = 100
): Array<{
  start_index: number;
  end_index: number;
  avg_confidence: number;
  color: string;
}> {
  const heatmap: Array<{
    start_index: number;
    end_index: number;
    avg_confidence: number;
    color: string;
  }> = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    const sum = chunk.reduce((acc, w) => acc + (w.confidence ?? 1), 0);
    const avg = chunk.length > 0 ? sum / chunk.length : 1;

    // Determine color based on confidence
    let color = 'green';
    if (avg < 0.7) color = 'red';
    else if (avg < 0.85) color = 'yellow';

    heatmap.push({
      start_index: i,
      end_index: Math.min(i + chunkSize - 1, words.length - 1),
      avg_confidence: Math.round(avg * 1000) / 1000,
      color,
    });
  }

  return heatmap;
}

/**
 * Categorize a flagged word based on its content
 * Used for analytics breakdown
 */
export function categorizeWord(word: string): string {
  // Medical terms (basic heuristics - can be enhanced with dictionary)
  const medicalPatterns = [
    /lumbar/i,
    /cervical/i,
    /thoracic/i,
    /fracture/i,
    /surgery/i,
    /diagnosis/i,
    /treatment/i,
    /medication/i,
    /spine/i,
    /vertebra/i,
  ];
  if (medicalPatterns.some((pattern) => pattern.test(word))) {
    return 'medical';
  }

  // Numbers and dates
  if (/\d/.test(word)) {
    return 'numbers_dates';
  }

  // Proper nouns (capitalized words)
  if (word[0] === word[0].toUpperCase() && word.length > 1) {
    return 'proper_nouns';
  }

  return 'general';
}
