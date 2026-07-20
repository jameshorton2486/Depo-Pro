import type { DeepgramConfig, DeepgramKeyterm } from "../../types/case.ts";
import { DEEPGRAM_KEYTERM_HARD_TOKEN_CAP, estimateSelectedStoredKeytermTokens } from "../keytermDerivation.ts";
import { readStoredKeytermMeta } from "../keyterms/managedKeyterms.ts";
import { formatDeepgramKeyterm } from "../format/legalText.ts";

export interface DeepgramRequestKeyterm {
  term: string;
  boost: number;
  category: string;
  source: string;
  selected: boolean;
}

export interface DeepgramRequestPreviewEnvelope {
  case_id: string;
  computed_at: string;
  deepgram_request: {
    model: string;
    punctuate: string;
    diarize_model: string;
    filler_words: string;
    numerals: string;
    utterances: string;
    utt_split: string;
    smart_format: string;
    language: string;
    mip_opt_out: string;
  };
  effective_config: { audio_profile: DeepgramConfig["audio_profile"]; expected_speaker_count: number | null };
  keyterms: Array<{
    term: string;
    boost: number;
    category: string;
    source: string;
  }>;
  keyterms_count: number;
  estimated_token_usage: number;
  estimated_token_cap: number;
  keyterms_note: string | null;
}

export interface DeepgramRequestBuildResult {
  envelope: DeepgramRequestPreviewEnvelope;
  wireKeyterms: string[];
  wireQueryString: string;
  wireUrl: string;
}

const DEEPGRAM_ENDPOINT = "https://api.deepgram.com/v1/listen";
const MAX_KEYTERMS = 100;

// System-default utterance split. Used to detect whether a stored config still
// carries the factory value (in which case the audio profile chooses a better
// endpointing window) versus a value the reporter deliberately tuned.
const FACTORY_UTT_SPLIT_SECONDS = 0.8;

// Utterance endpointing per acoustic profile. Remote/telephone audio carries
// network latency and longer inter-speaker gaps, so a slightly wider split
// reduces spurious mid-turn utterance breaks; in-room profiles keep the tighter
// default. This is the one Deepgram batch lever the profile can meaningfully
// drive today — previously audio_profile only appeared in the preview envelope
// and never reached the wire.
export const AUDIO_PROFILE_UTT_SPLIT_SECONDS: Record<DeepgramConfig["audio_profile"], number> = {
  clean: 0.8,
  courtroom: 0.8,
  remote: 1.0,
  telephone: 1.0,
};

function resolveUttSplitSeconds(config: DeepgramConfig | undefined): number {
  const audioProfile = config?.audio_profile ?? "clean";
  const profileSplit = AUDIO_PROFILE_UTT_SPLIT_SECONDS[audioProfile] ?? FACTORY_UTT_SPLIT_SECONDS;
  // Respect an explicitly tuned value; otherwise let the profile decide. A stored
  // value equal to the factory default is treated as "unset" so a chosen profile
  // still takes effect.
  if (typeof config?.utterance_split_seconds === "number" && config.utterance_split_seconds !== FACTORY_UTT_SPLIT_SECONDS) {
    return config.utterance_split_seconds;
  }
  return profileSplit;
}

// Wire defaults used only when a stored DeepgramConfig does not override a field.
// numerals is intentionally "false" to match defaultDeepgramConfig(): with
// smart_format enabled Deepgram still formats numbers in context (dates, times,
// money, cause numbers), while spelled-out counts are left for the reporter's
// number-style pass. Keep this in sync with defaultDeepgramConfig().numerals.
export const DEEPGRAM_REQUEST_PARAMS = {
  model: "nova-3",
  punctuate: "true",
  diarize_model: "latest",
  filler_words: "true",
  numerals: "false",
  utterances: "true",
  utt_split: "0.8",
  smart_format: "true",
  language: "en",
  mip_opt_out: "true",
} as const;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toDisplayBoost(boost: number): number {
  if (boost <= 1) {
    return Math.round(boost * 10);
  }

  return Math.round(boost);
}

