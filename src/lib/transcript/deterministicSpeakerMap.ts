import type { EditorDocument, Speaker } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import { normalizeHonorificSpacing } from "../../editor/stageS/colloquy";
import { stripHonorificPrefix } from "../format/honorificHelper";

export type PresentationRole = "ATTORNEY" | "WITNESS" | "REPORTER" | "VIDEOGRAPHER" | "OTHER";

export interface SpeakerView {
  speakerId: string;
  speakerIndex: number | null;
  label: string;
  role: PresentationRole;
}

const GENERIC_SPEAKER_PATTERN = /^SPEAKER\s+\d+$/i;
const REPORTER_PATTERNS = [
  /cause number/i,
  /licensed in texas/i,
  /raise your right hand/i,
  /do you solemnly swear/i,
  /district court/i,
  /remote deposition/i,
  /off the record/i,
  /you may proceed with the examination/i,
] as const;
const VIDEOGRAPHER_PATTERNS = [
  /we are on the record/i,
  /today'?s date/i,
  /the time is now/i,
  /beginning of the deposition/i,
  /will the court reporter please/i,
  /this is the beginning/i,
] as const;
const WITNESS_PATTERNS = [
  /^\s*i do\.?\s*$/i,
  /^\s*my name is\b/i,
  /\bi was hired to\b/i,
  /\bboard certified\b/i,
  /\bi have \d+ offices\b/i,
  /\bi'm in\b/i,
  /\bi am in\b/i,
] as const;
const MIN_REPORTER_SCORE = 2;
const MIN_VIDEOGRAPHER_SCORE = 2;

function normalizeSpeakerLabel(label: string): string {
  return normalizeHonorificSpacing(label).trim().replace(/:+$/, "").replace(/\s+/g, " ").toUpperCase();
}

