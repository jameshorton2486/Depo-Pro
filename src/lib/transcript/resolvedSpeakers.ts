import type { Speaker } from "../../api/types";
import type { TranscriptSpeakerRow } from "../../api/transcriptRepository";
import { resolveSpeakers } from "./speakerResolution.ts";
import type { Database } from "../../types/database";

type SpeakerResolutionCurrentRow =
  Database["public"]["Tables"]["speaker_resolution_current"]["Row"];

export interface ResolvedSpeakerView extends Speaker {
  participantId: string;
  rawSpeakerIds: string[];
  speakerIndices: number[];
}

export function buildResolvedSpeakerViews(
  rawSpeakers: TranscriptSpeakerRow[],
  overlay: SpeakerResolutionCurrentRow[],
): ResolvedSpeakerView[] {
  const resolved = resolveSpeakers({
    rawSpeakers,
    overlay,
  });

  return resolved.participants.map((participant) => ({
    speaker_id: participant.participantId,
    participantId: participant.participantId,
    display_name: participant.label,
    deepgram_speaker: participant.speakerIndices[0] ?? participant.sortOrder ?? 0,
    role: mapResolvedRole(participant.role),
    rawSpeakerIds: [...participant.rawSpeakerIds],
    speakerIndices: [...participant.speakerIndices],
  }));
}

export function normalizeParticipantLabelSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildParticipantId(
  role: Speaker["role"] | string | null | undefined,
  label: string,
): string {
  const normalizedRole = (role ?? "OTHER").toString().trim().toLowerCase() || "other";
  const normalizedLabel = normalizeParticipantLabelSlug(label) || "unlabeled";
  return `pty_${normalizedRole}_${normalizedLabel}`;
}

export function isResolvedSpeakerMappingComplete(speakers: ResolvedSpeakerView[]): boolean {
  return speakers.length > 0 && speakers.every((speaker) => {
    return speaker.display_name.trim().length > 0 && Boolean(speaker.role);
  });
}

function mapResolvedRole(role: string | null | undefined): Speaker["role"] | undefined {
  switch ((role ?? "").trim().toLowerCase()) {
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