function normalizeSelectedKeyterms(keyterms: DeepgramRequestKeyterm[]) {
  const selected = keyterms
    .filter((keyterm) => keyterm.selected)
    .map((keyterm, index) => ({
      index,
      term: formatDeepgramKeyterm(normalizeWhitespace(keyterm.term)),
      boost: keyterm.boost,
      category: keyterm.category,
      source: keyterm.source,
    }))
    .filter((keyterm) => keyterm.term.length > 0);

  const deduped: typeof selected = [];
  const seen = new Set<string>();
  for (const keyterm of selected) {
    const dedupeKey = keyterm.term.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    deduped.push(keyterm);
  }

  deduped.sort((left, right) => {
    if (right.boost !== left.boost) {
      return right.boost - left.boost;
    }
    return left.index - right.index;
  });

  return deduped;
}

export function buildDeepgramRequest(input: {
  caseId: string;
  keyterms: DeepgramRequestKeyterm[];
  config?: DeepgramConfig;
  computedAt?: string;
}): DeepgramRequestBuildResult {
  const computedAt = input.computedAt ?? new Date().toISOString();
  const normalized = normalizeSelectedKeyterms(input.keyterms);
  const wireKeyterms = normalized.slice(0, MAX_KEYTERMS).map((keyterm) => keyterm.term);
  const cutCount = normalized.length - wireKeyterms.length;
  const config = input.config;
  const requestParams: Record<string, string> = {
    ...DEEPGRAM_REQUEST_PARAMS,
    model: config?.model || DEEPGRAM_REQUEST_PARAMS.model,
    punctuate: String(config?.punctuate ?? true),
    numerals: String(config?.numerals ?? false),
    utterances: String(config?.utterances ?? true),
    utt_split: String(resolveUttSplitSeconds(config)),
    smart_format: String(config?.smart_format ?? true),
    language: config?.language || DEEPGRAM_REQUEST_PARAMS.language,
  };
  if (config?.diarize === false) {
    delete requestParams.diarize_model;
  } else {
    requestParams.diarize_model = config?.diarize_version || DEEPGRAM_REQUEST_PARAMS.diarize_model;
  }
  const params = new URLSearchParams(requestParams);

  for (const keyterm of wireKeyterms) {
    params.append("keyterm", keyterm);
  }

  const wireQueryString = params.toString();

  return {
    envelope: {
      case_id: input.caseId,
      computed_at: computedAt,
      deepgram_request: requestParams as DeepgramRequestPreviewEnvelope["deepgram_request"],
      effective_config: {
        audio_profile: config?.audio_profile ?? "clean",
        expected_speaker_count: config?.speaker_count ?? null,
      },
      keyterms: normalized.map((keyterm) => ({
        term: keyterm.term,
        boost: toDisplayBoost(keyterm.boost),
        category: keyterm.category,
        source: keyterm.source,
      })),
      keyterms_count: normalized.length,
      estimated_token_usage: normalized.reduce((sum, keyterm) => sum + keyterm.term.trim().split(/\s+/).filter(Boolean).length + 1, 0),
      estimated_token_cap: DEEPGRAM_KEYTERM_HARD_TOKEN_CAP,
      keyterms_note:
        cutCount > 0
          ? `${cutCount} keyterms were excluded from the wire request after the 100-term cap.`
          : null,
    },
    wireKeyterms,
    wireQueryString,
    wireUrl: `${DEEPGRAM_ENDPOINT}?${wireQueryString}`,
  };
}

export function buildDeepgramRequestFromStoredKeyterms(input: {
  caseId: string;
  keyterms: DeepgramKeyterm[];
  config?: DeepgramConfig;
  computedAt?: string;
}): DeepgramRequestBuildResult {
  const request = buildDeepgramRequest({
    caseId: input.caseId,
    computedAt: input.computedAt,
    config: input.config,
    keyterms: input.keyterms.map((keyterm) => {
      const meta = readStoredKeytermMeta(keyterm.notes ?? "");
      return {
        term: keyterm.term,
        boost: keyterm.boost,
        category: keyterm.category,
        source: meta.source ?? "manual",
        selected: meta.selected ?? true,
      };
    }),
  });

  request.envelope.estimated_token_usage = estimateSelectedStoredKeytermTokens(input.keyterms);
  return request;
}
