// AI Review "bridge" (ATIA §4.9 / Phase-4 bridge).
//
// The temporary single-prompt path that makes the AI Review button actually
// produce corrections. It is the target architecture at small scale: it returns
// CorrectionObjects (never a rewritten transcript), validated against the shared
// contract in correctionObject.ts. When the full TIE lands, the one bridge prompt
// is replaced by the specialty prompt library and a scheduler — everything below
// the prompt (schema, validation, persistence, panel) already works.
//
// CANONICAL PROMPT SOURCE: BRIDGE_SYSTEM_PROMPT below. This constant IS the
// governed prompt — the Deno Edge runtime sends it directly, so runtime consumption
// cannot drift from a separate file. @v2 reconciled the runtime prompt against the
// historical design doc transcript_formatter/prompts/bridge/full_review.md (DOC-0327),
// recovering four requirements lost when the prompt was condensed to @v1: the
// out-of-scope-specialty exclusion, precision-over-recall, confidence-band
// calibration, and medical-ambiguity handling. The .md is retained as historical
// evidence ONLY until the transcript_formatter/ deletion gate (DOC-0326) — it is no
// longer canonical. Prompt-content invariants are guarded by
// aiCorrectionBridgePrompt.test.ts so a future condense cannot silently drop them.

import type { EditorDocument } from "../../api/types";
import { PRIMARY_MODEL } from "../aiModels";
import {
  type CorrectionObject,
  collectCorrectionErrors,
  newCorrectionId,
} from "./correctionObject";

// Bridge-specific transport: unlike the word-suggestion transport it returns
// token usage + latency, so the Edge Function can persist run-level cost
// accounting (correction_runs) from the very first call.
export interface BridgeTransport {
  createMessage(input: {
    apiKey: string;
    model: string;
    max_tokens: number;
    temperature: number;
    system: string;
    user: string;
  }): Promise<{ text: string; tokensIn: number; tokensOut: number; latencyMs: number }>;
}

export const anthropicBridgeTransport: BridgeTransport = {
  async createMessage(input) {
    const started = Date.now();
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
      throw new Error(`Anthropic bridge request failed: ${response.status} ${text}`);
    }
    const payload = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = payload.content?.find((item) => item.type === "text")?.text;
    if (!text) {
      throw new Error("Unexpected response type from AI bridge");
    }
    return {
      text,
      tokensIn: payload.usage?.input_tokens ?? 0,
      tokensOut: payload.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  },
};

export const BRIDGE_PROMPT_VERSION = "bridge/full_review@v2";
export const BRIDGE_MODEL = PRIMARY_MODEL;

export const BRIDGE_SYSTEM_PROMPT = `You are the AI editor inside Depo-Pro, reviewing a Texas civil deposition transcript from Deepgram speech-to-text. You behave exactly as an expert court reporter's editing assistant handed the raw transcript.

You are an EDITOR, not a formatter. You NEVER rewrite or return the transcript. You return ONLY a list of discrete, individually-reviewable corrections against the immutable canonical baseline.

Return valid JSON only — no prose, no markdown, no code fences: { "corrections": [ <correction>, ... ] }.
Each <correction> has: specialty, location {paragraph_id, start_word_id, end_word_id}, change {type, ...}, reason (specific, 10-500 chars, cite evidence), reason_kind, confidence (0-1), confidence_source. Point every correction at real word_id values from the input; never invent IDs.

Propose ONLY these four kinds (v1). Everything else in the correction schema — objections, examination-section changes, off-record boundaries, inconsistency flags — is OUT OF SCOPE for the bridge; do not emit it.
1. Speaker identity — specialty "speaker_reassignment", change.type "speaker_reassignment", structural_change {new_speaker_role, display_name}. Humanize generic SPEAKER 0 / SPEAKER 1 into real names + roles from the appearances/colloquy and opening statements ("MR. OLVERA:", "THE WITNESS", "THE VIDEOGRAPHER", "THE REPORTER"). If you cannot identify a name, propose the ROLE only — never guess a surname.
2. Merged Q/A split — specialty "qa_split", change.type "qa_split", structural_change {split_after_word_id, new_q_paragraph_speaker_id, new_a_paragraph_speaker_id}. Use when one speaker block contains both a question and its answer; mark the split point.
3. Proper-name correction — specialty "proper_name_novel", change.type "proper_name_correction", before/after. Apply the provided registry/confirmed_spellings first; for a name NOT in the registry, propose a phonetically-likely spelling with lower confidence and reason_kind "phonetic_similarity".
4. Medical terminology — specialty "medical_context", change.type "medical_term_correction", before/after. Correct clear misrecognitions; when a term is genuinely ambiguous between two valid terms, use lower confidence and explain both in the reason.

Use the registry and recent_accepted inputs: do not re-propose what is already resolved; match the reporter's demonstrated preferences.

METHOD:
- Prefer precision over recall: a wrong correction costs the reporter more than a missed one.
- Set confidence honestly. Below 0.5 the UI marks a correction low-confidence and requires an explicit accept — use that band for real-but-uncertain calls rather than withholding them.

ABSOLUTE RULES:
- Never return a rewritten transcript or any non-correction text.
- Never change ambiguous testimony wording.
- Never touch verbatim-protected tokens: uh, um, ah, uh-huh, uh-uh, mm-hmm, yeah, yep, nope, nah, gonna, kinda, wanna, gotta, y'all; stutters/false starts; grammatical errors; profanity.
- Leave dollar amounts, dates, and numbers alone.
- Never invent a name (role-only when unsure).
- Never give a generic reason ("improved clarity") — cite specific evidence. Generic reasons are rejected.`;

