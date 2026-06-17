import type { EditorDocument, Speaker } from "../../api/types";
import { adaptSpeakerRoleToStageS, participantLabel, type StageSRole } from "../../editor/speakerMapping";
import type { CaseRecord } from "../../types/case";
import type { ResolvedSpeakerView } from "./resolvedSpeakers";

export interface TranscriptSpeakerIdentity {
  participantId: string;
  rawSpeakerIds: string[];
  speakerIndices: number[];
  role: Speaker["role"] | undefined;
  stageRole: StageSRole;
  identityKey: string;
  name: string;
  honorific: string;
  transcriptLabel: string;
}

interface IdentityCandidate {
  identityKey: string;
  stageRole: StageSRole;
  name: string;
  honorific: string;
}

const GENERIC_SPEAKER_PATTERN = /^SPEAKER\s+\d+$/i;
const RAW_SPEAKER_ID_PATTERN = /^spk_(\d+)$/i;
const UNRESOLVED_SPEAKER_PATTERN = /^\[UNIDENTIFIED SPEAKER \d+\]$/i;

export function buildUnresolvedSpeakerLabel(speakerIndex: number): string {
  return `[UNIDENTIFIED SPEAKER ${speakerIndex}]`;
}

export function isUnresolvedSpeakerLabel(label: string): boolean {
  return UNRESOLVED_SPEAKER_PATTERN.test(label.trim());
}

export function buildTranscriptSpeakerIdentityMap(
  document: EditorDocument,
  resolvedSpeakers: ResolvedSpeakerView[],
  record: CaseRecord | null | undefined,
): Map<string, TranscriptSpeakerIdentity> {
  const identityByRawSpeakerId = new Map<string, TranscriptSpeakerIdentity>();
  const resolvedByRawSpeakerId = new Map<string, ResolvedSpeakerView>();

  for (const resolvedSpeaker of resolvedSpeakers) {
    for (const rawSpeakerId of resolvedSpeaker.rawSpeakerIds) {
      resolvedByRawSpeakerId.set(rawSpeakerId, resolvedSpeaker);
    }
  }

  const attorneyAssignments = record
    ? assignAttorneyIdentities(resolvedSpeakers, record)
    : new Map<string, IdentityCandidate>();

  for (const speaker of document.speakers) {
    const resolvedSpeaker = resolvedByRawSpeakerId.get(speaker.speaker_id);
    const participantId = resolvedSpeaker?.participantId ?? `raw:${speaker.speaker_id}`;
    const role = resolvedSpeaker?.role ?? speaker.role;
    const stageRole = adaptSpeakerRoleToStageS(role);
    const speakerIndex = resolvedSpeaker?.speakerIndices[0] ?? speaker.deepgram_speaker;
    const candidate = record
      ? resolveIdentityCandidate(resolvedSpeaker, speaker, stageRole, record, attorneyAssignments)
      : null;
    const transcriptLabel = buildTranscriptLabel(
      candidate,
      stageRole,
      resolvedSpeaker?.display_name ?? speaker.display_name,
      speakerIndex,
      Boolean(resolvedSpeaker && !resolvedSpeaker.participantId.startsWith("raw:")),
    );

    identityByRawSpeakerId.set(speaker.speaker_id, {
      participantId,
      rawSpeakerIds: resolvedSpeaker?.rawSpeakerIds ?? [speaker.speaker_id],
      speakerIndices: resolvedSpeaker?.speakerIndices ?? [speaker.deepgram_speaker],
      role,
      stageRole,
      identityKey: candidate?.identityKey ?? participantId,
      name: candidate?.name ?? "",
      honorific: candidate?.honorific ?? "",
      transcriptLabel,
    });
  }

  return identityByRawSpeakerId;
}

