import type { Speaker } from "../api/types";

export const STAGE_S_ROLES = [
  "examining_attorney",
  "witness",
  "defending_attorney",
  "co_counsel",
  "court_reporter",
  "videographer",
  "interpreter",
  "off_record",
  "other",
] as const;

export type StageSRole = typeof STAGE_S_ROLES[number];

export interface StageSParticipantInput {
  role?: Speaker["role"] | string | null;
  name?: string | null;
  honorific?: string | null;
  speakerIndices: number[];
  sortOrder?: number | null;
  createdAt?: string | null;
}

export interface StageSParticipantInfo {
  role: StageSRole;
  name: string;
  honorific: string;
  label: string;
  qaMode: "Q" | "A" | "";
}

const NAMED_ROLES = new Set<StageSRole>([
  "examining_attorney",
  "witness",
  "defending_attorney",
  "co_counsel",
]);

const VALID_HONORIFICS = new Set(["MR", "MS", "MRS", "DR"]);

export function roleToQaMode(role: StageSRole | null | undefined): "Q" | "A" | "" {
  if (role === "examining_attorney") return "Q";
  if (role === "witness") return "A";
  return "";
}

export function adaptSpeakerRoleToStageS(
  role: Speaker["role"] | string | null | undefined,
): StageSRole {
  if (!role) {
    return "other";
  }

  switch (role.trim().toLowerCase()) {
    case "attorney":
    case "examining_attorney":
      return "examining_attorney";
    case "witness":
      return "witness";
    case "reporter":
    case "court_reporter":
      return "court_reporter";
    case "interpreter":
      return "interpreter";
    case "other":
      return "other";
    case "defending_attorney":
      return "defending_attorney";
    case "co_counsel":
      return "co_counsel";
    case "videographer":
      return "videographer";
    case "off_record":
      return "off_record";
    default:
      return "other";
  }
}

export function participantLabel(
  role: StageSRole,
  name?: string | null,
  honorific?: string | null,
): string {
  switch (role) {
    case "court_reporter":
      return "THE REPORTER";
    case "videographer":
      return "THE VIDEOGRAPHER";
    case "interpreter":
      return "THE INTERPRETER";
    default:
      break;
  }

  if (NAMED_ROLES.has(role)) {
    const nameParts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    const surname = nameParts.length > 0 ? nameParts[nameParts.length - 1].toUpperCase() : "";
    const normalizedHonorific = (honorific ?? "").trim().replace(/\.+$/, "").toUpperCase();

    if (!surname || !VALID_HONORIFICS.has(normalizedHonorific)) {
      return "";
    }

    return `${normalizedHonorific}. ${surname}`;
  }

  const normalizedName = (name ?? "").trim().toUpperCase();
  return normalizedName;
}

export function buildIndexMap(
  participants: StageSParticipantInput[],
): Map<number, StageSParticipantInfo> {
  const sortedParticipants = [...participants].sort((left, right) => {
    const sortOrderDelta = normalizeSortOrder(left.sortOrder) - normalizeSortOrder(right.sortOrder);
    if (sortOrderDelta !== 0) {
      return sortOrderDelta;
    }

    return normalizeCreatedAt(left.createdAt).localeCompare(normalizeCreatedAt(right.createdAt));
  });

  const indexMap = new Map<number, StageSParticipantInfo>();

  for (const participant of sortedParticipants) {
    const role = adaptSpeakerRoleToStageS(participant.role);
    const info: StageSParticipantInfo = {
      role,
      name: (participant.name ?? "").trim(),
      honorific: (participant.honorific ?? "").trim(),
      label: participantLabel(role, participant.name, participant.honorific),
      qaMode: roleToQaMode(role),
    };

    for (const speakerIndex of participant.speakerIndices) {
      if (!indexMap.has(speakerIndex)) {
        indexMap.set(speakerIndex, info);
      }
    }
  }

  return indexMap;
}

function normalizeSortOrder(sortOrder: number | null | undefined): number {
  return sortOrder ?? Number.MAX_SAFE_INTEGER;
}

function normalizeCreatedAt(createdAt: string | null | undefined): string {
  return createdAt ?? "";
}
