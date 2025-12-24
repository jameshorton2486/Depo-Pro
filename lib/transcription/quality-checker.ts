/**
 * Transcription Quality Checker
 * Analyzes transcription quality and identifies segments needing review
 */

import type {
  TranscriptWord,
  FlaggedSegment,
  QualityReport,
  Utterance,
} from '@/types/deepgram';

// Configurable thresholds
const THRESHOLDS = {
  LOW_CONFIDENCE: parseFloat(process.env.LOW_CONFIDENCE_THRESHOLD || '0.85'),
  INAUDIBLE: 0.5,
  UNCLEAR: 0.7,
  HIGH_QUALITY: 95,
  ACCEPTABLE_QUALITY: 85,
  NEEDS_REVIEW_PERCENTAGE: 0.05, // 5% flagged = needs review
};

/**
 * Calculate comprehensive quality metrics for a transcription
 */
export function calculateQualityMetrics(
  words: TranscriptWord[],
  utterances?: Utterance[],
): QualityReport {
  if (words.length === 0) {
    return {
      overallConfidence: 0,
      lowConfidenceCount: 0,
      inaudibleCount: 0,
      qualityScore: 0,
      needsReview: true,
      flaggedSegments: [],
    };
  }

  // Calculate confidence distribution
  const confidenceSum = words.reduce((sum, w) => sum + w.confidence, 0);
  const overallConfidence = confidenceSum / words.length;

  // Count problematic words
  const lowConfidenceCount = words.filter(
    w => w.confidence < THRESHOLDS.LOW_CONFIDENCE && w.confidence >= THRESHOLDS.INAUDIBLE,
  ).length;

  const inaudibleCount = words.filter(
    w => w.confidence < THRESHOLDS.INAUDIBLE,
  ).length;

  // Extract flagged segments
  const flaggedSegments = extractFlaggedSegments(words);

  // Calculate quality score
  const totalProblematic = lowConfidenceCount + inaudibleCount;
  const qualityScore = ((words.length - totalProblematic) / words.length) * 100;

  // Determine if review is needed
  const needsReview =
    (totalProblematic / words.length) > THRESHOLDS.NEEDS_REVIEW_PERCENTAGE ||
    inaudibleCount > 0 ||
    qualityScore < THRESHOLDS.ACCEPTABLE_QUALITY;

  return {
    overallConfidence,
    lowConfidenceCount,
    inaudibleCount,
    qualityScore,
    needsReview,
    flaggedSegments,
  };
}

/**
 * Extract segments that need human review
 */
export function extractFlaggedSegments(words: TranscriptWord[]): FlaggedSegment[] {
  const segments: FlaggedSegment[] = [];
  let currentSegment: FlaggedSegment | null = null;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const needsFlag = word.confidence < THRESHOLDS.LOW_CONFIDENCE;

    if (needsFlag) {
      // Get context (words before and after)
      const contextStart = Math.max(0, i - 3);
      const contextEnd = Math.min(words.length, i + 4);
      const contextWords = words.slice(contextStart, contextEnd);
      const contextText = contextWords.map(w => w.word).join(' ');

      // Determine reason
      let reason: 'low_confidence' | 'inaudible' | 'unclear';
      if (word.confidence < THRESHOLDS.INAUDIBLE) {
        reason = 'inaudible';
      } else if (word.confidence < THRESHOLDS.UNCLEAR) {
        reason = 'unclear';
      } else {
        reason = 'low_confidence';
      }

      // Check if we can extend current segment (within 1 second)
      if (currentSegment && word.start - currentSegment.end < 1.0) {
        currentSegment.end = word.end;
        currentSegment.text = contextText;
        currentSegment.words.push(word);
        currentSegment.confidence = Math.min(currentSegment.confidence, word.confidence);
        // Upgrade reason if worse
        if (reason === 'inaudible') currentSegment.reason = 'inaudible';
        else if (reason === 'unclear' && currentSegment.reason === 'low_confidence') {
          currentSegment.reason = 'unclear';
        }
      } else {
        // Save previous segment and start new one
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          start: word.start,
          end: word.end,
          text: contextText,
          confidence: word.confidence,
          reason,
          words: [word],
          wordIndex: i,
          speaker: word.speaker,
        };
      }
    } else if (currentSegment) {
      // End current segment
      segments.push(currentSegment);
      currentSegment = null;
    }
  }

  // Don't forget last segment
  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Get quality grade based on score
 */
