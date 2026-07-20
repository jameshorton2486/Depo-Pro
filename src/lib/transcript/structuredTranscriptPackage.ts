import type { DialogueBlock } from "./structureEngine";
import type { TranscriptParagraph } from "./transcriptParagraphTypes";

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
  const source = paragraph.sourceUtteranceIds.join(",") || "generated";
  return `paragraph:${index}:${source}`;
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
      paragraph,
      sourceUtteranceIds: [...paragraph.sourceUtteranceIds],
      sourceWordIds: [...paragraph.sourceWordIds],
    })),
    dialogue: input.dialogue.map((block) => ({
      ...block,
      source_utterance_ids: [...block.source_utterance_ids],
    })),
  };
}

export function validateStructuredTranscriptPackage(
  transcriptPackage: StructuredTranscriptPackage,
): string[] {
  const errors: string[] = [];
  if (transcriptPackage.schema !== STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA) {
    errors.push("package schema is invalid");
  }
  if (transcriptPackage.version !== STRUCTURED_TRANSCRIPT_PACKAGE_VERSION) {
    errors.push("package version is invalid");
  }
  if (!transcriptPackage.transcriptId.trim()) {
    errors.push("transcriptId is required");
  }
  if (Number.isNaN(Date.parse(transcriptPackage.createdAt))) {
    errors.push("createdAt must be an ISO timestamp");
  }

  const paragraphIds = new Set<string>();
  for (const entry of transcriptPackage.paragraphs) {
    if (paragraphIds.has(entry.id)) {
      errors.push(`duplicate paragraph package ID: ${entry.id}`);
    }
    paragraphIds.add(entry.id);
    if (entry.sourceUtteranceIds.length === 0) {
      errors.push(`paragraph ${entry.id} is missing source utterance provenance`);
    }
  }

  const dialogueIds = new Set<string>();
  for (const block of transcriptPackage.dialogue) {
    if (dialogueIds.has(block.dialogue_block_id)) {
      errors.push(`duplicate dialogue block ID: ${block.dialogue_block_id}`);
    }
    dialogueIds.add(block.dialogue_block_id);
    if (block.source_utterance_ids.length === 0) {
      errors.push(`dialogue block ${block.dialogue_block_id} is missing source provenance`);
    }
  }

  return errors;
}
