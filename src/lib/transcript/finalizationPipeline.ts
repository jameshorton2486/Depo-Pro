/**
 * Stage 1 finalization pipeline (DTAS Stage 1 — Normalization & Canonical).
 *
 * Pure composition of the recognition MERGE + canonical-INTEGRITY gate,
 * extracted from the Deepgram webhook (`transcribe-callback`) so that it is:
 *   - unit-testable in isolation, and
 *   - reusable by the Cloud Run finalize worker (Roadmap Phase 2) and the
 *     stuck-transcript recovery path (Roadmap Phase 3) without re-running
 *     Deepgram.
 *
 * This module performs NO I/O. Downloading the stored chunk responses and
 * per-source normalization happen at the I/O boundary and are passed in as
 * already-normalized `SourceTranscriptSegment`s. This function then merges the
 * segments into a single canonical transcript and runs the integrity audit.
 *
 * DTAS alignment:
 *   - Law 3 (recognition immutable): consumes normalized recognition, never
 *     rewrites it — merge only re-sequences ids and reconciles chunk seams.
 *   - Law 4 (no information discarded): the merge preserves every word.
 *   - Stage 1 boundary: emits the canonical transcript + an explicit integrity
 *     verdict; persistence (ingest) is a separate concern downstream.
 */

import { auditCanonicalTranscript, type CanonicalIntegrityResult } from "./canonicalIntegrity.ts";
import {
  mergeSourceTranscriptSegments,
  type MergedSourceSegment,
  type SourceTranscriptSegment,
} from "./multifileMerge.ts";
import type { NormalizedTranscriptData } from "./normalize.ts";

export interface FinalizationResult {
  /** The merged canonical transcript (words / utterances / speakers). */
  normalized: NormalizedTranscriptData;
  /** Per-source merge metadata (time offsets and durations). */
  segments: MergedSourceSegment[];
  /** Full integrity-audit outcome (failures, warnings, metrics). */
  integrity: CanonicalIntegrityResult;
  /** Convenience: true when every integrity gate passed. */
  integrityPassed: boolean;
}

export interface FinalizationOptions {
  /** Threshold (seconds) above which auto-chunk seam checks apply. */
  autoChunkThresholdSeconds?: number;
}

/**
 * Merge already-normalized source segments into one canonical transcript and
 * run the canonical-integrity audit. Deterministic and side-effect free.
 *
 * The caller is responsible for providing segments in transcript order
 * (`source_index` ascending); the merge honors that order.
 *
 * @throws if no source segments are provided — finalizing with nothing to
 * finalize is a programming error, not a transcript that "passes empty".
 */
export function finalizeTranscript(
  sources: readonly SourceTranscriptSegment[],
  options: FinalizationOptions = {},
): FinalizationResult {
  if (sources.length === 0) {
    throw new Error("finalizeTranscript requires at least one source segment");
  }

  const merged = mergeSourceTranscriptSegments([...sources]);
  const integrity = auditCanonicalTranscript({
    normalized: merged.normalized,
    segments: merged.segments,
    autoChunkThresholdSeconds: options.autoChunkThresholdSeconds,
  });

  return {
    normalized: merged.normalized,
    segments: merged.segments,
    integrity,
    integrityPassed: integrity.integrity_passed,
  };
}