export function getQualityGrade(score: number): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
} {
  if (score >= 95) {
    return { grade: 'A', label: 'Excellent', color: 'green' };
  } else if (score >= 85) {
    return { grade: 'B', label: 'Good', color: 'blue' };
  } else if (score >= 75) {
    return { grade: 'C', label: 'Acceptable', color: 'yellow' };
  } else if (score >= 65) {
    return { grade: 'D', label: 'Needs Review', color: 'orange' };
  } else {
    return { grade: 'F', label: 'Poor Quality', color: 'red' };
  }
}

/**
 * Analyze speaker distribution and quality per speaker
 */
export function analyzeSpeakerQuality(utterances: Utterance[]): Map<number, {
  speakerId: number;
  utteranceCount: number;
  wordCount: number;
  totalDuration: number;
  avgConfidence: number;
  lowConfidenceWords: number;
}> {
  const speakerStats = new Map<number, {
    speakerId: number;
    utteranceCount: number;
    wordCount: number;
    totalDuration: number;
    totalConfidence: number;
    lowConfidenceWords: number;
  }>();

  for (const utt of utterances) {
    const existing = speakerStats.get(utt.speaker) || {
      speakerId: utt.speaker,
      utteranceCount: 0,
      wordCount: 0,
      totalDuration: 0,
      totalConfidence: 0,
      lowConfidenceWords: 0,
    };

    existing.utteranceCount++;
    existing.wordCount += utt.words.length;
    existing.totalDuration += utt.end - utt.start;

    for (const word of utt.words) {
      existing.totalConfidence += word.confidence;
      if (word.confidence < THRESHOLDS.LOW_CONFIDENCE) {
        existing.lowConfidenceWords++;
      }
    }

    speakerStats.set(utt.speaker, existing);
  }

  // Calculate averages
  const result = new Map();
  for (const [speakerId, stats] of speakerStats) {
    result.set(speakerId, {
      speakerId,
      utteranceCount: stats.utteranceCount,
      wordCount: stats.wordCount,
      totalDuration: stats.totalDuration,
      avgConfidence: stats.wordCount > 0 ? stats.totalConfidence / stats.wordCount : 0,
      lowConfidenceWords: stats.lowConfidenceWords,
    });
  }

  return result;
}

/**
 * Generate quality summary for display
 */
export function generateQualitySummary(report: QualityReport): string {
  const grade = getQualityGrade(report.qualityScore);
  const lines: string[] = [];

  lines.push(`Quality Grade: ${grade.grade} (${grade.label})`);
  lines.push(`Quality Score: ${report.qualityScore.toFixed(1)}%`);
  lines.push(`Overall Confidence: ${(report.overallConfidence * 100).toFixed(1)}%`);
  lines.push('');

  if (report.lowConfidenceCount > 0 || report.inaudibleCount > 0) {
    lines.push('Issues Found:');
    if (report.lowConfidenceCount > 0) {
      lines.push(`  • ${report.lowConfidenceCount} low-confidence words`);
    }
    if (report.inaudibleCount > 0) {
      lines.push(`  • ${report.inaudibleCount} inaudible segments`);
    }
    lines.push(`  • ${report.flaggedSegments.length} segments flagged for review`);
  } else {
    lines.push('No issues found - excellent audio quality!');
  }

  if (report.needsReview) {
    lines.push('');
    lines.push('⚠️ Scopist review recommended');
  }

  return lines.join('\n');
}

export default {
  calculateQualityMetrics,
  extractFlaggedSegments,
  getQualityGrade,
  analyzeSpeakerQuality,
  generateQualitySummary,
};
