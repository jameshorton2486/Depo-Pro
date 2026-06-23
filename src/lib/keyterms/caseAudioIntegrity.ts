import type { CaseRecord } from "../../types/case.ts";
import { deriveCaseReferenceTerms } from "../keytermDerivation.ts";

const AUDIO_FILENAME_STOP_TOKENS = new Set([
  "a",
  "an",
  "and",
  "audio",
  "clip",
  "conference",
  "copy",
  "date",
  "depo",
  "deposition",
  "doctor",
  "draft",
  "dr",
  "edited",
  "final",
  "for",
  "hearing",
  "in",
  "md",
  "mp3",
  "mp4",
  "m4a",
  "of",
  "on",
  "part",
  "record",
  "recording",
  "remote",
  "session",
  "source",
  "take",
  "the",
  "v",
  "version",
  "video",
  "vs",
  "wav",
  "webm",
]);

export interface CaseAudioIntegrityResult {
  ok: boolean;
  matchedTokens: string[];
  unmatchedDistinctiveTokens: string[];
}

function normalizeStem(filename: string): string {
  return filename
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return value
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function isDistinctiveFilenameToken(token: string): boolean {
  if (token.length <= 2) {
    return false;
  }

  if (/^\d+$/.test(token)) {
    return false;
  }

  return !AUDIO_FILENAME_STOP_TOKENS.has(token);
}

function buildReferenceTokenSet(record: CaseRecord): Set<string> {
  const references = deriveCaseReferenceTerms(record);
  const tokens = new Set<string>();

  for (const reference of references) {
    const normalized = reference.trim().toLowerCase();
    if (normalized) {
      tokens.add(normalized);
    }

    for (const token of tokenize(reference)) {
      if (isDistinctiveFilenameToken(token)) {
        tokens.add(token);
      }
    }
  }

  return tokens;
}

export function validateCaseAudioIntegrity(record: CaseRecord, originalFilename: string): CaseAudioIntegrityResult {
  const referenceTokens = buildReferenceTokenSet(record);
  const distinctiveTokens = Array.from(new Set(
    tokenize(normalizeStem(originalFilename)).filter((token) => isDistinctiveFilenameToken(token)),
  ));

  const matchedTokens = distinctiveTokens.filter((token) => referenceTokens.has(token));
  const unmatchedDistinctiveTokens = distinctiveTokens.filter((token) => !referenceTokens.has(token));

  if (distinctiveTokens.length < 2) {
    return {
      ok: true,
      matchedTokens,
      unmatchedDistinctiveTokens,
    };
  }

  return {
    ok: matchedTokens.length > 0,
    matchedTokens,
    unmatchedDistinctiveTokens,
  };
}

export function assertCaseAudioIntegrity(record: CaseRecord, originalFilename: string): void {
  const result = validateCaseAudioIntegrity(record, originalFilename);
  if (result.ok) {
    return;
  }

  throw new Error(
    `Audio filename appears inconsistent with case-derived keyterms: ${result.unmatchedDistinctiveTokens.join(", ") || originalFilename}`,
  );
}
