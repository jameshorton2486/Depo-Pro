// =============================================================================
// CONFIDENCE ANALYSIS SERVICE
// =============================================================================
// Location: lib/services/confidence-analysis-service.ts
// Phase: 2 - Pipeline Orchestration
// Fixes: B3 (confidence stats not persisted)
//
// CRITICAL PRINCIPLE:
// Confidence statistics MUST be persisted centrally for:
// 1. RX escalation decisions
// 2. Billing justification
// 3. QA audits
// 4. Scopist workload estimation
// =============================================================================

import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ConfidenceStats {
  totalWords: number;
  wordsBelow90: number;
  wordsBelow80: number;
  wordsBelow70: number;
  wordsBelow50: number;  // Inaudible
  percentBelow90: number;
  percentBelow80: number;
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  speakerBreakdown?: Record<number, {
    wordCount: number;
    averageConfidence: number;
  }>;
}

export interface WordData {
  word: string;
  confidence: number;
  speaker?: number;
  start: number;
  end: number;
}

// -----------------------------------------------------------------------------
// Calculate Confidence Statistics
// -----------------------------------------------------------------------------

export function calculateConfidenceStats(words: WordData[]): ConfidenceStats {
  if (words.length === 0) {
    return {
      totalWords: 0,
      wordsBelow90: 0,
      wordsBelow80: 0,
      wordsBelow70: 0,
      wordsBelow50: 0,
      percentBelow90: 0,
      percentBelow80: 0,
      averageConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0,
    };
  }

  // Count words at different thresholds
  let wordsBelow90 = 0;
  let wordsBelow80 = 0;
  let wordsBelow70 = 0;
  let wordsBelow50 = 0;
  let totalConfidence = 0;
  let minConfidence = 1;
  let maxConfidence = 0;

  // Speaker breakdown
  const speakerStats: Record<number, { total: number; sum: number }> = {};

  for (const word of words) {
    const conf = word.confidence;
    totalConfidence += conf;

    if (conf < 0.9) wordsBelow90++;
    if (conf < 0.8) wordsBelow80++;
    if (conf < 0.7) wordsBelow70++;
    if (conf < 0.5) wordsBelow50++;

    if (conf < minConfidence) minConfidence = conf;
    if (conf > maxConfidence) maxConfidence = conf;

    // Track by speaker
    if (word.speaker !== undefined) {
      if (!speakerStats[word.speaker]) {
        speakerStats[word.speaker] = { total: 0, sum: 0 };
      }
      speakerStats[word.speaker].total++;
      speakerStats[word.speaker].sum += conf;
    }
  }

  const totalWords = words.length;
  const averageConfidence = totalConfidence / totalWords;

  // Build speaker breakdown
  const speakerBreakdown: Record<number, { wordCount: number; averageConfidence: number }> = {};
  for (const [speaker, stats] of Object.entries(speakerStats)) {
    speakerBreakdown[Number(speaker)] = {
      wordCount: stats.total,
      averageConfidence: stats.sum / stats.total,
    };
  }

  return {
    totalWords,
    wordsBelow90,
    wordsBelow80,
    wordsBelow70,
    wordsBelow50,
    percentBelow90: (wordsBelow90 / totalWords) * 100,
    percentBelow80: (wordsBelow80 / totalWords) * 100,
    averageConfidence,
    minConfidence,
    maxConfidence,
    speakerBreakdown: Object.keys(speakerBreakdown).length > 0 ? speakerBreakdown : undefined,
  };
}

// -----------------------------------------------------------------------------
// Persist Confidence Stats to Database
// -----------------------------------------------------------------------------

export async function persistConfidenceStats(
  jobId: string,
  transcriptionId: string,
  words: WordData[]
): Promise<ConfidenceStats> {
  const stats = calculateConfidenceStats(words);

  // Update transcription with stats
  await db.transcription.update({
    where: { id: transcriptionId },
    data: {
      wordCount: stats.totalWords,
      flaggedWordCount: stats.wordsBelow90, // Using 90% as the threshold
      averageConfidence: stats.averageConfidence,
    },
  });

  // Create audit log
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { firmId: true },
  });

  await db.auditLog.create({
    data: {
      action: 'transcription.confidence_analyzed',
      targetType: 'transcription',
      targetId: transcriptionId,
      firmId: job?.firmId || undefined,
      metadata: {
        jobId,
        totalWords: stats.totalWords,
        wordsBelow90: stats.wordsBelow90,
        percentBelow90: stats.percentBelow90.toFixed(2),
        averageConfidence: stats.averageConfidence.toFixed(4),
        analyzedAt: new Date().toISOString(),
      },
    },
  });

  console.log(`📊 Confidence stats persisted for job ${jobId}:`);
  console.log(`   Total words: ${stats.totalWords}`);
  console.log(`   Words < 90%: ${stats.wordsBelow90} (${stats.percentBelow90.toFixed(1)}%)`);
  console.log(`   Average: ${(stats.averageConfidence * 100).toFixed(1)}%`);

  return stats;
}

