import type { TranscriptParagraph } from "./transcriptParagraphTypes";

// Relocated from the retired structureEngine (Phase G, Wave G1); this package's
// (currently always-empty) `dialogue` field is the sole surviving consumer.
export type StructureBlockType =
  | "Q"
  | "A"
  | "SP"
  | "PN"
  | "HEADER"
  | "NEEDS_SPLIT"
  | "NEEDS_EXTRACT";

export interface ClassifiedBlock {
  utterance_index: number;
  utterance_id: string;
  block_type: StructureBlockType;
  speaker_id: string;
  display_name: string;
  confidence: number;
  text?: string;
  split_point?: string;
  objection_text?: string;
  position?: "start" | "middle" | "end";
  synthetic_flag?: string;
}

export interface DialogueBlock extends ClassifiedBlock {
  dialogue_block_id: string;
  source_utterance_ids: string[];
  text: string;
}

export const STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA = "depo-pro/structured-transcript-package";
export const STRUCTURED_TRANSCRIPT_PACKAGE_VERSION = 1 as const;

export interface StructuredTranscriptPackageParagraph {
  id: string;
  paragraph: TranscriptParagraph;
  sourceUtteranceIds: string[];
  sourceWordIds: string[];
}

export interface StructuredTranscriptPackage {
  schema: typeof STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA;
  version: typeof STRUCTURED_TRANSCRIPT_PACKAGE_VERSION;
  transcriptId: string;
  createdAt: string;
  paragraphs: StructuredTranscriptPackageParagraph[];
  dialogue: DialogueBlock[];
}

export interface StructuredTranscriptPackageInput {
  transcriptId: string;
  paragraphs: TranscriptParagraph[];
  dialogue: DialogueBlock[];
  createdAt?: string;
}

function packageParagraphId(paragraph: TranscriptParagraph, index: number): string {
  const source = paragraph.sourceUtteranceIds?.join(",") || "generated";
  return `paragraph:${index}:${source}`;
}

function cloneParagraph(paragraph: TranscriptParagraph): TranscriptParagraph {
  return {
    ...paragraph,
    words: [...paragraph.words],
    sourceLines: [...paragraph.sourceLines],
    sourceUtteranceIds: [...paragraph.sourceUtteranceIds],
    sourceWordIds: [...paragraph.sourceWordIds],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export function buildStructuredTranscriptPackage(
  input: StructuredTranscriptPackageInput,
): StructuredTranscriptPackage {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    schema: STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA,
    version: STRUCTURED_TRANSCRIPT_PACKAGE_VERSION,
    transcriptId: input.transcriptId,
    createdAt,
    paragraphs: input.paragraphs.map((paragraph, index) => ({
      id: packageParagraphId(paragraph, index),
      paragraph: cloneParagraph(paragraph),
      sourceUtteranceIds: [...paragraph.sourceUtteranceIds],
      sourceWordIds: [...paragraph.sourceWordIds],
    })),
    dialogue: input.dialogue.map((block) => ({
      ...block,
      source_utterance_ids: [...block.source_utterance_ids],
    })),
  };
}

export function validateStructuredTranscriptPackage(transcriptPackage: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(transcriptPackage)) return ["package must be an object"];
  if (transcriptPackage.schema !== STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA) errors.push("package schema is invalid");
  if (transcriptPackage.version !== STRUCTURED_TRANSCRIPT_PACKAGE_VERSION) errors.push("package version is invalid");
  if (typeof transcriptPackage.transcriptId !== "string" || !transcriptPackage.transcriptId.trim()) errors.push("transcriptId is required");
  if (typeof transcriptPackage.createdAt !== "string" || Number.isNaN(Date.parse(transcriptPackage.createdAt))) errors.push("createdAt must be an ISO timestamp");

  const paragraphIds = new Set<string>();
  if (!Array.isArray(transcriptPackage.paragraphs)) errors.push("paragraphs must be an array");
  else for (const entry of transcriptPackage.paragraphs) {
    if (!isRecord(entry)) { errors.push("paragraph entry must be an object"); continue; }
    const id = typeof entry.id === "string" ? entry.id : "unknown";
    if (paragraphIds.has(id)) errors.push(`duplicate paragraph package ID: ${id}`);
    paragraphIds.add(id);
    if (!Array.isArray(entry.sourceUtteranceIds) || entry.sourceUtteranceIds.length === 0) errors.push(`paragraph ${id} is missing source utterance provenance`);
  }

  const dialogueIds = new Set<string>();
  if (!Array.isArray(transcriptPackage.dialogue)) errors.push("dialogue must be an array");
  else for (const block of transcriptPackage.dialogue) {
    if (!isRecord(block)) { errors.push("dialogue block must be an object"); continue; }
    const id = typeof block.dialogue_block_id === "string" ? block.dialogue_block_id : "unknown";
    if (dialogueIds.has(id)) errors.push(`duplicate dialogue block ID: ${id}`);
    dialogueIds.add(id);
    if (!Array.isArray(block.source_utterance_ids) || block.source_utterance_ids.length === 0) errors.push(`dialogue block ${id} is missing source provenance`);
  }
  return errors;
}
