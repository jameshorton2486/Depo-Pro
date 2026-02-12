// lib/config/features.ts
// Security Audit D.13 - Feature Flag Guardrails
// Kill switch without redeployment

/**
 * Feature flags for toggling functionality via environment variables
 *
 * Usage in routes:
 * ```ts
 * if (!FEATURES.MEDICAL_CHRONOLOGY) {
 *   return NextResponse.json(
 *     { error: 'Medical chronology is temporarily disabled' },
 *     { status: 503 }
 *   );
 * }
 * ```
 *
 * Toggle in Vercel:
 * - Go to Settings → Environment Variables
 * - Add: ENABLE_MEDICAL_CHRONOLOGY=false
 * - Restart (no redeploy needed)
 */
export const FEATURES = {
  /**
   * Phase 10: Medical Chronology
   * - Upload medical records (PDFs)
   * - AI extraction via Anthropic
   * - Timeline view + DOCX export
   */
  MEDICAL_CHRONOLOGY: process.env.ENABLE_MEDICAL_CHRONOLOGY !== 'false',

  /**
   * Transcript Export (DOCX/PDF)
   * Disable if export server is overwhelmed
   */
  TRANSCRIPT_EXPORT: process.env.ENABLE_EXPORT !== 'false',

  /**
   * AI Extraction (Anthropic Claude)
   * Disable if API quota exceeded or cost limit reached
   */
  AI_EXTRACTION: process.env.ENABLE_AI_EXTRACTION !== 'false',

  /**
   * Deepgram Transcription
   * Disable if Deepgram API issues or cost overrun
   */
  TRANSCRIPTION: process.env.ENABLE_TRANSCRIPTION !== 'false',

  /**
   * Demand Builder (Future feature - off by default)
   */
  DEMAND_BUILDER: process.env.ENABLE_DEMAND_BUILDER === 'true',

  /**
   * Real-time Collaboration (Future feature - off by default)
   */
  REALTIME_COLLAB: process.env.ENABLE_REALTIME === 'true',

  /**
   * Exhibit Management
   */
  EXHIBITS: process.env.ENABLE_EXHIBITS !== 'false',

  /**
   * Vocabulary Management
   */
  VOCABULARY: process.env.ENABLE_VOCABULARY !== 'false',

  /**
   * Job Sharing (share transcripts with attorneys)
   */
  JOB_SHARING: process.env.ENABLE_SHARING !== 'false',
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}

/**
 * Get disabled features (for status page)
 */
export function getDisabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature);
}

/**
 * Feature-specific error message
 */
export function getFeatureDisabledMessage(feature: keyof typeof FEATURES): string {
  const messages: Record<keyof typeof FEATURES, string> = {
    MEDICAL_CHRONOLOGY: 'Medical chronology feature is temporarily disabled for maintenance',
    TRANSCRIPT_EXPORT: 'Transcript export is temporarily disabled',
    AI_EXTRACTION: 'AI extraction is temporarily disabled',
    TRANSCRIPTION: 'Transcription service is temporarily disabled',
    DEMAND_BUILDER: 'Demand builder is not yet available',
    REALTIME_COLLAB: 'Real-time collaboration is not yet available',
    EXHIBITS: 'Exhibit management is temporarily disabled',
    VOCABULARY: 'Vocabulary management is temporarily disabled',
    JOB_SHARING: 'Job sharing is temporarily disabled',
  };

  return messages[feature] || 'This feature is temporarily disabled';
}
