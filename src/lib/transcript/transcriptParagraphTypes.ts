import type { DepositionRegion } from "./depositionRegionEngine";
import type { FormattedLine, FormattedWord } from "../format/types";

export type WorkspaceParagraphMode = "COLLOQUY" | "Q" | "A" | "PARENTHETICAL";
export type TranscriptParagraphKind =
  | WorkspaceParagraphMode
  | "DOCUMENT_BLOCK"
  | "BY_LINE"
  | "SECTION_HEADER";

export type TextMode = "display" | "clean";

export interface WorkspaceParagraphDescriptor {
  mode: WorkspaceParagraphMode;
  label: string;
  heading: string | null;
  byLine: string | null;
}

export interface TranscriptParagraph {
  kind: TranscriptParagraphKind;
  region: DepositionRegion;
  label: string;
  speakerLabel: string;
  text: string;
  speakerId: string | null;
  leadingText: string;
  mode: TextMode;
  words: FormattedWord[];
  sourceLines: FormattedLine[];
  sourceUtteranceIds: string[];
  sourceWordIds: string[];
}
