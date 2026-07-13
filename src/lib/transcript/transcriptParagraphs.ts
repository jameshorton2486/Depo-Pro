import type { EditorDocument } from "../../api/types";
import { COLON_GAP, colloquyLabel, normalizeHonorificSpacing } from "../../editor/stageS/colloquy";
import type { CaseRecord } from "../../types/case";
import { abbreviationRegistry } from "../format/abbreviationRegistry";
import { cfe } from "../format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import type { FormattedLine, FormattedWord } from "../format/types";
import { applyParagraphDisplayImprovements } from "./paragraphDisplayImprovements";
import { buildDisplayDocument } from "./speakerResolutionEngine";
import { applyQaFixer } from "./qaStructureUtils";
import { classifyDepositionRegions, type DepositionRegion } from "./depositionRegionEngine";
import { asStructuredUtterance, normalizePersistedLineType, type PersistedLineType } from "./structuredTranscript";
import type { TextMode, TranscriptParagraph, TranscriptParagraphKind, WorkspaceParagraphDescriptor } from "./transcriptParagraphTypes";

export type ParagraphSemanticLineType = "Q" | "A" | "SP" | "PN" | "HEADER" | null;

export interface ParagraphSemanticAssignment {
  utteranceId: string;
  speakerId: string;
  speakerLabel: string;
  lineType: ParagraphSemanticLineType;
}

interface RenderState {
  inExamination: boolean;
  currentExaminerLabel: string | null;
  hasQuestion: boolean;
  proceedingsInserted: boolean;
  lastParagraphWasColloquy: boolean;
  witnessPrefaceInserted: boolean;
}

interface StructuralEventDescriptor {
  text: string;
}

const QUESTION_LEAD_PATTERN = /^(can you|would you|will you|please|tell me|state|describe|explain|identify|have you|did you|do you|are you|what|when|where|why|how)\b/i;
const REPORTER_ADMIN_PATTERN = /\b(cause number|district court|licensed in texas|remote deposition|state your agreement|raise your right hand|solemnly swear|solemnly affirm|you may proceed with the examination|mark as exhibit|off the record|back on the record)\b/i;
const WITNESS_RESPONSE_PATTERN = /^(yes\.?|no\.?|correct\.?|i do\.?|i did\.?|i was\.?|uh\b|um\b|my name is\b|i'm\b|i am\b|sure\.?|okay\.?)/i;
const OBJECTION_PATTERN = /\bobjection\.\s*(?:form\.|foundation\.|nonresponsive\.|hearsay\.)?/i;

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
  region: DepositionRegion,
  label: string,
  speakerLabel: string,
  speakerId: string | null,
  mode: TextMode,
  words: FormattedWord[],
  sourceLines: FormattedLine[],
  leadingText = "",
): TranscriptParagraph {
  return {
    kind,
    region,
    label,
    speakerLabel,
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

function detectStructuralEvent(text: string): StructuralEventDescriptor | null {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }

  if (/\b(raise your right hand|solemnly swear|solemnly affirm|under penalty of perjury)\b/i.test(normalized)) {
    return { text: "(The witness was sworn.)" };
  }

  if (/\b(you may proceed with the examination|proceed with the examination)\b/i.test(normalized)) {
    return { text: "(Whereupon, the deposition commenced.)" };
  }

  const exhibitMatch = normalized.match(/\bexhibit\s+(\d+)\s+marked\b/i);
  if (exhibitMatch) {
    return { text: `(Exhibit ${exhibitMatch[1]} marked)` };
  }

  return null;
}

function buildWitnessPrefaceParagraphs(
  line: FormattedLine,
  mode: TextMode,
  record?: CaseRecord | null,
): TranscriptParagraph[] {
  const witnessName = record?.witnesses?.[0]?.name.value?.trim();
  if (!witnessName) {
    return [];
  }

  return [
    {
      kind: "SECTION_HEADER",
      region: "TESTIMONY",
      label: "",
      speakerLabel: "",
      text: witnessName.toUpperCase(),
      speakerId: line.speaker_id,
      leadingText: witnessName.toUpperCase(),
      mode,
      words: [],
      sourceLines: [line],
      sourceUtteranceIds: [line.utterance_id],
      sourceWordIds: [...line.source_word_ids],
    },
    {
      kind: "SECTION_HEADER",
      region: "TESTIMONY",
      label: "",
      speakerLabel: "",
      text: "having been first duly sworn, testified as follows:",
      speakerId: line.speaker_id,
      leadingText: "having been first duly sworn, testified as follows:",
      mode,
      words: [],
      sourceLines: [line],
      sourceUtteranceIds: [line.utterance_id],
      sourceWordIds: [...line.source_word_ids],
    },
  ];
}

function attorneyCandidates(record: CaseRecord | null | undefined): Array<{ label: string; variants: string[] }> {
  return (record?.attorneys ?? []).map((attorney) => {
    const parts = attorney.name.value.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] ?? "";
    const last = parts[parts.length - 1] ?? "";
    return {
      label: normalizeSpeakerLabel(`MR. ${last || attorney.name.value}`),
      variants: [
        attorney.name.value,
        first,
        last,
        `${first} ${last}`.trim(),
      ].filter(Boolean).map((value) => value.toUpperCase()),
    };
  });
}

