import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import type { DepositionRegion } from "./depositionRegionEngine";
import { buildDisplayDocument } from "./speakerResolutionEngine";
import { buildTranscriptParagraphs, renderTranscriptParagraphText } from "./transcriptParagraphs";
import type { TextMode, TranscriptParagraph, TranscriptParagraphKind } from "./transcriptParagraphTypes";

export const STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA = "depo-pro/structured-transcript-package";
export const STRUCTURED_TRANSCRIPT_PACKAGE_VERSION = 1 as const;
export const STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA_VERSION = 1 as const;
export const STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER_VERSION = 1 as const;
export const STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER = "buildStructuredTranscriptPackage";
export const SPEAKER_SEMANTIC_PRODUCER = "buildDisplayDocument";
export const PARAGRAPH_SEMANTIC_PRODUCER = "buildTranscriptParagraphs";
export const BOUNDARY_SEMANTIC_PRODUCER = "boundaryEngine";

export interface StructuredTranscriptPackageIdentity {
  schema: typeof STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA;
  version: typeof STRUCTURED_TRANSCRIPT_PACKAGE_VERSION;
  producer: typeof STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER;
  builtAt: string;
  transcriptId: string;
}

export interface StructuredTranscriptPackageSpeaker {
  speakerId: string;
  displayName: string;
  role: EditorDocument["speakers"][number]["role"] | null;
  deepgramSpeaker: number | null;
}

export interface StructuredTranscriptParagraphReviewFlags {
  allReviewed: boolean;
  hasLowConfidence: boolean;
  hasPendingAiSuggestions: boolean;
}

export interface StructuredTranscriptParagraphConfidence {
  min: number | null;
  max: number | null;
  average: number | null;
}

export interface StructuredTranscriptPackageParagraph {
  id: string;
  kind: TranscriptParagraphKind;
  region: DepositionRegion;
  lineType: TranscriptParagraphKind;
  line_type: TranscriptParagraphKind;
  label: string;
  text: string;
  leadingText: string;
  speakerId: string | null;
  speakerLabel: string;
  speakerRole: EditorDocument["speakers"][number]["role"] | null;
  mode: TextMode;
  words: TranscriptParagraph["words"];
  sourceLines: TranscriptParagraph["sourceLines"];
  sourceUtteranceIds: string[];
  sourceWordIds: string[];
  confidence: StructuredTranscriptParagraphConfidence;
  reviewFlags: StructuredTranscriptParagraphReviewFlags;
  provenance: StructuredTranscriptPackageParagraphProvenance;
}

export interface StructuredTranscriptPackageParagraphProvenance {
  paragraphId: string;
  source: "RULE";
  metadata: null;
  boundary: {
    producer: typeof BOUNDARY_SEMANTIC_PRODUCER;
    excludedFromOutput: boolean;
    exclusionReason: "PRE_RECORD" | "OFF_RECORD" | "POST_RECORD" | null;
    isSynthetic: boolean;
  } | null;
  manual: null;
  ai: null;
  confidence: StructuredTranscriptParagraphConfidence;
  producer: typeof STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER;
  createdAt: string;
  sourceUtteranceIds: string[];
  sourceWordIds: string[];
  semanticOwners: {
    speakerLabel: typeof SPEAKER_SEMANTIC_PRODUCER;
    lineType: typeof PARAGRAPH_SEMANTIC_PRODUCER;
    paragraphStructure: typeof PARAGRAPH_SEMANTIC_PRODUCER;
    boundary: typeof BOUNDARY_SEMANTIC_PRODUCER | null;
  };
}

export interface StructuredTranscriptPackageLineTypeEntry {
  paragraphId: string;
  lineType: TranscriptParagraphKind;
}

export interface StructuredTranscriptPackageReviewFlagEntry {
  paragraphId: string;
  flags: StructuredTranscriptParagraphReviewFlags;
}

export interface StructuredTranscriptPackage {
  version: typeof STRUCTURED_TRANSCRIPT_PACKAGE_VERSION;
  schemaVersion: typeof STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA_VERSION;
  producerVersion: typeof STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER_VERSION;
  producerVersions: {
    contract: typeof STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER_VERSION;
    speakerSemantics: 1;
    paragraphSemantics: 1;
    boundarySemantics: 1;
  };
  createdAt: string;
  canonicalTranscriptId: string;
  identity: StructuredTranscriptPackageIdentity;
  speakers: StructuredTranscriptPackageSpeaker[];
  resolvedSpeakers: StructuredTranscriptPackageSpeaker[];
  paragraphs: StructuredTranscriptPackageParagraph[];
  lineTypes: StructuredTranscriptPackageLineTypeEntry[];
  provenance: StructuredTranscriptPackageParagraphProvenance[];
  reviewFlags: StructuredTranscriptPackageReviewFlagEntry[];
}

