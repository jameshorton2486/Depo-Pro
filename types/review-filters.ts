// types/review-filters.ts
// Feature 2: Smart Review Filters & Shortcuts
// Workflow Intelligence Plan - Phase A

export type ConfidenceSeverity = 'all' | 'critical' | 'low' | 'medium';
export type WordCategory = 'all' | 'medical' | 'proper_noun' | 'number_date' | 'general';

export interface ReviewFilters {
  severity: ConfidenceSeverity;
  category: WordCategory;
  status: 'all' | 'pending' | 'reviewed';
}

export const SEVERITY_THRESHOLDS: Record<ConfidenceSeverity, [number, number]> = {
  all: [0, 1],
  critical: [0, 0.5], // Very low confidence (<50%)
  low: [0.5, 0.7], // Low confidence (50-70%)
  medium: [0.7, 0.85], // Medium confidence (70-85%, near threshold)
};

/**
 * Keyboard shortcuts for review workflow
 * Shift + key combinations for faster navigation
 */
export const KEYBOARD_SHORTCUTS = {
  JUMP_TO_HIGHEST_RISK: { key: 'R', combo: 'Shift+R', label: 'Jump to Highest Risk' },
  FILTER_CRITICAL: { key: '!', combo: 'Shift+1', label: 'Show < 0.5 only' },
  FILTER_MEDICAL: { key: 'M', combo: 'Shift+M', label: 'Medical terms only' },
  FILTER_NUMBERS: { key: 'N', combo: 'Shift+N', label: 'Numbers/dates only' },
  FILTER_PROPER_NOUNS: { key: 'P', combo: 'Shift+P', label: 'Proper nouns only' },
  RESET_FILTERS: { key: 'A', combo: 'Shift+A', label: 'Reset all filters' },
} as const;
