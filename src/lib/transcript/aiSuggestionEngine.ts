import type { CaseRecord } from "../../types/case.ts";
import { PRIMARY_MODEL } from "../aiModels.ts";

export interface AISuggestionInput {
  transcriptId: string;
  utterances: Array<{
    utterance_id: string;
    speaker_id: string;
    speaker_display_name: string;
    speaker_role: string;
    raw_text: string;
    working_text: string;
    words: Array<{
      word_id: string;
      raw_text: string;
      working_text: string | null;
      confidence: number;
      is_flagged: boolean;
      flag_type: string | null;
    }>;
  }>;
  correctionReport: {
    ambiguousFlags: Array<{
      word_id: string;
      utterance_id: string;
      raw_text: string;
      context_before: string;
      context_after: string;
      flag_type: string;
    }>;
    speakerIssues: Array<{
      speaker_id: string;
      display_name: string;
      role: string;
      issue: string;
    }>;
    unstructuredBlocks: Array<{
      utterance_id: string;
      raw_text: string;
      speaker_role: string;
    }>;
  };
  caseRecord: {
    causeNumber: string;
    caseStyle: string;
    witnessName: string;
    examiningAttorney: string;
    opposingCounsel: string;
    reporterName: string;
    caseType: string;
    jurisdiction: string;
  };
}

export interface AISuggestionResult {
  wordSuggestions: Array<{
    word_id: string;
    utterance_id: string;
    suggestion: string;
    reason: string;
    confidence: number;
    auto_apply: boolean;
  }>;
  speakerSuggestions: Array<{
    speaker_id: string;
    suggested_display_name: string;
    suggested_role: "ATTORNEY" | "WITNESS" | "REPORTER" | "VIDEOGRAPHER" | "INTERPRETER";
    reason: string;
    confidence: number;
  }>;
  structureSuggestions: Array<{
    utterance_id: string;
    suggested_line_type: "Q" | "A" | "COLLOQUY" | "PARENTHETICAL";
    reason: string;
  }>;
  promptVersion: string;
  model: string;
}

export const AUTO_APPLY_THRESHOLD = 0.92;
export const PROMPT_VERSION = "wave22-p5-v1";
export const AI_SUGGESTION_MODEL = PRIMARY_MODEL;

export const SYSTEM_PROMPT = `You are a legal transcript correction assistant for a Texas civil deposition.
You will receive flagged tokens from a Deepgram speech-to-text transcript that the deterministic
correction pipeline could not resolve with certainty.

Your job is to suggest corrections for:
1. Ambiguous ASR tokens
2. Speaker attribution
3. Q./A. structure

ABSOLUTE RULES:
- NEVER change testimony content when the meaning is ambiguous
- NEVER change dollar amounts, dates, or numeric figures unless the garble is completely unambiguous
- NEVER change filler words: uh, um, yeah, nope, uh-huh, uh-uh, mm-hmm
- NEVER change words that are clearly correct in context
- When uncertain (confidence < 0.85), return the token unchanged with a flag
- Proper names not in the case record: flag, do not correct

VERBATIM PROTECTED — NEVER TOUCH:
- uh, um, ah, like, you know, I mean, basically, so, well
- uh-huh, uh-uh, mm-hmm, yeah, yep, nope, nah
- gonna, kinda, wanna, gotta, lemme, y'all
- Grammatical errors in testimony
- Profanity (preserve exactly)
- Stutters and false starts

OUTPUT: Return valid JSON only. No prose. No explanation outside the JSON fields.`;

export interface AISuggestionTransport {
  createMessage(input: {
    apiKey: string;
    model: string;
    max_tokens: number;
    temperature: number;
    system: string;
    user: string;
  }): Promise<string>;
}

