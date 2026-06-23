import type { EditorDocument } from "../../api/types";
import { buildPages, getBlockRole } from "../../editor/pagination";
import type {
  AbbreviationRegistry,
  FormattedDocument,
  FormattedLine,
  GeometryProfile,
} from "./types";

type DisplaySegment = {
  utterance_id: string;
  segment_index: number;
  segment_count: number;
  speaker_id: string;
  word_ids: string[];
};

type RawSegment = {
  speaker_id: string;
  word_ids: string[];
};

const MIN_SEGMENT_WORDS = 2;
const LOW_CONFIDENCE_THRESHOLD = 0.70;
const MONTH_NAMES = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);
const DIRECT_ADDRESS_TITLES = new Map([
  ["doctor", "Doctor"],
  ["judge", "Judge"],
  ["counselor", "Counselor"],
]);
const SIMPLE_NUMBER_WORDS = new Map<string, number>([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["thirteen", 13],
  ["fourteen", 14],
  ["fifteen", 15],
  ["sixteen", 16],
  ["seventeen", 17],
  ["eighteen", 18],
  ["nineteen", 19],
  ["twenty", 20],
  ["thirty", 30],
  ["forty", 40],
  ["fifty", 50],
  ["sixty", 60],
  ["seventy", 70],
  ["eighty", 80],
  ["ninety", 90],
]);

type SpacingRules = {
  oneSpaceTokens: Set<string>;
  oneSpacePatterns: RegExp[];
  sentenceBoundaries: Set<string>;
};

function collapseShortRuns(runs: RawSegment[]): RawSegment[] {
  if (runs.length <= 1) {
    return runs;
  }

  const merged: RawSegment[] = [];
  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index];
    if (run.word_ids.length >= MIN_SEGMENT_WORDS) {
      merged.push({ ...run, word_ids: [...run.word_ids] });
      continue;
    }

    if (merged.length === 0) {
      const next = runs[index + 1];
      if (next) {
        next.word_ids = [...run.word_ids, ...next.word_ids];
        continue;
      }
      merged.push({ ...run, word_ids: [...run.word_ids] });
      continue;
    }

    const previous = merged[merged.length - 1];
    previous.word_ids.push(...run.word_ids);
  }

  return merged;
}

export function classifyUtteranceParagraphs(
  utterance: EditorDocument["utterances"][number],
  wordById: Map<string, EditorDocument["words"][number]>
): DisplaySegment[] {
  const runs: RawSegment[] = [];

  for (const wordId of utterance.word_ids) {
    const word = wordById.get(wordId);
    if (!word) {
      continue;
    }

    const previous = runs[runs.length - 1];
    if (!previous || previous.speaker_id !== word.speaker_id) {
      runs.push({ speaker_id: word.speaker_id, word_ids: [wordId] });
      continue;
    }

    previous.word_ids.push(wordId);
  }

  const mergedRuns = collapseShortRuns(runs);
  return mergedRuns.map((run, index) => ({
    utterance_id: utterance.utterance_id,
    segment_index: index,
    segment_count: mergedRuns.length,
    speaker_id: run.speaker_id,
    word_ids: run.word_ids,
  }));
}

function toLineRole(role: EditorDocument["speakers"][number]["role"] | null | undefined): FormattedLine["role"] {
  const blockRole = getBlockRole(role);
  if (blockRole === "Q") {
    return "q";
  }
  if (blockRole === "A") {
    return "a";
  }
  return "speaker_label";
}

function buildSpacingRules(registry: AbbreviationRegistry): SpacingRules {
  const oneSpaceTokens = new Set(
    Object.values(registry.one_space_tokens)
      .flat()
      .map((token) => token.toLowerCase())
  );
  const oneSpacePatterns = registry.one_space_patterns.map((pattern) => new RegExp(pattern.regex));
  const sentenceBoundaries = new Set(registry.rule.two_space_boundaries);

  return {
    oneSpaceTokens,
    oneSpacePatterns,
    sentenceBoundaries,
  };
}