function resolveIdentityCandidate(
  resolvedSpeaker: ResolvedSpeakerView | undefined,
  speaker: Speaker,
  stageRole: StageSRole,
  record: CaseRecord,
  attorneyAssignments: Map<string, IdentityCandidate>,
): IdentityCandidate | null {
  const label = resolvedSpeaker?.display_name ?? speaker.display_name;
  const participantId = resolvedSpeaker?.participantId ?? null;

  if (stageRole === "court_reporter") {
    const reporterName = record.reporter.name.value.trim();
    return {
      identityKey: "reporter",
      stageRole,
      name: reporterName,
      honorific: parseLabel(label).honorific,
    };
  }

  if (stageRole === "witness") {
    const witnessCandidates = record.witnesses.map((entry) => ({
      identityKey: entry.witness_id,
      stageRole,
      name: entry.name.value,
      honorific: entry.prefix_suffix ?? "",
    }));
    const byParticipantId = findCandidateByIdentityKey(witnessCandidates, participantId);
    if (byParticipantId) {
      return byParticipantId;
    }

    const exact = findNamedMatch(witnessCandidates, label);
    if (exact) {
      return exact;
    }

    if (record.witnesses.length === 1) {
      const witness = record.witnesses[0];
      return {
        identityKey: witness.witness_id,
        stageRole,
        name: witness.name.value,
        honorific: witness.prefix_suffix ?? "",
      };
    }
  }

  if (stageRole === "interpreter") {
    const interpreterCandidates = record.interpreters.map((entry) => ({
      identityKey: entry.interpreter_id,
      stageRole,
      name: entry.name.value,
      honorific: "",
    }));
    const byParticipantId = findCandidateByIdentityKey(interpreterCandidates, participantId);
    if (byParticipantId) {
      return byParticipantId;
    }

    const exact = findNamedMatch(interpreterCandidates, label);
    if (exact) {
      return exact;
    }

    if (record.interpreters.length === 1) {
      const interpreter = record.interpreters[0];
      return {
        identityKey: interpreter.interpreter_id,
        stageRole,
        name: interpreter.name.value,
        honorific: "",
      };
    }
  }

  if (stageRole === "videographer") {
    const videographerCandidates = record.videographers.map((entry) => ({
      identityKey: entry.videographer_id,
      stageRole,
      name: entry.name.value,
      honorific: "",
    }));
    const byParticipantId = findCandidateByIdentityKey(videographerCandidates, participantId);
    if (byParticipantId) {
      return byParticipantId;
    }

    const exact = findNamedMatch(videographerCandidates, label);
    if (exact) {
      return exact;
    }

    if (record.videographers.length === 1) {
      const videographer = record.videographers[0];
      return {
        identityKey: videographer.videographer_id,
        stageRole,
        name: videographer.name.value,
        honorific: "",
      };
    }
  }

  if (stageRole === "examining_attorney" || stageRole === "defending_attorney" || stageRole === "co_counsel") {
    const attorneyCandidates = buildAttorneyCandidates(record);
    const byParticipantId = findCandidateByIdentityKey(attorneyCandidates, participantId);
    if (byParticipantId) {
      return byParticipantId;
    }

    const exact = findNamedMatch(attorneyCandidates, label);
    if (exact) {
      return exact;
    }

    return attorneyAssignments.get(resolvedSpeaker?.participantId ?? speaker.speaker_id) ?? null;
  }

  const participantCandidates = record.participants.map((entry) => ({
    identityKey: entry.participant_id,
    stageRole: participantRoleToStageRole(entry.role),
    name: entry.name.value,
    honorific: "",
  }));
  const byParticipantId = findCandidateByIdentityKey(participantCandidates, participantId);
  if (byParticipantId) {
    return byParticipantId;
  }

  const participantMatch = findNamedMatch(participantCandidates, label);
  return participantMatch;
}

function buildAttorneyCandidates(record: CaseRecord): IdentityCandidate[] {
  return record.attorneys.map((attorney) => ({
    identityKey: attorney.attorney_id,
    stageRole: attorneyToStageRole(attorney),
    name: attorney.name.value,
    honorific: "",
  }));
}

function assignAttorneyIdentities(
  resolvedSpeakers: ResolvedSpeakerView[],
  record: CaseRecord,
): Map<string, IdentityCandidate> {
  const assignments = new Map<string, IdentityCandidate>();
  const attorneyCandidates = buildAttorneyCandidates(record);
  const attorneySpeakers = resolvedSpeakers
    .filter((speaker) => speaker.role === "ATTORNEY")
    .sort((left, right) => (left.speakerIndices[0] ?? 0) - (right.speakerIndices[0] ?? 0));

  for (const speaker of attorneySpeakers) {
    const exact = findNamedMatch(attorneyCandidates, speaker.display_name);
    if (!exact) {
      continue;
    }

    assignments.set(speaker.participantId, exact);
  }

  return assignments;
}

