import { buildSuggestionCaseRecord, type AISuggestionInput, type AISuggestionResult } from "./aiSuggestionEngine.ts";
import type { CaseRecord } from "../../types/case";

export const AI_REVIEW_PROMPT_VERSION = "wave22-p5-v1";

export interface AIReviewMeta {
  completed?: boolean;
  prompt_version?: string;
  model?: string;
  transcript_revision?: string;
  completed_at?: string;
  suggestions_count?: number;
  auto_applied_count?: number;
}

export interface AIReviewTranscriptRow {
  transcript_id: string;
  updated_at: string;
  ai_review_meta?: AIReviewMeta | null;
}

export interface AIReviewWordRow {
  id: string;
  word_id?: string;
  utterance_id: string;
  raw_text: string;
  working_text: string | null;
  confidence: number;
  ai_suggestion?: string | null;
  ai_suggestion_status?: string | null;
  is_flagged?: boolean | null;
  flag_type?: string | null;
}

export interface AIReviewUtteranceRow {
  id: string;
  utterance_id?: string;
  speaker_id: string;
  speaker_display_name?: string | null;
  speaker_role?: string | null;
  raw_text?: string | null;
  working_text?: string | null;
  line_type?: string | null;
}

export interface AIReviewSpeakerRow {
  speaker_id: string;
  proposed_display_name?: string | null;
  proposed_role?: string | null;
  display_name?: string | null;
  verified_role?: string | null;
  ai_suggested?: boolean | null;
}

export interface AIReviewWordSuggestion {
  word_id: string;
  utterance_id: string;
  suggestion: string;
  reason: string;
  confidence: number;
  auto_apply: boolean;
}

export interface AIReviewPersistedWordRow {
  word_id: string;
  utterance_id: string;
  raw_text: string;
  working_text: string | null;
}

export interface AIReviewAuditRow {
  utterance_id: string;
  word_id: string;
  source: "ai_review";
  action: "ai_suggestion_auto_applied";
  old_text: string;
  new_text: string;
  before_text: string;
  after_text: string;
}

export function shouldSkipAIReview(
  transcript: AIReviewTranscriptRow,
  forceRerun = false,
  promptVersion = AI_REVIEW_PROMPT_VERSION,
): boolean {
  if (forceRerun) {
    return false;
  }
  const meta = transcript.ai_review_meta;
  if (!meta?.completed) {
    return false;
  }
  return meta.prompt_version === promptVersion && meta.transcript_revision === transcript.updated_at;
}

export function buildAmbiguousFlags(words: AIReviewWordRow[]): AISuggestionInput["correctionReport"]["ambiguousFlags"] {
  const wordsByUtterance = new Map<string, AIReviewWordRow[]>();
  for (const word of words) {
    const bucket = wordsByUtterance.get(word.utterance_id) ?? [];
    bucket.push(word);
    wordsByUtterance.set(word.utterance_id, bucket);
  }

  return words
    .filter((word) => word.confidence < 0.75 || word.is_flagged)
    .map((word) => {
      const utteranceWords = wordsByUtterance.get(word.utterance_id) ?? [];
      const index = utteranceWords.findIndex((candidate) => candidate.id === word.id);
      return {
        word_id: word.word_id ?? word.id,
        utterance_id: word.utterance_id,
        raw_text: word.raw_text,
        context_before: utteranceWords
          .slice(Math.max(0, index - 4), index)
          .map((candidate) => candidate.working_text ?? candidate.raw_text)
          .join(" "),
        context_after: utteranceWords
          .slice(index + 1, index + 5)
          .map((candidate) => candidate.working_text ?? candidate.raw_text)
          .join(" "),
        flag_type: word.is_flagged ? word.flag_type ?? "LOW_CONFIDENCE" : "LOW_CONFIDENCE",
      };
    })
    .slice(0, 60);
}

export function buildSpeakerIssues(speakers: AIReviewSpeakerRow[]): AISuggestionInput["correctionReport"]["speakerIssues"] {
  return speakers
    .filter((speaker) => !(speaker.verified_role ?? speaker.proposed_role) || /^SPEAKER\b/i.test((speaker.display_name ?? speaker.proposed_display_name ?? "").trim()))
    .map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.display_name ?? speaker.proposed_display_name ?? "",
      role: speaker.verified_role ?? speaker.proposed_role ?? "OTHER",
      issue: !(speaker.verified_role ?? speaker.proposed_role) ? "no_role_assigned" : "generic_display_name",
    }));
}