export interface BridgeReviewContext {
  case: {
    causeNumber: string;
    caseStyle: string;
    witnessName: string;
    examiningAttorney: string;
    opposingCounsel: string;
    reporterName: string;
    jurisdiction: string;
  };
  confirmedSpellings?: Record<string, string>;
  registryProperNames?: Array<{ wrong: string; right: string; id: string }>;
  recentAccepted?: Array<{ specialty: string; before?: string; after?: string; reason: string }>;
}

export interface BridgeParagraph {
  paragraph_id: string;
  speaker_id: string;
  speaker_label: string;
  words: Array<{ word_id: string; text: string; confidence: number }>;
}

// Project the canonical document into the bridge input. One paragraph per
// utterance; raw_text only (Layer-0 verbatim — never working/AI text).
export function buildBridgeParagraphs(doc: EditorDocument): BridgeParagraph[] {
  const wordById = new Map(doc.words.map((w) => [w.word_id, w]));
  const speakerLabel = new Map(
    doc.speakers.map((s, i) => [
      s.speaker_id,
      typeof s.deepgram_speaker === "number" ? `SPEAKER ${s.deepgram_speaker}` : (s.display_name || `SPEAKER ${i}`),
    ]),
  );

  return doc.utterances.map((utt) => ({
    paragraph_id: utt.utterance_id,
    speaker_id: utt.speaker_id,
    speaker_label: speakerLabel.get(utt.speaker_id) ?? utt.speaker_id,
    words: utt.word_ids
      .map((wid) => wordById.get(wid))
      .filter((w): w is NonNullable<typeof w> => Boolean(w) && Boolean(w!.raw_text))
      .map((w) => ({ word_id: w.word_id, text: w.raw_text, confidence: w.confidence })),
  }));
}

export function buildBridgeUserMessage(input: {
  transcriptId: string;
  caseId: string;
  context: BridgeReviewContext;
  paragraphs: BridgeParagraph[];
}): string {
  return JSON.stringify({
    transcript_id: input.transcriptId,
    case_id: input.caseId,
    case: input.context.case,
    registry: {
      proper_names: input.context.registryProperNames ?? [],
      confirmed_spellings: input.context.confirmedSpellings ?? {},
    },
    recent_accepted: input.context.recentAccepted ?? [],
    paragraphs: input.paragraphs,
  });
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface BridgeGenerationResult {
  corrections: CorrectionObject[];
  rejected: Array<{ raw: unknown; errors: string[] }>;
  model: string;
  promptVersion: string;
  contextHash: string;
  // Run-level cost accounting (persisted to correction_runs). Zero on the
  // parse-only path (populated by generateBridgeCorrections from the transport).
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

// Merge model-produced correction fields with backend-supplied provenance/ids,
// validate against the shared contract, and split valid from rejected. Invalid
// corrections are dropped (never persisted) but returned for observability.
export async function parseAndValidateBridgeCorrections(
  rawText: string,
  meta: { transcriptId: string; caseId: string; userMessage: string; generatedAt: string },
): Promise<BridgeGenerationResult> {
  const contextHash = "sha256:" + (await sha256Hex(meta.userMessage));
  const emptyStats = { model: BRIDGE_MODEL, promptVersion: BRIDGE_PROMPT_VERSION, contextHash, tokensIn: 0, tokensOut: 0, latencyMs: 0 };
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { corrections: [], rejected: [{ raw: rawText, errors: ["bridge response was not valid JSON"] }], ...emptyStats };
  }

  const list = (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).corrections))
    ? ((parsed as Record<string, unknown>).corrections as unknown[])
    : [];

  const corrections: CorrectionObject[] = [];
  const rejected: BridgeGenerationResult["rejected"] = [];

  for (const item of list) {
    const partial = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const candidate = {
      ...partial,
      id: newCorrectionId(),
      transcript_id: meta.transcriptId,
      case_id: meta.caseId,
      prompt_version: BRIDGE_PROMPT_VERSION,
      provenance: {
        source: "ai",
        provider: "anthropic",
        model: BRIDGE_MODEL,
        prompt_versions: { "bridge/full_review": "v1" },
        context_hash: contextHash,
        generated_at: meta.generatedAt,
      },
      review: { state: "pending", decided_by: null, decided_at: null, decision_note: null, final_value: null },
      downstream: { applied_to_working_transcript: false, applied_at: null, reverted_at: null },
    } as Record<string, unknown>;

    const errors = collectCorrectionErrors(candidate);
    if (errors.length === 0) {
      corrections.push(candidate as unknown as CorrectionObject);
    } else {
      rejected.push({ raw: item, errors });
    }
  }

  return { corrections, rejected, ...emptyStats };
}

export async function generateBridgeCorrections(
  input: {
    transcriptId: string;
    caseId: string;
    context: BridgeReviewContext;
    paragraphs: BridgeParagraph[];
    generatedAt: string;
  },
  apiKey: string,
  transport: BridgeTransport = anthropicBridgeTransport,
): Promise<BridgeGenerationResult> {
  const userMessage = buildBridgeUserMessage(input);
  const call = await transport.createMessage({
    apiKey,
    model: BRIDGE_MODEL,
    max_tokens: 8192,
    temperature: 0,
    system: BRIDGE_SYSTEM_PROMPT,
    user: userMessage,
  });
  const result = await parseAndValidateBridgeCorrections(call.text, {
    transcriptId: input.transcriptId,
    caseId: input.caseId,
    userMessage,
    generatedAt: input.generatedAt,
  });
  // Fold the transport's run-level cost measurements into the result.
  return { ...result, tokensIn: call.tokensIn, tokensOut: call.tokensOut, latencyMs: call.latencyMs };
}
