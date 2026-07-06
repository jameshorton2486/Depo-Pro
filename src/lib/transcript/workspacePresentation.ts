// AI Structuring Engine (G5) — activated when user confirms inferred structure.
// Called from buildEditorContent when structureConfirmed === true.
// buildDisplayDocument: infers speaker roles, Q./A. classification.
// buildWorkspaceParagraphs: inserts PROCEEDINGS/EXAMINATION/BY_LINE markers.
import type { EditorDocument } from "../../api/types";
import { COLON_GAP, colloquyLabel, normalizeHonorificSpacing } from "../../editor/stageS/colloquy";
import type { CaseRecord } from "../../types/case";
import { abbreviationRegistry } from "../format/abbreviationRegistry";
import { cfe } from "../format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import type { FormattedLine, FormattedWord } from "../format/types";
import { applyParagraphDisplayImprovements } from "./paragraphDisplayImprovements";
import { applyQaFixer } from "./qaFixer";
import { buildDisplayDocument } from "./deterministicSpeakerMap";
export { buildDisplayDocument } from "./deterministicSpeakerMap";

export type WorkspaceParagraphMode = "COLLOQUY" | "Q" | "A" | "PARENTHETICAL";
export type TranscriptParagraphKind =
  | WorkspaceParagraphMode
  | "BY_LINE"
  | "SECTION_HEADER";

export type TextMode = "display" | "clean";

export type WordDisplayLayer = "ai_suggestion" | "working_text" | "raw_text";

export interface WordDisplayResolvable {
  raw_text: string;
  working_text?: string | null;
  ai_suggestion?: string | null;
  ai_suggestion_status?: string | null;
}

export interface ResolvedWordDisplay {
  displayText: string;
  layer: WordDisplayLayer;
  isPending: boolean;
}

export interface WorkspaceParagraphDescriptor {
  mode: WorkspaceParagraphMode;
  label: string;
  heading: string | null;
  /**
   * Two forms:
   * - Standalone: "BY MR. BENTLEY:" — emitted as a separate BY_LINE paragraph.
   * - Resumption: "(BY MR. BENTLEY)" — prepended inline to the Q. text.
   */
  byLine: string | null;
}

export interface TranscriptParagraph {
  kind: TranscriptParagraphKind;
  label: string;
  text: string;
  speakerId: string | null;
  leadingText: string;
  mode: TextMode;
  words: FormattedWord[];
  sourceLines: FormattedLine[];
  sourceUtteranceIds: string[];
  sourceWordIds: string[];
}

interface RenderState {
  inExamination: boolean;
  currentExaminerLabel: string | null;
  hasQuestion: boolean;
  proceedingsInserted: boolean;
  lastParagraphWasColloquy: boolean;
}

function serializeLineText(line: FormattedLine, mode: TextMode): string {
  return line.words
    .map((word) => {
      const flag = mode === "display" && word.inline_flag
        ? ` ${word.inline_flag}`
        : "";
      return `${word.text}${flag}${word.trailing_space}`;
    })
    .join("")
    .trim();
}

function serializeParagraphWords(words: FormattedWord[], mode: TextMode): string {
  return words
    .map((word) => {
      const flag = mode === "display" && word.inline_flag
        ? ` ${word.inline_flag}`
        : "";
      return `${word.text}${flag}${word.trailing_space}`;
    })
    .join("");
}

function collectSourceUtteranceIds(words: FormattedWord[], sourceLines: FormattedLine[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const line of sourceLines) {
    if (!seen.has(line.utterance_id)) {
      seen.add(line.utterance_id);
      ids.push(line.utterance_id);
    }
  }

  for (const word of words) {
    if (!seen.has(word.utterance_id)) {
      seen.add(word.utterance_id);
      ids.push(word.utterance_id);
    }
  }

  return ids;
}

function collectSourceWordIds(words: FormattedWord[], sourceLines: FormattedLine[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const line of sourceLines) {
    for (const wordId of line.source_word_ids) {
      if (!seen.has(wordId)) {
        seen.add(wordId);
        ids.push(wordId);
      }
    }
  }

  for (const word of words) {
    if (!seen.has(word.word_id)) {
      seen.add(word.word_id);
      ids.push(word.word_id);
    }
  }

  return ids;
}

function buildParagraphFromParts(
  kind: TranscriptParagraphKind,
  label: string,
  speakerId: string | null,
  mode: TextMode,
  words: FormattedWord[],
  sourceLines: FormattedLine[],
  leadingText = "",
): TranscriptParagraph {
  return {
    kind,
    label,
    text: `${leadingText}${serializeParagraphWords(words, mode)}`.trim(),
    speakerId,
    leadingText,
    mode,
    words,
    sourceLines,
    sourceUtteranceIds: collectSourceUtteranceIds(words, sourceLines),
    sourceWordIds: collectSourceWordIds(words, sourceLines),
  };
}

