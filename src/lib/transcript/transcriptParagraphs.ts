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

function normalizeSpeakerLabel(label: string): string {
  return label.trim().replace(/:+$/, "").replace(/\s+/g, " ").toUpperCase();
}

function buildByLine(label: string): string {
  return `BY ${normalizeSpeakerLabel(label)}:`;
}

export function buildResumptionByLine(label: string): string {
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
  const words = [...input.line.words];
  return {
    kind,
    region: input.region,
    label,
    speakerLabel: input.speakerLabel,
    text: `${leadingText}${text}`.trim(),
    speakerId: input.line.speaker_id,
    leadingText,
    mode: "display" satisfies TextMode,
    words,
    sourceLines: [input.line],
    sourceUtteranceIds: collectSourceUtteranceIds(words, input.line),
    sourceWordIds: [...input.line.source_word_ids],
  };
}

function examinationHeading(text: string): ExaminationKind | null {
  return EXAMINATION_HEADINGS[text.trim().toUpperCase()] ?? null;
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
    const transition = state.kind === null
      ? "EXAMINATION"
      : state.examinerLabel !== null && state.examinerLabel !== label
        ? "CROSS-EXAMINATION"
        : null;
    const byLine = state.lastWasColloquy
      ? buildResumptionByLine(label)
      : state.examinerLabel !== label
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
): ExaminationState {
  const nextHeading = descriptor.heading ? examinationHeading(descriptor.heading) : null;
  return {
    kind: nextHeading ?? state.kind,
    examinerLabel: descriptor.mode === "COLLOQUY" && descriptor.heading ? null : descriptor.mode === "Q" ? descriptor.label : state.examinerLabel,
    lastWasColloquy: descriptor.mode === "COLLOQUY" && descriptor.heading === null,
  };
}

export function buildTranscriptParagraphs(lines: ParagraphProductionLine[]): TranscriptParagraph[] {
  const paragraphs: TranscriptParagraph[] = [];
  let state: ExaminationState = { kind: null, examinerLabel: null, lastWasColloquy: false };

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
    state = advanceState(descriptor, state);
  }

  return paragraphs;
}