function inferAttorneyLabelFromText(text: string, record?: CaseRecord | null): string | null {
  const normalizedText = text.toUpperCase();

  for (const attorney of attorneyCandidates(record)) {
    if (attorney.variants.some((variant) => variant.length > 0 && normalizedText.includes(variant))) {
      return attorney.label;
    }
  }

  return null;
}

function looksLikeAttorneySpeaker(label: string, record?: CaseRecord | null): boolean {
  const normalized = normalizeSpeakerLabel(label);
  if (/^(MR|MS|MRS)\.\s+/i.test(normalized)) {
    return true;
  }

  return attorneyCandidates(record).some((attorney) => attorney.label === normalized);
}

function inferOpeningAppearanceLabel(
  text: string,
  persistedSpeakerLabel: string,
  record?: CaseRecord | null,
): string {
  const attorneyLabel = inferAttorneyLabelFromText(text, record);
  if (!attorneyLabel) {
    return persistedSpeakerLabel;
  }

  if (/\b(for the plaintiff|for defendant|represent(?:ing)? the plaintiff|represent(?:ing)? defendant|located in)\b/i.test(text)) {
    return attorneyLabel;
  }

  return persistedSpeakerLabel;
}

function witnessLabelCandidates(record?: CaseRecord | null): string[] {
  const witness = record?.witnesses?.[0];
  const name = witness?.name.value?.trim() ?? "";
  if (!name) {
    return ["THE WITNESS"];
  }

  const normalizedName = normalizeSpeakerLabel(name);
  const witnessSurname = name.split(/\s+/).filter(Boolean).slice(-1)[0] ?? "WITNESS";

  return Array.from(new Set([
    "THE WITNESS",
    normalizedName,
    normalizeSpeakerLabel(`DR. ${witnessSurname}`),
  ]));
}

function looksLikeWitnessSpeaker(label: string, record?: CaseRecord | null): boolean {
  const normalized = normalizeSpeakerLabel(label);
  return witnessLabelCandidates(record).includes(normalized);
}

function looksLikeQuestion(text: string): boolean {
  const normalized = text.trim();
  return /\?$/.test(normalized) || QUESTION_LEAD_PATTERN.test(normalized);
}

function isAdministrativeReporterText(text: string): boolean {
  return REPORTER_ADMIN_PATTERN.test(text);
}

function looksLikeWitnessResponse(text: string): boolean {
  return WITNESS_RESPONSE_PATTERN.test(text.trim());
}

function looksLikeStandaloneObjection(text: string): boolean {
  return OBJECTION_PATTERN.test(text.trim());
}

function buildStructuralEventParagraph(
  text: string,
  line: FormattedLine,
  mode: TextMode,
): TranscriptParagraph {
  return {
    kind: "PARENTHETICAL",
    region: "PROCEEDINGS",
    label: "",
    speakerLabel: "",
    text,
    speakerId: line.speaker_id,
    leadingText: "",
    mode,
    words: [],
    sourceLines: [line],
    sourceUtteranceIds: [line.utterance_id],
    sourceWordIds: [...line.source_word_ids],
  };
}

