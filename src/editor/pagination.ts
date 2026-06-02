// UFM-style pagination: groups utterances into 25-line pages.
// Line counts are estimated from word count; exact reflow requires DOM measurement.
//
// Standard UFM geometry:
//   25 numbered lines per page
//   ~58 usable characters per text line (after Q./A. prefix and margins)
//   Average word length ≈ 5.5 chars + 1 space = 6.5 chars/word
//
// The page number and per-page line number from this module are written into
// each UtteranceNode's attrs so they survive TipTap serialisation.

import type { Speaker } from "../api/types";

export const LINES_PER_PAGE = 25;
const CHARS_PER_LINE = 58;
const AVG_CHARS_PER_WORD = 6.5;

export type BlockRole = "Q" | "A" | "COLLOQUY";

export function getBlockRole(role: Speaker["role"] | null | undefined): BlockRole {
  if (role === "WITNESS") return "A";
  if (role === "ATTORNEY") return "Q";
  return "COLLOQUY";
}

/**
 * Estimates the number of transcript lines an utterance occupies.
 *
 * Layout rules:
 *  Q / A: 1 blank line + text lines (prefix "Q.  " / "A.  " counts toward first line)
 *  COLLOQUY: 1 blank + 1 speaker-name line + text lines
 */
export function estimateLineCount(wordCount: number, role: BlockRole): number {
  const estimatedChars = Math.max(1, wordCount) * AVG_CHARS_PER_WORD;
  const textLines = Math.ceil(estimatedChars / CHARS_PER_LINE);

  if (role === "Q" || role === "A") {
    return 1 + textLines; // 1 blank before + wrapped text
  }
  return 1 + 1 + textLines; // 1 blank + speaker-name line + wrapped text
}

export interface PageInfo {
  pageNumber: number;  // 1-based
  lineInPage: number;  // 1-based within page
}

/**
 * Assigns each utterance a page number and starting line within that page.
 * Returns a Map keyed by utterance_id.
 *
 * A single utterance is never split across pages: if it won't fit on the
 * current page it starts a new one (matching UFM convention).
 */
export function buildPages(
  utterances: Array<{
    utterance_id: string;
    speaker_id: string;
    wordCount: number;
  }>,
  speakerRoles: Map<string, Speaker["role"] | undefined>
): Map<string, PageInfo> {
  const result = new Map<string, PageInfo>();

  let pageNumber = 1;
  let lineUsed = 0; // lines consumed on the current page

  for (const utt of utterances) {
    const rawRole = speakerRoles.get(utt.speaker_id);
    const role = getBlockRole(rawRole);
    const lines = estimateLineCount(utt.wordCount, role);

    // Start a new page if this utterance won't fit (and there's already content)
    if (lineUsed > 0 && lineUsed + lines > LINES_PER_PAGE) {
      pageNumber++;
      lineUsed = 0;
    }

    result.set(utt.utterance_id, {
      pageNumber,
      lineInPage: lineUsed + 1,
    });

    lineUsed += lines;
  }

  return result;
}
