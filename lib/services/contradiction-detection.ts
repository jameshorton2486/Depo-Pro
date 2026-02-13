// lib/services/contradiction-detection.ts
// Accuracy Intelligence Plan - Step 4: Medical Contradiction Detection
// Phase A: Rule-based detection | Phase C: Claude-powered semantic analysis

export type ContradictionType =
  | 'TREATMENT_GAP'
  | 'DATE_MISMATCH'
  | 'PROVIDER_MISMATCH'
  | 'FREQUENCY_ANOMALY';

export type ContradictionSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ContradictionFlag {
  type: ContradictionType;
  severity: ContradictionSeverity;
  description: string;
  medical_reference?: {
    entry_id: string;
    date: string;
    summary: string;
  };
  transcript_reference?: {
    page?: number;
    line?: number;
    text: string;
  };
  confidence: number; // 0-1
}

export interface MedicalChronologyEntry {
  id: string;
  event_date: string;
  summary: string;
  category: string;
  provider?: string;
}

/**
 * Detect treatment gaps in medical chronology
 *
 * Defense attorneys will argue pre-existing condition if there's a 6+ month
 * gap between injury and first treatment.
 *
 * @param entries - Chronology entries sorted by date
 * @param gapThreshold - Days to consider a "gap" (default: 180)
 * @returns Detected treatment gaps
 */
export function detectTreatmentGaps(
  entries: MedicalChronologyEntry[],
  gapThreshold: number = 180
): ContradictionFlag[] {
  // Filter entries with valid dates
  const sorted = entries
    .filter(e => e.event_date && !isNaN(new Date(e.event_date).getTime()))
    .sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

  const flags: ContradictionFlag[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].event_date);
    const curr = new Date(sorted[i].event_date);

    const daysBetween = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysBetween > gapThreshold) {
      const severity: ContradictionSeverity =
        daysBetween > 365 ? 'HIGH' : 'MEDIUM';

      flags.push({
        type: 'TREATMENT_GAP',
        severity,
        description: `${daysBetween}-day gap between "${sorted[i - 1].summary.substring(0, 60)}..." (${sorted[i - 1].event_date}) and "${sorted[i].summary.substring(0, 60)}..." (${sorted[i].event_date})`,
        medical_reference: {
          entry_id: sorted[i].id,
          date: sorted[i].event_date,
          summary: sorted[i].summary,
        },
        confidence: 1.0, // Rule-based = high confidence
      });
    }
  }

  return flags;
}

/**
 * Detect frequency anomalies in treatment
 *
 * 12 visits in one week may indicate billing issues.
 * 1 year gap in ongoing treatment may indicate non-compliance.
 *
 * @param entries - Chronology entries
 * @returns Detected frequency anomalies
 */
export function detectFrequencyAnomalies(
  entries: MedicalChronologyEntry[]
): ContradictionFlag[] {
  const flags: ContradictionFlag[] = [];

  // Group by week
  const byWeek: Record<string, MedicalChronologyEntry[]> = {};

  for (const e of entries) {
    if (!e.event_date) continue;

    const d = new Date(e.event_date);
    if (isNaN(d.getTime())) continue;

    // Get week start (Sunday)
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];

    if (!byWeek[key]) {
      byWeek[key] = [];
    }
    byWeek[key].push(e);
  }

  // Flag weeks with unusually high visit count
  for (const [week, weekEntries] of Object.entries(byWeek)) {
    if (weekEntries.length >= 5) {
      const severity: ContradictionSeverity =
        weekEntries.length >= 8 ? 'HIGH' : 'MEDIUM';

      flags.push({
        type: 'FREQUENCY_ANOMALY',
        severity,
        description: `${weekEntries.length} medical events in week of ${week}. Unusually dense treatment cluster may indicate billing anomaly.`,
        confidence: 0.8, // Lower confidence - could be legitimate
      });
    }
  }

  return flags;
}

/**
 * Detect provider name mismatches
 *
 * If transcript mentions "Dr. Smith" but records show "Dr. Sanchez",
 * flag for manual verification.
 *
 * @param chronologyProviders - Providers from medical records
 * @param transcriptProviders - Providers mentioned in testimony
 * @returns Detected provider mismatches
 */
export function detectProviderMismatches(
  chronologyProviders: string[],
  transcriptProviders: string[]
): ContradictionFlag[] {
  const flags: ContradictionFlag[] = [];

  // Normalize provider names (lowercase, remove Dr./MD/etc)
  const normalizeProvider = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\b(dr|md|do|pa|np|dds|dpm|od)\b\.?/gi, '')
      .trim();
  };

  const chronologySet = new Set(
    chronologyProviders.map(normalizeProvider)
  );

  for (const transcriptProvider of transcriptProviders) {
    const normalized = normalizeProvider(transcriptProvider);

    // Exact match check
    if (!chronologySet.has(normalized)) {
      // Fuzzy match check (simple Levenshtein-like comparison)
      const closeMatch = Array.from(chronologySet).some(chronoProvider => {
        return fuzzyMatch(normalized, chronoProvider, 0.7);
      });

      if (!closeMatch) {
        flags.push({
          type: 'PROVIDER_MISMATCH',
          severity: 'MEDIUM',
          description: `Testimony mentions "${transcriptProvider}" but provider not found in medical records. Verify name accuracy.`,
          transcript_reference: {
            text: transcriptProvider,
          },
          confidence: 0.7, // Fuzzy matching = moderate confidence
        });
      }
    }
  }

  return flags;
}

