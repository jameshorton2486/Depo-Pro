import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
  type IParagraphOptions,
} from "docx";

import type { EditorDocument, Speaker } from "../../api/types";
import type { ExportSegmentDocument } from "./exportAssembly";
import { getBlockRole, type BlockRole } from "../../editor/pagination";

export const DOCX_PAGE_WIDTH_TWIPS = 12240;
export const DOCX_PAGE_HEIGHT_TWIPS = 15840;
export const DOCX_MARGIN_TOP_TWIPS = 1440;
export const DOCX_MARGIN_BOTTOM_TWIPS = 1440;
export const DOCX_MARGIN_LEFT_TWIPS = 1800;
export const DOCX_MARGIN_RIGHT_TWIPS = 1080;

export const QA_LABEL_TAB_TWIPS = 720;
export const QA_TEXT_TAB_TWIPS = 1440;
export const COLLOQUY_TAB_TWIPS = 2160;
export const CENTER_TAB_TWIPS = (DOCX_PAGE_WIDTH_TWIPS / 2) - DOCX_MARGIN_LEFT_TWIPS;
export const QA_HANGING_INDENT_TWIPS = 720;

export type ParagraphRunSpec =
  | { kind: "text"; text: string }
  | { kind: "tab" };

export interface TranscriptDocxParagraphSpec {
  kind: "qa" | "attribution" | "colloquy" | "parenthetical" | "segment_heading";
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  indent?: {
    left?: number;
    hanging?: number;
  };
  runs: ParagraphRunSpec[];
  tabStops: Array<{
    type: (typeof TabStopType)[keyof typeof TabStopType];
    position: number;
  }>;
}

export function buildBodyTabStops() {
  return [
    { type: TabStopType.LEFT, position: QA_LABEL_TAB_TWIPS },
    { type: TabStopType.LEFT, position: QA_TEXT_TAB_TWIPS },
    { type: TabStopType.LEFT, position: COLLOQUY_TAB_TWIPS },
    { type: TabStopType.CENTER, position: CENTER_TAB_TWIPS },
  ] as const;
}

export function buildQaParagraphSpec(label: "Q." | "A.", text: string): TranscriptDocxParagraphSpec {
  return {
    kind: "qa",
    indent: {
      left: QA_TEXT_TAB_TWIPS,
      hanging: QA_HANGING_INDENT_TWIPS,
    },
    runs: [
      { kind: "text", text: label },
      { kind: "tab" },
      { kind: "text", text },
    ],
    tabStops: [...buildBodyTabStops()],
  };
}

export function buildAttributionParagraphSpec(text: string): TranscriptDocxParagraphSpec {
  return {
    kind: "attribution",
    indent: {
      left: QA_TEXT_TAB_TWIPS,
    },
    runs: [
      { kind: "tab" },
      { kind: "text", text },
    ],
    tabStops: [...buildBodyTabStops()],
  };
}

function buildColloquyParagraphSpec(label: string, text: string): TranscriptDocxParagraphSpec {
  return {
    kind: "colloquy",
    runs: [
      { kind: "text", text: `${label}:` },
      { kind: "tab" },
      { kind: "text", text },
    ],
    tabStops: [...buildBodyTabStops()],
  };
}

function buildParentheticalParagraphSpec(text: string): TranscriptDocxParagraphSpec {
  return {
    kind: "parenthetical",
    alignment: AlignmentType.CENTER,
    runs: [
      { kind: "tab" },
      { kind: "text", text },
    ],
    tabStops: [...buildBodyTabStops()],
  };
}

function buildSegmentHeadingParagraphSpec(text: string): TranscriptDocxParagraphSpec {
  return {
    kind: "segment_heading",
    alignment: AlignmentType.CENTER,
    runs: [{ kind: "text", text }],
    tabStops: [...buildBodyTabStops()],
  };
}

