import { workspaceApi } from "../../api/workspaceService";
import type { Speaker } from "../../types";

export const SPEAKER_ROLES: Speaker["role"][] = [
  "REPORTER",
  "WITNESS",
  "ATTORNEY",
  "INTERPRETER",
  "OTHER",
];

export type SpeakerView = Speaker & {
  ai_suggested?: boolean;
  ai_suggestion_reason?: string;
};

export function getSpeakerSourceFileLabel(speakerId: string): string | null {
  const match = speakerId.match(/^spk_f(\d{3})_s\d{3}$/);
  if (!match) {
    return null;
  }

  return `File ${Number.parseInt(match[1], 10) + 1}`;
}

export function isAISuggestedSpeaker(speaker: SpeakerView): boolean {
  return speaker.ai_suggested === true;
}

export function shouldRelabelInEditor(
  previousRole: Speaker["role"] | undefined,
  nextRole: Speaker["role"] | undefined,
): boolean {
  return previousRole === nextRole;
}

export function getSpeakerClusterBadgeLabel(speaker: Speaker): string {
  return speaker.deepgram_speaker != null ? `SPK ${speaker.deepgram_speaker}` : "CUSTOM";
}

export async function addParticipantToSpeakerList(params: {
  jobId: string;
  displayName: string;
  role?: Speaker["role"];
  speakers: Speaker[];
  addSpeaker: typeof workspaceApi.addSpeaker;
}): Promise<Speaker[]> {
  const name = params.displayName.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  const newSpeaker = await params.addSpeaker(params.jobId, {
    display_name: name,
    role: params.role,
  });

  return [...params.speakers, newSpeaker];
}
