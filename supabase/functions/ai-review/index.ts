import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { generateAISuggestions } from "../../../src/lib/transcript/aiSuggestionEngine.ts";
import {
  AI_REVIEW_PROMPT_VERSION,
  buildAISuggestionInput,
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
  const transcriptRes = await supabase
    .from("transcripts")
    .select("transcript_id, case_id, updated_at, ai_review_meta")
    .eq("transcript_id", transcriptId)
    .single();

  if (transcriptRes.error || !transcriptRes.data) {
    return respondJson(404, { error: "transcript not found" });
  }

  const transcript = transcriptRes.data as {
    transcript_id: string;
    case_id: string;
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

  const [utterancesRes, wordsRes, speakersRes, caseRes] = await Promise.all([
    supabase.from("transcript_utterances").select("id, utterance_id, speaker_id, speaker_label, speaker_role, text, line_type").eq("transcript_id", transcriptId).order("utterance_index", { ascending: true }),
    supabase.from("transcript_words").select("id, word_id, utterance_id, raw_text, working_text, confidence, ai_suggestion, ai_suggestion_status").eq("transcript_id", transcriptId).order("word_index", { ascending: true }),
    supabase.from("speaker_resolution_current").select("*").eq("transcript_id", transcriptId),
    supabase.from("cases").select("payload").eq("case_id", transcript.case_id).maybeSingle(),
  ]);

  if (utterancesRes.error || wordsRes.error || speakersRes.error) {
    return respondJson(500, { error: "Failed to load transcript data" });
  }

  const caseRecord = (caseRes.data?.payload ?? null) as Record<string, unknown> | null;
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
    speakers: ((speakersRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      speaker_id: String(row.speaker_id ?? ""),
      proposed_display_name: row.proposed_display_name == null ? null : String(row.proposed_display_name),
      proposed_role: row.proposed_role == null ? null : String(row.proposed_role),
      display_name: row.display_name == null ? null : String(row.display_name),
      verified_role: row.verified_role == null ? null : String(row.verified_role),
      ai_suggested: Boolean(row.ai_suggested),
    })),
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

  for (const suggestion of suggestions.wordSuggestions) {
    const update: Record<string, unknown> = {
      ai_suggestion: suggestion.suggestion,
      ai_suggestion_reason: suggestion.reason,
      ai_confidence: suggestion.confidence,
      ai_suggestion_status: suggestion.auto_apply ? "accepted" : "pending",
    };
    if (suggestion.auto_apply) {
      update.working_text = suggestion.suggestion;
    }
    await supabase.from("transcript_words").update(update).eq("word_id", suggestion.word_id).eq("transcript_id", transcriptId);
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
        auto_applied_count: summary.autoAppliedCount,
      },
    })
    .eq("transcript_id", transcriptId);

  return respondJson(200, {
    completed: true,
    suggestions_count: summary.totalSuggestions,
    auto_applied_count: summary.autoAppliedCount,
    pending_review_count: summary.pendingReviewCount,
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
