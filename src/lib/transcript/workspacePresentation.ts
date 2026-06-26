// AI Structuring Engine (G5) — activated when user confirms inferred structure.
// Called from buildEditorContent when structureConfirmed === true.
// buildDisplayDocument: infers speaker roles, Q./A. classification.
// buildWorkspaceParagraphs: inserts PROCEEDINGS/EXAMINATION/BY_LINE markers.
import type { EditorDocument, Speaker } from "../../api/types";
import { COLON_GAP, colloquyLabel, normalizeHonorificSpacing } from "../../editor/stageS/colloquy";
import type { CaseRecord } from "../../types/case";
import { abbreviationRegistry } from "../format/abbreviationRegistry";
import { cfe } from "../format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import { stripHonorificPrefix } from "../format/honorificHelper";
import type { FormattedLine } from "../format/types";
import { applyParagraphDisplayImprovements } from "./paragraphDisplayImprovements";
import { applyQaFixer } from "./qaFixer";

export type WorkspaceParagraphMode = "COLLOQUY" | "Q" | "A" | "PARENTHETICAL";
export type TranscriptParagraphKind =
  | WorkspaceParagraphMode
  | "BY_LINE"
  | "SECTION_HEADER";

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
  sourceUtteranceIds: string[];
  sourceWordIds: string[];
}

type PresentationRole = "ATTORNEY" | "WITNESS" | "REPORTER" | "VIDEOGRAPHER" | "OTHER";

interface SpeakerView {
  speakerId: string;
  speakerIndex: number | null;
  label: string;
  role: PresentationRole;
}

interface RenderState {
  inExamination: boolean;
  currentExaminerLabel: string | null;
  hasQuestion: boolean;
  proceedingsInserted: boolean;
  lastParagraphWasColloquy: boolean;
}

const GENERIC_SPEAKER_PATTERN = /^SPEAKER\s+\d+$/i;
const REPORTER_PATTERNS = [
  /cause number/i,
  /licensed in texas/i,
  /raise your right hand/i,
  /do you solemnly swear/i,
  /district court/i,
  /remote deposition/i,
  /off the record/i,
  /you may proceed with the examination/i,
] as const;
const VIDEOGRAPHER_PATTERNS = [
  /we are on the record/i,
  /today'?s date/i,
  /the time is now/i,
  /beginning of the deposition/i,
  /will the court reporter please/i,
  /this is the beginning/i,
] as const;
const WITNESS_PATTERNS = [
  /^\s*i do\.?\s*$/i,
  /^\s*my name is\b/i,
  /\bi was hired to\b/i,
  /\bboard certified\b/i,
  /\bi have \d+ offices\b/i,
  /\bi'm in\b/i,
  /\bi am in\b/i,
] as const;
const MIN_REPORTER_SCORE = 2;
const MIN_VIDEOGRAPHER_SCORE = 2;

function serializeLineText(line: FormattedLine): string {
  return line.words
    .map((word) => `${word.text}${word.inline_flag ? ` ${word.inline_flag}` : ""}${word.trailing_space}`)
    .join("")
    .trim();
}

