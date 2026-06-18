import type { DeepgramResponse } from "./types";
import type { NormalizedTranscriptData } from "./normalize";

export const LATEST_ASSEMBLY_VERSION = "2026-06-15-assembly-attribution-preservation";
export const CURRENT_ASSEMBLY_VERSION = "persisted-transcript-state";

export interface ReassemblyMetrics {
  mixedCanonicalUtterances: number;
  utteranceCount: number;
  speakerCount: number;
  wordCount: number;
}

export type HumanWorkSignal =
  | "edited-words"
  | "review-progress"
  | "speaker-resolution"
  | "workspace-audit-history";

export interface HumanWorkSummary {
  hasHumanWork: boolean;
  signals: HumanWorkSignal[];
}

export interface TranscriptReassemblySnapshotSpeaker {
  speaker_id: string;
  display_name: string;
  deepgram_speaker: number;
  role: string | null;
  job_id: string;
  speaker_index: number;
  speaker_label: string;
  assigned_name: string | null;
  speaker_role: string | null;
  word_count: number;
}

export interface TranscriptReassemblySnapshotUtterance {
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  ordinal: number;
  job_id: string;
  utterance_index: number;
  speaker_index: number;
  speaker_label: string;
  text: string;
  avg_confidence: string | null;
}

export interface TranscriptReassemblySnapshotWord {
  utterance_id: string;
  word_id: string;
  speaker_id: string;
  ordinal: number;
  text: string;
  raw_text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  reviewed: boolean;
  edited: boolean;
  job_id: string;
  word_index: number;
  working_text: string | null;
  speaker_index: number;
  is_filler: boolean;
  removed: boolean;
}

export interface TranscriptReassemblyUndoSnapshot {
  transcriptId: string;
  durationSeconds: number | null;
  wordCount: number;
  utteranceCount: number;
  speakerCount: number;
  avgConfidence: string | null;
  speakerMapConfirmed: boolean;
  speakers: TranscriptReassemblySnapshotSpeaker[];
  utterances: TranscriptReassemblySnapshotUtterance[];
  words: TranscriptReassemblySnapshotWord[];
}

export interface TranscriptReassemblyPreview {
  currentAssemblyVersion: string;
  latestAssemblyVersion: string;
  canApply: boolean;
  blockedReasons: string[];
  currentMetrics: ReassemblyMetrics;
  candidateMetrics: ReassemblyMetrics;
  impacts: ReassemblyImpactSummary;
  previewToken: string;
  humanWorkSummary: HumanWorkSummary;
}

export interface TranscriptReassemblyApplyResult {
  ok: true;
  updatedAt: string | null;
  currentMetrics: ReassemblyMetrics;
  candidateMetrics: ReassemblyMetrics;
  undoSnapshot: TranscriptReassemblyUndoSnapshot | null;
}

export interface TranscriptReassemblyRestoreResult {
  ok: true;
  updatedAt: string | null;
}

export interface ReassemblyEligibilityInput {
  reviewStateCount: number;
  suggestionCount: number;
  certificationCount: number;
  exportCount: number;
}

export interface ReassemblyImpactSummary {
  reviewStateImpact: "none" | "blocked-existing-review-state";
  suggestionsImpact: "none" | "blocked-existing-suggestions";
  auditImpact: "append-rebuild-event";
  certificationImpact: "none" | "blocked-certified-case";
  exportImpact: "none" | "blocked-export-locked-case";
}

export interface ReassemblyEligibility {
  canPreview: boolean;
  canApply: boolean;
  blockedReasons: string[];
  impacts: ReassemblyImpactSummary;
}

export interface ReassemblyStoredSpeakerRow {
  speaker_id: string;
}

export interface ReassemblyStoredUtteranceRow {
  utterance_id: string;
}

export interface ReassemblyStoredWordRow {
  utterance_id: string;
  speaker_id: string;
}

export interface ReassemblyPreviewTokenInput {
  transcriptId: string;
  updatedAt: string | null;
  rawStoragePath: string | null;
  currentMetrics: ReassemblyMetrics;
  candidateMetrics: ReassemblyMetrics;
}