export function createStructuredTranscriptPackageSkeleton(
  transcriptId: string,
): StructuredTranscriptPackage {
  return {
    version: STRUCTURED_TRANSCRIPT_PACKAGE_VERSION,
    schemaVersion: STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA_VERSION,
    producerVersion: STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER_VERSION,
    producerVersions: {
      contract: STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER_VERSION,
      speakerSemantics: 1,
      paragraphSemantics: 1,
      boundarySemantics: 1,
    },
    createdAt: new Date().toISOString(),
    canonicalTranscriptId: transcriptId,
    identity: {
      schema: STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA,
      version: STRUCTURED_TRANSCRIPT_PACKAGE_VERSION,
      producer: STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER,
      builtAt: new Date().toISOString(),
      transcriptId,
    },
    speakers: [],
    resolvedSpeakers: [],
    paragraphs: [],
    lineTypes: [],
    provenance: [],
    reviewFlags: [],
  };
}

export function validateStructuredTranscriptPackageContract(
  structuredTranscript: StructuredTranscriptPackage,
): string[] {
  const errors: string[] = [];
  const { identity, speakers, paragraphs } = structuredTranscript;

  if (identity.schema !== STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA) {
    errors.push("identity.schema must match the structured transcript schema identifier");
  }
  if (structuredTranscript.version !== STRUCTURED_TRANSCRIPT_PACKAGE_VERSION) {
    errors.push("version must match the structured transcript package version");
  }
  if (structuredTranscript.schemaVersion !== STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA_VERSION) {
    errors.push("schemaVersion must match the structured transcript package schema version");
  }
  if (structuredTranscript.producerVersion !== STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER_VERSION) {
    errors.push("producerVersion must match the structured transcript package producer version");
  }
  if (structuredTranscript.producerVersions.contract !== STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER_VERSION) {
    errors.push("producerVersions.contract must match the structured transcript package producer version");
  }
  if (identity.version !== STRUCTURED_TRANSCRIPT_PACKAGE_VERSION) {
    errors.push("identity.version must match the structured transcript package version");
  }
  if (identity.producer !== STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER) {
    errors.push("identity.producer must match the structured transcript package producer");
  }
  if (!identity.transcriptId.trim()) {
    errors.push("identity.transcriptId must be present");
  }
  if (structuredTranscript.canonicalTranscriptId !== identity.transcriptId) {
    errors.push("canonicalTranscriptId must match identity.transcriptId");
  }
  if (!structuredTranscript.createdAt.trim() || Number.isNaN(Date.parse(structuredTranscript.createdAt))) {
    errors.push("createdAt must be a valid ISO timestamp");
  }
  if (!identity.builtAt.trim() || Number.isNaN(Date.parse(identity.builtAt))) {
    errors.push("identity.builtAt must be a valid ISO timestamp");
  }
  if (structuredTranscript.resolvedSpeakers.length !== speakers.length) {
    errors.push("resolvedSpeakers must remain aligned with speakers");
  }

  const speakerIds = new Set<string>();
  for (const speaker of speakers) {
    if (!speaker.speakerId.trim()) {
      errors.push("every speaker must have a non-empty speakerId");
    }
    if (speakerIds.has(speaker.speakerId)) {
      errors.push(`duplicate speakerId: ${speaker.speakerId}`);
    }
    speakerIds.add(speaker.speakerId);
  }

  const paragraphIds = new Set<string>();
  for (const paragraph of paragraphs) {
    if (!paragraph.id.trim()) {
      errors.push("every paragraph must have a non-empty id");
    }
    if (paragraphIds.has(paragraph.id)) {
      errors.push(`duplicate paragraph id: ${paragraph.id}`);
    }
    paragraphIds.add(paragraph.id);

    if (!paragraph.kind) {
      errors.push(`paragraph ${paragraph.id} must have a semantic kind`);
    }
    if (!paragraph.lineType) {
      errors.push(`paragraph ${paragraph.id} must have a lineType`);
    }
    if (!paragraph.line_type) {
      errors.push(`paragraph ${paragraph.id} must have a line_type`);
    }
    if (paragraph.speakerId && !speakerIds.has(paragraph.speakerId)) {
      errors.push(`paragraph ${paragraph.id} references orphan speakerId ${paragraph.speakerId}`);
    }
    if (paragraph.sourceUtteranceIds.length === 0 && paragraph.sourceWordIds.length === 0) {
      errors.push(`paragraph ${paragraph.id} must have provenance`);
    }
    if (paragraph.speakerId == null) {
      errors.push(`paragraph ${paragraph.id} must reference a speaker`);
    }
    if (paragraph.provenance.paragraphId !== paragraph.id) {
      errors.push(`paragraph ${paragraph.id} provenance must reference the same paragraph id`);
    }
    if (
      paragraph.speakerLabel.trim().length === 0
      && paragraph.kind !== "SECTION_HEADER"
      && paragraph.kind !== "BY_LINE"
      && paragraph.kind !== "PARENTHETICAL"
      && paragraph.kind !== "DOCUMENT_BLOCK"
    ) {
      errors.push(`paragraph ${paragraph.id} must preserve a producer-owned speakerLabel`);
    }
    if (paragraph.provenance.semanticOwners.speakerLabel !== SPEAKER_SEMANTIC_PRODUCER) {
      errors.push(`paragraph ${paragraph.id} must attribute speakerLabel ownership to ${SPEAKER_SEMANTIC_PRODUCER}`);
    }
    if (paragraph.provenance.semanticOwners.lineType !== PARAGRAPH_SEMANTIC_PRODUCER) {
      errors.push(`paragraph ${paragraph.id} must attribute lineType ownership to ${PARAGRAPH_SEMANTIC_PRODUCER}`);
    }
  }

  const paragraphIdsByLineType = new Set(structuredTranscript.lineTypes.map((entry) => entry.paragraphId));
  const paragraphIdsByProvenance = new Set(structuredTranscript.provenance.map((entry) => entry.paragraphId));
  const paragraphIdsByReviewFlags = new Set(structuredTranscript.reviewFlags.map((entry) => entry.paragraphId));
  for (const paragraph of paragraphs) {
    if (!paragraphIdsByLineType.has(paragraph.id)) {
      errors.push(`paragraph ${paragraph.id} must have a top-level lineTypes entry`);
    }
    if (!paragraphIdsByProvenance.has(paragraph.id)) {
      errors.push(`paragraph ${paragraph.id} must have a top-level provenance entry`);
    }
    if (!paragraphIdsByReviewFlags.has(paragraph.id)) {
      errors.push(`paragraph ${paragraph.id} must have a top-level reviewFlags entry`);
    }
  }

  return errors;
}

