import type { PersistedLineType } from "./structuredTranscript";

export type DepositionRegion = "CAPTION" | "PROCEEDINGS" | "TESTIMONY" | "CERTIFICATION";

export interface DepositionRegionLineInput {
  utteranceId: string;
  text: string;
  persistedLineType?: PersistedLineType | null;
  role?: string | null;
}

const PROCEEDINGS_START_PATTERNS = [
  /^PROCEEDINGS$/i,
  /\bthis is cause number\b/i,
  /\bwe are on the record\b/i,
  /\btoday'?s date is\b/i,
  /\bthe time is now\b/i,
  /\bbeginning of the deposition\b/i,
  /\bwill the court reporter please\b/i,
  /\braise your right hand\b/i,
  /\bsolemnly swear\b/i,
  /\bsolemnly affirm\b/i,
] as const;

const CAPTION_LINE_PATTERNS = [
  /^CAUSE NO\./i,
  /^IN THE DISTRICT COURT$/i,
  /^\)+$/,
  /^VS\.?$/i,
  /\bPlaintiff,?$/i,
  /\bDefendants?\.?$/i,
  /\bJUDICIAL DISTRICT$/i,
  /^[A-Z0-9 ,.'&;-]+,$/,
] as const;

const TESTIMONY_START_PATTERNS = [
  /^\(Whereupon,\s+the deposition commenced/i,
  /^EXAMINATION$/i,
  /^CROSS-EXAMINATION$/i,
  /^REDIRECT(?:\s+EXAMINATION)?$/i,
  /^RECROSS(?:-EXAMINATION)?$/i,
  /^BY\s+(MR|MS|MRS)\./i,
  /^Q\.$/i,
  /^A\.$/i,
] as const;

const CERTIFICATION_START_PATTERNS = [
  /^CHANGES AND SIGNATURE$/i,
  /^WITNESS NAME:/i,
  /^PAGE\s+LINE\s+CHANGE/i,
  /^I,\s+.+have read the foregoing deposition/i,
  /^THE STATE OF\b/i,
  /^COUNTY OF\b/i,
  /^Before me,/i,
  /^Given under my hand and seal of office/i,
  /^NOTARY PUBLIC IN AND FOR/i,
] as const;

function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isProceedingsStart(text: string): boolean {
  return matchesAny(text, PROCEEDINGS_START_PATTERNS);
}

function isCaptionLine(text: string): boolean {
  return matchesAny(text, CAPTION_LINE_PATTERNS);
}

function isTestimonyStart(
  text: string,
  persistedLineType?: PersistedLineType | null,
  role?: string | null,
): boolean {
  if (persistedLineType === "Q" || persistedLineType === "A" || role === "q" || role === "a") {
    return true;
  }

  return matchesAny(text, TESTIMONY_START_PATTERNS);
}

function isCertificationStart(text: string): boolean {
  return matchesAny(text, CERTIFICATION_START_PATTERNS);
}

export function classifyDepositionRegions(
  lines: DepositionRegionLineInput[],
): Map<string, DepositionRegion> {
  const regionByUtteranceId = new Map<string, DepositionRegion>();
  let currentRegion: DepositionRegion = "CAPTION";

  for (const line of lines) {
    const text = line.text.trim();

    if (text.length === 0) {
      regionByUtteranceId.set(line.utteranceId, currentRegion);
      continue;
    }

    if (currentRegion !== "CERTIFICATION" && isCertificationStart(text)) {
      currentRegion = "CERTIFICATION";
    } else if (currentRegion === "CAPTION" && isCaptionLine(text)) {
      currentRegion = "CAPTION";
    } else if (currentRegion === "CAPTION" && isProceedingsStart(text)) {
      currentRegion = "PROCEEDINGS";
    } else if ((currentRegion === "CAPTION" || currentRegion === "PROCEEDINGS") && isTestimonyStart(text, line.persistedLineType, line.role)) {
      currentRegion = "TESTIMONY";
    }

    regionByUtteranceId.set(line.utteranceId, currentRegion);
  }

  return regionByUtteranceId;
}
