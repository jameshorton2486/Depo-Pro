import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
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
    expect(input.caseRecord.entityTerms).toEqual([]);

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

  it("includes registry-backed entity terms in AI context", () => {
    const record = emptyCaseRecord("case_1", "2026-07-13T00:00:00Z");
    record.caption.case_style.value = "Etminan v. Bentley Chiropractic";
    record.witnesses = [{
      witness_id: "wit_1",
      name: { value: "Payam Etminan", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      role: { value: "EXPERT", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      title: { value: "M.D.", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      prefix_suffix: "M.D.",
      party_affiliation: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_interpreter: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_videographer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      spelling_corrections: [],
      email: null,
      phone: null,
    }];
    record.attorneys = [{
      attorney_id: "atty_1",
      name: { value: "Dennis Bentley", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      firm: { value: "Bentley Law", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      role: { value: "EXAMINING", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      representing: { value: "Plaintiff", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    }];

    const input = buildAISuggestionInput({
      transcriptId: "tr_1",
      utterances: [],
      words: [],
      speakers: [],
      caseRecord: record,
    });

    expect(input.caseRecord.entityTerms).toContain("Dennis Bentley");
    expect(input.caseRecord.entityTerms).toContain("Payam Etminan");
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