function stripTrailingClosers(token: string): string {
  return token.replace(/["')\]]+$/g, "");
}

function normalizeAlphaToken(token: string | undefined): string {
  return (token ?? "").replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "").toLowerCase();
}

function splitTrailingPunctuation(token: string): { core: string; trailer: string } {
  const match = token.match(/^(.*?)([,:;.!?"')\]]*)$/);
  if (!match) {
    return { core: token, trailer: "" };
  }
  return {
    core: match[1],
    trailer: match[2],
  };
}

function closesSentenceWithQuote(token: string): boolean {
  const stripped = stripTrailingClosers(token);
  if (stripped.length === token.length) {
    return false;
  }
  const lastCoreChar = stripped[stripped.length - 1];
  return lastCoreChar === "." || lastCoreChar === "?" || lastCoreChar === "!";
}

function isRegistryToken(token: string, nextToken: string | undefined, rules: SpacingRules): boolean {
  const normalized = token.toLowerCase();
  if (rules.oneSpaceTokens.has(normalized)) {
    if (normalized !== "no.") {
      return true;
    }
    if (nextToken === undefined || /^no\.$/i.test(nextToken)) {
      return false;
    }
    return /^[A-Za-z0-9(]/.test(nextToken);
  }

  const stripped = stripTrailingClosers(token);
  if (rules.oneSpaceTokens.has(stripped.toLowerCase())) {
    return true;
  }

  return rules.oneSpacePatterns.some((pattern) => pattern.test(stripped));
}

function isSentenceBoundary(token: string, nextToken: string | undefined, rules: SpacingRules): boolean {
  if (isRegistryToken(token, nextToken, rules)) {
    return false;
  }

  const stripped = stripTrailingClosers(token);
  const lastCoreChar = stripped[stripped.length - 1];
  if (!lastCoreChar || !rules.sentenceBoundaries.has(lastCoreChar)) {
    return false;
  }

  if (nextToken === undefined) {
    return true;
  }

  return /^[A-Z"'([]/.test(nextToken);
}

function buildTrailingSpace(
  token: string,
  nextToken: string | undefined,
  rules: SpacingRules
): string {
  if (nextToken === undefined) {
    return "";
  }

  if (closesSentenceWithQuote(token) || isSentenceBoundary(token, nextToken, rules)) {
    return "  ";
  }

  return " ";
}

function formatSpeakerPrefix(
  role: FormattedLine["role"],
  speakerLabel: string
): string {
  if (role === "q") {
    return "Q.";
  }
  if (role === "a") {
    return "A.";
  }
  return `${speakerLabel.toUpperCase()}:`;
}

function normalizeInterruptingDash(token: string, nextToken: string | undefined): string {
  if (nextToken !== "--") {
    return token;
  }

  return token
    .replace(/,(["'])$/, "$1")
    .replace(/,$/, "");
}

function normalizeQuotedQuestionMark(token: string, nextToken: string | undefined): string {
  if (!nextToken || !/^[A-Z"'([]/.test(nextToken)) {
    return token;
  }

  return token.replace(/\?(["'])$/, "$1?");
}

function normalizeDateOrdinal(token: string, previousToken: string | undefined): string {
  if (!MONTH_NAMES.has(normalizeAlphaToken(previousToken))) {
    return token;
  }

  return token.replace(/^(\d{1,2})(st|nd|rd|th)([.,?!"']*)$/i, "$1$3");
}

function parseNumberWord(core: string): number | null {
  const normalized = core.toLowerCase();
  const direct = SIMPLE_NUMBER_WORDS.get(normalized);
  if (direct !== undefined) {
    return direct;
  }

  if (!normalized.includes("-")) {
    return null;
  }

  const parts = normalized.split("-");
  if (parts.length !== 2) {
    return null;
  }

  const tens = SIMPLE_NUMBER_WORDS.get(parts[0]);
  const units = SIMPLE_NUMBER_WORDS.get(parts[1]);
  if (tens === undefined || units === undefined || tens < 20 || units >= 10) {
    return null;
  }

  return tens + units;
}

function shouldNormalizeNumberWord(
  previousToken: string | undefined,
  nextToken: string | undefined
): boolean {
  const previous = normalizeAlphaToken(previousToken);
  const next = normalizeAlphaToken(nextToken);

  return previous === "age" || previous === "aged" || next === "year" || next === "years" || next === "old";
}

function normalizeNumberWord(
  token: string,
  previousToken: string | undefined,
  nextToken: string | undefined
): string {
  if (!shouldNormalizeNumberWord(previousToken, nextToken)) {
    return token;
  }

  const { core, trailer } = splitTrailingPunctuation(token);
  const value = parseNumberWord(core);
  if (value === null) {
    return token;
  }

  return `${value}${trailer}`;
}

function capitalizeDirectAddressTitle(
  token: string,
  previousToken: string | undefined,
  nextToken: string | undefined,
  index: number
): string {
  const { core, trailer } = splitTrailingPunctuation(token);
  const normalized = core.toLowerCase();
  const replacement = DIRECT_ADDRESS_TITLES.get(normalized);
  if (!replacement) {
    return token;
  }

  const previousEndsComma = /,$/.test(previousToken ?? "");
  const sentenceInitialAddress = index === 0 && /[,?!]$/.test(token);
  const nextIsDash = nextToken === "--";

  if (!previousEndsComma && !sentenceInitialAddress && !nextIsDash) {
    return token;
  }

  return `${replacement}${trailer}`;
}

function buildInlineFlag(word: EditorDocument["words"][number], flagNumber: number): string {
  return `[SCOPIST: FLAG ${flagNumber}: "${word.raw_text}" — verify from audio]`;
}

function normalizeDisplayToken(
  word: EditorDocument["words"][number],
  index: number,
  words: EditorDocument["words"][number][]
): string {
  let text = word.text;
  const previousToken = words[index - 1]?.text;
  const nextToken = words[index + 1]?.text;

  text = normalizeInterruptingDash(text, nextToken);
  text = normalizeQuotedQuestionMark(text, nextToken);
  text = normalizeDateOrdinal(text, previousToken);
  text = normalizeNumberWord(text, previousToken, nextToken);
  text = capitalizeDirectAddressTitle(text, previousToken, nextToken, index);

  return text;
}

export function cfe(
  doc: EditorDocument,
  geometry: GeometryProfile,
  registry: AbbreviationRegistry
): FormattedDocument {
  const wordById = new Map(doc.words.map((word) => [word.word_id, word]));
  const speakerById = new Map(doc.speakers.map((speaker) => [speaker.speaker_id, speaker]));
  const speakerRoles = new Map(doc.speakers.map((speaker) => [speaker.speaker_id, speaker.role]));
  const spacingRules = buildSpacingRules(registry);
  const segments = doc.utterances.flatMap((utterance) => classifyUtteranceParagraphs(utterance, wordById));
  const pageInfoMap = buildPages(
    segments.map((segment) => ({
      utterance_id: `${segment.utterance_id}#${segment.segment_index}`,
      speaker_id: segment.speaker_id,
      wordCount: segment.word_ids.length,
    })),
    speakerRoles,
    geometry
  );

  const lines: FormattedLine[] = [];
  let paragraphIndex = 0;

  doc.utterances.forEach((utterance) => {
    const utteranceSegments = classifyUtteranceParagraphs(utterance, wordById);
    utteranceSegments.forEach((segment) => {
      paragraphIndex += 1;

      const sourceWords = segment.word_ids
        .map((wordId) => wordById.get(wordId))
        .filter((word): word is EditorDocument["words"][number] => Boolean(word));
      const firstWord = sourceWords[0];
      const lastWord = sourceWords[sourceWords.length - 1];
      const speaker = speakerById.get(segment.speaker_id);
      const pageInfo = pageInfoMap.get(`${segment.utterance_id}#${segment.segment_index}`);
      const role = toLineRole(speaker?.role ?? null);
      const prefixText = formatSpeakerPrefix(role, speaker?.display_name ?? segment.speaker_id);
      const flags = [
        ...(sourceWords.some((word) => word.confidence < LOW_CONFIDENCE_THRESHOLD) ? ["LOW_CONFIDENCE"] : []),
        ...(speaker?.role ? [] : ["UNCERTAIN_SPEAKER"]),
      ];

      let flagNumber = 0;
      const displayTexts = sourceWords.map((word, index) => {
        if (word.confidence < LOW_CONFIDENCE_THRESHOLD) {
          return word.text;
        }
        return normalizeDisplayToken(word, index, sourceWords);
      });

      const formattedWords = sourceWords.map((word, index) => {
        const inlineFlag = word.confidence < LOW_CONFIDENCE_THRESHOLD
          ? buildInlineFlag(word, ++flagNumber)
          : null;
        const displayText = displayTexts[index];

        return {
          word_id: word.word_id,
          utterance_id: word.utterance_id,
          speaker_id: word.speaker_id,
          text: displayText,
          raw_text: word.raw_text,
          start_time: word.start_time,
          end_time: word.end_time,
          confidence: word.confidence,
          reviewed: word.reviewed,
          edited: word.edited,
          inline_flag: inlineFlag,
          trailing_space: buildTrailingSpace(
            displayText,
            displayTexts[index + 1],
            spacingRules
          ),
        };
      });

      lines.push({
        role,
        indent_intent: role === "q" || role === "a" ? "qa" : "speaker",
        paragraph_index: paragraphIndex - 1,
        utterance_id: segment.utterance_id,
        speaker_id: segment.speaker_id,
        speaker_label: speaker?.display_name ?? segment.speaker_id,
        prefix_text: prefixText,
        source_word_ids: segment.word_ids,
        words: formattedWords,
        page_number: pageInfo?.pageNumber ?? 1,
        page_line_number: pageInfo?.lineInPage ?? paragraphIndex,
        line_number: paragraphIndex,
        start_time: firstWord?.start_time ?? utterance.start_time,
        end_time: lastWord?.end_time ?? utterance.end_time,
        segment_index: segment.segment_index,
        segment_count: segment.segment_count,
        language: null,
        geometry,
        continuation_mode: "return_to_margin",
        flags,
      });
    });
  });

  return {
    job_id: doc.job_id,
    lines,
  };
}
