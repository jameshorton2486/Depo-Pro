import type { CaseRecord } from "../../types/case";
import {
  LEGAL_OBJECTION_GARBLE_MAP,
  looksLikeImplausibleMoney,
  MEDICAL_GARBLE_MAP,
  METADATA_MULTIWORD_CORRECTIONS,
} from "./correctionRegistry";

export type CorrectionAuthority =
  | "DETERMINISTIC_REGISTRY"
  | "CONFIRMED_SPELLING"
  | "MEDICAL_DICTIONARY"
  | "AI_CONTEXTUAL";

export interface CorrectionEngineWord {
  word_id: string;
  utterance_id: string;
  raw_text: string;
  working_text?: string | null;
  text?: string;
  sequence_number?: number;
}

export interface CorrectionEngineBlock {
  utterance_id: string;
  utterance_index: number;
  sequence_number: number;
  block_type: "Q" | "A" | "SP" | "PN" | "HEADER";
  speaker_id: string;
  display_name: string;
  text: string;
  words: CorrectionEngineWord[];
}

export interface CorrectionLogEntry {
  word_id: string;
  original: string;
  corrected: string;
  confidence: number;
  authority: CorrectionAuthority;
  rule_id: string;
  reason: string;
  evidence: string;
}

export interface ScopistFlag {
  category: "VERIFY_SPELLING" | "VERIFY_AUDIO" | "VERIFY_SPEAKER" | "CONFLICT" | "INAUDIBLE" | "VERIFY_CASE_FILE" | "MONEY_AMOUNT";
  flag_text: string;
  utterance_id: string;
  word_id?: string;
  description: string;
}

export interface AiSuggestion {
  word_id: string;
  utterance_id: string;
  original: string;
  suggestion?: string;
  confidence: number;
  auto_apply: boolean;
  reason: string;
  authority: string;
}

export interface AiReviewResult {
  suggestions: AiSuggestion[];
  flags: Array<{ word_id: string; utterance_id: string; original: string; flag_text: string; reason: string }>;
  metrics: {
    reviewed: number;
    auto_applied: number;
    pending_review: number;
    flagged_only: number;
  };
}

