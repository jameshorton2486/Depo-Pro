import type { FormattedLine, FormattedWord } from "../format/types";
import type { DepositionRegion } from "./depositionRegionEngine";
import type {
  TextMode,
  TranscriptParagraph,
  TranscriptParagraphKind,
  WorkspaceParagraphDescriptor,
} from "./transcriptParagraphTypes";

export type ExaminationKind = "EXAMINATION" | "CROSS-EXAMINATION" | "REDIRECT" | "RECROSS";

export interface ParagraphProductionLine {
  line: FormattedLine;
  text: string;
  region: DepositionRegion;
  persistedLineType?: "Q" | "A" | "PN" | "HEADER" | "SP" | null;
  speakerLabel: string;
}

interface ExaminationState {
  kind: ExaminationKind | null;
  examinerLabel: string | null;
  examinerSpeakerId: string | null;
  lastWasColloquy: boolean;
}

const EXAMINATION_HEADINGS: Readonly<Record<string, ExaminationKind>> = {
  EXAMINATION: "EXAMINATION",
  "CROSS-EXAMINATION": "CROSS-EXAMINATION",
  REDIRECT: "REDIRECT",
  "REDIRECT EXAMINATION": "REDIRECT",
  RECROSS: "RECROSS",
  "RECROSS-EXAMINATION": "RECROSS",
};

function normalizeSpeakerLabel(label: string | null | undefined): string {
  return (label ?? "").trim().replace(/:+$/, "").replace(/\s+/g, " ").toUpperCase();
}

function buildByLine(label: string): string {
  return `BY ${normalizeSpeakerLabel(label)}:`;
}

export function buildResumptionByLine(label: string | null | undefined): string {
  return `(BY ${normalizeSpeakerLabel(label)})`;
}

function collectSourceUtteranceIds(words: FormattedWord[], line: FormattedLine): string[] {
  return Array.from(new Set([line.utterance_id, ...words.map((word) => word.utterance_id)]));
}

function buildParagraph(
  kind: TranscriptParagraphKind,
  input: ParagraphProductionLine,
  label: string,
  text = input.text,
  leadingText = "",
): TranscriptParagraph {
  const isGenerated = kind === "SECTION_HEADER" || kind === "BY_LINE";
  const words = isGenerated ? [] : [...input.line.words];
  return {
    kind,
    region: input.region,
    label,
    speakerLabel: input.speakerLabel,
    text: `${leadingText}${text}`.trim(),
    speakerId: isGenerated ? null : input.line.speaker_id,
    leadingText,
    mode: "display" satisfies TextMode,
    words,
    sourceLines: [input.line],
    sourceUtteranceIds: collectSourceUtteranceIds(words, input.line),
    sourceWordIds: isGenerated ? [] : [...input.line.source_word_ids],
  };
}

function examinationHeading(text: string): ExaminationKind | null {
  return EXAMINATION_HEADINGS[text.trim().toUpperCase()] ?? null;
}

function nextExaminationKind(current: ExaminationKind | null): ExaminationKind {
  if (current === null) return "EXAMINATION";
  if (current === "EXAMINATION") return "CROSS-EXAMINATION";
  if (current === "CROSS-EXAMINATION") return "REDIRECT";
  if (current === "REDIRECT") return "RECROSS";
  return "CROSS-EXAMINATION";
}

function descriptorForLine(
  input: ParagraphProductionLine,
  state: ExaminationState,
): WorkspaceParagraphDescriptor {
  const heading = examinationHeading(input.text);
  if (heading) {
    return { mode: "COLLOQUY", label: "", heading, byLine: null };
  }

  if (input.persistedLineType === "PN") {
    return { mode: "PARENTHETICAL", label: "", heading: null, byLine: null };
  }

  const isQuestion = input.persistedLineType === "Q" || input.line.role === "q";
  if (isQuestion) {
    const label = normalizeSpeakerLabel(input.speakerLabel);
    const speakerChanged = state.examinerSpeakerId !== null
      && state.examinerSpeakerId !== input.line.speaker_id;
    const transition = state.kind === null || speakerChanged
      ? nextExaminationKind(state.kind)
      : null;
    const byLine = state.lastWasColloquy && !speakerChanged && state.examinerSpeakerId !== null
      ? buildResumptionByLine(label)
      : state.examinerSpeakerId !== input.line.speaker_id
        ? buildByLine(label)
        : null;
    return { mode: "Q", label, heading: transition, byLine };
  }

  if (input.persistedLineType === "A" || input.line.role === "a") {
    return { mode: "A", label: input.speakerLabel, heading: null, byLine: null };
  }

  return { mode: "COLLOQUY", label: input.speakerLabel, heading: null, byLine: null };
}

