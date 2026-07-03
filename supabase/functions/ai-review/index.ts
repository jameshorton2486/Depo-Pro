import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { generateAISuggestions } from "../../../src/lib/transcript/aiSuggestionEngine.ts";
import {
  AI_REVIEW_PROMPT_VERSION,
  buildAutoApplyPlan,
  buildAISuggestionInput,
  isAIReviewAutoApplyEnabled,
  shouldSkipAIReview,
  summarizeSuggestions,
} from "../../../src/lib/transcript/aiReview.ts";

type Database = Record<string, never>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true });
  }

  if (request.method !== "POST") {
    return respondJson(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey || !anthropicKey) {
    return respondJson(500, { error: "Missing server configuration" });
  }

  const body = await request.json().catch(() => null) as { transcript_id?: string; force_rerun?: boolean } | null;
  const transcriptId = body?.transcript_id;
  if (!transcriptId) {
    return respondJson(400, { error: "transcript_id required" });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);
  const autoApplyEnabled = isAIReviewAutoApplyEnabled(Deno.env.get("AI_REVIEW_AUTO_APPLY"));
  const transcriptRes = await supabase
    .from("transcripts")
    .select("transcript_id, case_id, job_id, updated_at, ai_review_meta")
    .eq("transcript_id", transcriptId)
    .single();

  if (transcriptRes.error || !transcriptRes.data) {
    return respondJson(404, { error: "transcript not found" });
  }

  const transcript = transcriptRes.data as {
    transcript_id: string;
    case_id: string;
    job_id: string;
    updated_at: string;
    ai_review_meta?: Record<string, unknown> | null;
  };

  if (shouldSkipAIReview({
    transcript_id: transcript.transcript_id,
    updated_at: transcript.updated_at,
    ai_review_meta: transcript.ai_review_meta as never,
  }, Boolean(body?.force_rerun), AI_REVIEW_PROMPT_VERSION)) {
    return respondJson(200, { skipped: true, reason: "already_reviewed" });
  }

  const [utterancesRes, wordsRes, speakerResolutionRes, transcriptSpeakersRes, caseRes] = await Promise.all([
    supabase.from("transcript_utterances").select("id, utterance_id, speaker_id, speaker_label, speaker_role, text, line_type").eq("transcript_id", transcriptId).order("utterance_index", { ascending: true }),
    supabase.from("transcript_words").select("id, word_id, utterance_id, raw_text, working_text, confidence, ai_suggestion, ai_suggestion_status").eq("transcript_id", transcriptId).order("word_index", { ascending: true }),
    supabase
      .from("speaker_resolution_current")
      .select("speaker_id, proposed_display_name, proposed_role, confidence, evidence, authority, ai_suggested, verified, created_at, updated_at")
      .eq("transcript_id", transcriptId),
    supabase
      .from("transcript_speakers")
      .select("speaker_id, display_name, assigned_name, role, speaker_role")
      .eq("transcript_id", transcriptId),
    supabase.from("cases").select("payload").eq("case_id", transcript.case_id).maybeSingle(),
  ]);

  if (utterancesRes.error || wordsRes.error || speakerResolutionRes.error || transcriptSpeakersRes.error) {
    return respondJson(500, { error: "Failed to load transcript data" });
  }

  const caseRecord = (caseRes.data?.payload ?? null) as Record<string, unknown> | null;
  const wordsById = new Map(
    ((wordsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const wordId = String(row.word_id ?? row.id ?? "");
      return [wordId, row] as const;
    }),
  );
  const transcriptSpeakers = new Map(
    ((transcriptSpeakersRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const speakerId = String(row.speaker_id ?? "");
      return [speakerId, row] as const;
    }),
  );
  const input = buildAISuggestionInput({
    transcriptId,
    utterances: ((utterancesRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? row.utterance_id ?? ""),
      utterance_id: String(row.utterance_id ?? row.id ?? ""),
      speaker_id: String(row.speaker_id ?? ""),
      speaker_display_name: String(row.speaker_label ?? ""),
      speaker_role: String(row.speaker_role ?? "OTHER"),
      raw_text: String(row.text ?? ""),
      working_text: String(row.text ?? ""),
      line_type: row.line_type == null ? null : String(row.line_type),
    })),
    words: ((wordsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      word_id: String(row.word_id ?? row.id ?? ""),
      utterance_id: String(row.utterance_id ?? ""),
      raw_text: String(row.raw_text ?? ""),
      working_text: row.working_text == null ? null : String(row.working_text),
      confidence: Number(row.confidence ?? 0),
      ai_suggestion: row.ai_suggestion == null ? null : String(row.ai_suggestion),
      ai_suggestion_status: row.ai_suggestion_status == null ? null : String(row.ai_suggestion_status),
    })),
    speakers: ((speakerResolutionRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const speakerId = String(row.speaker_id ?? "");
      const verifiedSpeaker = transcriptSpeakers.get(speakerId);
      const displayName = verifiedSpeaker?.assigned_name ?? verifiedSpeaker?.display_name;
      const verifiedRole = verifiedSpeaker?.speaker_role ?? verifiedSpeaker?.role;

      return {
        speaker_id: speakerId,
        proposed_display_name: row.proposed_display_name == null ? null : String(row.proposed_display_name),
        proposed_role: row.proposed_role == null ? null : String(row.proposed_role),
        display_name: displayName == null ? null : String(displayName),
        verified_role: verifiedRole == null ? null : String(verifiedRole),
        ai_suggested: Boolean(row.ai_suggested),
      };
    }),
    caseRecord: caseRecord as never,
  });

  if (
    input.correctionReport.ambiguousFlags.length === 0 &&
    input.correctionReport.speakerIssues.length === 0 &&
    input.correctionReport.unstructuredBlocks.length === 0
  ) {
    await supabase
      .from("transcripts")
      .update({
        ai_review_meta: {
          completed: true,
          prompt_version: AI_REVIEW_PROMPT_VERSION,
          model: "claude-sonnet-4-6",
          transcript_revision: transcript.updated_at,
          completed_at: new Date().toISOString(),
          suggestions_count: 0,
          auto_applied_count: 0,
        },
      })
      .eq("transcript_id", transcriptId);

    return respondJson(200, { completed: true, suggestions_count: 0 });
  }

  const suggestions = await generateAISuggestions(input, anthropicKey);
  let autoAppliedCount = 0;

  for (const suggestion of suggestions.wordSuggestions) {
    const existingRow = wordsById.get(suggestion.word_id);
    if (!existingRow) {
      await recordAiReviewFailure(supabase, transcript, {
        error: "missing_word_for_ai_suggestion",
        word_id: suggestion.word_id,
      });
      return respondJson(500, { error: "Failed to persist AI review suggestions" });
    }

    const plan = buildAutoApplyPlan({
      suggestion,
      word: {
        word_id: suggestion.word_id,
        utterance_id: String(existingRow.utterance_id ?? suggestion.utterance_id ?? ""),
        raw_text: String(existingRow.raw_text ?? ""),
        working_text: existingRow.working_text == null ? null : String(existingRow.working_text),
      },
      autoApplyEnabled,
    });

    const updateResult = await supabase
      .from("transcript_words")
      .update(plan.update)
      .eq("word_id", suggestion.word_id)
      .eq("transcript_id", transcriptId);

    if (updateResult.error) {
      await recordAiReviewFailure(supabase, transcript, {
        error: "word_update_failed",
        word_id: suggestion.word_id,
        message: updateResult.error.message,
      });
      return respondJson(500, { error: "Failed to persist AI review suggestions" });
    }

    if (plan.auditRow) {
      const auditResult = await supabase
        .from("transcript_audit_log")
        .insert({
          transcript_id: transcriptId,
          change_id: `chg_${transcript.transcript_id}_${suggestion.word_id}_${Date.now()}`,
          utterance_id: plan.auditRow.utterance_id,
          word_id: plan.auditRow.word_id,
          old_text: plan.auditRow.old_text,
          new_text: plan.auditRow.new_text,
          source: plan.auditRow.source,
          suggestion_id: null,
          reviewer_user_id: null,
          case_id: transcript.case_id,
          job_id: transcript.job_id,
          actor: null,
          action: plan.auditRow.action,
          before_text: plan.auditRow.before_text,
          after_text: plan.auditRow.after_text,
        });

      if (auditResult.error) {
        await recordAiReviewFailure(supabase, transcript, {
          error: "auto_apply_audit_insert_failed",
          word_id: suggestion.word_id,
          message: auditResult.error.message,
        });
        return respondJson(500, { error: "Failed to persist AI review suggestions" });
      }

      autoAppliedCount += 1;
    }
  }

  for (const suggestion of suggestions.speakerSuggestions) {
    if (suggestion.confidence < 0.9) {
      continue;
    }
    await supabase
      .from("speaker_resolution_current")
      .update({
        proposed_display_name: suggestion.suggested_display_name,
        proposed_role: suggestion.suggested_role,
        ai_suggested: true,
      })
      .eq("transcript_id", transcriptId)
      .eq("speaker_id", suggestion.speaker_id);
  }

  for (const suggestion of suggestions.structureSuggestions) {
    await supabase
      .from("transcript_utterances")
      .update({ ai_suggested_line_type: suggestion.suggested_line_type })
      .eq("transcript_id", transcriptId)
      .eq("utterance_id", suggestion.utterance_id);
  }

  const summary = summarizeSuggestions(suggestions);
  await supabase
    .from("transcripts")
    .update({
      ai_review_meta: {
        completed: true,
        prompt_version: AI_REVIEW_PROMPT_VERSION,
        model: suggestions.model,
        transcript_revision: transcript.updated_at,
        completed_at: new Date().toISOString(),
        suggestions_count: summary.totalSuggestions,
        auto_applied_count: autoAppliedCount,
        auto_apply_enabled: autoApplyEnabled,
      },
    })
    .eq("transcript_id", transcriptId);

  return respondJson(200, {
    completed: true,
    suggestions_count: summary.totalSuggestions,
    auto_applied_count: autoAppliedCount,
    pending_review_count: summary.totalSuggestions - autoAppliedCount,
  });
});

function respondJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function recordAiReviewFailure(
  supabase: ReturnType<typeof createClient<Database>>,
  transcript: {
    transcript_id: string;
    updated_at: string;
  },
  detail: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from("transcripts")
    .update({
      ai_review_meta: {
        completed: false,
        prompt_version: AI_REVIEW_PROMPT_VERSION,
        transcript_revision: transcript.updated_at,
        failed_at: new Date().toISOString(),
        ...detail,
      },
    })
    .eq("transcript_id", transcript.transcript_id);
}