function summarizeConfidence(words: TranscriptParagraph["words"]): StructuredTranscriptParagraphConfidence {
  const confidences = words
    .map((word) => word.confidence)
    .filter((value): value is number => Number.isFinite(value));

  if (confidences.length === 0) {
    return { min: null, max: null, average: null };
  }

  const total = confidences.reduce((sum, value) => sum + value, 0);
  return {
    min: Math.min(...confidences),
    max: Math.max(...confidences),
    average: total / confidences.length,
  };
}

function buildReviewFlags(
  paragraph: TranscriptParagraph,
  sourceWordsById: Map<string, EditorDocument["words"][number]>,
): StructuredTranscriptParagraphReviewFlags {
  const sourceWords = paragraph.sourceWordIds
    .map((wordId) => sourceWordsById.get(wordId))
    .filter((word): word is EditorDocument["words"][number] => Boolean(word));

  return {
    allReviewed: sourceWords.length > 0 && sourceWords.every((word) => word.reviewed),
    hasLowConfidence: sourceWords.some((word) => word.confidence < 0.85),
    hasPendingAiSuggestions: sourceWords.some((word) => {
      const candidate = word as EditorDocument["words"][number] & {
        ai_suggestion?: string | null;
        ai_suggestion_status?: string | null;
      };
      return Boolean(candidate.ai_suggestion) && candidate.ai_suggestion_status === "pending";
    }),
  };
}

function readBoundaryProvenance(
  document: EditorDocument,
  paragraph: TranscriptParagraph,
): StructuredTranscriptPackageParagraphProvenance["boundary"] {
  for (const utteranceId of paragraph.sourceUtteranceIds) {
    const sourceUtterance = document.utterances.find((utterance) => utterance.utterance_id === utteranceId) as
      | (EditorDocument["utterances"][number] & {
          excluded_from_output?: boolean | null;
          exclusion_reason?: "PRE_RECORD" | "OFF_RECORD" | "POST_RECORD" | null;
          is_synthetic?: boolean | null;
        })
      | undefined;
    if (!sourceUtterance) {
      continue;
    }
    if (sourceUtterance.excluded_from_output || sourceUtterance.exclusion_reason || sourceUtterance.is_synthetic) {
      return {
        producer: BOUNDARY_SEMANTIC_PRODUCER,
        excludedFromOutput: sourceUtterance.excluded_from_output === true,
        exclusionReason: sourceUtterance.exclusion_reason ?? null,
        isSynthetic: sourceUtterance.is_synthetic === true,
      };
    }
  }

  return null;
}

