// types/analytics.ts
// Feature Deep Dive v2: Type-safe analytics interfaces
// Enhancement 9: Defensive Type Safety

/**
 * Risk score calculation result
 * Computed by lib/services/risk-score.ts
 */
export interface RiskScoreResult {
  score: number; // 0-100
  label: string; // "Low Risk" | "Medium Risk" | "High Risk" | "Critical — Full Review Required"
  color: 'green' | 'yellow' | 'orange' | 'red';
  priority: 1 | 2 | 3 | 4; // For sorting (4 = highest priority)
}

/**
 * Category breakdown for flagged words
 * Shows distribution of correction types
 */
export interface CategoryBreakdown {
  medical: number; // % of corrections in medical terms
  proper_nouns: number; // % in names/places
  numbers_dates: number; // % in numbers/dates
  general: number; // % in common words
}

/**
 * Comprehensive confidence analytics
 * Computed by lib/services/confidence-analytics.ts
 */
export interface ConfidenceAnalytics {
  total_words: number;
  flagged_count: number;
  flagged_percentage: number; // 0-100, 1 decimal place
  avg_confidence: number; // 0-1, 3 decimal places
  category_breakdown: CategoryBreakdown;
  speaker_confidence: Record<string, number>; // speaker_id -> avg confidence
  risk_score: number; // Legacy field, prefer risk_score_result.score
}

/**
 * Transcription metadata structure
 * Stored in transcriptions.metadata JSONB column
 */
export interface TranscriptionMetadata {
  confidence_analytics?: ConfidenceAnalytics;
  risk_score_result?: RiskScoreResult;
  audio_quality_score?: number; // 0-1 from Deepgram
  computed_at?: string; // ISO timestamp
}

/**
 * Heatmap segment for confidence visualization
 */
export interface ConfidenceHeatmapSegment {
  start_index: number;
  end_index: number;
  avg_confidence: number;
  color: 'green' | 'yellow' | 'red';
}

/**
 * Risk score input parameters
 */
export interface RiskScoreInput {
  flagged_count: number;
  total_words: number;
  very_low_confidence_count: number; // words < 0.6
  speaker_change_count: number;
  audio_quality_score?: number; // 0-1
}

/**
 * Enhancement 1A: Firm-level baseline metrics
 * For adaptive risk scoring
 */
export interface FirmBaselineMetrics {
  firm_id: string;
  avg_flagged_percentage: number;
  avg_confidence: number;
  avg_risk_score: number;
  total_transcriptions: number;
  last_updated: string; // ISO timestamp
}

/**
 * Enhancement 1B: Reviewer feedback for self-improving risk model
 */
export interface ReviewerFeedback {
  transcription_id: string;
  reviewer_id: string;
  effort_label: 'low' | 'medium' | 'high';
  actual_review_time_seconds: number;
  risk_score_at_start: number;
  feedback_notes?: string;
  created_at: string;
}

/**
 * Enhancement 4A: Dashboard risk overview widget data
 */
export interface RiskOverview {
  total_jobs: number;
  high_risk_count: number;
  high_risk_percentage: number;
  medium_risk_count: number;
  medium_risk_percentage: number;
  low_risk_count: number;
  low_risk_percentage: number;
  avg_confidence_this_week: number;
  avg_confidence_last_week: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Flagged word category for filtering
 */
export type FlaggedWordCategory = 'all' | 'medical' | 'proper_nouns' | 'numbers_dates' | 'general' | 'very_low';

/**
 * Confidence threshold levels for inline highlighting
 */
export type ConfidenceLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Helper to get confidence level from score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return 'excellent';
  if (confidence >= 0.7) return 'good';
  if (confidence >= 0.5) return 'fair';
  if (confidence >= 0.3) return 'poor';
  return 'critical';
}

/**
 * Helper to get color for confidence level
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'excellent': return 'text-slate-900 dark:text-slate-100';
    case 'good': return 'text-slate-700 dark:text-slate-300';
    case 'fair': return 'text-yellow-600 dark:text-yellow-400';
    case 'poor': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400 underline decoration-red-500';
  }
}
