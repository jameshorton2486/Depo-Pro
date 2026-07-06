import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import { buildUfmMetadata, type UfmMetadataEnvelope } from "../ufm/buildUfmMetadata";
import { buildDisplayDocument } from "./deterministicSpeakerMap";
import {
  classifyBlocks,
  extractEmbeddedObjections,
  mergeConsecutiveFragments,
  splitMergedBlocks,
  verifyColloquy,
  type ClassifiedBlock,
  type StructureSpeakerMapEntry,
  type StructureUtterance,
} from "./structureEngine";

export interface StructuredSpeakerAssignment {
  speaker_id: string;
  display_name: string;
  speaker_role: "reporter" | "witness" | "attorney" | "other";
}

export interface StructuredUtteranceAssignment {
  utterance_id: string;
  speaker_id: string;
  speaker_label: string;
  speaker_role: "reporter" | "witness" | "attorney" | "other";
  line_type: "Q" | "A" | "SP" | "PN" | "HEADER" | null;
}

export interface PreWorkspaceStructureResult {
  speakers: StructuredSpeakerAssignment[];
  utterances: StructuredUtteranceAssignment[];
  inclusionPages: UfmMetadataEnvelope;
}

function mapRole(value: EditorDocument["speakers"][number]["role"] | undefined): "reporter" | "witness" | "attorney" | "other" {
  switch (value) {
    case "REPORTER":
      return "reporter";
    case "WITNESS":
      return "witness";
    case "ATTORNEY":
      return "attorney";
    default:
      return "other";
  }
}

function mapStructureRole(value: EditorDocument["speakers"][number]["role"] | undefined): StructureSpeakerMapEntry["role"] {
  switch (value) {
    case "REPORTER":
      return "REPORTER";
    case "WITNESS":
      return "WITNESS";
    case "ATTORNEY":
      return "ATTORNEY";
    case "INTERPRETER":
      return "INTERPRETER";
    case "OTHER":
      return "OTHER";
    default:
      return "UNKNOWN";
  }
}

function buildUtteranceTexts(document: EditorDocument): Map<string, string> {
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  return new Map(
    document.utterances.map((utterance) => [
      utterance.utterance_id,
      utterance.word_ids.map((wordId) => wordById.get(wordId)?.text ?? "").join(" ").trim(),
    ]),
  );
}

function pickExaminerAndWitness(
  document: EditorDocument,
): { examinerSpeakerId: string | null; witnessSpeakerId: string | null } {
  let examinerSpeakerId: string | null = null;
  let witnessSpeakerId: string | null = null;

  for (const speaker of document.speakers) {
    if (!examinerSpeakerId && speaker.role === "ATTORNEY") {
      examinerSpeakerId = speaker.speaker_id;
    }
    if (!witnessSpeakerId && speaker.role === "WITNESS") {
      witnessSpeakerId = speaker.speaker_id;
    }
  }

  return { examinerSpeakerId, witnessSpeakerId };
}

function resolveBlockType(
  block: ClassifiedBlock,
  extractedByUtterance: Map<string, ReturnType<typeof extractEmbeddedObjections> extends Promise<(infer T)[]> ? T : never>,
  splitUtteranceIds: Set<string>,
): "Q" | "A" | "SP" | "PN" | "HEADER" | null {
  if (block.block_type === "NEEDS_EXTRACT") {
    return extractedByUtterance.has(block.utterance_id) ? "A" : "SP";
  }
  if (block.block_type === "NEEDS_SPLIT") {
    return splitUtteranceIds.has(block.utterance_id) ? "Q" : "SP";
  }
  return block.block_type;
}

export async function buildPreWorkspaceStructure(
  document: EditorDocument,
  record: CaseRecord,
): Promise<PreWorkspaceStructureResult> {
  const displayDocument = buildDisplayDocument(document, record);
  const utteranceTexts = buildUtteranceTexts(displayDocument);
  const speakerMap = Object.fromEntries(
    displayDocument.speakers.map((speaker) => [
      speaker.speaker_id,
      {
        display_name: speaker.display_name,
        role: mapStructureRole(speaker.role),
      } satisfies StructureSpeakerMapEntry,
    ]),
  );
  const utterances: StructureUtterance[] = displayDocument.utterances.map((utterance, index) => ({
    utterance_index: index,
    utterance_id: utterance.utterance_id,
    speaker_id: utterance.speaker_id,
    text: utteranceTexts.get(utterance.utterance_id) ?? "",
  }));

  const initialBlocks = (await classifyBlocks(utterances, speakerMap)).map((block) => ({
    ...block,
    text: utteranceTexts.get(block.utterance_id) ?? "",
  }));
  const { examinerSpeakerId, witnessSpeakerId } = pickExaminerAndWitness(displayDocument);
  const splitCandidates = initialBlocks.filter((block) => block.block_type === "NEEDS_SPLIT" && block.text);
  const splitResults = examinerSpeakerId && witnessSpeakerId
    ? await splitMergedBlocks(splitCandidates, examinerSpeakerId, witnessSpeakerId, speakerMap)
    : [];
  const extracted = await extractEmbeddedObjections(
    initialBlocks.filter((block) => block.block_type === "NEEDS_EXTRACT" && block.text),
    speakerMap,
  );
  const verifiedColloquy = await verifyColloquy(
    initialBlocks.filter((block) => block.block_type === "SP" && block.text),
    speakerMap,
  );
  const colloquyByUtterance = new Map(verifiedColloquy.map((item) => [utterances[item.utterance_index]?.utterance_id ?? "", item.correct_type]));
  const extractedByUtterance = new Map(extracted.map((item) => [item.utterance_id, item]));
  const splitUtteranceIds = new Set(splitResults.map((item) => item.utterance_id));
  const mergedBlocks = mergeConsecutiveFragments(initialBlocks);
  const mergedByUtterance = new Map(mergedBlocks.map((block) => [block.utterance_id, block]));

  const structuredUtterances: StructuredUtteranceAssignment[] = displayDocument.utterances.map((utterance) => {
    const speaker = displayDocument.speakers.find((candidate) => candidate.speaker_id === utterance.speaker_id);
    const block = mergedByUtterance.get(utterance.utterance_id);
    const reclassified = colloquyByUtterance.get(utterance.utterance_id);
    const lineType = reclassified
      ?? (block ? resolveBlockType(block, extractedByUtterance, splitUtteranceIds) : null);

    return {
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      speaker_label: speaker?.display_name ?? utterance.speaker_id,
      speaker_role: mapRole(speaker?.role),
      line_type: lineType,
    };
  });

  return {
    speakers: displayDocument.speakers.map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.display_name,
      speaker_role: mapRole(speaker.role),
    })),
    utterances: structuredUtterances,
    inclusionPages: buildUfmMetadata({
      record,
      provenance: [],
    }),
  };
}