function buildDocumentBlockParagraph(
  line: FormattedLine,
  text: string,
  mode: TextMode,
  region: DepositionRegion,
): TranscriptParagraph {
  return {
    kind: "DOCUMENT_BLOCK",
    region,
    label: "",
    speakerLabel: "",
    text,
    speakerId: line.speaker_id,
    leadingText: "",
    mode,
    words: [...line.words],
    sourceLines: [line],
    sourceUtteranceIds: [line.utterance_id],
    sourceWordIds: [...line.source_word_ids],
  };
}

function readExtractedValue(value: { value: string | null } | { value: string } | null | undefined): string | null {
  const candidate = value?.value;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

function toUpperLine(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim().toUpperCase() : null;
}

function buildPartyCaptionLines(record?: CaseRecord | null): string[] {
  const parties = record?.parties ?? [];
  if (parties.length === 0) {
    const caseStyle = toUpperLine(readExtractedValue(record?.caption.case_style) ?? readExtractedValue(record?.caption.case_name));
    return caseStyle ? [caseStyle] : [];
  }

  const plaintiffLines = parties
    .filter((party) => party.role.value === "plaintiff" || party.role.value === "cross_plaintiff")
    .map((party) => toUpperLine(readExtractedValue(party.name)))
    .filter((value): value is string => Boolean(value));
  const defendantLines = parties
    .filter((party) => party.role.value === "defendant" || party.role.value === "cross_defendant")
    .map((party) => toUpperLine(readExtractedValue(party.name)))
    .filter((value): value is string => Boolean(value));
  const otherLines = parties
    .filter((party) => !["plaintiff", "cross_plaintiff", "defendant", "cross_defendant"].includes(party.role.value))
    .map((party) => toUpperLine(readExtractedValue(party.name)))
    .filter((value): value is string => Boolean(value));

  const lines: string[] = [];
  if (plaintiffLines.length > 0) {
    lines.push(...plaintiffLines);
    lines.push(plaintiffLines.length === 1 ? "Plaintiff," : "Plaintiffs,");
  }
  if (defendantLines.length > 0 || otherLines.length > 0) {
    lines.push("VS.");
    lines.push(...defendantLines, ...otherLines);
    const totalDefenseLines = defendantLines.length + otherLines.length;
    lines.push(totalDefenseLines === 1 ? "Defendant." : "Defendants.");
  }

  if (lines.length > 0) {
    return lines;
  }

  const caseStyle = toUpperLine(readExtractedValue(record?.caption.case_style) ?? readExtractedValue(record?.caption.case_name));
  return caseStyle ? [caseStyle] : [];
}

function buildCaptionBlock(record?: CaseRecord | null): string | null {
  const causeNumber = readExtractedValue(record?.caption.case_number);
  const judicialDistrict = readExtractedValue(record?.caption.judicial_district);
  const courtName = readExtractedValue(record?.caption.court_name);
  const county = readExtractedValue(record?.caption.county);
  const state = readExtractedValue(record?.caption.state) ?? readExtractedValue(record?.session.location_state);
  const partyLines = buildPartyCaptionLines(record);

  const lines = [
    causeNumber ? `CAUSE NO. ${causeNumber}` : null,
    ...partyLines,
    "IN THE DISTRICT COURT",
    toUpperLine(judicialDistrict),
    toUpperLine(courtName),
    county || state
      ? toUpperLine([county, state].filter((value): value is string => Boolean(value)).join(", "))
      : null,
  ].filter((value): value is string => Boolean(value));

  return lines.length > 0 ? lines.join("\n") : null;
}

function buildAppearanceBlock(record?: CaseRecord | null): string | null {
  const attorneys = record?.attorneys ?? [];
  if (attorneys.length === 0) {
    return null;
  }

  const lines: string[] = ["APPEARANCES"];

  for (const attorney of attorneys) {
    const name = readExtractedValue(attorney.name);
    if (!name) {
      continue;
    }

    const block = [
      toUpperLine(name),
      attorney.representing.value ? `For ${attorney.representing.value}` : null,
      attorney.firm.value?.trim() ? attorney.firm.value.trim() : null,
      attorney.address?.trim() ? attorney.address.trim() : null,
      [attorney.city?.trim(), attorney.state?.trim(), attorney.zip?.trim()]
        .filter((value): value is string => Boolean(value))
        .join(", ") || null,
      attorney.phone?.trim() ? attorney.phone.trim() : null,
      attorney.email?.trim() ? attorney.email.trim() : null,
    ].filter((value): value is string => Boolean(value));

    if (block.length === 0) {
      continue;
    }

    if (lines.length > 1) {
      lines.push("");
    }
    lines.push(...block);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function buildCaptionProductionParagraphs(
  line: FormattedLine,
  mode: TextMode,
  record?: CaseRecord | null,
): TranscriptParagraph[] {
  const captionBlock = buildCaptionBlock(record);
  const appearanceBlock = buildAppearanceBlock(record);
  const paragraphs: TranscriptParagraph[] = [];

  if (captionBlock) {
    paragraphs.push(buildDocumentBlockParagraph(line, captionBlock, mode, "CAPTION"));
  }

  if (appearanceBlock) {
    paragraphs.push(buildDocumentBlockParagraph(line, appearanceBlock, mode, "CAPTION"));
  }

  return paragraphs;
}

function classifyLineDescriptor(
  line: FormattedLine,
  text: string,
  state: RenderState,
  record?: CaseRecord | null,
  persistedLineType?: PersistedLineType | null,
  persistedSpeakerLabel?: string | null,
): WorkspaceParagraphDescriptor {
  const rawSpeakerLabel = persistedSpeakerLabel ?? line.speaker_label;
  const openingAppearanceLabel = inferOpeningAppearanceLabel(text, rawSpeakerLabel, record);
  const inferredAttorneyLabel = inferAttorneyLabelFromText(text, record);
  const speakerLabel = state.inExamination
    ? (inferredAttorneyLabel ?? rawSpeakerLabel)
    : openingAppearanceLabel;

  if (persistedLineType === "PN") {
    return { mode: "PARENTHETICAL", label: "", heading: null, byLine: null };
  }

  if (!state.proceedingsInserted) {
    const inferredMode =
      line.role === "q"
        ? "Q"
        : line.role === "a"
          ? "A"
          : looksLikeParenthetical(text)
            ? "PARENTHETICAL"
            : "COLLOQUY";
    return {
      mode: persistedLineType === "Q" ? "Q" : persistedLineType === "A" ? "A" : inferredMode,
      label: openingAppearanceLabel,
      heading: persistedLineType === "Q"
        ? "EXAMINATION"
        : line.role === "q"
          ? "EXAMINATION"
          : line.role === "speaker_label"
            ? "PROCEEDINGS"
            : null,
      byLine: persistedLineType === "Q" || line.role === "q" ? buildByLine(speakerLabel) : null,
    };
  }

  if (looksLikeParenthetical(text)) {
    return { mode: "PARENTHETICAL", label: "", heading: null, byLine: null };
  }

  if (persistedLineType === "Q" || line.role === "q") {
    if (
      state.inExamination
      && looksLikeAttorneySpeaker(rawSpeakerLabel, record)
      && normalizeSpeakerLabel(rawSpeakerLabel) !== normalizeSpeakerLabel(state.currentExaminerLabel ?? "")
    ) {
      return {
        mode: "COLLOQUY",
        label: rawSpeakerLabel,
        heading: null,
        byLine: null,
      };
    }

    const needsResumptionByLine = state.lastParagraphWasColloquy && state.inExamination;
    return {
      mode: "Q",
      label: inferredAttorneyLabel ?? state.currentExaminerLabel ?? speakerLabel,
      heading: state.inExamination ? null : "EXAMINATION",
      byLine: needsResumptionByLine
        ? buildResumptionByLine(inferredAttorneyLabel ?? state.currentExaminerLabel ?? speakerLabel)
        : (state.currentExaminerLabel !== (inferredAttorneyLabel ?? speakerLabel)
            ? buildByLine(inferredAttorneyLabel ?? speakerLabel)
            : null),
    };
  }

  if (persistedLineType === "A" || line.role === "a") {
    return { mode: "A", label: speakerLabel, heading: null, byLine: null };
  }

  if (looksLikeStandaloneObjection(text)) {
    return {
      mode: "COLLOQUY",
      label: inferredAttorneyLabel ?? speakerLabel,
      heading: null,
      byLine: null,
    };
  }

  if (state.proceedingsInserted && !isAdministrativeReporterText(text) && looksLikeQuestion(text)) {
    const defaultAttorneySurname = record?.attorneys?.[0]?.name.value
      ? record.attorneys[0].name.value.split(/\s+/).filter(Boolean).slice(-1)[0]
      : null;
    const examinerLabel = inferredAttorneyLabel
      ?? state.currentExaminerLabel
      ?? inferAttorneyLabelFromText(text, record)
      ?? normalizeSpeakerLabel(defaultAttorneySurname ? `MR. ${defaultAttorneySurname}` : rawSpeakerLabel);

    const needsResumptionByLine = state.lastParagraphWasColloquy && state.inExamination;

    return {
      mode: "Q",
      label: examinerLabel,
      heading: state.inExamination ? null : "EXAMINATION",
      byLine: needsResumptionByLine
        ? buildResumptionByLine(examinerLabel)
        : (state.currentExaminerLabel !== examinerLabel ? buildByLine(examinerLabel) : null),
    };
  }

  const witnessSpeaker = looksLikeWitnessSpeaker(rawSpeakerLabel, record);

  if (
    state.inExamination
    && state.hasQuestion
    && !isAdministrativeReporterText(text)
    && !looksLikeQuestion(text)
    && (looksLikeWitnessResponse(text) || witnessSpeaker)
  ) {
    return { mode: "A", label: speakerLabel, heading: null, byLine: null };
  }

  return {
    mode: looksLikeParenthetical(text) ? "PARENTHETICAL" : "COLLOQUY",
    label: speakerLabel,
    heading: null,
    byLine: null,
  };
}

function advanceRenderState(descriptor: WorkspaceParagraphDescriptor, state: RenderState): RenderState {
  const hasQuestion = state.hasQuestion || descriptor.mode === "Q";

  return {
    proceedingsInserted: true,
    inExamination: state.inExamination || descriptor.mode === "Q" || (descriptor.mode === "A" && hasQuestion),
    currentExaminerLabel: descriptor.mode === "Q" ? descriptor.label : state.currentExaminerLabel,
    hasQuestion,
    lastParagraphWasColloquy: descriptor.mode === "COLLOQUY",
    witnessPrefaceInserted: state.witnessPrefaceInserted,
  };
}

export function buildWorkspaceParagraphs(document: EditorDocument, record?: CaseRecord | null): Map<string, WorkspaceParagraphDescriptor> {
  const displayDocument = buildDisplayDocument(document, record);
  const formatted = cfe(displayDocument, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
  const structuredUtteranceById = new Map(
    displayDocument.utterances.map((utterance) => [utterance.utterance_id, asStructuredUtterance(utterance)]),
  );
  const descriptors = new Map<string, WorkspaceParagraphDescriptor>();
  const regionByUtteranceId = classifyDepositionRegions(formatted.lines.map((line) => {
    const structuredUtterance = structuredUtteranceById.get(line.utterance_id);
    return {
      utteranceId: line.utterance_id,
      text: serializeLineText(line, "display"),
      persistedLineType: normalizePersistedLineType(structuredUtterance?.line_type),
      role: line.role,
    };
  }));
  let state: RenderState = {
    inExamination: false,
    currentExaminerLabel: null,
    hasQuestion: false,
    proceedingsInserted: false,
    lastParagraphWasColloquy: false,
    witnessPrefaceInserted: false,
  };

  for (const line of formatted.lines) {
    if (descriptors.has(line.utterance_id)) {
      continue;
    }
    const text = serializeLineText(line, "display");
    const region = regionByUtteranceId.get(line.utterance_id) ?? "PROCEEDINGS";
    if (region === "CAPTION" || region === "CERTIFICATION") {
      descriptors.set(line.utterance_id, {
        mode: "COLLOQUY",
        label: "",
        heading: null,
        byLine: null,
      });
      continue;
    }
    const structuredUtterance = structuredUtteranceById.get(line.utterance_id);
    const descriptor = classifyLineDescriptor(
      line,
      text,
      state,
      record,
      normalizePersistedLineType(structuredUtterance?.line_type),
      structuredUtterance?.speaker_label ?? null,
    );
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
    left.region,
    left.label,
    left.speakerLabel,
    left.speakerId,
    left.mode,
    [...leftWords, ...right.words],
    [...left.sourceLines, ...right.sourceLines],
    left.leadingText,
  );
}

function canMergeParagraphs(current: TranscriptParagraph | null, next: TranscriptParagraph): current is TranscriptParagraph {
  return Boolean(
    current
    && current.kind === next.kind
    && current.region === next.region
    && current.kind !== "SECTION_HEADER"
    && current.kind !== "BY_LINE"
    && current.kind !== "DOCUMENT_BLOCK"
    && current.label === next.label
  );
}

function paragraphKindToSemanticLineType(kind: TranscriptParagraphKind): ParagraphSemanticLineType {
  if (kind === "Q") return "Q";
  if (kind === "A") return "A";
  if (kind === "PARENTHETICAL") return "PN";
  if (kind === "COLLOQUY") return "SP";
  if (kind === "SECTION_HEADER") return "HEADER";
  return null;
}

function semanticLineTypePriority(lineType: ParagraphSemanticLineType): number {
  if (lineType === "Q" || lineType === "A") return 4;
  if (lineType === "PN") return 3;
  if (lineType === "SP") return 2;
  if (lineType === "HEADER") return 1;
  return 0;
}

export function buildTranscriptParagraphs(
  document: EditorDocument,
  record?: CaseRecord | null,
  mode: TextMode = "display",
): TranscriptParagraph[] {
  const displayDocument = buildDisplayDocument(document, record);
  const formatted = cfe(displayDocument, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
  const structuredUtteranceById = new Map(
    displayDocument.utterances.map((utterance) => [utterance.utterance_id, asStructuredUtterance(utterance)]),
  );
  const paragraphs: TranscriptParagraph[] = [];
  const regionByUtteranceId = classifyDepositionRegions(formatted.lines.map((line) => {
    const structuredUtterance = structuredUtteranceById.get(line.utterance_id);
    return {
      utteranceId: line.utterance_id,
      text: serializeLineText(line, mode),
      persistedLineType: normalizePersistedLineType(structuredUtterance?.line_type),
      role: line.role,
    };
  }));
  let state: RenderState = {
    inExamination: false,
    currentExaminerLabel: null,
    hasQuestion: false,
    proceedingsInserted: false,
    lastParagraphWasColloquy: false,
    witnessPrefaceInserted: false,
  };
  let pending: TranscriptParagraph | null = null;
  let captionProduced = false;
  let captionGeneratedFromRecord = false;

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
    const structuredUtterance = structuredUtteranceById.get(line.utterance_id);
    const persistedLineType = normalizePersistedLineType(structuredUtterance?.line_type);
    const region = regionByUtteranceId.get(line.utterance_id) ?? "PROCEEDINGS";
    const structuralEvent = detectStructuralEvent(text);

    if (region === "CAPTION") {
      flushPending();
      if (!captionProduced) {
        const producedCaptionParagraphs = buildCaptionProductionParagraphs(line, mode, record);
        if (producedCaptionParagraphs.length > 0) {
          paragraphs.push(...producedCaptionParagraphs);
          captionProduced = true;
          captionGeneratedFromRecord = true;
          state = { ...state, lastParagraphWasColloquy: false };
          continue;
        }
      }
      if (captionGeneratedFromRecord) {
        state = { ...state, lastParagraphWasColloquy: false };
        continue;
      }
      paragraphs.push(buildDocumentBlockParagraph(line, text, mode, region));
      captionProduced = true;
      state = { ...state, lastParagraphWasColloquy: false };
      continue;
    }

    if (region === "CERTIFICATION") {
      flushPending();
      paragraphs.push(buildDocumentBlockParagraph(line, text, mode, region));
      state = { ...state, lastParagraphWasColloquy: false };
      continue;
    }

    if (persistedLineType === "HEADER") {
      flushPending();
      paragraphs.push({
        kind: "SECTION_HEADER",
        region,
        label: "",
        speakerLabel: "",
        text,
        speakerId: line.speaker_id,
        leadingText: text,
        mode,
        words: [...line.words],
        sourceLines: [line],
        sourceUtteranceIds: [line.utterance_id],
        sourceWordIds: [...line.source_word_ids],
      });
      state = { ...state, proceedingsInserted: true, lastParagraphWasColloquy: false };
      continue;
    }

    if (structuralEvent) {
      flushPending();
      paragraphs.push(buildStructuralEventParagraph(structuralEvent.text, line, mode));
      state = { ...state, proceedingsInserted: true, lastParagraphWasColloquy: false };
      continue;
    }

    const descriptor = classifyLineDescriptor(
      line,
      text,
      state,
      record,
      persistedLineType,
      structuredUtterance?.speaker_label ?? null,
    );

    if (descriptor.heading) {
      flushPending();
      if (descriptor.heading === "EXAMINATION" && !state.witnessPrefaceInserted) {
        paragraphs.push(...buildWitnessPrefaceParagraphs(line, mode, record));
        state = { ...state, witnessPrefaceInserted: true };
      }
      paragraphs.push({
        kind: "SECTION_HEADER",
        region,
        label: "",
        speakerLabel: "",
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
        region,
        label: "",
        speakerLabel: descriptor.label,
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
      region,
      descriptor.mode === "Q" ? "Q." : descriptor.mode === "A" ? "A." : descriptor.label,
      descriptor.label,
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

export function buildParagraphSemanticAssignments(
  document: EditorDocument,
  record?: CaseRecord | null,
): ParagraphSemanticAssignment[] {
  const displayDocument = buildDisplayDocument(document, record);
  const speakerById = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker]));
  const paragraphs = buildTranscriptParagraphs(document, record, "display");
  const assignmentByUtteranceId = new Map<string, ParagraphSemanticAssignment>();

  for (const paragraph of paragraphs) {
    const lineType = paragraphKindToSemanticLineType(paragraph.kind);
    if (lineType == null) {
      continue;
    }

    for (const utteranceId of paragraph.sourceUtteranceIds) {
      const existing = assignmentByUtteranceId.get(utteranceId);
      if (existing && semanticLineTypePriority(existing.lineType) >= semanticLineTypePriority(lineType)) {
        continue;
      }

      const speakerId = paragraph.speakerId
        ?? displayDocument.utterances.find((utterance) => utterance.utterance_id === utteranceId)?.speaker_id
        ?? "";
      const fallbackSpeakerLabel = speakerById.get(speakerId)?.display_name ?? speakerId;

      assignmentByUtteranceId.set(utteranceId, {
        utteranceId,
        speakerId,
        speakerLabel: paragraph.speakerLabel || fallbackSpeakerLabel,
        lineType,
      });
    }
  }

  return displayDocument.utterances.map((utterance) => {
    const assignment = assignmentByUtteranceId.get(utterance.utterance_id);
    const speakerLabel = assignment?.speakerLabel
      ?? speakerById.get(utterance.speaker_id)?.display_name
      ?? utterance.speaker_id;

    return {
      utteranceId: utterance.utterance_id,
      speakerId: utterance.speaker_id,
      speakerLabel,
      lineType: assignment?.lineType ?? null,
    };
  });
}

export function renderTranscriptParagraphText(
  paragraph: TranscriptParagraph,
  stripInlineFlags: (value: string) => string,
  mode: TextMode,
): string {
  const text = mode === "clean"
    ? stripInlineFlags(paragraph.text).trim()
    : paragraph.text;

  if (paragraph.kind === "SECTION_HEADER" || paragraph.kind === "BY_LINE") {
    return paragraph.text;
  }

  if (paragraph.kind === "DOCUMENT_BLOCK") {
    return text;
  }

  if (paragraph.kind === "Q" || paragraph.kind === "A") {
    return `${paragraph.label} ${text}`.trim();
  }

  if (paragraph.kind === "PARENTHETICAL") {
    return text;
  }

  return `${colloquyLabel(paragraph.label)}${COLON_GAP}${text}`.trim();
}

export function buildWorkspaceTranscriptText(
  document: EditorDocument,
  stripInlineFlags: (value: string) => string,
  record?: CaseRecord | null,
): string {
  return buildTranscriptParagraphs(document, record, "display")
    .map((paragraph) => renderTranscriptParagraphText(paragraph, stripInlineFlags, "display"))
    .join("\n\n")
    .trim();
}

export function buildWorkspaceTranscriptTextClean(
  document: EditorDocument,
  stripInlineFlags: (value: string) => string,
  record?: CaseRecord | null,
): string {
  return buildTranscriptParagraphs(document, record, "clean")
    .map((paragraph) => renderTranscriptParagraphText(paragraph, stripInlineFlags, "clean"))
    .join("\n\n")
    .trim();
}