function advanceState(
  descriptor: WorkspaceParagraphDescriptor,
  state: ExaminationState,
  speakerId: string,
): ExaminationState {
  const nextHeading = descriptor.heading ? examinationHeading(descriptor.heading) : null;
  const explicitHeading = descriptor.mode === "COLLOQUY" && descriptor.heading !== null;
  return {
    kind: nextHeading ?? state.kind,
    examinerLabel: explicitHeading ? null : descriptor.mode === "Q" ? descriptor.label : state.examinerLabel,
    examinerSpeakerId: explicitHeading ? null : descriptor.mode === "Q" ? speakerId : state.examinerSpeakerId,
    lastWasColloquy: descriptor.mode === "COLLOQUY" && descriptor.heading === null,
  };
}

/** Where an examination section begins, from the structural paragraph authority. */
export interface ExaminationSectionStart {
  kind: ExaminationKind;
  /** Examining attorney label (normalized), when the section opens on a Q line. */
  examinerLabel: string | null;
  /** The utterance that opens the section — a real rendered line whose coordinate the map carries. */
  utteranceId: string;
}

/**
 * Detect examination-section boundaries from the SAME structural state machine that
 * synthesizes the SECTION_HEADER/BY_LINE paragraphs (buildTranscriptParagraphs), rather
 * than from rendered header text. This is why the certified witness index can be built
 * even though the "EXAMINATION"/"BY ..." lines are generated at the paragraph layer and
 * never appear as utterances in the cfe stream: each section start is keyed to the real
 * utterance that opens it, whose (page, line) the PaginationMap already holds. Pure and
 * deterministic; it introduces no new heuristic — it reuses descriptorForLine/advanceState.
 */
export function detectExaminationSections(
  lines: ParagraphProductionLine[] | null | undefined,
): ExaminationSectionStart[] {
  if (!lines) {
    return [];
  }
  const starts: ExaminationSectionStart[] = [];
  let state: ExaminationState = { kind: null, examinerLabel: null, examinerSpeakerId: null, lastWasColloquy: false };

  for (const input of lines) {
    if (input.region !== "TESTIMONY") {
      continue;
    }
    const descriptor = descriptorForLine(input, state);
    if (descriptor.heading) {
      const kind = examinationHeading(descriptor.heading);
      if (kind) {
        starts.push({
          kind,
          examinerLabel: descriptor.mode === "Q" ? normalizeSpeakerLabel(descriptor.label) : null,
          utteranceId: input.line.utterance_id,
        });
      }
    }
    state = advanceState(descriptor, state, input.line.speaker_id);
  }

  return starts;
}

export function buildTranscriptParagraphs(lines: ParagraphProductionLine[] | null | undefined): TranscriptParagraph[] {
  if (!lines) {
    return [];
  }
  const paragraphs: TranscriptParagraph[] = [];
  let state: ExaminationState = { kind: null, examinerLabel: null, examinerSpeakerId: null, lastWasColloquy: false };

  for (const input of lines) {
    if (input.region !== "TESTIMONY") {
      continue;
    }

    const descriptor = descriptorForLine(input, state);
    if (descriptor.heading) {
      paragraphs.push(buildParagraph("SECTION_HEADER", input, "", descriptor.heading));
    }
    if (descriptor.byLine && !descriptor.byLine.startsWith("(BY ")) {
      paragraphs.push(buildParagraph("BY_LINE", input, descriptor.label, descriptor.byLine));
    }

    if (!examinationHeading(input.text)) {
      const leadingText = descriptor.byLine?.startsWith("(BY ") ? `${descriptor.byLine} ` : "";
      const label = descriptor.mode === "Q" ? "Q." : descriptor.mode === "A" ? "A." : descriptor.label;
      paragraphs.push(buildParagraph(descriptor.mode, input, label, input.text, leadingText));
    }
    state = advanceState(descriptor, state, input.line.speaker_id);
  }

  return paragraphs;
}