function createParagraphFromSpec(spec: TranscriptDocxParagraphSpec): Paragraph {
  const children = spec.runs.map((run) => {
    if (run.kind === "tab") {
      return new Tab();
    }
    return new TextRun(run.text);
  });

  const options: IParagraphOptions = {
    children,
    tabStops: spec.tabStops.map((tabStop) => ({
      type: tabStop.type,
      position: tabStop.position,
    })),
    alignment: spec.alignment,
    ...(spec.indent ? { indent: spec.indent } : {}),
  };

  return new Paragraph(options);
}

function buildUtteranceText(document: EditorDocument, wordIds: string[]): string {
  const wordsById = new Map(document.words.map((word) => [word.word_id, word]));
  return wordIds
    .map((wordId) => wordsById.get(wordId)?.text ?? "")
    .join(" ")
    .trim();
}

function isParentheticalText(text: string): boolean {
  return /^\(.+\)$/.test(text.trim());
}

function isAttributionText(text: string): boolean {
  return /^\(BY\b.+\)$/i.test(text.trim());
}

function buildParagraphSpecForUtterance(
  role: BlockRole,
  speakerLabel: string,
  text: string,
): TranscriptDocxParagraphSpec {
  if (isAttributionText(text)) {
    return buildAttributionParagraphSpec(text.trim());
  }

  if (isParentheticalText(text)) {
    return buildParentheticalParagraphSpec(text.trim());
  }

  if (role === "Q") {
    return buildQaParagraphSpec("Q.", text);
  }

  if (role === "A") {
    return buildQaParagraphSpec("A.", text);
  }

  return buildColloquyParagraphSpec(speakerLabel, text);
}

function buildDocumentParagraphSpecs(document: EditorDocument): TranscriptDocxParagraphSpec[] {
  const speakersById = new Map(document.speakers.map((speaker) => [speaker.speaker_id, speaker]));

  return document.utterances.map((utterance) => {
    const speaker = speakersById.get(utterance.speaker_id);
    const role = getBlockRole(speaker?.role);
    const speakerLabel = speaker?.display_name?.trim() || utterance.speaker_id;
    const text = buildUtteranceText(document, utterance.word_ids);
    return buildParagraphSpecForUtterance(role, speakerLabel, text);
  });
}

function sourceLabel(segment: ExportSegmentDocument, index: number): string {
  return segment.sourceFilename?.trim() || `Source ${index + 1}`;
}

export function buildTranscriptDocxParagraphSpecs(
  segments: ExportSegmentDocument[],
): TranscriptDocxParagraphSpec[] {
  const ordered = segments
    .slice()
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex);

  return ordered.flatMap((segment, index) => {
    const segmentParagraphs = buildDocumentParagraphSpecs(segment.document);
    if (ordered.length === 1) {
      return segmentParagraphs;
    }

    return [
      buildSegmentHeadingParagraphSpec(`Segment ${index + 1}: ${sourceLabel(segment, index)}`),
      ...segmentParagraphs,
    ];
  });
}

export async function buildTranscriptDocxBlob(
  segments: ExportSegmentDocument[],
): Promise<Blob> {
  const sectionChildren = buildTranscriptDocxParagraphSpecs(segments).map(createParagraphFromSpec);
  const document = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: DOCX_PAGE_WIDTH_TWIPS,
            height: DOCX_PAGE_HEIGHT_TWIPS,
          },
          margin: {
            top: DOCX_MARGIN_TOP_TWIPS,
            bottom: DOCX_MARGIN_BOTTOM_TWIPS,
            left: DOCX_MARGIN_LEFT_TWIPS,
            right: DOCX_MARGIN_RIGHT_TWIPS,
          },
        },
      },
      children: sectionChildren,
    }],
  });

  return Packer.toBlob(document);
}

export function inferSpeakerRole(role: string | null | undefined): Speaker["role"] | undefined {
  switch (role) {
    case "court_reporter":
    case "reporter":
      return "REPORTER";
    case "witness":
      return "WITNESS";
    case "attorney":
    case "examining_attorney":
    case "defending_attorney":
      return "ATTORNEY";
    case "interpreter":
      return "INTERPRETER";
    case "other":
      return "OTHER";
    default:
      return undefined;
  }
}
