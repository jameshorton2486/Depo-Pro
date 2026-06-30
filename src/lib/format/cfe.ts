import type { EditorDocument } from "../../api/types";
import { buildPages, getBlockRole } from "../../editor/pagination";
import {
  AMBIGUOUS_FLAGS,
  DETERMINISTIC_PHRASE_CORRECTIONS,
  DETERMINISTIC_TOKEN_CORRECTIONS,
  INTERRUPTION_DASH,
  isStutterCandidateWord,
  looksLikeImplausibleMoney,
  normalizeSlashDate,
} from "../transcript/correctionRegistry";
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
const COMMON_WORD_FLAG_THRESHOLD = 0.35;
const FUNCTION_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "because", "but", "by",
  "could", "did", "do", "does", "for", "from", "had", "have", "he", "her", "hers",
  "i", "if", "in", "is", "it", "its", "me", "my", "of", "on", "or", "she", "so",
  "that", "the", "their", "them", "there", "these", "they", "this", "those", "to",
  "was", "were", "what", "when", "which", "who", "with", "would", "will", "you", "your",
  "such", "very",
]);
const COMMON_WORDS = new Set([
  "date", "essentially", "first", "good", "got", "just", "kinda", "know", "like",
  "looking", "miss", "new", "okay", "out", "probably", "remote", "roll", "say",
  "severe", "shadow", "sure", "thing", "yeah",
]);
const MEDICAL_TERMS = new Set([
  "clinical", "disc", "discectomy", "doctor", "epidural", "foraminal", "fusion",
  "injury", "ligamentous", "lumbar", "medical", "pathology", "radicular", "spine",
  "surgery", "thecal", "vertebrae",
]);
const LEGAL_TERMS = new Set([
  "action", "agreement", "civil", "counsel", "court", "defendant", "deposition",
  "exhibit", "jury", "malpractice", "objection", "plaintiff", "record", "reporter",
  "rules", "trial", "witness",
]);
const ORGANIZATION_SUFFIXES = new Set([
  "co", "corp", "corporation", "inc", "llc", "llp", "pc", "pllc",
]);
const COMMON_CAPITALIZED_FUNCTION_WORDS = new Set([
  "And", "But", "Could", "Do", "I", "If", "Is", "It", "Not", "So", "This", "What", "Will",
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
  contextSensitiveTokens: Set<string>;
};

type FlagTokenClass =
  | "FUNCTION_WORD"
  | "COMMON_WORD"
  | "PROPER_NOUN"
  | "MEDICAL_TERM"
  | "LEGAL_TERM"
  | "ORGANIZATION"
  | "OTHER";

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
  const contextSensitiveTokens = new Set(
    Object.keys(registry.context_sensitive)
      .map((token) => token.toLowerCase())
  );

  return {
    oneSpaceTokens,
    oneSpacePatterns,
    sentenceBoundaries,
    contextSensitiveTokens,
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

function stripTokenEdges(token: string): string {
  return token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
}

function isAllCapsToken(token: string): boolean {
  return /^[A-Z0-9]+$/.test(token) && /[A-Z]/.test(token);
}

function isTitleCaseToken(token: string): boolean {
  return /^[A-Z][a-z]+(?:[A-Z][a-z]+)?$/.test(token);
}

export function classifyFlagToken(token: string): FlagTokenClass {
  const stripped = stripTokenEdges(token);
  const lower = stripped.toLowerCase();

  if (!stripped) {
    return "OTHER";
  }

  if (FUNCTION_WORDS.has(lower) || COMMON_CAPITALIZED_FUNCTION_WORDS.has(stripped)) {
    return "FUNCTION_WORD";
  }

  if (COMMON_WORDS.has(lower)) {
    return "COMMON_WORD";
  }

  if (MEDICAL_TERMS.has(lower)) {
    return "MEDICAL_TERM";
  }

  if (LEGAL_TERMS.has(lower)) {
    return "LEGAL_TERM";
  }

  if (ORGANIZATION_SUFFIXES.has(lower) || isAllCapsToken(stripped)) {
    return "ORGANIZATION";
  }

  if (/^\d+$/.test(stripped) || stripped.length === 1) {
    return "OTHER";
  }

  if (isTitleCaseToken(stripped)) {
    return "PROPER_NOUN";
  }

  return "OTHER";
}

export function shouldEmitInlineFlag(word: EditorDocument["words"][number]): boolean {
  if (findAmbiguousFlag(word.text, word.raw_text)) {
    return true;
  }

  if (looksLikeImplausibleMoney(word.raw_text)) {
    return true;
  }

  if (word.confidence >= LOW_CONFIDENCE_THRESHOLD) {
    return false;
  }

  const tokenClass = classifyFlagToken(word.raw_text);
  if (tokenClass === "FUNCTION_WORD") {
    return false;
  }
  if (tokenClass === "COMMON_WORD") {
    return word.confidence < COMMON_WORD_FLAG_THRESHOLD;
  }
  return true;
}

function usesNumberAbbreviationRule(
  token: string,
  nextToken: string | undefined,
  rules: SpacingRules
): boolean {
  if (!rules.contextSensitiveTokens.has(token.toLowerCase())) {
    return false;
  }

  if (nextToken === undefined || /^no\.$/i.test(nextToken)) {
    return false;
  }

  return /^[A-Za-z0-9(]/.test(nextToken);
}

function isRegistryToken(token: string, nextToken: string | undefined, rules: SpacingRules): boolean {
  const normalized = token.toLowerCase();
  if (rules.oneSpaceTokens.has(normalized)) {
    if (!rules.contextSensitiveTokens.has(normalized)) {
      return true;
    }

    return usesNumberAbbreviationRule(token, nextToken, rules);
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

function buildInlineFlag(
  word: EditorDocument["words"][number],
  flagNumber: number,
  likelyMeaning?: string
): string {
  const likelyClause = likelyMeaning
    ? `; likely "${likelyMeaning}"`
    : "";
  return `[SCOPIST: FLAG ${flagNumber}: "${word.raw_text}" — verify from audio${likelyClause}]`;
}

function findAmbiguousFlag(...candidates: Array<string | undefined>): (typeof AMBIGUOUS_FLAGS)[number] | undefined {
  return AMBIGUOUS_FLAGS.find((flag) => (
    candidates.some((candidate) => candidate?.toLowerCase() === flag.match.toLowerCase())
  ));
}

function applyDeterministicTokenCorrection(
  token: string,
  previousToken: string | undefined,
  nextToken: string | undefined
): string {
  for (const correction of DETERMINISTIC_TOKEN_CORRECTIONS) {
    if (token !== correction.match) {
      continue;
    }
    if (
      correction.requiresPrecedingPattern
      && !correction.requiresPrecedingPattern.test(previousToken ?? "")
    ) {
      continue;
    }
    if (
      correction.requiresFollowingPattern
      && !correction.requiresFollowingPattern.test(nextToken ?? "")
    ) {
      continue;
    }
    return correction.replacement;
  }

  return token;
}

function normalizeForStutterComparison(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, "");
}

function applyDeterministicStutterDashes(tokens: string[]): string[] {
  const corrected = [...tokens];

  for (let index = 0; index < corrected.length - 1; index += 1) {
    const current = corrected[index];
    const next = corrected[index + 1];
    if (!current || !next) {
      continue;
    }

    const currentNormalized = normalizeForStutterComparison(current);
    const nextNormalized = normalizeForStutterComparison(next);
    if (!currentNormalized || currentNormalized !== nextNormalized) {
      continue;
    }

    const previousNormalized = index > 0
      ? normalizeForStutterComparison(corrected[index - 1])
      : "";
    const followingNormalized = index + 2 < corrected.length
      ? normalizeForStutterComparison(corrected[index + 2])
      : "";

    if (previousNormalized === currentNormalized || followingNormalized === currentNormalized) {
      continue;
    }

    if (!isStutterCandidateWord(current)) {
      continue;
    }

    corrected[index] = current + INTERRUPTION_DASH.trimEnd();
  }

  return corrected;
}

function applyPhraseCorrections(tokens: string[]): string[] {
  const corrected = [...tokens];

  for (const correction of DETERMINISTIC_PHRASE_CORRECTIONS) {
    const matchTokens = correction.match.toLowerCase().split(/\s+/);
    if (matchTokens.length === 0) {
      continue;
    }

    for (let index = 0; index <= corrected.length - matchTokens.length; index += 1) {
      const windowTokens = corrected
        .slice(index, index + matchTokens.length)
        .map((token) => token.toLowerCase());
      const matches = windowTokens.every((token, tokenIndex) => token === matchTokens[tokenIndex]);
      if (!matches) {
        continue;
      }

      corrected[index] = correction.replacement;
      for (let offset = 1; offset < matchTokens.length; offset += 1) {
        corrected[index + offset] = "";
      }
      index += matchTokens.length - 1;
    }
  }

  return corrected;
}

function getNextVisibleToken(tokens: string[], index: number): string | undefined {
  for (let offset = index + 1; offset < tokens.length; offset += 1) {
    if (tokens[offset]) {
      return tokens[offset];
    }
  }
  return undefined;
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
  text = normalizeNumberWord(text, previousToken, nextToken);
  text = normalizeSlashDate(text);
  text = applyDeterministicTokenCorrection(text, previousToken, nextToken);

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
      const displayTexts = sourceWords.map((word, index) => normalizeDisplayToken(word, index, sourceWords));

      const stutterAdjustedDisplayTexts = applyDeterministicStutterDashes(displayTexts);
      const correctedDisplayTexts = applyPhraseCorrections(stutterAdjustedDisplayTexts);

      const formattedWords = sourceWords.map((word, index) => {
        const ambiguousFlag = findAmbiguousFlag(correctedDisplayTexts[index], word.raw_text, word.text);
        const inlineFlag = shouldEmitInlineFlag(word)
          ? buildInlineFlag(word, ++flagNumber, ambiguousFlag?.likelyMeaning)
          : null;
        const displayText = correctedDisplayTexts[index];

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
          // Phrase-level corrections may collapse multiple source words into
          // one display token; blank followers stay hidden but keep their IDs.
          trailing_space: buildTrailingSpace(
            displayText,
            displayText ? getNextVisibleToken(correctedDisplayTexts, index) : undefined,
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
