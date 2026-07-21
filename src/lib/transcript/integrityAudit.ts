import type { DeepgramResponse } from "./types";

const REQUIRED_TOP_LEVEL_KEYS = ["results", "metadata"] as const;
const REQUIRED_UTTERANCE_KEYS = ["id", "start", "end", "confidence", "speaker", "words", "transcript"] as const;
const REQUIRED_WORD_KEYS = ["word", "start", "end", "confidence", "speaker"] as const;
const GAP_WARNING_SECONDS = 30;
const GAP_CRITICAL_SECONDS = 120;
const GAP_VERY_LARGE_SECONDS = 240;
const OVERLAP_IGNORE_SECONDS = 0.1;
const OVERLAP_WARNING_SECONDS = 1.5;
const OVERLAP_ELEVATED_WARNING_SECONDS = 3.0;
const LOW_CONFIDENCE_THRESHOLD = 0.7;
const LOW_CONFIDENCE_RATE_WARNING = 0.4;
const DIARIZATION_COLLAPSE_PCT = 85;
const OFF_RECORD_PATTERN = /\b(off the record|off record|back on the record|on the record|recess|break)\b/i;
const REMOTE_INTERRUPTION_PATTERN = /\b(zoom|technical (?:issue|difficulty|problem)|connection|disconnected|reconnect|muted|unmuted|can you hear me|audio cut out)\b/i;

type AuditSeverity = "warning" | "critical";

export interface IntegrityAuditResult {
  integrity_passed: boolean;
  word_count: number;
  utterance_count: number;
  speaker_ids_found: string[];
  confidence_stats: {
    mean: number;
    p10: number;
    p50: number;
    p90: number;
    low_confidence_rate: number;
  };
  gaps: Array<{ position: number; duration_seconds: number; severity: AuditSeverity }>;
  failures: string[];
  warnings: string[];
  metrics: Record<string, unknown>;
}

export interface IntegrityAuditOptions {
  expectedSpeakerCount?: number | null;
}


type AuditWord = {
  id?: string;
  word?: string;
  start?: number;
  end?: number;
  confidence?: number;
  speaker?: number | string | null;
};

type AuditUtterance = {
  id?: string;
  start?: number;
  end?: number;
  confidence?: number;
  speaker?: number | string | null;
  words?: AuditWord[];
  transcript?: string;
};

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }

  const index = Math.min(values.length - 1, Math.floor(values.length * fraction));
  return values[index] ?? 0;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function extractUtterances(response: DeepgramResponse): AuditUtterance[] {
  const results = (response as Partial<DeepgramResponse>).results;
  return results && Array.isArray(results.utterances) ? results.utterances : [];
}

function hasOffRecordContext(previous: AuditUtterance | undefined, current: AuditUtterance | undefined): boolean {
  const context = `${previous?.transcript ?? ""} ${current?.transcript ?? ""}`;
  return OFF_RECORD_PATTERN.test(context);
}

function hasNearbyOffRecordEvidence(utterances: AuditUtterance[], index: number, windowRadius = 2): boolean {
  const start = Math.max(0, index - windowRadius);
  const end = Math.min(utterances.length - 1, index + windowRadius);

  for (let cursor = start; cursor <= end; cursor += 1) {
    const transcript = utterances[cursor]?.transcript ?? "";
    if (OFF_RECORD_PATTERN.test(transcript) || REMOTE_INTERRUPTION_PATTERN.test(transcript)) {
      return true;
    }
  }

  return false;
}

function countAudibleWords(utterance: AuditUtterance | undefined): number {
  return (utterance?.words ?? []).filter((word) => {
    const text = (word.word ?? "").trim();
    return text.length > 0;
  }).length;
}

function looksStructurallyHealthy(utterance: AuditUtterance | undefined): boolean {
  if (!utterance) {
    return false;
  }

  const start = utterance.start ?? 0;
  const end = utterance.end ?? 0;
  const duration = Math.max(0, end - start);
  const transcript = (utterance.transcript ?? "").trim();
  const confidence = typeof utterance.confidence === "number" ? utterance.confidence : 0;
  const audibleWordCount = countAudibleWords(utterance);

  return transcript.length > 0
    && audibleWordCount >= 2
    && duration >= 0.5
    && confidence >= 0.5;
}

function hasSilentRecessShape(previous: AuditUtterance | undefined, current: AuditUtterance | undefined, gapSeconds: number): boolean {
  return gapSeconds >= GAP_CRITICAL_SECONDS
    && gapSeconds < 600
    && looksStructurallyHealthy(previous)
    && looksStructurallyHealthy(current);
}