function normalizeComparableName(value: string): string {
  const withoutArticle = value.trim().replace(/^THE\s+/i, "");

  return stripHonorificPrefix(withoutArticle)
    .replace(/[^A-Z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function formatAttorneyDisplayLabel(name: string, gender?: string | null): string {
  const normalized = normalizeComparableName(name);
  const parts = normalized.split(" ").filter(Boolean);
  const surname = parts[parts.length - 1] ?? normalized;
  const normalizedGender = gender?.trim().toLowerCase();
  const honorific = normalizedGender === "f" || normalizedGender === "female" ? "MS." : "MR.";
  return `${honorific} ${surname}`.trim();
}

function getAttorneyGender(attorney: CaseRecord["attorneys"][number]): string | null {
  const candidate = attorney as unknown as { gender?: { value?: unknown } | unknown };
  const genderField = candidate.gender;
  if (typeof genderField === "string") {
    return genderField;
  }
  if (
    genderField
    && typeof genderField === "object"
    && "value" in genderField
    && typeof genderField.value === "string"
  ) {
    return genderField.value;
  }
  return null;
}

function extractSurname(name: string): string {
  const normalized = normalizeComparableName(name)
    .replace(/\b(M D|MD|PH D|PHD|J D|JD|ESQ|JR|SR|II|III|IV)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized.split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function isPhysicianWitness(witness: CaseRecord["witnesses"][number] | undefined): boolean {
  if (!witness) {
    return false;
  }

  const name = witness.name.value;
  const prefixSuffix = witness.prefix_suffix ?? "";
  const roleValue = typeof witness.role?.value === "string" ? witness.role.value : null;
  return /\b(M\.D\.|PH\.D\.)\b/i.test(name)
    || /\b(M\.D\.|PH\.D\.|DR\.)\b/i.test(prefixSuffix)
    || roleValue === "EXPERT";
}

function formatWitnessDisplayLabel(witness: CaseRecord["witnesses"][number] | undefined): string {
  if (!isPhysicianWitness(witness)) {
    return "THE WITNESS";
  }

  const surname = extractSurname(witness?.name.value ?? "WITNESS") || "WITNESS";
  return `DR. ${surname}`;
}

function isGenericSpeakerLabel(label: string): boolean {
  return !label.trim() || GENERIC_SPEAKER_PATTERN.test(label.trim());
}

function getGenericSpeakerFallbackLabel(speaker: Speaker): string {
  return speaker.deepgram_speaker != null
    ? `SPEAKER ${speaker.deepgram_speaker}`
    : "SPEAKER CUSTOM";
}

function countMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((score, pattern) => (pattern.test(text) ? score + 1 : score), 0);
}

function findSpeakerAggregateTexts(document: EditorDocument): Map<string, string> {
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  const texts = new Map<string, string>();

  for (const utterance of document.utterances) {
    const text = utterance.word_ids
      .map((wordId) => wordById.get(wordId)?.text ?? "")
      .join(" ")
      .trim();
    const current = texts.get(utterance.speaker_id) ?? "";
    texts.set(utterance.speaker_id, `${current} ${text}`.trim());
  }

  return texts;
}

function attorneyNameScore(text: string, name: string): number {
  const normalizedText = normalizeComparableName(text);
  const normalizedName = normalizeComparableName(name);
  if (!normalizedName) {
    return 0;
  }

  let score = 0;
  if (normalizedText.includes(normalizedName)) {
    score += 4;
  }

  const parts = normalizedName.split(" ").filter(Boolean);
  const surname = parts[parts.length - 1] ?? "";
  if (surname && normalizedText.includes(surname)) {
    score += 2;
  }

  if (/for the plaintiff|for the defendant|represent the plaintiff|represent the defendant/i.test(text)) {
    score += 1;
  }

  return score;
}

export function buildSpeakerViews(document: EditorDocument, record?: CaseRecord | null): Map<string, SpeakerView> {
  const aggregateTexts = findSpeakerAggregateTexts(document);
  const explicitSpeakerViews = new Map<string, SpeakerView>();

  for (const speaker of document.speakers) {
    const baseLabel = isGenericSpeakerLabel(speaker.display_name)
      ? getGenericSpeakerFallbackLabel(speaker)
      : normalizeSpeakerLabel(speaker.display_name);
    const baseRole: PresentationRole =
      speaker.role === "ATTORNEY"
        ? "ATTORNEY"
        : speaker.role === "WITNESS"
          ? "WITNESS"
          : speaker.role === "REPORTER"
            ? "REPORTER"
            : "OTHER";

    explicitSpeakerViews.set(speaker.speaker_id, {
      speakerId: speaker.speaker_id,
      speakerIndex: speaker.deepgram_speaker,
      label: baseLabel,
      role: baseRole,
    });
  }

  let reporterId: string | null = null;
  let reporterScore = 0;
  let videographerId: string | null = null;
  let videographerScore = 0;
  let witnessId: string | null = null;
  let witnessScore = 0;

  for (const speaker of document.speakers) {
    const text = aggregateTexts.get(speaker.speaker_id) ?? "";
    const currentReporterScore = countMatches(text, REPORTER_PATTERNS);
    if (currentReporterScore > reporterScore) {
      reporterScore = currentReporterScore;
      reporterId = speaker.speaker_id;
    }

    const currentVideographerScore = countMatches(text, VIDEOGRAPHER_PATTERNS);
    if (currentVideographerScore > videographerScore) {
      videographerScore = currentVideographerScore;
      videographerId = speaker.speaker_id;
    }

    const currentWitnessScore = countMatches(text, WITNESS_PATTERNS);
    if (currentWitnessScore > witnessScore) {
      witnessScore = currentWitnessScore;
      witnessId = speaker.speaker_id;
    }
  }

  if (reporterId) {
    const view = explicitSpeakerViews.get(reporterId);
    if (view) {
      view.label = "THE REPORTER";
      view.role = "REPORTER";
    }
  }

  if (videographerId && videographerId !== reporterId) {
    const view = explicitSpeakerViews.get(videographerId);
    if (view) {
      view.label = "THE VIDEOGRAPHER";
      view.role = "VIDEOGRAPHER";
    }
  }

  if (witnessId) {
    const view = explicitSpeakerViews.get(witnessId);
    if (view && view.role === "OTHER") {
      view.label = formatWitnessDisplayLabel(record?.witnesses[0]);
      view.role = "WITNESS";
    }
  }

  if (record) {
    const patternAssignedIds = new Set<string>();
    if (reporterId && reporterScore >= MIN_REPORTER_SCORE) {
      patternAssignedIds.add(reporterId);
    }
    if (
      videographerId
      && videographerId !== reporterId
      && videographerScore >= MIN_VIDEOGRAPHER_SCORE
    ) {
      patternAssignedIds.add(videographerId);
    }
    const assignedSpeakerIds = new Set<string>();

    for (const attorney of record.attorneys ?? []) {
      let bestSpeakerId: string | null = null;
      let bestScore = 0;
      for (const speaker of document.speakers) {
        if (patternAssignedIds.has(speaker.speaker_id)) {
          continue;
        }
        if (assignedSpeakerIds.has(speaker.speaker_id)) {
          continue;
        }
        const text = aggregateTexts.get(speaker.speaker_id) ?? "";
        const score = attorneyNameScore(text, attorney.name.value);
        if (score > bestScore) {
          bestScore = score;
          bestSpeakerId = speaker.speaker_id;
        }
      }

      if (bestSpeakerId && bestScore > 0) {
        const view = explicitSpeakerViews.get(bestSpeakerId);
        if (view) {
          view.label = formatAttorneyDisplayLabel(attorney.name.value, getAttorneyGender(attorney));
          view.role = "ATTORNEY";
          assignedSpeakerIds.add(bestSpeakerId);
        }
      }
    }

    if (record.witnesses?.length === 1) {
      const witnessCandidateId = witnessId
        && !patternAssignedIds.has(witnessId)
        && !assignedSpeakerIds.has(witnessId)
        && explicitSpeakerViews.get(witnessId)?.role === "OTHER"
        ? witnessId
        : document.speakers.find((speaker) => {
          const view = explicitSpeakerViews.get(speaker.speaker_id);
          return (
            speaker.deepgram_speaker != null
            && !patternAssignedIds.has(speaker.speaker_id)
            && !assignedSpeakerIds.has(speaker.speaker_id)
            && view?.role === "OTHER"
          );
        })?.speaker_id;
      const view = witnessCandidateId ? explicitSpeakerViews.get(witnessCandidateId) : null;
      if (view) {
        view.label = formatWitnessDisplayLabel(record.witnesses[0]);
        view.role = "WITNESS";
      }
    }
  }

  return explicitSpeakerViews;
}

export function buildDisplayDocument(document: EditorDocument, record?: CaseRecord | null): EditorDocument {
  const speakerViews = buildSpeakerViews(document, record);

  return {
    ...document,
    speakers: document.speakers.map((speaker) => {
      const view = speakerViews.get(speaker.speaker_id);
      return {
        ...speaker,
        display_name: view?.label ?? speaker.display_name,
        role:
          view?.role === "ATTORNEY"
            ? "ATTORNEY"
            : view?.role === "WITNESS"
              ? "WITNESS"
              : view?.role === "REPORTER"
                ? "REPORTER"
                : speaker.role ?? "OTHER",
      } satisfies Speaker;
    }),
  };
}