export const anthropicFetchTransport: AISuggestionTransport = {
  async createMessage(input) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.max_tokens,
        temperature: input.temperature,
        system: input.system,
        messages: [{ role: "user", content: input.user }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic request failed: ${response.status} ${text}`);
    }

    const payload = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((item) => item.type === "text")?.text;
    if (!text) {
      throw new Error("Unexpected response type from AI");
    }
    return text;
  },
};

export function buildUserMessage(input: AISuggestionInput): string {
  return JSON.stringify({
    task: "transcript_correction",
    case_record: input.caseRecord,
    flagged_tokens: input.correctionReport.ambiguousFlags.map((flag) => ({
      word_id: flag.word_id,
      utterance_id: flag.utterance_id,
      raw_text: flag.raw_text,
      context: `...${flag.context_before} [${flag.raw_text}] ${flag.context_after}...`,
      flag_type: flag.flag_type,
    })),
    speaker_issues: input.correctionReport.speakerIssues,
    unstructured_blocks: input.correctionReport.unstructuredBlocks,
    response_format: {
      wordSuggestions: [{
        word_id: "string",
        utterance_id: "string",
        suggestion: "string",
        reason: "string (one sentence)",
        confidence: "number 0.0-1.0",
      }],
      speakerSuggestions: [{
        speaker_id: "string",
        suggested_display_name: "string",
        suggested_role: "ATTORNEY|WITNESS|REPORTER|VIDEOGRAPHER|INTERPRETER",
        reason: "string (one sentence)",
        confidence: "number 0.0-1.0",
      }],
      structureSuggestions: [{
        utterance_id: "string",
        suggested_line_type: "Q|A|COLLOQUY|PARENTHETICAL",
        reason: "string (one sentence)",
      }],
    },
  });
}

function clampConfidence(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, numeric));
}

export function normalizeAndScore(raw: unknown): AISuggestionResult {
  const payload = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const wordSuggestions = Array.isArray(payload.wordSuggestions) ? payload.wordSuggestions : [];
  const speakerSuggestions = Array.isArray(payload.speakerSuggestions) ? payload.speakerSuggestions : [];
  const structureSuggestions = Array.isArray(payload.structureSuggestions) ? payload.structureSuggestions : [];

  return {
    wordSuggestions: wordSuggestions.map((item) => {
      const candidate = item as Record<string, unknown>;
      const confidence = clampConfidence(candidate.confidence);
      return {
        word_id: String(candidate.word_id ?? ""),
        utterance_id: String(candidate.utterance_id ?? ""),
        suggestion: String(candidate.suggestion ?? ""),
        reason: String(candidate.reason ?? ""),
        confidence,
        auto_apply: confidence >= AUTO_APPLY_THRESHOLD,
      };
    }),
    speakerSuggestions: speakerSuggestions.map((item) => {
      const candidate = item as Record<string, unknown>;
      return {
        speaker_id: String(candidate.speaker_id ?? ""),
        suggested_display_name: String(candidate.suggested_display_name ?? ""),
        suggested_role: (candidate.suggested_role ?? "REPORTER") as AISuggestionResult["speakerSuggestions"][number]["suggested_role"],
        reason: String(candidate.reason ?? ""),
        confidence: clampConfidence(candidate.confidence),
      };
    }),
    structureSuggestions: structureSuggestions.map((item) => {
      const candidate = item as Record<string, unknown>;
      return {
        utterance_id: String(candidate.utterance_id ?? ""),
        suggested_line_type: (candidate.suggested_line_type ?? "COLLOQUY") as AISuggestionResult["structureSuggestions"][number]["suggested_line_type"],
        reason: String(candidate.reason ?? ""),
      };
    }),
    promptVersion: PROMPT_VERSION,
    model: AI_SUGGESTION_MODEL,
  };
}

export async function generateAISuggestions(
  input: AISuggestionInput,
  apiKey: string,
  transport: AISuggestionTransport = anthropicFetchTransport,
): Promise<AISuggestionResult> {
  const text = await transport.createMessage({
    apiKey,
    model: AI_SUGGESTION_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM_PROMPT,
    user: buildUserMessage(input),
  });

  return normalizeAndScore(JSON.parse(text));
}

export function buildSuggestionCaseRecord(record: CaseRecord | null | undefined): AISuggestionInput["caseRecord"] {
  // Reporter identity must come from canonical case data only (§14/§57). An
  // absent reporter yields an empty string (missing) — never a fabricated
  // benchmark default.
  const reporterName = record?.reporter?.name?.value ?? "";
  const reporterCert = record?.reporter?.cert_number?.value ?? "";
  return {
    causeNumber: record?.caption?.case_number?.value ?? "",
    caseStyle: record?.caption?.case_style?.value ?? "",
    witnessName: record?.witnesses?.[0]?.name.value ?? "",
    examiningAttorney: record?.attorneys?.[0]?.name.value ?? "",
    opposingCounsel: record?.attorneys?.[1]?.name.value ?? "",
    reporterName: [reporterName, reporterCert ? `CSR No. ${reporterCert}` : ""].filter(Boolean).join(", "),
    caseType: "",
    jurisdiction: record?.caption?.county?.value ?? "",
  };
}