/**
 * Simple fuzzy string matching
 * Returns true if strings are at least `threshold` similar (0-1)
 */
function fuzzyMatch(str1: string, str2: string, threshold: number): boolean {
  if (str1 === str2) return true;

  // Simple similarity: count matching characters
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return true;

  let matches = 0;
  const minLen = Math.min(str1.length, str2.length);

  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) matches++;
  }

  const similarity = matches / maxLen;
  return similarity >= threshold;
}

/**
 * Detect all contradictions across medical records and testimony
 *
 * @param chronologyEntries - Medical chronology entries
 * @param transcriptProviders - Providers mentioned in deposition
 * @returns All detected contradictions
 */
export function detectAllContradictions(
  chronologyEntries: MedicalChronologyEntry[],
  transcriptProviders: string[] = []
): ContradictionFlag[] {
  const flags: ContradictionFlag[] = [];

  // Treatment gap detection
  flags.push(...detectTreatmentGaps(chronologyEntries));

  // Frequency anomaly detection
  flags.push(...detectFrequencyAnomalies(chronologyEntries));

  // Provider mismatch detection
  if (transcriptProviders.length > 0) {
    const chronologyProviders = chronologyEntries
      .map(e => e.provider)
      .filter((p): p is string => !!p);

    flags.push(
      ...detectProviderMismatches(chronologyProviders, transcriptProviders)
    );
  }

  // Sort by severity (HIGH -> MEDIUM -> LOW)
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return flags;
}

/**
 * Get summary statistics for contradictions
 */
export function getContradictionSummary(flags: ContradictionFlag[]): {
  total: number;
  bySeverity: Record<ContradictionSeverity, number>;
  byType: Record<ContradictionType, number>;
  highestSeverity: ContradictionSeverity | null;
} {
  if (flags.length === 0) {
    return {
      total: 0,
      bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      byType: {
        TREATMENT_GAP: 0,
        DATE_MISMATCH: 0,
        PROVIDER_MISMATCH: 0,
        FREQUENCY_ANOMALY: 0,
      },
      highestSeverity: null,
    };
  }

  const bySeverity: Record<ContradictionSeverity, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  const byType: Record<ContradictionType, number> = {
    TREATMENT_GAP: 0,
    DATE_MISMATCH: 0,
    PROVIDER_MISMATCH: 0,
    FREQUENCY_ANOMALY: 0,
  };

  for (const flag of flags) {
    bySeverity[flag.severity]++;
    byType[flag.type]++;
  }

  const highestSeverity = bySeverity.HIGH > 0 ? 'HIGH' :
    bySeverity.MEDIUM > 0 ? 'MEDIUM' :
    bySeverity.LOW > 0 ? 'LOW' : null;

  return {
    total: flags.length,
    bySeverity,
    byType,
    highestSeverity,
  };
}

/**
 * Format contradiction flags for display
 */
export function formatContradictionFlag(flag: ContradictionFlag): string {
  const severityEmoji = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢',
  };

  return `${severityEmoji[flag.severity]} ${flag.type}: ${flag.description}`;
}

// ═══════════════════════════════════════════════════════════════
// PHASE C: CLAUDE-POWERED SEMANTIC ANALYSIS (Future)
// ═══════════════════════════════════════════════════════════════

/**
 * Placeholder for Phase C: Claude-powered semantic contradiction detection
 *
 * This will send transcript excerpts + chronology entries to Claude API
 * for semantic analysis of discrepancies.
 *
 * Example prompt:
 * "You are a legal medical records analyst. Compare the deposition testimony
 * excerpts below with the medical chronology. Identify any discrepancies in:
 * 1. Dates mentioned in testimony vs medical records
 * 2. Injuries described vs diagnoses coded
 * 3. Providers mentioned vs providers in records
 * 4. Treatment sequences that don't match timeline
 *
 * TESTIMONY EXCERPTS:
 * [extracted date/medical/provider entities from transcript]
 *
 * MEDICAL CHRONOLOGY:
 * [chronology entries with dates and summaries]
 *
 * For each discrepancy, provide:
 * - Type (DATE_MISMATCH, INJURY_DISCREPANCY, PROVIDER_MISMATCH)
 * - Severity (HIGH, MEDIUM, LOW)
 * - Description
 * - Confidence (0.0-1.0)"
 *
 * @param transcriptExcerpts - Relevant testimony excerpts
 * @param chronologyEntries - Medical chronology
 * @returns Claude-detected contradictions
 */
export async function detectContradictionsWithClaude(
  transcriptExcerpts: string[],
  chronologyEntries: MedicalChronologyEntry[]
): Promise<ContradictionFlag[]> {
  // TODO: Implement in Phase C after entity extraction is in place
  // This requires:
  // 1. Entity extraction from transcript (dates, medical terms, providers)
  // 2. Claude API integration
  // 3. Prompt engineering for medical record analysis
  // 4. Response parsing into ContradictionFlag format

  console.log('[Phase C] Claude-powered contradiction detection not yet implemented');
  console.log('Input:', { transcriptExcerpts: transcriptExcerpts.length, chronologyEntries: chronologyEntries.length });

  return [];
}