function classifyOverlap(overlapSeconds: number): "ignore" | "warning" | "elevated_warning" | "failure" {
  const normalizedOverlap = roundMetric(overlapSeconds);
  if (normalizedOverlap <= OVERLAP_IGNORE_SECONDS) {
    return "ignore";
  }
  if (normalizedOverlap <= OVERLAP_WARNING_SECONDS) {
    return "warning";
  }
  if (normalizedOverlap <= OVERLAP_ELEVATED_WARNING_SECONDS) {
    return "elevated_warning";
  }
  return "failure";
}

export function integrityAudit(
  rawDeepgramJson: DeepgramResponse,
  options: IntegrityAuditOptions = {},
): IntegrityAuditResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const gaps: IntegrityAuditResult["gaps"] = [];

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in rawDeepgramJson)) {
      failures.push(`Missing top-level key '${key}'.`);
    }
  }

  const results = rawDeepgramJson.results as Record<string, unknown> | undefined;
  if (!results || !Array.isArray(results.channels)) {
    failures.push("Missing results.channels array.");
  }
  if (!results || !Array.isArray(results.utterances)) {
    failures.push("Missing results.utterances array.");
  }

  const utterances = extractUtterances(rawDeepgramJson);
  if (utterances.length === 0) {
    failures.push("No utterances found.");
  }

  utterances.slice(0, 5).forEach((utterance, utteranceIndex) => {
    for (const key of REQUIRED_UTTERANCE_KEYS) {
      if (!(key in utterance)) {
        failures.push(`Utterance[${utteranceIndex}] missing key '${key}'.`);
      }
    }

    (utterance.words ?? []).slice(0, 3).forEach((word, wordIndex) => {
      for (const key of REQUIRED_WORD_KEYS) {
        if (!(key in word)) {
          failures.push(`Word[${utteranceIndex}][${wordIndex}] missing key '${key}'.`);
        }
      }
    });
  });

  const speakerWordCounts = new Map<string, number>();
  const confidences: number[] = [];
  const duplicateWordIds = new Set<string>();
  const seenWordIds = new Set<string>();

  utterances.forEach((utterance, utteranceIndex) => {
    const speakerValue = utterance.speaker;
    if (speakerValue === null || speakerValue === undefined || speakerValue === "") {
      failures.push(`Utterance[${utteranceIndex}] has no speaker ID assigned.`);
    }

    const speakerId = speakerValue == null ? null : String(speakerValue);
    const words = utterance.words ?? [];
    if (speakerId) {
      speakerWordCounts.set(speakerId, (speakerWordCounts.get(speakerId) ?? 0) + words.length);
    }

    words.forEach((word, wordIndex) => {
      if (typeof word.confidence === "number") {
        confidences.push(word.confidence);
      }

      const fallbackWordId = `${word.start ?? "na"}_${word.word ?? "na"}_${utteranceIndex}_${wordIndex}`;
      const wordId = typeof word.id === "string" && word.id.length > 0 ? word.id : fallbackWordId;
      if (seenWordIds.has(wordId)) {
        duplicateWordIds.add(wordId);
      } else {
        seenWordIds.add(wordId);
      }
    });
  });

  if (duplicateWordIds.size > 0) {
    failures.push(`Duplicate word IDs found: ${[...duplicateWordIds].slice(0, 10).join(", ")}`);
  }

  const speakerIds = [...speakerWordCounts.keys()].sort();
  if (speakerIds.length < 2) {
    warnings.push(`Only ${speakerIds.length} distinct speaker(s) detected. Confirm this matches the proceeding.`);
  }
  if (options.expectedSpeakerCount != null && speakerIds.length !== options.expectedSpeakerCount) {
    warnings.push(
      `${speakerIds.length} speaker cluster(s) detected; ${options.expectedSpeakerCount} expected. Review speaker mapping.`,
    );
  }
  if (speakerIds.length > 8) {
    warnings.push(`${speakerIds.length} speaker clusters detected. Likely diarization fragmentation.`);
  }

  const totalWords = [...speakerWordCounts.values()].reduce((sum, count) => sum + count, 0);
  for (const [speakerId, count] of speakerWordCounts.entries()) {
    const pct = totalWords === 0 ? 0 : (count / totalWords) * 100;
    if (pct > DIARIZATION_COLLAPSE_PCT) {
      warnings.push(`Speaker ${speakerId} accounts for ${pct.toFixed(0)}% of all words. Possible diarization collapse.`);
    }
  }

  for (let index = 1; index < utterances.length; index += 1) {
    const previous = utterances[index - 1];
    const current = utterances[index];
    const prevStart = previous.start ?? 0;
    const currStart = current.start ?? 0;
    const prevEnd = previous.end ?? 0;
    const currEnd = current.end ?? 0;

    if (currStart < prevStart) {
      failures.push(`Utterance ordering violation between ${index - 1} and ${index}.`);
    }

    const overlap = prevEnd - currStart;
    const overlapSeverity = classifyOverlap(overlap);
    if (overlapSeverity === "warning") {
      warnings.push(`Minor overlap of ${overlap.toFixed(2)}s between utterances ${index - 1} and ${index}.`);
    } else if (overlapSeverity === "elevated_warning") {
      warnings.push(`Elevated overlap of ${overlap.toFixed(2)}s between utterances ${index - 1} and ${index}. Review timing around this boundary.`);
    } else if (overlapSeverity === "failure") {
      failures.push(`Impossible overlap of ${overlap.toFixed(2)}s between utterances ${index - 1} and ${index}.`);
    }

    const gap = currStart - prevEnd;
    if (gap >= GAP_CRITICAL_SECONDS) {
      if (
        hasOffRecordContext(previous, current)
        || (gap >= GAP_VERY_LARGE_SECONDS && hasNearbyOffRecordEvidence(utterances, index))
        || hasSilentRecessShape(previous, current, gap)
      ) {
        warnings.push(
          hasSilentRecessShape(previous, current, gap)
            ? `Gap of ${gap.toFixed(1)}s at utterance ${index}; long silent recess inferred from clean speech on both sides of the boundary.`
            : `Gap of ${gap.toFixed(1)}s at utterance ${index}; off-record language detected.`,
        );
        gaps.push({ position: index, duration_seconds: roundMetric(gap), severity: "warning" });
      } else {
        failures.push(`Critical gap of ${gap.toFixed(1)}s between utterances ${index - 1} and ${index}.`);
        gaps.push({ position: index, duration_seconds: roundMetric(gap), severity: "critical" });
      }
    } else if (gap >= GAP_WARNING_SECONDS) {
      warnings.push(`Gap of ${gap.toFixed(1)}s at utterance ${index}; likely off-record section.`);
      gaps.push({ position: index, duration_seconds: roundMetric(gap), severity: "warning" });
    }

    if (currEnd < currStart) {
      failures.push(`Utterance[${index}] ends before it starts.`);
    }
  }

  if (confidences.length === 0) {
    failures.push("No confidence scores found in any word.");
  }

  const sortedConfidences = [...confidences].sort((left, right) => left - right);
  const lowConfidenceCount = confidences.filter((value) => value < LOW_CONFIDENCE_THRESHOLD).length;
  const lowConfidenceRate = confidences.length === 0 ? 0 : lowConfidenceCount / confidences.length;
  if (lowConfidenceRate > LOW_CONFIDENCE_RATE_WARNING) {
    warnings.push(`${(lowConfidenceRate * 100).toFixed(0)}% of words are below 0.70 confidence.`);
  }

  const confidenceStats = {
    mean: confidences.length === 0 ? 0 : roundMetric(confidences.reduce((sum, value) => sum + value, 0) / confidences.length),
    p10: roundMetric(percentile(sortedConfidences, 0.1)),
    p50: roundMetric(percentile(sortedConfidences, 0.5)),
    p90: roundMetric(percentile(sortedConfidences, 0.9)),
    low_confidence_rate: roundMetric(lowConfidenceRate),
  };

  const integrityPassed = failures.length === 0;

  return {
    integrity_passed: integrityPassed,
    word_count: confidences.length,
    utterance_count: utterances.length,
    speaker_ids_found: speakerIds,
    confidence_stats: confidenceStats,
    gaps,
    failures,
    warnings,
    metrics: {
      engine: "integrity_audit",
      version: "v2.0",
      passed: integrityPassed,
      checks_run: 5,
      checks_passed: integrityPassed ? 5 : 5 - Math.min(failures.length, 5),
      word_count: confidences.length,
      utterance_count: utterances.length,
      speaker_count: speakerIds.length,
      speaker_ids: speakerIds,
      speaker_word_counts: Object.fromEntries(speakerWordCounts),
      confidence_stats: confidenceStats,
      timestamp_gaps: gaps,
      failures,
      warnings,
      pipeline_recommendation: integrityPassed ? "PROCEED" : "HALT — manual review required",
    },
  };
}