export function resolveWordDisplay(word: WordDisplayResolvable): ResolvedWordDisplay {
  if (word.ai_suggestion && word.ai_suggestion_status === "pending") {
    return {
      displayText: word.ai_suggestion,
      layer: "ai_suggestion",
      isPending: true,
    };
  }

  if (word.working_text) {
    return {
      displayText: word.working_text,
      layer: "working_text",
      isPending: false,
    };
  }

  return {
    displayText: word.raw_text,
    layer: "raw_text",
    isPending: false,
  };
}

export function stripInlineFlagSpans(text: string): string {
  return text.replace(/\s*\[SCOPIST:\s*FLAG\s*\d+:[^\]]+\]/g, "");
}

function normalizeSpeakerLabel(label: string): string {
  return normalizeHonorificSpacing(label).trim().replace(/:+$/, "").replace(/\s+/g, " ").toUpperCase();
}

function buildByLine(label: string): string {
  return `BY ${normalizeSpeakerLabel(label)}:`;
}

export function buildResumptionByLine(label: string): string {
  return `(BY ${normalizeSpeakerLabel(label)})`;
}

function looksLikeParenthetical(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    return true;
  }

  return /^recess\b/i.test(normalized);
}

function classifyLineDescriptor(line: FormattedLine, text: string, state: RenderState): WorkspaceParagraphDescriptor {
  if (!state.proceedingsInserted) {
    return {
      mode: line.role === "q" ? "Q" : line.role === "a" ? "A" : looksLikeParenthetical(text) ? "PARENTHETICAL" : "COLLOQUY",
      label: line.speaker_label,
      heading: line.role === "q" ? "EXAMINATION" : line.role === "speaker_label" ? "PROCEEDINGS" : null,
      byLine: line.role === "q" ? buildByLine(line.speaker_label) : null,
    };
  }

  if (looksLikeParenthetical(text)) {
    return {
      mode: "PARENTHETICAL",
      label: "",
      heading: null,
      byLine: null,
    };
  }

  if (line.role === "q") {
    const needsResumptionByLine = state.lastParagraphWasColloquy && state.inExamination;

    return {
      mode: "Q",
      label: line.speaker_label,
      heading: state.inExamination ? null : "EXAMINATION",
      byLine: needsResumptionByLine
        ? buildResumptionByLine(line.speaker_label)
        : (state.currentExaminerLabel !== line.speaker_label ? buildByLine(line.speaker_label) : null),
    };
  }

  if (line.role === "a") {
    return {
      mode: "A",
      label: line.speaker_label,
      heading: null,
      byLine: null,
    };
  }

  const colloquyMode = looksLikeParenthetical(text) ? "PARENTHETICAL" : "COLLOQUY";
  return {
    mode: colloquyMode,
    label: line.speaker_label,
    heading: null,
    byLine: null,
  };
}

function advanceRenderState(descriptor: WorkspaceParagraphDescriptor, state: RenderState): RenderState {
  return {
    proceedingsInserted: true,
    inExamination: state.inExamination || descriptor.mode === "Q" || descriptor.mode === "A",
    currentExaminerLabel: descriptor.mode === "Q" ? descriptor.label : state.currentExaminerLabel,
    hasQuestion: state.hasQuestion || descriptor.mode === "Q",
    lastParagraphWasColloquy: descriptor.mode === "COLLOQUY",
  };
}