function serializeMetrics(metrics: ReassemblyMetrics): string {
  return [
    metrics.mixedCanonicalUtterances,
    metrics.utteranceCount,
    metrics.speakerCount,
    metrics.wordCount,
  ].join(":");
}

export function buildReassemblyPreviewToken(input: ReassemblyPreviewTokenInput): string {
  return [
    input.transcriptId,
    input.updatedAt ?? "null",
    input.rawStoragePath ?? "null",
    serializeMetrics(input.currentMetrics),
    serializeMetrics(input.candidateMetrics),
    LATEST_ASSEMBLY_VERSION,
  ].join("|");
}

export function evaluateReassemblyEligibility(
  input: ReassemblyEligibilityInput,
): ReassemblyEligibility {
  const blockedReasons: string[] = [];

  if (input.reviewStateCount > 0) {
    blockedReasons.push("Existing review state must be resolved before rebuild v1.");
  }

  if (input.suggestionCount > 0) {
    blockedReasons.push("Existing suggestions must be resolved before rebuild v1.");
  }

  if (input.certificationCount > 0) {
    blockedReasons.push("Certified cases are blocked from transcript rebuild.");
  }

  if (input.exportCount > 0) {
    blockedReasons.push("Export-locked cases are blocked from transcript rebuild.");
  }

  return {
    canPreview: blockedReasons.length === 0,
    canApply: blockedReasons.length === 0,
    blockedReasons,
    impacts: {
      reviewStateImpact: input.reviewStateCount > 0 ? "blocked-existing-review-state" : "none",
      suggestionsImpact: input.suggestionCount > 0 ? "blocked-existing-suggestions" : "none",
      auditImpact: "append-rebuild-event",
      certificationImpact: input.certificationCount > 0 ? "blocked-certified-case" : "none",
      exportImpact: input.exportCount > 0 ? "blocked-export-locked-case" : "none",
    },
  };
}

export function buildStoredTranscriptMetrics(
  speakers: ReassemblyStoredSpeakerRow[],
  utterances: ReassemblyStoredUtteranceRow[],
  words: ReassemblyStoredWordRow[],
): ReassemblyMetrics {
  const speakerIds = new Set(speakers.map((speaker) => speaker.speaker_id));
  const speakerIdsByUtterance = new Map<string, Set<string>>();

  for (const word of words) {
    const speakerSet = speakerIdsByUtterance.get(word.utterance_id) ?? new Set<string>();
    speakerSet.add(word.speaker_id);
    speakerIdsByUtterance.set(word.utterance_id, speakerSet);
  }

  const mixedCanonicalUtterances = utterances.reduce((count, utterance) => {
    const speakerSet = speakerIdsByUtterance.get(utterance.utterance_id);
    return count + ((speakerSet?.size ?? 0) > 1 ? 1 : 0);
  }, 0);

  return {
    mixedCanonicalUtterances,
    utteranceCount: utterances.length,
    speakerCount: speakerIds.size,
    wordCount: words.length,
  };
}

export function buildNormalizedTranscriptMetrics(
  normalized: NormalizedTranscriptData,
): ReassemblyMetrics {
  const speakerIndicesByUtterance = new Map<string, Set<number>>();

  for (const word of normalized.words) {
    const speakerSet = speakerIndicesByUtterance.get(word.utterance_id) ?? new Set<number>();
    speakerSet.add(word.speaker_index);
    speakerIndicesByUtterance.set(word.utterance_id, speakerSet);
  }

  const mixedCanonicalUtterances = normalized.utterances.reduce((count, utterance) => {
    const speakerSet = speakerIndicesByUtterance.get(utterance.utterance_id);
    return count + ((speakerSet?.size ?? 0) > 1 ? 1 : 0);
  }, 0);

  return {
    mixedCanonicalUtterances,
    utteranceCount: normalized.utterances.length,
    speakerCount: normalized.speakers.length,
    wordCount: normalized.words.length,
  };
}

export function countMixedDeepgramUtterances(response: DeepgramResponse): number {
  return (response.results.utterances ?? []).reduce((count, utterance) => {
    const speakerSet = new Set(
      utterance.words.map((word) => word.speaker ?? utterance.speaker ?? 0),
    );
    return count + (speakerSet.size > 1 ? 1 : 0);
  }, 0);
}