export function buildAISuggestionInput(input: {
  transcriptId: string;
  utterances: AIReviewUtteranceRow[];
  words: AIReviewWordRow[];
  speakers: AIReviewSpeakerRow[];
  caseRecord: CaseRecord | null | undefined;
}): AISuggestionInput {
  const wordsByUtterance = new Map<string, AIReviewWordRow[]>();
  for (const word of input.words) {
    const bucket = wordsByUtterance.get(word.utterance_id) ?? [];
    bucket.push(word);
    wordsByUtterance.set(word.utterance_id, bucket);
  }

  return {
    transcriptId: input.transcriptId,
    utterances: input.utterances.map((utterance) => ({
      utterance_id: utterance.utterance_id ?? utterance.id,
      speaker_id: utterance.speaker_id,
      speaker_display_name: utterance.speaker_display_name ?? "",
      speaker_role: utterance.speaker_role ?? "OTHER",
      raw_text: utterance.raw_text ?? "",
      working_text: utterance.working_text ?? utterance.raw_text ?? "",
      words: (wordsByUtterance.get(utterance.utterance_id ?? utterance.id) ?? []).map((word) => ({
        word_id: word.word_id ?? word.id,
        raw_text: word.raw_text,
        working_text: word.working_text,
        confidence: word.confidence,
        is_flagged: Boolean(word.is_flagged),
        flag_type: word.flag_type ?? null,
      })),
    })),
    correctionReport: {
      ambiguousFlags: buildAmbiguousFlags(input.words),
      speakerIssues: buildSpeakerIssues(input.speakers),
      unstructuredBlocks: input.utterances
        .filter((utterance) => !utterance.line_type || utterance.line_type === "UNKNOWN")
        .map((utterance) => ({
          utterance_id: utterance.utterance_id ?? utterance.id,
          raw_text: utterance.raw_text ?? "",
          speaker_role: utterance.speaker_role ?? "OTHER",
        })),
    },
    caseRecord: buildSuggestionCaseRecord(input.caseRecord),
  };
}

export function isAIReviewAutoApplyEnabled(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function buildAutoApplyPlan(input: {
  suggestion: AIReviewWordSuggestion;
  word: AIReviewPersistedWordRow;
  autoApplyEnabled: boolean;
}): {
  autoApplied: boolean;
  update: {
    ai_suggestion: string;
    ai_suggestion_reason: string;
    ai_confidence: number;
    ai_suggestion_status: "accepted" | "pending";
    working_text?: string | null;
  };
  auditRow: AIReviewAuditRow | null;
} {
  const { suggestion, word, autoApplyEnabled } = input;
  const autoApplied = autoApplyEnabled && suggestion.auto_apply;
  const nextText = suggestion.suggestion;
  const previousText = word.working_text ?? word.raw_text;

  return {
    autoApplied,
    update: {
      ai_suggestion: nextText,
      ai_suggestion_reason: suggestion.reason,
      ai_confidence: suggestion.confidence,
      ai_suggestion_status: autoApplied ? "accepted" : "pending",
      ...(autoApplied ? { working_text: nextText === word.raw_text ? null : nextText } : {}),
    },
    auditRow: autoApplied
      ? {
        utterance_id: word.utterance_id,
        word_id: word.word_id,
        source: "ai_review",
        action: "ai_suggestion_auto_applied",
        old_text: previousText,
        new_text: nextText,
        before_text: previousText,
        after_text: nextText,
      }
      : null,
  };
}

export function summarizeSuggestions(result: AISuggestionResult): {
  totalSuggestions: number;
  autoAppliedCount: number;
  pendingReviewCount: number;
} {
  const totalSuggestions =
    result.wordSuggestions.length +
    result.speakerSuggestions.length +
    result.structureSuggestions.length;
  const autoAppliedCount = result.wordSuggestions.filter((item) => item.auto_apply).length;
  return {
    totalSuggestions,
    autoAppliedCount,
    pendingReviewCount: totalSuggestions - autoAppliedCount,
  };
}
