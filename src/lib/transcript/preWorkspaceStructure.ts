import type { EditorDocument } from "../../api/types.ts";
import type { CaseRecord } from "../../types/case.ts";
import { buildUfmMetadata, type UfmMetadataEnvelope } from "../ufm/buildUfmMetadata.ts";
import { buildDisplayDocument } from "./speakerResolutionEngine.ts";
import { buildParagraphSemanticAssignments } from "./transcriptParagraphs.ts";
import type { StructuredUtterance } from "./structuredTranscript.ts";

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

export function applyPreWorkspaceStructure(
  document: EditorDocument,
  structure: Pick<PreWorkspaceStructureResult, "speakers" | "utterances">,
): EditorDocument {
  const speakerById = new Map(structure.speakers.map((speaker) => [speaker.speaker_id, speaker]));
  const utteranceById = new Map(structure.utterances.map((utterance) => [utterance.utterance_id, utterance]));

  return {
    ...document,
    speakers: document.speakers.map((speaker) => {
      const structuredSpeaker = speakerById.get(speaker.speaker_id);
      if (!structuredSpeaker) {
        return speaker;
      }

      return {
        ...speaker,
        display_name: structuredSpeaker.display_name,
        role:
          structuredSpeaker.speaker_role === "attorney"
            ? "ATTORNEY"
            : structuredSpeaker.speaker_role === "witness"
              ? "WITNESS"
              : structuredSpeaker.speaker_role === "reporter"
                ? "REPORTER"
                : "OTHER",
      };
    }),
    utterances: document.utterances.map((utterance) => {
      const structuredUtterance = utteranceById.get(utterance.utterance_id);
      if (!structuredUtterance) {
        return utterance;
      }

      return {
        ...utterance,
        line_type: structuredUtterance.line_type,
        speaker_label: structuredUtterance.speaker_label,
      } satisfies StructuredUtterance;
    }),
  };
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

export async function buildPreWorkspaceStructure(
  document: EditorDocument,
  record: CaseRecord,
): Promise<PreWorkspaceStructureResult> {
  const displayDocument = buildDisplayDocument(document, record);
  const speakerById = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker]));
  const semanticAssignments = new Map(
    buildParagraphSemanticAssignments(document, record).map((assignment) => [assignment.utteranceId, assignment]),
  );

  const structuredUtterances: StructuredUtteranceAssignment[] = displayDocument.utterances.map((utterance) => {
    const speaker = speakerById.get(utterance.speaker_id);
    const assignment = semanticAssignments.get(utterance.utterance_id);

    return {
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      speaker_label: assignment?.speakerLabel ?? speaker?.display_name ?? utterance.speaker_id,
      speaker_role: mapRole(speaker?.role),
      line_type: assignment?.lineType ?? null,
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
