import type { TranscriptSpeakerRow } from "../../api/transcriptRepository";
import type { StageSParticipantInput } from "../../editor/speakerMapping";
import type { Database } from "../../types/database";

type SpeakerResolutionRow = Database["public"]["Tables"]["speaker_resolution_current"]["Row"];

export interface ResolvedParticipant extends StageSParticipantInput {
  participantId: string;
  label: string;
  rawSpeakerIds: string[];
}

export interface ResolveSpeakersInput {
  rawSpeakers: TranscriptSpeakerRow[];
  overlay: SpeakerResolutionRow[];
}

export interface ResolveSpeakersResult {
  participants: ResolvedParticipant[];
  bySpeakerIndex: Map<number, ResolvedParticipant>;
}

export function resolveSpeakers({
  rawSpeakers,
  overlay,
}: ResolveSpeakersInput): ResolveSpeakersResult {
  const sortedRawSpeakers = [...rawSpeakers].sort(compareRawSpeakers);
  const overlayBySpeakerId = new Map(overlay.map((row) => [row.raw_speaker_id, row]));
  const overlayBySpeakerIndex = new Map(overlay.map((row) => [row.raw_speaker_index, row]));
  const participants: ResolvedParticipant[] = [];
  const byParticipantId = new Map<string, ResolvedParticipant>();
  const bySpeakerIndex = new Map<number, ResolvedParticipant>();

  for (const rawSpeaker of sortedRawSpeakers) {
    const resolution = overlayBySpeakerId.get(rawSpeaker.speaker_id)
      ?? overlayBySpeakerIndex.get(rawSpeaker.speaker_index);
    const participantId = resolution?.participant_id ?? `raw:${rawSpeaker.speaker_id}`;
    const resolvedRole = resolution?.resolved_role ?? currentSpeakerRole(rawSpeaker);
    const resolvedLabel = resolution?.resolved_label ?? currentSpeakerLabel(rawSpeaker);
    const participant = byParticipantId.get(participantId)
      ?? createParticipant(participantId, resolvedRole, resolvedLabel, rawSpeaker);

    if (!byParticipantId.has(participantId)) {
      byParticipantId.set(participantId, participant);
      participants.push(participant);
    } else {
      mergeParticipant(participant, resolvedRole, resolvedLabel, rawSpeaker);
    }

    if (!participant.speakerIndices.includes(rawSpeaker.speaker_index)) {
      participant.speakerIndices.push(rawSpeaker.speaker_index);
      participant.speakerIndices.sort((left, right) => left - right);
    }

    if (!participant.rawSpeakerIds.includes(rawSpeaker.speaker_id)) {
      participant.rawSpeakerIds.push(rawSpeaker.speaker_id);
    }

    bySpeakerIndex.set(rawSpeaker.speaker_index, participant);
  }

  return { participants, bySpeakerIndex };
}

function createParticipant(
  participantId: string,
  role: string | null | undefined,
  label: string,
  rawSpeaker: TranscriptSpeakerRow,
): ResolvedParticipant {
  const parsedLabel = parseResolvedLabel(label);
  return {
    participantId,
    role,
    name: parsedLabel.name,
    honorific: parsedLabel.honorific,
    label,
    rawSpeakerIds: [rawSpeaker.speaker_id],
    speakerIndices: [rawSpeaker.speaker_index],
    sortOrder: rawSpeaker.speaker_index,
  };
}

function mergeParticipant(
  participant: ResolvedParticipant,
  role: string | null | undefined,
  label: string,
  rawSpeaker: TranscriptSpeakerRow,
): void {
  if (!participant.role && role) {
    participant.role = role;
  }

  if (!participant.label.trim() && label.trim()) {
    const parsedLabel = parseResolvedLabel(label);
    participant.label = label;
    participant.name = parsedLabel.name;
    participant.honorific = parsedLabel.honorific;
  }

  if (participant.sortOrder == null || rawSpeaker.speaker_index < participant.sortOrder) {
    participant.sortOrder = rawSpeaker.speaker_index;
  }
}

function currentSpeakerLabel(rawSpeaker: TranscriptSpeakerRow): string {
  return (
    rawSpeaker.assigned_name
    || rawSpeaker.speaker_label
    || rawSpeaker.display_name
    || rawSpeaker.speaker_id
  ).trim();
}

function currentSpeakerRole(rawSpeaker: TranscriptSpeakerRow): string | null {
  return rawSpeaker.speaker_role ?? rawSpeaker.role ?? null;
}

function parseResolvedLabel(label: string): { name: string; honorific: string } {
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

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function compareRawSpeakers(left: TranscriptSpeakerRow, right: TranscriptSpeakerRow): number {
  if (left.speaker_index !== right.speaker_index) {
    return left.speaker_index - right.speaker_index;
  }

  return left.speaker_id.localeCompare(right.speaker_id);
}