export interface CorrectionEngineClient {
  completeJson<T>(input: {
    promptId: "4-E";
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<T>;
}

const VERBATIM_PROTECTED = new Set([
  "uh", "um", "ah", "er", "like", "you", "know", "i", "mean", "basically", "so", "well",
  "uh-huh", "uh-uh", "mm-hmm", "yeah", "yep", "nope", "nah", "gonna", "kinda", "wanna", "gotta", "lemme", "y'all",
]);

function currentWordText(word: CorrectionEngineWord): string {
  return word.working_text ?? word.text ?? word.raw_text;
}

function replaceAll(text: string, search: string, replacement: string): string {
  return text.split(search).join(replacement);
}

function pushLog(
  target: CorrectionLogEntry[],
  word_id: string,
  original: string,
  corrected: string,
  confidence: number,
  authority: CorrectionAuthority,
  rule_id: string,
  reason: string,
  evidence: string,
): void {
  target.push({ word_id, original, corrected, confidence, authority, rule_id, reason, evidence });
}

export function applyMetadataCorrections(blocks: CorrectionEngineBlock[]): { blocks: CorrectionEngineBlock[]; corrections: CorrectionLogEntry[] } {
  const corrections: CorrectionLogEntry[] = [];

  const nextBlocks = blocks.map((block) => {
    let nextText = block.text;
    let nextWords = [...block.words];

    for (const rule of METADATA_MULTIWORD_CORRECTIONS) {
      if (!rule.pattern.test(nextText)) {
        continue;
      }
      rule.pattern.lastIndex = 0;
      nextText = nextText.replace(rule.pattern, rule.replacement);
      const firstWord = nextWords[0];
      if (firstWord) {
        pushLog(corrections, firstWord.word_id, block.text, nextText, 1, "DETERMINISTIC_REGISTRY", rule.rule_id, rule.reason, `Pattern match: ${rule.pattern}`);
      }
    }

    if (/^They do\.$/i.test(nextText.trim())) {
      const firstWord = nextWords[0];
      if (firstWord) {
        pushLog(corrections, firstWord.word_id, nextText, "I do.", 1, "DETERMINISTIC_REGISTRY", "OATH_RESPONSE_GARBLE", "Oath response garble", "Standalone oath response");
      }
      nextText = "I do.";
    }

    nextWords = nextWords.map((word, index) => {
      let text = currentWordText(word);
      if (index === 0 && /^They$/i.test(text) && /^I do\.$/i.test(nextText)) {
        text = "I";
      } else if (index === 1 && /^do\.?$/i.test(text) && /^I do\.$/i.test(nextText)) {
        text = "do.";
      }
      return { ...word, working_text: text === word.raw_text ? null : text, text };
    });

    return { ...block, text: nextText, words: nextWords };
  });

  return { blocks: nextBlocks, corrections };
}

export function applyConfirmedSpellings(
  blocks: CorrectionEngineBlock[],
  confirmedSpellings: Record<string, string>,
  applyBeforeUtteranceIndex: number,
): { blocks: CorrectionEngineBlock[]; corrections: CorrectionLogEntry[] } {
  const corrections: CorrectionLogEntry[] = [];
  const entries = Object.entries(confirmedSpellings);

  const nextBlocks = blocks.map((block) => {
    if (block.sequence_number >= applyBeforeUtteranceIndex) {
      return block;
    }

    const nextWords = block.words.map((word) => {
      let text = currentWordText(word);
      for (const [source, replacement] of entries) {
        const pattern = new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        if (!pattern.test(text)) {
          continue;
        }
        pattern.lastIndex = 0;
        const replaced = text.replace(pattern, replacement);
        if (replaced !== text) {
          pushLog(corrections, word.word_id, text, replaced, 1, "CONFIRMED_SPELLING", "CONFIRMED_SPELLING", "Confirmed on record spelling", `Confirmed spelling ${source} -> ${replacement}`);
          text = replaced;
        }
      }
      return { ...word, working_text: text === word.raw_text ? null : text, text };
    });

    return {
      ...block,
      words: nextWords,
      text: nextWords.map((word) => currentWordText(word)).join(" "),
    };
  });

  return { blocks: nextBlocks, corrections };
}

export function applyLegalPhraseCorrections(blocks: CorrectionEngineBlock[]): { blocks: CorrectionEngineBlock[]; corrections: CorrectionLogEntry[] } {
  const corrections: CorrectionLogEntry[] = [];
  const nextBlocks = blocks.map((block) => {
    if (block.block_type !== "SP" || !/objection|injection|infection|direction|action|exit/i.test(block.text)) {
      return block;
    }

    let nextText = block.text;
    for (const [source, replacement] of Object.entries(LEGAL_OBJECTION_GARBLE_MAP)) {
      nextText = replaceAll(nextText, source, replacement);
    }

    if (nextText !== block.text) {
      const firstWord = block.words[0];
      if (firstWord) {
        pushLog(corrections, firstWord.word_id, block.text, nextText, 1, "DETERMINISTIC_REGISTRY", "LEGAL_PHRASE_GARBLE", "Objection phrase garble", "SP objection block normalization");
      }
    }

    return { ...block, text: nextText };
  });

  return { blocks: nextBlocks, corrections };
}

export function applyMedicalPhraseCorrections(
  blocks: CorrectionEngineBlock[],
  caseType: string | null | undefined,
): { blocks: CorrectionEngineBlock[]; corrections: CorrectionLogEntry[] } {
  const normalizedCaseType = (caseType ?? "").toLowerCase();
  if (!normalizedCaseType.includes("medical") && !normalizedCaseType.includes("personal_injury")) {
    return { blocks, corrections: [] };
  }

  const corrections: CorrectionLogEntry[] = [];
  const nextBlocks = blocks.map((block) => {
    let nextText = block.text;
    for (const [source, replacement] of Object.entries(MEDICAL_GARBLE_MAP)) {
      nextText = replaceAll(nextText, source, replacement);
    }

    if (nextText !== block.text) {
      const firstWord = block.words[0];
      if (firstWord) {
        pushLog(corrections, firstWord.word_id, block.text, nextText, 0.99, "MEDICAL_DICTIONARY", "MEDICAL_GARBLE", "Medical terminology garble", `Dictionary replacement in ${caseType ?? "unknown"} context`);
      }
    }

    return { ...block, text: nextText };
  });

  return { blocks: nextBlocks, corrections };
}

export async function applyAiContextualCorrections(
  blocks: CorrectionEngineBlock[],
  caseMetadata: CaseRecord | null | undefined,
  caseType: string | null | undefined,
  client?: CorrectionEngineClient,
): Promise<AiReviewResult> {
  const ambiguousWords = blocks.flatMap((block) =>
    block.words.filter((word) => {
      const text = currentWordText(word).toLowerCase();
      return !VERBATIM_PROTECTED.has(text);
    }),
  ).slice(0, 60);

  if (client) {
    return client.completeJson<AiReviewResult>({
      promptId: "4-E",
      system: "Correction engine prompt 4-E",
      user: JSON.stringify({ blocks, caseMetadata, caseType, ambiguousWords }),
      maxTokens: 2048,
    });
  }

  const suggestions: AiSuggestion[] = [];
  const flags: AiReviewResult["flags"] = [];

  for (const word of ambiguousWords) {
    const text = currentWordText(word);
    if (VERBATIM_PROTECTED.has(text.toLowerCase())) {
      continue;
    }

    if (looksLikeImplausibleMoney(text) && /fee|salary|hour|paid/i.test(blocks.find((block) => block.utterance_id === word.utterance_id)?.text ?? "")) {
      flags.push({
        word_id: word.word_id,
        utterance_id: word.utterance_id,
        original: text,
        flag_text: `[SCOPIST: FLAG ${flags.length + 1}: MONEY_AMOUNT — Verify amount — '${text}' may be '${text.replace(".50", "50")}' — verify from audio]`,
        reason: "Dollar amount under $50 in professional context",
      });
      continue;
    }

    if (/raiding/i.test(text)) {
      suggestions.push({
        word_id: word.word_id,
        utterance_id: word.utterance_id,
        original: text,
        suggestion: "radiating",
        confidence: 0.93,
        auto_apply: true,
        reason: "Medical context makes 'radiating' unambiguous.",
        authority: "CONTEXTUAL_MEDICAL_TERM",
      });
      continue;
    }

    if (/accent/i.test(text)) {
      flags.push({
        word_id: word.word_id,
        utterance_id: word.utterance_id,
        original: text,
        flag_text: `[SCOPIST: FLAG ${flags.length + 1}: VERIFY_AUDIO — Verify from audio — '${text}' is unclear]`,
        reason: "Ambiguous contextual token below confidence threshold",
      });
      continue;
    }
  }

  return {
    suggestions,
    flags,
    metrics: {
      reviewed: ambiguousWords.length,
      auto_applied: suggestions.filter((item) => item.auto_apply && item.confidence >= 0.92).length,
      pending_review: suggestions.filter((item) => !item.auto_apply && item.confidence >= 0.85).length,
      flagged_only: flags.length,
    },
  };
}

export function applyAiSuggestionsToBlocks(
  blocks: CorrectionEngineBlock[],
  suggestions: AiSuggestion[],
): CorrectionEngineBlock[] {
  const byWordId = new Map(suggestions.filter((item) => item.suggestion).map((item) => [item.word_id, item]));
  return blocks.map((block) => {
    const nextWords = block.words.map((word) => {
      const suggestion = byWordId.get(word.word_id);
      if (!suggestion || !suggestion.suggestion || suggestion.confidence < 0.92 || !suggestion.auto_apply) {
        return word;
      }
      return {
        ...word,
        working_text: suggestion.suggestion === word.raw_text ? null : suggestion.suggestion,
        text: suggestion.suggestion,
      };
    });
    return { ...block, words: nextWords, text: nextWords.map((word) => currentWordText(word)).join(" ") };
  });
}

export function generateScopistFlags(input: {
  blocks: CorrectionEngineBlock[];
  keyterms?: string[];
  confirmedSpellings?: Record<string, string>;
  ambiguousSpeakerIds?: string[];
  caseMetadata?: CaseRecord | null;
}): ScopistFlag[] {
  const keyterms = new Set((input.keyterms ?? []).map((term) => term.toLowerCase()));
  const confirmed = new Set(Object.keys(input.confirmedSpellings ?? {}).map((term) => term.toLowerCase()));
  const flags: ScopistFlag[] = [];

  for (const block of input.blocks) {
    if (input.ambiguousSpeakerIds?.includes(block.speaker_id)) {
      flags.push({
        category: "VERIFY_SPEAKER",
        utterance_id: block.utterance_id,
        description: "Utterance attribution is ambiguous",
        flag_text: `[SCOPIST: FLAG ${flags.length + 1}: VERIFY_SPEAKER — Verify speaker — this block may be reassigned]`,
      });
    }

    for (const word of block.words) {
      const text = currentWordText(word);
      if (/^[A-Z][a-z]{5,}$/.test(text) && !keyterms.has(text.toLowerCase()) && !confirmed.has(text.toLowerCase())) {
        flags.push({
          category: "VERIFY_SPELLING",
          utterance_id: block.utterance_id,
          word_id: word.word_id,
          description: `Verify spelling of '${text}'`,
          flag_text: `[SCOPIST: FLAG ${flags.length + 1}: VERIFY_SPELLING — Verify spelling of '${text}' — likely proper noun]`,
        });
        break;
      }
    }
  }

  return flags;
}