export function buildWorkspaceParagraphs(document: EditorDocument, record?: CaseRecord | null): Map<string, WorkspaceParagraphDescriptor> {
  const displayDocument = buildDisplayDocument(document, record);
  const formatted = cfe(displayDocument, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
  const descriptors = new Map<string, WorkspaceParagraphDescriptor>();
  let state: RenderState = {
    inExamination: false,
    currentExaminerLabel: null,
    hasQuestion: false,
    proceedingsInserted: false,
    lastParagraphWasColloquy: false,
  };

  for (const line of formatted.lines) {
    if (descriptors.has(line.utterance_id)) {
      continue;
    }
    const text = serializeLineText(line, "display");
    const descriptor = classifyLineDescriptor(line, text, state);
    descriptors.set(line.utterance_id, descriptor);
    state = advanceRenderState(descriptor, state);
  }

  return descriptors;
}

function mergeParagraph(left: TranscriptParagraph, right: TranscriptParagraph): TranscriptParagraph {
  const leftWords = [...left.words];
  if (leftWords.length > 0) {
    const lastWord = leftWords[leftWords.length - 1];
    leftWords[leftWords.length - 1] = {
      ...lastWord,
      trailing_space: lastWord.trailing_space.length > 0 ? lastWord.trailing_space : " ",
    };
  }

  return buildParagraphFromParts(
    left.kind,
    left.label,
    left.speakerId,
    left.mode,
    [...leftWords, ...right.words],
    [...left.sourceLines, ...right.sourceLines],
    left.leadingText,
  );
}

function canMergeParagraphs(current: TranscriptParagraph | null, next: TranscriptParagraph): current is TranscriptParagraph {
  if (!current) {
    return false;
  }

  return current.kind === next.kind
    && current.kind !== "SECTION_HEADER"
    && current.kind !== "BY_LINE"
    && current.label === next.label;
}

export function buildTranscriptParagraphs(
  document: EditorDocument,
  record?: CaseRecord | null,
  mode: TextMode = "display",
): TranscriptParagraph[] {
  const displayDocument = buildDisplayDocument(document, record);
  const formatted = cfe(displayDocument, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
  const paragraphs: TranscriptParagraph[] = [];
  let state: RenderState = {
    inExamination: false,
    currentExaminerLabel: null,
    hasQuestion: false,
    proceedingsInserted: false,
    lastParagraphWasColloquy: false,
  };
  let pending: TranscriptParagraph | null = null;

  function flushPending() {
    if (!pending) {
      return;
    }
    pending = {
      ...pending,
      text: applyParagraphDisplayImprovements(pending.text),
    };
    paragraphs.push(pending);
    pending = null;
  }

  for (const line of formatted.lines) {
    const text = serializeLineText(line, mode);
    const descriptor = classifyLineDescriptor(line, text, state);

    if (descriptor.heading) {
      flushPending();
      paragraphs.push({
        kind: "SECTION_HEADER",
        label: "",
        text: descriptor.heading,
        speakerId: line.speaker_id,
        leadingText: descriptor.heading,
        mode,
        words: [],
        sourceLines: [line],
        sourceUtteranceIds: [line.utterance_id],
        sourceWordIds: [...line.source_word_ids],
      });
    }

    if (descriptor.byLine && !descriptor.byLine.startsWith("(BY ")) {
      flushPending();
      paragraphs.push({
        kind: "BY_LINE",
        label: "",
        text: descriptor.byLine,
        speakerId: line.speaker_id,
        leadingText: descriptor.byLine,
        mode,
        words: [],
        sourceLines: [line],
        sourceUtteranceIds: [line.utterance_id],
        sourceWordIds: [...line.source_word_ids],
      });
    }

    const leadingText = descriptor.mode === "Q" && descriptor.byLine?.startsWith("(BY ")
      ? `${descriptor.byLine} `
      : "";

    const paragraph = buildParagraphFromParts(
      descriptor.mode,
      descriptor.mode === "Q" ? "Q." : descriptor.mode === "A" ? "A." : descriptor.label,
      line.speaker_id,
      mode,
      [...line.words],
      [line],
      leadingText,
    );

    if (canMergeParagraphs(pending, paragraph)) {
      pending = mergeParagraph(pending, paragraph);
    } else {
      flushPending();
      pending = paragraph;
    }

    state = advanceRenderState(descriptor, state);
  }

  flushPending();
  return applyQaFixer(paragraphs);
}

export function renderTranscriptParagraphText(
  paragraph: TranscriptParagraph,
  mode: TextMode,
): string {
  const text = mode === "clean"
    ? stripInlineFlagSpans(paragraph.text).trim()
    : paragraph.text;

  if (paragraph.kind === "SECTION_HEADER" || paragraph.kind === "BY_LINE") {
    return paragraph.text;
  }

  if (paragraph.kind === "Q" || paragraph.kind === "A") {
    return `${paragraph.label} ${text}`.trim();
  }

  if (paragraph.kind === "PARENTHETICAL") {
    return text;
  }

  return `${colloquyLabel(paragraph.label)}${COLON_GAP}${text}`.trim();
}

export function buildWorkspaceTranscriptText(document: EditorDocument, record?: CaseRecord | null): string {
  return buildTranscriptParagraphs(document, record, "display")
    .map((paragraph) => renderTranscriptParagraphText(paragraph, "display"))
    .join("\n\n")
    .trim();
}

export function buildWorkspaceTranscriptTextClean(document: EditorDocument, record?: CaseRecord | null): string {
  return buildTranscriptParagraphs(document, record, "clean")
    .map((paragraph) => renderTranscriptParagraphText(paragraph, "clean"))
    .join("\n\n")
    .trim();
}