function buildPackageParagraph(
  paragraph: TranscriptParagraph,
  sourceWordsById: Map<string, EditorDocument["words"][number]>,
  sourceDocument: EditorDocument,
  index: number,
  createdAt: string,
): StructuredTranscriptPackageParagraph {
  const baseId = paragraph.sourceUtteranceIds[0] ?? `paragraph-${index + 1}`;
  const paragraphId = `${baseId}:${paragraph.kind.toLowerCase()}:${index + 1}`;
  const confidence = summarizeConfidence(paragraph.words);
  return {
    id: paragraphId,
    kind: paragraph.kind,
    region: paragraph.region,
    lineType: paragraph.kind,
    line_type: paragraph.kind,
    label: paragraph.label,
    text: paragraph.text,
    leadingText: paragraph.leadingText,
    speakerId: paragraph.speakerId,
    speakerLabel: paragraph.speakerLabel,
    speakerRole: sourceDocument.speakers.find((speaker) => speaker.speaker_id === paragraph.speakerId)?.role ?? null,
    mode: paragraph.mode,
    words: paragraph.words,
    sourceLines: paragraph.sourceLines,
    sourceUtteranceIds: paragraph.sourceUtteranceIds,
    sourceWordIds: paragraph.sourceWordIds,
    confidence,
    reviewFlags: buildReviewFlags(paragraph, sourceWordsById),
    provenance: {
      paragraphId,
      source: "RULE",
      metadata: null,
      boundary: readBoundaryProvenance(sourceDocument, paragraph),
      manual: null,
      ai: null,
      confidence,
      producer: STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER,
      createdAt,
      sourceUtteranceIds: paragraph.sourceUtteranceIds,
      sourceWordIds: paragraph.sourceWordIds,
      semanticOwners: {
        speakerLabel: SPEAKER_SEMANTIC_PRODUCER,
        lineType: PARAGRAPH_SEMANTIC_PRODUCER,
        paragraphStructure: PARAGRAPH_SEMANTIC_PRODUCER,
        boundary: readBoundaryProvenance(sourceDocument, paragraph)?.producer ?? null,
      },
    },
  };
}

export function buildStructuredTranscriptPackage(
  document: EditorDocument,
  options?: {
    record?: CaseRecord | null;
    mode?: TextMode;
  },
): StructuredTranscriptPackage {
  const mode = options?.mode ?? "display";
  const displayDocument = buildDisplayDocument(document, options?.record);
  const structuredTranscript = createStructuredTranscriptPackageSkeleton(document.job_id);
  const createdAt = structuredTranscript.createdAt;
  const speakers: StructuredTranscriptPackageSpeaker[] = displayDocument.speakers.map((speaker) => ({
    speakerId: speaker.speaker_id,
    displayName: speaker.display_name,
    role: speaker.role ?? null,
    deepgramSpeaker: speaker.deepgram_speaker ?? null,
  }));
  const sourceWordsById = new Map(displayDocument.words.map((word) => [word.word_id, word]));
  const paragraphs = buildTranscriptParagraphs(document, options?.record, mode)
    .map((paragraph, index) => buildPackageParagraph(paragraph, sourceWordsById, displayDocument, index, createdAt));

  structuredTranscript.speakers = speakers;
  structuredTranscript.resolvedSpeakers = speakers;
  structuredTranscript.paragraphs = paragraphs;
  structuredTranscript.lineTypes = paragraphs.map((paragraph) => ({
    paragraphId: paragraph.id,
    lineType: paragraph.lineType,
  }));
  structuredTranscript.provenance = paragraphs.map((paragraph) => paragraph.provenance);
  structuredTranscript.reviewFlags = paragraphs.map((paragraph) => ({
    paragraphId: paragraph.id,
    flags: paragraph.reviewFlags,
  }));
  return structuredTranscript;
}

export function renderStructuredTranscriptText(
  structuredTranscript: StructuredTranscriptPackage,
  stripInlineFlags: (value: string) => string,
  mode: TextMode,
): string {
  return structuredTranscript.paragraphs
    .map((paragraph) => renderTranscriptParagraphText(paragraph, stripInlineFlags, mode))
    .join("\n\n")
    .trim();
}
