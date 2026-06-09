import type { DeepgramKeyterm } from "../../types/case.ts";
import { DEEPGRAM_KEYTERM_HARD_TOKEN_CAP, estimateSelectedStoredKeytermTokens } from "../keytermDerivation.ts";
import { readStoredKeytermMeta } from "../keyterms/managedKeyterms.ts";

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
    paragraphs: string;
    diarize: string;
    filler_words: string;
    utterances: string;
    smart_format: string;
    mip_opt_out: string;
  };
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

export const DEEPGRAM_REQUEST_PARAMS = {
  model: "nova-3",
  punctuate: "true",
  paragraphs: "true",
  diarize: "true",
  filler_words: "true",
  utterances: "true",
  smart_format: "true",
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
      term: normalizeWhitespace(keyterm.term),
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
  computedAt?: string;
}): DeepgramRequestBuildResult {
  const computedAt = input.computedAt ?? new Date().toISOString();
  const normalized = normalizeSelectedKeyterms(input.keyterms);
  const wireKeyterms = normalized.slice(0, MAX_KEYTERMS).map((keyterm) => keyterm.term);
  const cutCount = normalized.length - wireKeyterms.length;
  const params = new URLSearchParams(DEEPGRAM_REQUEST_PARAMS);

  for (const keyterm of wireKeyterms) {
    params.append("keyterm", keyterm);
  }

  const wireQueryString = params.toString();

  return {
    envelope: {
      case_id: input.caseId,
      computed_at: computedAt,
      deepgram_request: { ...DEEPGRAM_REQUEST_PARAMS },
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
  computedAt?: string;
}): DeepgramRequestBuildResult {
  const request = buildDeepgramRequest({
    caseId: input.caseId,
    computedAt: input.computedAt,
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
