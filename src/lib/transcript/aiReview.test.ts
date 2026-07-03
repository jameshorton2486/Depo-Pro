import { describe, expect, it } from "vitest";

import {
  AI_REVIEW_PROMPT_VERSION,
  buildAutoApplyPlan,
  buildAISuggestionInput,
  buildAmbiguousFlags,
  isAIReviewAutoApplyEnabled,
  shouldSkipAIReview,
  summarizeSuggestions,
} from "./aiReview";

describe("aiReview helpers", () => {
  it("skips when prompt version and transcript revision match", () => {
    expect(shouldSkipAIReview({
      transcript_id: "tr_1",
      updated_at: "2026-06-27T20:00:00.000Z",
      ai_review_meta: {
        completed: true,
        prompt_version: AI_REVIEW_PROMPT_VERSION,
        transcript_revision: "2026-06-27T20:00:00.000Z",
      },
    })).toBe(true);
  });

  it("does not skip when prompt version changes", () => {
    expect(shouldSkipAIReview({
      transcript_id: "tr_1",
      updated_at: "2026-06-27T20:00:00.000Z",
      ai_review_meta: {
        completed: true,
        prompt_version: "older",
        transcript_revision: "2026-06-27T20:00:00.000Z",
      },
    })).toBe(false);
  });

  it("builds ambiguous flags with surrounding context", () => {
    const flags = buildAmbiguousFlags([
      { id: "1", word_id: "w_1", utterance_id: "utt_1", raw_text: "pain", working_text: null, confidence: 0.9 },
      { id: "2", word_id: "w_2", utterance_id: "utt_1", raw_text: "raiding", working_text: null, confidence: 0.6 },
      { id: "3", word_id: "w_3", utterance_id: "utt_1", raw_text: "down", working_text: null, confidence: 0.9 },
    ]);
    expect(flags[0]?.raw_text).toBe("raiding");
    expect(flags[0]?.context_before).toContain("pain");
    expect(flags[0]?.context_after).toContain("down");
  });

  it("builds AI input and suggestion summary", () => {
    const input = buildAISuggestionInput({
      transcriptId: "tr_1",
      utterances: [{
        id: "utt_1",
        utterance_id: "utt_1",
        speaker_id: "spk_1",
        speaker_display_name: "SPEAKER 1",
        speaker_role: "OTHER",
        raw_text: "raiding pain",
        working_text: "raiding pain",
        line_type: null,
      }],
      words: [{
        id: "1",
        word_id: "w_1",
        utterance_id: "utt_1",
        raw_text: "raiding",
        working_text: null,
        confidence: 0.6,
      }],
      speakers: [{
        speaker_id: "spk_1",
        display_name: "SPEAKER 1",
        verified_role: null,
      }],
      caseRecord: null,
    });

    expect(input.correctionReport.ambiguousFlags).toHaveLength(1);
    expect(input.correctionReport.speakerIssues).toHaveLength(1);

    const summary = summarizeSuggestions({
      wordSuggestions: [{ word_id: "w_1", utterance_id: "utt_1", suggestion: "radiating", reason: "reason", confidence: 0.93, auto_apply: true }],
      speakerSuggestions: [],
      structureSuggestions: [],
      promptVersion: AI_REVIEW_PROMPT_VERSION,
      model: "claude-sonnet-4-6",
    });
    expect(summary.autoAppliedCount).toBe(1);
    expect(summary.totalSuggestions).toBe(1);
  });

  it("prefers verified speaker identity over proposed speaker resolution fields", () => {
    const input = buildAISuggestionInput({
      transcriptId: "tr_1",
      utterances: [],
      words: [],
      speakers: [{
        speaker_id: "spk_1",
        proposed_display_name: "SPEAKER 1",
        proposed_role: "OTHER",
        display_name: "Dennis Bentley",
        verified_role: "ATTORNEY",
        ai_suggested: true,
      }],
      caseRecord: null,
    });

    expect(input.correctionReport.speakerIssues).toEqual([]);
  });

  it("builds an audit-backed auto-apply plan only when explicitly enabled", () => {
    const suggestion = {
      word_id: "w_1",
      utterance_id: "utt_1",
      suggestion: "radiating",
      reason: "Medical context",
      confidence: 0.93,
      auto_apply: true,
    };
    const word = {
      word_id: "w_1",
      utterance_id: "utt_1",
      raw_text: "raiding",
      working_text: null,
    };

    const disabled = buildAutoApplyPlan({
      suggestion,
      word,
      autoApplyEnabled: false,
    });
    expect(disabled.autoApplied).toBe(false);
    expect(disabled.update.ai_suggestion_status).toBe("pending");
    expect(disabled.update.working_text).toBeUndefined();
    expect(disabled.auditRow).toBeNull();

    const enabled = buildAutoApplyPlan({
      suggestion,
      word,
      autoApplyEnabled: true,
    });
    expect(enabled.autoApplied).toBe(true);
    expect(enabled.update.ai_suggestion_status).toBe("accepted");
    expect(enabled.update.working_text).toBe("radiating");
    expect(enabled.auditRow).toEqual({
      utterance_id: "utt_1",
      word_id: "w_1",
      source: "ai_review",
      action: "ai_suggestion_auto_applied",
      old_text: "raiding",
      new_text: "radiating",
      before_text: "raiding",
      after_text: "radiating",
    });
  });

  it("treats AI review auto-apply as opt-in", () => {
    expect(isAIReviewAutoApplyEnabled(undefined)).toBe(false);
    expect(isAIReviewAutoApplyEnabled("false")).toBe(false);
    expect(isAIReviewAutoApplyEnabled("true")).toBe(true);
  });
});
