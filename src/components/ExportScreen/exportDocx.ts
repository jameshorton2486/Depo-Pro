import type { Speaker } from "../../api/types";
import { loadOrderedTranscriptSnapshotsForCase } from "../../api/transcriptRepository";
import { renderStageS, type StageSUtteranceInput } from "../../editor/stageS/renderer";
import type { StageSParticipantInput } from "../../editor/speakerMapping";
import type { CaseRecord } from "../../types/case";
import {
  buildSegmentHeadingParagraphSpec,
  buildTranscriptDocxBlob,
  buildTranscriptDocxBlobFromParagraphSpecs,
  type TranscriptDocxParagraphSpec,
} from "./docxFormatter";
import type { ExportSegmentDocument } from "./exportAssembly";
import { buildParagraphSpecsFromStageSLines } from "./stageSToDocx";

const USE_STAGE_S_EXPORT = import.meta.env.VITE_USE_STAGE_S_EXPORT === "true";

type TranscriptSnapshot = Awaited<ReturnType<typeof loadOrderedTranscriptSnapshotsForCase>>[number];

export interface ExportTranscriptSegment extends ExportSegmentDocument {
  snapshot?: TranscriptSnapshot;
}

interface BuildExportDocxBlobOptions {
  useStageSExport?: boolean;
  buildLegacyBlob?: (segments: ExportSegmentDocument[]) => Promise<Blob>;
  buildStageSBlob?: (segments: ExportTranscriptSegment[], record: CaseRecord) => Promise<Blob>;
}

export async function buildExportDocxBlob(
  segments: ExportTranscriptSegment[],
  record: CaseRecord,
  options: BuildExportDocxBlobOptions = {},
): Promise<Blob> {
  const useStageSExport = options.useStageSExport ?? USE_STAGE_S_EXPORT;

  if (!useStageSExport) {
    return (options.buildLegacyBlob ?? buildTranscriptDocxBlob)(segments);
  }

  return (options.buildStageSBlob ?? buildStageSDocxBlob)(segments, record);
}

export async function buildStageSDocxBlob(
  segments: ExportTranscriptSegment[],
  record: CaseRecord,
): Promise<Blob> {
  const paragraphSpecs = buildStageSDocxParagraphSpecs(segments, record);
  return buildTranscriptDocxBlobFromParagraphSpecs(paragraphSpecs);
}

export function buildStageSDocxParagraphSpecs(
  segments: ExportTranscriptSegment[],
  record: CaseRecord,
): TranscriptDocxParagraphSpec[] {
  const ordered = segments
    .slice()
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex);

  return ordered.flatMap((segment, index) => {
    const lines = renderStageS(
      buildStageSUtterances(segment),
      buildStageSParticipants(segment, record),
    ).lines;
    const paragraphSpecs = buildParagraphSpecsFromStageSLines(lines);
    if (ordered.length === 1) {
      return paragraphSpecs;
    }

    return [
      buildSegmentHeadingParagraphSpec(`Segment ${index + 1}: ${sourceLabel(segment, index)}`),
      ...paragraphSpecs,
    ];
  });
}

function buildStageSUtterances(segment: ExportTranscriptSegment): StageSUtteranceInput[] {
  if (segment.snapshot) {
    return segment.snapshot.utterances.map((utterance) => ({
      utterance_id: utterance.utterance_id,
      utterance_index: utterance.utterance_index,
      speaker_index: utterance.speaker_index,
      speaker_label: utterance.speaker_label,
      start_time: utterance.start_time,
      text: utterance.text,
    }));
  }

  const speakerIndexById = new Map(segment.document.speakers.map((speaker) => [speaker.speaker_id, speaker.deepgram_speaker]));
  const wordsById = new Map(segment.document.words.map((word) => [word.word_id, word]));

  return segment.document.utterances.map((utterance, utteranceIndex) => ({
    utterance_id: utterance.utterance_id,
    utterance_index: utteranceIndex,
    speaker_index: speakerIndexById.get(utterance.speaker_id) ?? utteranceIndex,
    speaker_label: stageSSpeakerLabel(segment.document.speakers, utterance.speaker_id),
    start_time: utterance.start_time,
    text: utterance.word_ids
      .map((wordId) => wordsById.get(wordId)?.text ?? "")
      .join(" ")
      .trim(),
  }));
}

function buildStageSParticipants(
  segment: ExportTranscriptSegment,
  record: CaseRecord,
): StageSParticipantInput[] {
  if (segment.snapshot) {
    return segment.snapshot.speakers.map((speaker, sortOrder) => {
      const participant = resolveParticipantMetadata(record, speaker.assigned_name || speaker.display_name, speaker.speaker_role || speaker.role);
      const parsed = parseAppearanceLabel(speaker.assigned_name || speaker.display_name);
      return {
        role: participant.role ?? speaker.speaker_role ?? speaker.role,
        name: participant.name ?? parsed.name,
        honorific: participant.honorific ?? parsed.honorific,
        speakerIndices: [speaker.speaker_index],
        sortOrder,
      };
    });
  }

  return segment.document.speakers.map((speaker, sortOrder) => {
    const participant = resolveParticipantMetadata(record, speaker.display_name, speaker.role);
    const parsed = parseAppearanceLabel(speaker.display_name);
    return {
      role: participant.role ?? speaker.role,
      name: participant.name ?? parsed.name,
      honorific: participant.honorific ?? parsed.honorific,
      speakerIndices: [speaker.deepgram_speaker],
      sortOrder,
    };
  });
}