// -----------------------------------------------------------------------------
// Get Confidence Stats for Job
// -----------------------------------------------------------------------------

export async function getConfidenceStatsForJob(jobId: string): Promise<ConfidenceStats | null> {
  const transcription = await db.transcription.findUnique({
    where: { jobId },
    select: {
      wordCount: true,
      flaggedWordCount: true,
      averageConfidence: true,
      words: true,
    },
  });

  if (!transcription) {
    return null;
  }

  // If we have stored stats, return them
  if (
    transcription.wordCount !== null &&
    transcription.flaggedWordCount !== null &&
    transcription.averageConfidence !== null
  ) {
    // Reconstruct from stored values
    const totalWords = transcription.wordCount;
    const wordsBelow90 = transcription.flaggedWordCount;

    return {
      totalWords,
      wordsBelow90,
      wordsBelow80: 0, // Not stored separately
      wordsBelow70: 0,
      wordsBelow50: 0,
      percentBelow90: (wordsBelow90 / totalWords) * 100,
      percentBelow80: 0,
      averageConfidence: transcription.averageConfidence,
      minConfidence: 0, // Would need to recalculate
      maxConfidence: 1,
    };
  }

  // If not stored, calculate from words array
  if (transcription.words) {
    const words = transcription.words as unknown as WordData[];
    return calculateConfidenceStats(words);
  }

  return null;
}

// -----------------------------------------------------------------------------
// Determine Review Recommendation
// -----------------------------------------------------------------------------

export interface ReviewRecommendation {
  needsReview: boolean;
  reviewType: 'NONE' | 'CONFIDENCE_BASED' | 'FULL_REVIEW';
  estimatedReviewWords: number;
  estimatedReviewMinutes: number;
  reason: string;
}

export function getReviewRecommendation(stats: ConfidenceStats): ReviewRecommendation {
  // Thresholds
  const NEEDS_REVIEW_THRESHOLD = 5; // >5% flagged needs review
  const FULL_REVIEW_THRESHOLD = 25; // >25% flagged needs full review
  const WORDS_PER_MINUTE_REVIEW = 50; // Estimated review speed

  // No review needed
  if (stats.percentBelow90 < NEEDS_REVIEW_THRESHOLD && stats.wordsBelow50 === 0) {
    return {
      needsReview: false,
      reviewType: 'NONE',
      estimatedReviewWords: 0,
      estimatedReviewMinutes: 0,
      reason: `Only ${stats.percentBelow90.toFixed(1)}% of words need review`,
    };
  }

  // Full review recommended
  if (stats.percentBelow90 >= FULL_REVIEW_THRESHOLD || stats.wordsBelow50 > 10) {
    const estimatedMinutes = Math.ceil(stats.totalWords / WORDS_PER_MINUTE_REVIEW);
    return {
      needsReview: true,
      reviewType: 'FULL_REVIEW',
      estimatedReviewWords: stats.totalWords,
      estimatedReviewMinutes: estimatedMinutes,
      reason: `${stats.percentBelow90.toFixed(1)}% flagged + ${stats.wordsBelow50} inaudible words`,
    };
  }

  // Confidence-based review
  const estimatedMinutes = Math.ceil(stats.wordsBelow90 / WORDS_PER_MINUTE_REVIEW);
  return {
    needsReview: true,
    reviewType: 'CONFIDENCE_BASED',
    estimatedReviewWords: stats.wordsBelow90,
    estimatedReviewMinutes: estimatedMinutes,
    reason: `${stats.wordsBelow90} words below 90% confidence`,
  };
}

// -----------------------------------------------------------------------------
// Calculate Review Progress
// -----------------------------------------------------------------------------

export async function calculateReviewProgress(jobId: string): Promise<{
  totalFlagged: number;
  reviewed: number;
  remaining: number;
  percentComplete: number;
}> {
  const transcription = await db.transcription.findUnique({
    where: { jobId },
    include: {
      edits: {
        where: {
          editType: 'WORD_CORRECTION',
        },
      },
    },
  });

  if (!transcription) {
    return { totalFlagged: 0, reviewed: 0, remaining: 0, percentComplete: 0 };
  }

  const totalFlagged = transcription.flaggedWordCount || 0;
  
  // Count edits as reviewed words
  const reviewed = transcription.edits.length;
  
  // Calculate remaining (but don't go negative)
  const remaining = Math.max(0, totalFlagged - reviewed);
  
  // Calculate percentage
  const percentComplete = totalFlagged > 0 
    ? Math.min(100, (reviewed / totalFlagged) * 100)
    : 100;

  return {
    totalFlagged,
    reviewed,
    remaining,
    percentComplete,
  };
}