function buildTranscriptLabel(
  candidate: IdentityCandidate | null,
  stageRole: StageSRole,
  fallbackLabel: string,
  speakerIndex: number,
  hasDeterministicResolution: boolean,
): string {
  if (candidate) {
    const formatted = participantLabel(candidate.stageRole, candidate.name, candidate.honorific);
    if (formatted) {
      return formatted;
    }

    if (isNamedRole(candidate.stageRole)) {
      const surnameLabel = extractSurnameLabel(candidate.name);
      if (surnameLabel) {
        return surnameLabel;
      }
    }

    if (candidate.name.trim()) {
      return normalizeSpeakerLabel(candidate.name);
    }
  }

  const normalizedFallback = normalizeSpeakerLabel(fallbackLabel);
  if (hasDeterministicResolution && normalizedFallback) {
    return normalizedFallback;
  }

  if (isExplicitResolvedLabel(stageRole, normalizedFallback)) {
    return normalizedFallback;
  }

  return buildUnresolvedSpeakerLabel(speakerIndex);
}

function attorneyToStageRole(attorney: CaseRecord["attorneys"][number]): StageSRole {
  const functions: string[] = Array.isArray(attorney.function?.value)
    ? [...attorney.function.value]
    : typeof attorney.function?.value === "string"
      ? [attorney.function.value]
      : [];

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
      return "examining_attorney";
  }
}

function participantRoleToStageRole(role: CaseRecord["participants"][number]["role"]): StageSRole {
  switch (role) {
    case "VIDEOGRAPHER":
      return "videographer";
    case "INTERPRETER":
      return "interpreter";
    default:
      return "other";
  }
}

function findNamedMatch<T extends IdentityCandidate>(entries: T[], label: string): T | null {
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

    const surname = extractSurname(normalizedName);
    if (surname && (target === surname || target.endsWith(` ${surname}`))) {
      return entry;
    }
  }

  return null;
}

function findCandidateByIdentityKey<T extends IdentityCandidate>(
  entries: T[],
  identityKey: string | null,
): T | null {
  if (!identityKey) {
    return null;
  }

  return entries.find((entry) => entry.identityKey === identityKey) ?? null;
}

function extractSurnameLabel(name: string): string {
  const surname = extractSurname(normalizeName(name));
  return surname ? normalizeSpeakerLabel(surname) : "";
}

function extractSurname(normalizedName: string): string {
  const parts = normalizedName.split(" ").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function parseLabel(label: string): { name: string; honorific: string } {
  const trimmed = label.trim();
  const match = trimmed.match(/^(MR|MS|MRS|DR)\.?\s+(.+)$/i);
  if (!match) {
    return { name: trimmed, honorific: "" };
  }

  return {
    honorific: match[1].toUpperCase(),
    name: match[2].trim(),
  };
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

function normalizeSpeakerLabel(label: string): string {
  const normalized = label.trim().replace(/:+$/, "").replace(/\s+/g, " ").toUpperCase();
  return normalized || "UNIDENTIFIED SPEAKER";
}

function isExplicitResolvedLabel(stageRole: StageSRole, label: string): boolean {
  if (!label || isGenericSpeakerLabel(label) || isUnresolvedSpeakerLabel(label) || RAW_SPEAKER_ID_PATTERN.test(label)) {
    return false;
  }

  if (/^(MR|MS|MRS|DR)\.\s+[A-Z0-9]/.test(label)) {
    return true;
  }

  switch (stageRole) {
    case "court_reporter":
      return label === "THE REPORTER";
    case "videographer":
      return label === "THE VIDEOGRAPHER";
    case "interpreter":
      return label === "THE INTERPRETER";
    case "witness":
      return label === "THE WITNESS";
    default:
      return false;
  }
}

function isNamedRole(role: StageSRole): boolean {
  return role === "examining_attorney" || role === "defending_attorney" || role === "co_counsel" || role === "witness";
}

export function isGenericSpeakerLabel(label: string): boolean {
  return GENERIC_SPEAKER_PATTERN.test(label.trim());
}