function serializeLineTextClean(line: FormattedLine): string {
  return line.words
    .map((word) => `${word.text}${word.trailing_space}`)
    .join("")
    .trim();
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

function normalizeComparableName(value: string): string {
  const withoutArticle = value.trim().replace(/^THE\s+/i, "");

  return stripHonorificPrefix(withoutArticle)
    .replace(/[^A-Z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function formatAttorneyDisplayLabel(name: string, gender?: string | null): string {
  const normalized = normalizeComparableName(name);
  const parts = normalized.split(" ").filter(Boolean);
  const surname = parts[parts.length - 1] ?? normalized;
  const normalizedGender = gender?.trim().toLowerCase();
  const honorific = normalizedGender === "f" || normalizedGender === "female" ? "MS." : "MR.";
  return `${honorific} ${surname}`.trim();
}

function getAttorneyGender(attorney: CaseRecord["attorneys"][number]): string | null {
  const candidate = attorney as unknown as { gender?: { value?: unknown } | unknown };
  const genderField = candidate.gender;
  if (typeof genderField === "string") {
    return genderField;
  }
  if (
    genderField
    && typeof genderField === "object"
    && "value" in genderField
    && typeof genderField.value === "string"
  ) {
    return genderField.value;
  }
  return null;
}

function extractSurname(name: string): string {
  const normalized = normalizeComparableName(name)
    .replace(/\b(M D|MD|PH D|PHD|J D|JD|ESQ|JR|SR|II|III|IV)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized.split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function isPhysicianWitness(witness: CaseRecord["witnesses"][number] | undefined): boolean {
  if (!witness) {
    return false;
  }

  const name = witness.name.value;
  const prefixSuffix = witness.prefix_suffix ?? "";
  return /\b(M\.D\.|PH\.D\.)\b/i.test(name)
    || /\b(M\.D\.|PH\.D\.|DR\.)\b/i.test(prefixSuffix)
    || witness.role.value === "EXPERT";
}

function formatWitnessDisplayLabel(witness: CaseRecord["witnesses"][number] | undefined): string {
  if (!isPhysicianWitness(witness)) {
    return "THE WITNESS";
  }

  const surname = extractSurname(witness?.name.value ?? "WITNESS") || "WITNESS";
  return `DR. ${surname}`;
}

function isGenericSpeakerLabel(label: string): boolean {
  return !label.trim() || GENERIC_SPEAKER_PATTERN.test(label.trim());
}

function getGenericSpeakerFallbackLabel(speaker: Speaker): string {
  return speaker.deepgram_speaker != null
    ? `SPEAKER ${speaker.deepgram_speaker}`
    : "SPEAKER CUSTOM";
}

function countMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((score, pattern) => (pattern.test(text) ? score + 1 : score), 0);
}

function findSpeakerAggregateTexts(document: EditorDocument): Map<string, string> {
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  const texts = new Map<string, string>();

  for (const utterance of document.utterances) {
    const text = utterance.word_ids
      .map((wordId) => wordById.get(wordId)?.text ?? "")
      .join(" ")
      .trim();
    const current = texts.get(utterance.speaker_id) ?? "";
    texts.set(utterance.speaker_id, `${current} ${text}`.trim());
  }

  return texts;
}

function attorneyNameScore(text: string, name: string): number {
  const normalizedText = normalizeComparableName(text);
  const normalizedName = normalizeComparableName(name);
  if (!normalizedName) {
    return 0;
  }

  let score = 0;
  if (normalizedText.includes(normalizedName)) {
    score += 4;
  }

  const parts = normalizedName.split(" ").filter(Boolean);
  const surname = parts[parts.length - 1] ?? "";
  if (surname && normalizedText.includes(surname)) {
    score += 2;
  }

  if (/for the plaintiff|for the defendant|represent the plaintiff|represent the defendant/i.test(text)) {
    score += 1;
  }

  return score;
}

function buildSpeakerViews(document: EditorDocument, record?: CaseRecord | null): Map<string, SpeakerView> {
  const aggregateTexts = findSpeakerAggregateTexts(document);
  const explicitSpeakerViews = new Map<string, SpeakerView>();

  for (const speaker of document.speakers) {
    const baseLabel = isGenericSpeakerLabel(speaker.display_name)
      ? getGenericSpeakerFallbackLabel(speaker)
      : normalizeSpeakerLabel(speaker.display_name);
    const baseRole: PresentationRole =
      speaker.role === "ATTORNEY"
        ? "ATTORNEY"
        : speaker.role === "WITNESS"
          ? "WITNESS"
          : speaker.role === "REPORTER"
            ? "REPORTER"
            : "OTHER";

    explicitSpeakerViews.set(speaker.speaker_id, {
      speakerId: speaker.speaker_id,
      speakerIndex: speaker.deepgram_speaker,
      label: baseLabel,
      role: baseRole,
    });
  }

  let reporterId: string | null = null;
  let reporterScore = 0;
  let videographerId: string | null = null;
  let videographerScore = 0;
  let witnessId: string | null = null;
  let witnessScore = 0;

  for (const speaker of document.speakers) {
    const text = aggregateTexts.get(speaker.speaker_id) ?? "";
    const currentReporterScore = countMatches(text, REPORTER_PATTERNS);
    if (currentReporterScore > reporterScore) {
      reporterScore = currentReporterScore;
      reporterId = speaker.speaker_id;
    }

    const currentVideographerScore = countMatches(text, VIDEOGRAPHER_PATTERNS);
    if (currentVideographerScore > videographerScore) {
      videographerScore = currentVideographerScore;
      videographerId = speaker.speaker_id;
    }

    const currentWitnessScore = countMatches(text, WITNESS_PATTERNS);
    if (currentWitnessScore > witnessScore) {
      witnessScore = currentWitnessScore;
      witnessId = speaker.speaker_id;
    }
  }

  if (reporterId) {
    const view = explicitSpeakerViews.get(reporterId);
    if (view) {
      view.label = "THE REPORTER";
      view.role = "REPORTER";
    }
  }

  if (videographerId && videographerId !== reporterId) {
    const view = explicitSpeakerViews.get(videographerId);
    if (view) {
      view.label = "THE VIDEOGRAPHER";
      view.role = "VIDEOGRAPHER";
    }
  }

  if (witnessId) {
    const view = explicitSpeakerViews.get(witnessId);
    if (view && view.role === "OTHER") {
      view.label = formatWitnessDisplayLabel(record?.witnesses[0]);
      view.role = "WITNESS";
    }
  }

  if (record) {
    const patternAssignedIds = new Set<string>();
    if (reporterId && reporterScore >= MIN_REPORTER_SCORE) {
      patternAssignedIds.add(reporterId);
    }
    if (
      videographerId
      && videographerId !== reporterId
      && videographerScore >= MIN_VIDEOGRAPHER_SCORE
    ) {
      patternAssignedIds.add(videographerId);
    }
    const assignedSpeakerIds = new Set<string>();

    for (const attorney of record.attorneys ?? []) {
      let bestSpeakerId: string | null = null;
      let bestScore = 0;
      for (const speaker of document.speakers) {
        if (patternAssignedIds.has(speaker.speaker_id)) {
          continue;
        }
        if (assignedSpeakerIds.has(speaker.speaker_id)) {
          continue;
        }
        const text = aggregateTexts.get(speaker.speaker_id) ?? "";
        const score = attorneyNameScore(text, attorney.name.value);
        if (score > bestScore) {
          bestScore = score;
          bestSpeakerId = speaker.speaker_id;
        }
      }

      if (bestSpeakerId && bestScore > 0) {
        const view = explicitSpeakerViews.get(bestSpeakerId);
        if (view) {
          view.label = formatAttorneyDisplayLabel(attorney.name.value, getAttorneyGender(attorney));
          view.role = "ATTORNEY";
          assignedSpeakerIds.add(bestSpeakerId);
        }
      }
    }

    if (record.witnesses?.length === 1 && witnessId) {
      const view = explicitSpeakerViews.get(witnessId);
      if (view && !patternAssignedIds.has(witnessId)) {
        view.label = formatWitnessDisplayLabel(record.witnesses[0]);
        view.role = "WITNESS";
      }
    }
  }

  return explicitSpeakerViews;
}

export function buildDisplayDocument(document: EditorDocument, record?: CaseRecord | null): EditorDocument {
  const speakerViews = buildSpeakerViews(document, record);

  return {
    ...document,
    speakers: document.speakers.map((speaker) => {
      const view = speakerViews.get(speaker.speaker_id);
      return {
        ...speaker,
        display_name: view?.label ?? speaker.display_name,
        role:
          view?.role === "ATTORNEY"
            ? "ATTORNEY"
            : view?.role === "WITNESS"
              ? "WITNESS"
              : view?.role === "REPORTER"
                ? "REPORTER"
                : speaker.role ?? "OTHER",
      } satisfies Speaker;
    }),
  };
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
    const text = serializeLineText(line);
    const descriptor = classifyLineDescriptor(line, text, state);
    descriptors.set(line.utterance_id, descriptor);
    state = advanceRenderState(descriptor, state);
  }

  return descriptors;
}

function mergeParagraph(left: TranscriptParagraph, right: TranscriptParagraph): TranscriptParagraph {
  return {
    ...left,
    text: `${left.text} ${right.text}`.trim(),
    sourceUtteranceIds: [...left.sourceUtteranceIds, ...right.sourceUtteranceIds],
    sourceWordIds: [...left.sourceWordIds, ...right.sourceWordIds],
  };
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

export function buildTranscriptParagraphs(document: EditorDocument, record?: CaseRecord | null): TranscriptParagraph[] {
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
    const text = serializeLineText(line);
    const descriptor = classifyLineDescriptor(line, text, state);

    if (descriptor.heading) {
      flushPending();
      paragraphs.push({
        kind: "SECTION_HEADER",
        label: "",
        text: descriptor.heading,
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
        sourceUtteranceIds: [line.utterance_id],
        sourceWordIds: [...line.source_word_ids],
      });
    }

    const paragraphText = descriptor.mode === "Q" && descriptor.byLine?.startsWith("(BY ")
      ? `${descriptor.byLine} ${text}`.trim()
      : text;

    const paragraph: TranscriptParagraph = {
      kind: descriptor.mode,
      label: descriptor.mode === "Q" ? "Q." : descriptor.mode === "A" ? "A." : descriptor.label,
      text: paragraphText,
      sourceUtteranceIds: [line.utterance_id],
      sourceWordIds: [...line.source_word_ids],
    };

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

export function buildTranscriptParagraphsClean(document: EditorDocument, record?: CaseRecord | null): TranscriptParagraph[] {
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
    const text = serializeLineTextClean(line);
    const descriptor = classifyLineDescriptor(line, text, state);

    if (descriptor.heading) {
      flushPending();
      paragraphs.push({
        kind: "SECTION_HEADER",
        label: "",
        text: descriptor.heading,
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
        sourceUtteranceIds: [line.utterance_id],
        sourceWordIds: [...line.source_word_ids],
      });
    }

    const paragraphText = descriptor.mode === "Q" && descriptor.byLine?.startsWith("(BY ")
      ? `${descriptor.byLine} ${text}`.trim()
      : text;

    const paragraph: TranscriptParagraph = {
      kind: descriptor.mode,
      label: descriptor.mode === "Q" ? "Q." : descriptor.mode === "A" ? "A." : descriptor.label,
      text: paragraphText,
      sourceUtteranceIds: [line.utterance_id],
      sourceWordIds: [...line.source_word_ids],
    };

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

export function renderTranscriptParagraphText(paragraph: TranscriptParagraph): string {
  if (paragraph.kind === "SECTION_HEADER" || paragraph.kind === "BY_LINE") {
    return paragraph.text;
  }

  if (paragraph.kind === "Q" || paragraph.kind === "A") {
    return `${paragraph.label} ${paragraph.text}`.trim();
  }

  if (paragraph.kind === "PARENTHETICAL") {
    return paragraph.text;
  }

  return `${colloquyLabel(paragraph.label)}${COLON_GAP}${paragraph.text}`.trim();
}

export function renderTranscriptParagraphTextClean(paragraph: TranscriptParagraph): string {
  const cleanText = stripInlineFlagSpans(paragraph.text).trim();

  if (paragraph.kind === "SECTION_HEADER" || paragraph.kind === "BY_LINE") {
    return paragraph.text;
  }

  if (paragraph.kind === "Q" || paragraph.kind === "A") {
    return `${paragraph.label} ${cleanText}`.trim();
  }

  if (paragraph.kind === "PARENTHETICAL") {
    return cleanText;
  }

  return `${colloquyLabel(paragraph.label)}${COLON_GAP}${cleanText}`.trim();
}

export function buildWorkspaceTranscriptText(document: EditorDocument, record?: CaseRecord | null): string {
  return buildTranscriptParagraphs(document, record)
    .map((paragraph) => renderTranscriptParagraphText(paragraph))
    .join("\n\n")
    .trim();
}

export function buildWorkspaceTranscriptTextClean(document: EditorDocument, record?: CaseRecord | null): string {
  return buildTranscriptParagraphsClean(document, record)
    .map((paragraph) => renderTranscriptParagraphTextClean(paragraph))
    .join("\n\n")
    .trim();
}
