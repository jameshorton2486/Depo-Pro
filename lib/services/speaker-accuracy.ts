// lib/services/speaker-accuracy.ts
// Accuracy Intelligence Plan - Step 5: Speaker Accuracy Tracking
// Track per-speaker confidence variance, correction rates, and audio quality

export interface SpeakerAccuracyProfile {
  speakerLabel: string;
  wordCount: number;
  avgConfidence: number;
  flaggedCount: number;
  flaggedPct: number;
  correctionRate: number; // % of flagged words that needed correction
  confidenceVariance: number; // how stable is confidence for this speaker
  switchFrequency: number; // speaker changes per minute
  recommendation: string | null;
}

/**
 * Analyze accuracy metrics per speaker
 *
 * Surfaces audio quality issues that affect specific speakers:
 * - Mumbling, accent, background noise
 * - Poor phone connection quality
 * - Microphone issues
 *
 * If one speaker consistently has low confidence, suggest manual verification
 * or re-labeling.
 *
 * @param allWords - All transcript words with speaker labels
 * @param corrections - Corrections made during review
 * @param audioDuration - Total audio duration in seconds (for switch frequency)
 * @returns Per-speaker accuracy profiles
 */
export function analyzeSpeakerAccuracy(
  allWords: Array<{
    word: string;
    confidence: number;
    speaker_label: string;
    start_time: number;
  }>,
  corrections: Array<{
    word_index: number;
    speaker_label: string;
    action: string;
  }>,
  audioDuration?: number
): SpeakerAccuracyProfile[] {
  if (allWords.length === 0) {
    return [];
  }

  // Group words by speaker
  const bySpeaker: Record<string, typeof allWords> = {};
  for (const w of allWords) {
    const key = w.speaker_label || 'UNKNOWN';
    if (!bySpeaker[key]) {
      bySpeaker[key] = [];
    }
    bySpeaker[key].push(w);
  }

  // Group corrections by speaker
  const correctionsBySpeaker: Record<string, typeof corrections> = {};
  for (const c of corrections) {
    const key = c.speaker_label || 'UNKNOWN';
    if (!correctionsBySpeaker[key]) {
      correctionsBySpeaker[key] = [];
    }
    correctionsBySpeaker[key].push(c);
  }

  // Calculate speaker switch frequency (if duration provided)
  const speakerSwitches = calculateSpeakerSwitches(allWords);
  const switchFrequencyPerMinute = audioDuration
    ? (speakerSwitches / audioDuration) * 60
    : 0;

  // Build profiles for each speaker
  return Object.entries(bySpeaker).map(([speaker, words]) => {
    // Calculate average confidence
    const confs = words.map(w => w.confidence);
    const avg = confs.reduce((a, b) => a + b, 0) / confs.length;

    // Calculate confidence variance (stability)
    const variance =
      confs.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / confs.length;

    // Count flagged words (< 0.85)
    const flagged = words.filter(w => w.confidence < 0.85).length;

    // Get corrections for this speaker
    const speakerCorrections = correctionsBySpeaker[speaker] || [];
    const corrected = speakerCorrections.filter(
      c => c.action === 'CORRECTED'
    ).length;
    const correctionRate = flagged > 0 ? corrected / flagged : 0;

    // Generate recommendation based on metrics
    let recommendation: string | null = null;

    if (avg < 0.7) {
      recommendation =
        'Very low confidence. Consider manual verification of all segments.';
    } else if (correctionRate > 0.5) {
      recommendation =
        'High correction rate. Audio quality may be poor for this speaker.';
    } else if (variance > 0.05) {
      recommendation =
        'Inconsistent confidence. Check for background noise or mic issues.';
    } else if (avg < 0.8 && flagged > 10) {
      recommendation = 'Multiple low-confidence segments. Review carefully.';
    }

    return {
      speakerLabel: speaker,
      wordCount: words.length,
      avgConfidence: Math.round(avg * 1000) / 10,
      flaggedCount: flagged,
      flaggedPct: Math.round((flagged / words.length) * 1000) / 10,
      correctionRate: Math.round(correctionRate * 1000) / 10,
      confidenceVariance: Math.round(variance * 10000) / 100,
      switchFrequency: Math.round(switchFrequencyPerMinute * 10) / 10,
      recommendation,
    };
  });
}

/**
 * Calculate speaker switch frequency
 * Counts how many times the speaker changes throughout the transcript
 */
function calculateSpeakerSwitches(
  words: Array<{ speaker_label: string }>
): number {
  let switches = 0;
  let prevSpeaker = '';

  for (const w of words) {
    const currentSpeaker = w.speaker_label || 'UNKNOWN';
    if (prevSpeaker && currentSpeaker !== prevSpeaker) {
      switches++;
    }
    prevSpeaker = currentSpeaker;
  }

  return switches;
}

/**
 * Find the speaker with the most quality issues
 */
export function findProblematicSpeaker(
  profiles: SpeakerAccuracyProfile[]
): SpeakerAccuracyProfile | null {
  if (profiles.length === 0) return null;

  // Score based on: low confidence, high variance, high correction rate
  const scored = profiles.map(p => ({
    profile: p,
    score:
      (1 - p.avgConfidence / 100) * 40 + // low confidence (40%)
      p.confidenceVariance * 30 + // high variance (30%)
      p.correctionRate * 30, // high correction rate (30%)
  }));

  // Return speaker with highest problem score
  scored.sort((a, b) => b.score - a.score);
  return scored[0].profile;
}

/**
 * Get summary statistics across all speakers
 */
export function getSpeakerAccuracySummary(
  profiles: SpeakerAccuracyProfile[]
): {
  totalSpeakers: number;
  avgConfidence: number;
  avgCorrectionRate: number;
  speakersWithIssues: number;
} {
  if (profiles.length === 0) {
    return {
      totalSpeakers: 0,
      avgConfidence: 0,
      avgCorrectionRate: 0,
      speakersWithIssues: 0,
    };
  }

  const totalConf = profiles.reduce((sum, p) => sum + p.avgConfidence, 0);
  const totalCorrRate = profiles.reduce((sum, p) => sum + p.correctionRate, 0);
  const withIssues = profiles.filter(p => p.recommendation !== null).length;

  return {
    totalSpeakers: profiles.length,
    avgConfidence: Math.round((totalConf / profiles.length) * 10) / 10,
    avgCorrectionRate: Math.round((totalCorrRate / profiles.length) * 10) / 10,
    speakersWithIssues: withIssues,
  };
}