function resolveParticipantMetadata(
  record: CaseRecord,
  label: string,
  role: string | null | undefined,
): Pick<StageSParticipantInput, "role" | "name" | "honorific"> {
  const normalizedRole = (role ?? "").trim().toLowerCase();
  const parsed = parseAppearanceLabel(label);

  if (normalizedRole === "witness") {
    const witness = findNamedMatch(record.witnesses.map((entry) => ({
      name: entry.name.value,
      honorific: entry.prefix_suffix ?? null,
    })), label);
    return {
      role,
      name: witness?.name ?? parsed.name,
      honorific: witness?.honorific ?? parsed.honorific,
    };
  }

  if (normalizedRole === "interpreter") {
    const interpreter = findNamedMatch(record.interpreters.map((entry) => ({
      name: entry.name.value,
      honorific: null,
    })), label);
    return { role, name: interpreter?.name ?? parsed.name, honorific: parsed.honorific };
  }

  if (normalizedRole === "videographer") {
    const videographer = findNamedMatch(record.videographers.map((entry) => ({
      name: entry.name.value,
      honorific: null,
    })), label);
    return { role, name: videographer?.name ?? parsed.name, honorific: parsed.honorific };
  }

  if (normalizedRole === "court_reporter" || normalizedRole === "reporter") {
    return {
      role,
      name: record.reporter.name.value || parsed.name,
      honorific: parsed.honorific,
    };
  }

  if (normalizedRole === "attorney" || normalizedRole === "examining_attorney" || normalizedRole === "defending_attorney" || normalizedRole === "co_counsel") {
    const attorney = findNamedMatch(record.attorneys.map((entry) => ({
      name: entry.name.value,
      honorific: null,
      role: attorneyStageSRole(entry),
    })), label);
    return {
      role: attorney?.role ?? role,
      name: attorney?.name ?? parsed.name,
      honorific: attorney?.honorific ?? parsed.honorific,
    };
  }

  const participant = findNamedMatch(record.participants.map((entry) => ({
    name: entry.name.value,
    honorific: null,
    role: participantStageSRole(entry.role),
  })), label);
  return {
    role: participant?.role ?? role,
    name: participant?.name ?? parsed.name,
    honorific: participant?.honorific ?? parsed.honorific,
  };
}

function attorneyStageSRole(attorney: CaseRecord["attorneys"][number]): string {
  const functions = normalizeAttorneyFunctions(attorney.function?.value);
  if (functions.includes("DEFENDING_ATTORNEY")) {
    return "defending_attorney";
  }
  if (functions.includes("CO_COUNSEL")) {
    return "co_counsel";
  }
  if (functions.includes("EXAMINING_ATTORNEY")) {
    return "examining_attorney";
  }

  switch (attorney.role.value) {
    case "OPPOSING":
      return "defending_attorney";
    case "CO_COUNSEL":
      return "co_counsel";
    case "EXAMINING":
      return "examining_attorney";
    default:
      return "attorney";
  }
}

function participantStageSRole(role: CaseRecord["participants"][number]["role"]): string {
  switch (role) {
    case "VIDEOGRAPHER":
      return "videographer";
    case "INTERPRETER":
      return "interpreter";
    default:
      return "other";
  }
}

function normalizeAttorneyFunctions(
  value: NonNullable<CaseRecord["attorneys"][number]["function"]>["value"] | undefined,
): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return typeof value === "string" ? [value] : [];
}

function findNamedMatch<T extends { name: string; honorific?: string | null; role?: string | null }>(
  entries: T[],
  label: string,
): T | null {
  const target = normalizeName(label);
  if (!target) {
    return null;
  }

  for (const entry of entries) {
    const normalizedName = normalizeName(entry.name);
    if (!normalizedName) {
      continue;
    }

    if (target === normalizedName || target.endsWith(normalizedName) || normalizedName.endsWith(target)) {
      return entry;
    }

    const parts = normalizedName.split(" ").filter(Boolean);
    const surname = parts.length > 0 ? parts[parts.length - 1] : undefined;
    if (surname && (target === surname || target.endsWith(` ${surname}`))) {
      return entry;
    }
  }

  return null;
}

function parseAppearanceLabel(label: string): { name: string; honorific: string } {
  const trimmed = label.trim();
  const match = trimmed.match(/^(MR|MS|MRS|DR)\.?\s+(.+)$/i);
  if (!match) {
    return { name: trimmed, honorific: "" };
  }

  return {
    honorific: match[1].toUpperCase(),
    name: toTitleCase(match[2]),
  };
}

function stageSSpeakerLabel(speakers: Speaker[], speakerId: string): string {
  return speakers.find((speaker) => speaker.speaker_id === speakerId)?.display_name?.trim() || speakerId;
}

function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/^(THE\s+)?(MR|MS|MRS|DR)\.?\s+/i, "")
    .replace(/[^A-Z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceLabel(segment: ExportSegmentDocument, index: number): string {
  return segment.sourceFilename?.trim() || `Source ${index + 1}`;
}
