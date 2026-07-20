import type { EditorDocument, Speaker } from "../../api/types";
import type { CaseRecord } from "../../types/case";

export interface SpeakerResolutionUtterance {
  utterance_index: number;
  speaker_id: string;
  text: string;
  start_time?: number;
  end_time?: number;
}

export interface SpeakerMapEntry {
  display_name: string;
  role: "REPORTER" | "VIDEOGRAPHER" | "ATTORNEY" | "WITNESS" | "INTERPRETER" | "UNKNOWN";
  confidence: number;
  evidence: string;
  authority: string;
  name_correction_applied?: string;
}

export interface SpeakerResolutionResult {
  speaker_map: Record<string, SpeakerMapEntry>;
  diarization_issues: Array<{
    collapsed_cluster: string;
    evidence: string;
    real_speakers_likely: number;
    recommendation: string;
  }>;
  speakers_unresolved: string[];
  metrics: {
    speakers_mapped: number;
    high_confidence: number;
    ambiguous: number;
    collapsed_clusters: number;
  };
}

export interface MidDepoVerificationResult {
  map_still_valid: boolean;
  shifted_speakers: Record<string, Partial<SpeakerMapEntry>>;
  new_speakers: Record<string, SpeakerMapEntry>;
  collapsed_clusters: Array<{
    speaker_id: string;
    evidence: string;
  }>;
  shift_detected_at_utterance: number | null;
  confidence: number;
  evidence: string;
}

export interface AttributionOverride {
  utterance_index: number;
  current_speaker_id: string;
  correct_speaker_id: string;
  correct_display_name: string;
  reason: string;
  confidence: number;
  authority: string;
}

export interface ExamTransition {
  transition_utterance_index: number;
  new_phase: string;
  new_examiner_display_name: string;
  insert_header_before_utterance_index: number;
}

export interface SpeakerResolutionClient {
  completeJson<T>(input: {
    promptId: "2-A" | "2-B" | "2-C" | "2-D";
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<T>;
}

export interface SpeakerResolutionStore {
  writeCurrentMap(input: {
    speaker_map: Record<string, SpeakerMapEntry>;
    transcript_id: string;
  }): Promise<void>;
  updatePipelineState(input: {
    transcript_id: string;
    pipeline_state: "AWAITING_SPEAKER_VERIFICATION" | "SPEAKER_VERIFIED";
    speaker_map_verified: boolean;
  }): Promise<void>;
}

export type PresentationRole = "ATTORNEY" | "WITNESS" | "REPORTER" | "VIDEOGRAPHER" | "OTHER";

export interface SpeakerView {
  speakerId: string;
  speakerIndex: number | null;
  label: string;
  role: PresentationRole;
}

export interface StoredSpeakerSemanticInput {
  speaker_id: string;
  display_name?: string | null;
  assigned_name?: string | null;
  speaker_label?: string | null;
  deepgram_speaker?: number | null;
  speaker_index?: number | null;
  role?: string | null;
  speaker_role?: string | null;
}

const MODEL = "claude-sonnet-4-6";
const TEMPERATURE = 0;
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

function assertInvariant(): void {
  if (MODEL !== "claude-sonnet-4-6" || TEMPERATURE !== 0) {
    throw new Error("Speaker resolution must use claude-sonnet-4-6 at temperature 0.");
  }
}

function comparable(value: string): string {
  return value.replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

function countMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((score, pattern) => (pattern.test(text) ? score + 1 : score), 0);
}

function surname(value: string): string {
  const parts = comparable(value).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function firstName(value: string): string {
  const parts = comparable(value).split(" ").filter(Boolean);
  return parts[0] ?? "";
}

function normalizeSpeakerLabel(label: string): string {
  return label.trim().replace(/:+$/, "").replace(/\s+/g, " ").toUpperCase();
}

function isGenericSpeakerLabel(label: string): boolean {
  return !label.trim() || GENERIC_SPEAKER_PATTERN.test(label.trim());
}

function getGenericSpeakerFallbackLabel(speaker: Speaker): string {
  return speaker.deepgram_speaker != null
    ? `SPEAKER ${speaker.deepgram_speaker}`
    : "SPEAKER CUSTOM";
}

function normalizeStoredSpeakerRole(role: string | null | undefined): PresentationRole {
  switch (role?.trim().toLowerCase()) {
    case "court_reporter":
    case "reporter":
      return "REPORTER";
    case "witness":
      return "WITNESS";
    case "attorney":
    case "examining_attorney":
    case "defending_attorney":
      return "ATTORNEY";
    case "videographer":
      return "VIDEOGRAPHER";
    default:
      return "OTHER";
  }
}

function presentationRoleToSpeakerRole(role: PresentationRole): Speaker["role"] {
  return role === "ATTORNEY"
    ? "ATTORNEY"
    : role === "WITNESS"
      ? "WITNESS"
      : role === "REPORTER"
        ? "REPORTER"
        : "OTHER";
}

export function resolveStoredSpeakerSemantic(input: StoredSpeakerSemanticInput): Speaker {
  const role = normalizeStoredSpeakerRole(input.speaker_role ?? input.role);
  const deepgramSpeaker = input.speaker_index ?? input.deepgram_speaker ?? null;
  const candidateLabel = input.assigned_name ?? input.speaker_label ?? input.display_name ?? "";
  const displayName = isGenericSpeakerLabel(candidateLabel)
    ? getGenericSpeakerFallbackLabel({
        speaker_id: input.speaker_id,
        display_name: candidateLabel,
        deepgram_speaker: deepgramSpeaker,
        role: presentationRoleToSpeakerRole(role),
      })
    : normalizeSpeakerLabel(candidateLabel);

  return {
    speaker_id: input.speaker_id,
    display_name: displayName,
    deepgram_speaker: deepgramSpeaker,
    role: presentationRoleToSpeakerRole(role),
  };
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
  const normalizedText = comparable(text);
  const normalizedName = comparable(name);
  if (!normalizedName) {
    return 0;
  }

  let score = 0;
  if (normalizedText.includes(normalizedName)) {
    score += 4;
  }

  const parts = normalizedName.split(" ").filter(Boolean);
  const lawyerSurname = parts[parts.length - 1] ?? "";
  if (lawyerSurname && normalizedText.includes(lawyerSurname)) {
    score += 2;
  }

  if (/for the plaintiff|for the defendant|represent the plaintiff|represent the defendant/i.test(text)) {
    score += 1;
  }

  return score;
}

function attorneyCandidates(record: CaseRecord | null | undefined): Array<{ name: string; gender: string | null }> {
  return (record?.attorneys ?? []).map((attorney) => {
    const candidate = attorney as unknown as { gender?: { value?: string } | string };
    const gender = typeof candidate.gender === "string"
      ? candidate.gender
      : candidate.gender?.value ?? null;
    return { name: attorney.name.value, gender };
  });
}

function honorificForGender(gender: string | null): "MR." | "MS." {
  const normalized = gender?.trim().toLowerCase();
  return normalized === "f" || normalized === "female" ? "MS." : "MR.";
}

function attorneyDisplayName(name: string, gender: string | null): string {
  return `${honorificForGender(gender)}  ${surname(name)}`.trim();
}

function attorneyPresentationLabel(name: string, gender: string | null): string {
  return `${honorificForGender(gender)} ${surname(name)}`.trim();
}

function presentationSurname(name: string): string {
  const normalized = comparable(name)
    .replace(/\b(M D|MD|PH D|PHD|J D|JD|ESQ|JR|SR|II|III|IV)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized.split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function witnessDisplayName(name: string | null | undefined, prefixSuffix: string | null | undefined, roleValue: string | null): string {
  const combined = `${name ?? ""} ${prefixSuffix ?? ""}`;
  const physician = /\b(M\.D\.|PH\.D\.)\b/i.test(combined) || roleValue === "EXPERT";
  if (!physician) {
    return "THE WITNESS";
  }

  return `DR. ${presentationSurname(name ?? "WITNESS") || "WITNESS"}`;
}

function findWitnessSelfIdentification(
  utterances: SpeakerResolutionUtterance[],
  speakerId: string,
): SpeakerResolutionUtterance | null {
  return utterances.find((utterance) => {
    return utterance.speaker_id === speakerId && /^\s*my name is\b/i.test(utterance.text);
  }) ?? null;
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
      const witness = record?.witnesses[0];
      const witnessRole = typeof witness?.role?.value === "string" ? witness.role.value : null;
      view.label = witnessDisplayName(witness?.name.value, witness?.prefix_suffix, witnessRole);
      view.role = "WITNESS";
    }
  }

  if (record) {
    const patternAssignedIds = new Set<string>();
    if (reporterId && reporterScore >= MIN_REPORTER_SCORE) {
      patternAssignedIds.add(reporterId);
    }
    if (videographerId && videographerId !== reporterId && videographerScore >= MIN_VIDEOGRAPHER_SCORE) {
      patternAssignedIds.add(videographerId);
    }
    const assignedSpeakerIds = new Set<string>();

    for (const attorney of record.attorneys ?? []) {
      let bestSpeakerId: string | null = null;
      let bestScore = 0;
      for (const speaker of document.speakers) {
        if (patternAssignedIds.has(speaker.speaker_id) || assignedSpeakerIds.has(speaker.speaker_id)) {
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
          view.label = attorneyPresentationLabel(attorney.name.value, attorneyCandidates(record).find((candidate) => candidate.name === attorney.name.value)?.gender ?? null);
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
      const witness = record.witnesses[0];
      const witnessRole = typeof witness?.role?.value === "string" ? witness.role.value : null;
      if (view) {
        view.label = witnessDisplayName(witness?.name.value, witness?.prefix_suffix, witnessRole);
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

function detectCollapsedCluster(
  utterances: SpeakerResolutionUtterance[],
  speakerId: string,
): { collapsed_cluster: string; evidence: string; real_speakers_likely: number; recommendation: string } | null {
  const speakerUtterances = utterances.filter((utterance) => utterance.speaker_id === speakerId);
  const hasReporter = speakerUtterances.some((utterance) => /today is|time is|raise your right hand|off the record/i.test(utterance.text));
  const hasQuestion = speakerUtterances.some((utterance) => /\?$/.test(utterance.text) || /directing your attention|let me ask/i.test(utterance.text));
  const hasAnswer = speakerUtterances.some((utterance) => /^\s*(yes|no|i|my name is|i don't recall|correct)\b/i.test(utterance.text));

  if ([hasReporter, hasQuestion, hasAnswer].filter(Boolean).length < 2) {
    return null;
  }

  return {
    collapsed_cluster: speakerId,
    evidence: `Cluster contains mixed reporter/question/answer signals across ${speakerUtterances.length} utterances.`,
    real_speakers_likely: 2,
    recommendation: "NEEDS_PARTICIPANT_DIRECTORY_REVIEW",
  };
}

function applyCaseMetadataAuthority(
  speakerMap: Record<string, SpeakerMapEntry>,
  utterances: SpeakerResolutionUtterance[],
  record: CaseRecord | null | undefined,
): Record<string, SpeakerMapEntry> {
  const attorneys = attorneyCandidates(record);
  const witnessName = record?.witnesses?.[0]?.name.value ?? null;

  return Object.fromEntries(
    Object.entries(speakerMap).map(([speakerId, entry]) => {
      if (entry.role === "ATTORNEY") {
        const evidenceText = utterances
          .filter((utterance) => utterance.speaker_id === speakerId)
          .map((utterance) => utterance.text)
          .join(" ");

        const bestAttorney = attorneys.find((attorney) => {
          const attorneyFirst = firstName(attorney.name);
          return attorneyFirst.length > 0 && comparable(evidenceText).includes(attorneyFirst);
        });

        if (bestAttorney) {
          const corrected = attorneyDisplayName(bestAttorney.name, bestAttorney.gender);
          if (entry.display_name !== corrected) {
            return [speakerId, {
              ...entry,
              display_name: corrected,
              authority: "SELF_IDENTIFICATION_PLUS_CASE_METADATA",
              name_correction_applied: `${entry.display_name.replace(/^MR\.\s+|^MS\.\s+/i, "").trim()} → ${surname(bestAttorney.name)}`,
            }];
          }
        }
      }

      if (entry.role === "WITNESS" && witnessName) {
        const identifyingUtterance = findWitnessSelfIdentification(utterances, speakerId);
        if (identifyingUtterance) {
          return [speakerId, {
            ...entry,
            display_name: "THE WITNESS",
            authority: "SELF_IDENTIFICATION",
          }];
        }
      }

      return [speakerId, entry];
    }),
  );
}

export async function mapInitialSpeakers(
  onRecordUtterances: SpeakerResolutionUtterance[],
  caseMetadata: CaseRecord | null | undefined,
  client: SpeakerResolutionClient,
  store?: SpeakerResolutionStore & { transcript_id: string },
): Promise<SpeakerResolutionResult> {
  assertInvariant();
  const result = await client.completeJson<SpeakerResolutionResult>({
    promptId: "2-A",
    system: "Speaker resolution prompt 2-A",
    user: JSON.stringify({
      caseMetadata,
      utterances: onRecordUtterances.slice(0, 80),
    }),
    maxTokens: 2048,
  });

  const withMetadataAuthority = applyCaseMetadataAuthority(result.speaker_map, onRecordUtterances, caseMetadata);
  const diarizationIssues = [
    ...result.diarization_issues,
    ...Object.keys(withMetadataAuthority)
      .map((speakerId) => detectCollapsedCluster(onRecordUtterances, speakerId))
      .filter((issue): issue is NonNullable<typeof issue> => issue != null),
  ];

  const finalized: SpeakerResolutionResult = {
    ...result,
    speaker_map: withMetadataAuthority,
    diarization_issues: diarizationIssues,
    metrics: {
      ...result.metrics,
      collapsed_clusters: diarizationIssues.length,
    },
  };

  if (store) {
    await store.writeCurrentMap({
      transcript_id: store.transcript_id,
      speaker_map: finalized.speaker_map,
    });
    await store.updatePipelineState({
      transcript_id: store.transcript_id,
      pipeline_state: "AWAITING_SPEAKER_VERIFICATION",
      speaker_map_verified: false,
    });
  }

  return finalized;
}

export async function verifyMidDepoSpeakers(
  utterances: SpeakerResolutionUtterance[],
  currentMap: Record<string, SpeakerMapEntry>,
  client: SpeakerResolutionClient,
): Promise<MidDepoVerificationResult> {
  assertInvariant();
  return client.completeJson<MidDepoVerificationResult>({
    promptId: "2-B",
    system: "Speaker resolution prompt 2-B",
    user: JSON.stringify({ currentMap, utterances }),
    maxTokens: 2048,
  });
}

export async function overrideAttributions(
  utterances: SpeakerResolutionUtterance[],
  confirmedMap: Record<string, SpeakerMapEntry>,
  caseMetadata: CaseRecord | null | undefined,
  client: SpeakerResolutionClient,
  speakerMapVerified: boolean,
): Promise<AttributionOverride[]> {
  if (!speakerMapVerified) {
    return [];
  }

  assertInvariant();
  return client.completeJson<AttributionOverride[]>({
    promptId: "2-C",
    system: "Speaker resolution prompt 2-C",
    user: JSON.stringify({ confirmedMap, caseMetadata, utterances }),
    maxTokens: 2048,
  });
}

export async function detectExamTransitions(
  utterances: SpeakerResolutionUtterance[],
  confirmedMap: Record<string, SpeakerMapEntry>,
  client: SpeakerResolutionClient,
  speakerMapVerified: boolean,
): Promise<{ transitions: ExamTransition[] }> {
  if (!speakerMapVerified) {
    return { transitions: [] };
  }

  assertInvariant();
  return client.completeJson<{ transitions: ExamTransition[] }>({
    promptId: "2-D",
    system: "Speaker resolution prompt 2-D",
    user: JSON.stringify({ confirmedMap, utterances }),
    maxTokens: 1024,
  });
}

export async function confirmSpeakerMap(
  transcriptId: string,
  store: SpeakerResolutionStore,
): Promise<void> {
  await store.updatePipelineState({
    transcript_id: transcriptId,
    pipeline_state: "SPEAKER_VERIFIED",
    speaker_map_verified: true,
  });
}

export function speakerRowsFromMap(speakerMap: Record<string, SpeakerMapEntry>): Array<Pick<Speaker, "speaker_id" | "display_name" | "role">> {
  return Object.entries(speakerMap).map(([speakerId, entry]) => ({
    speaker_id: speakerId,
    display_name: entry.display_name,
    role: entry.role === "VIDEOGRAPHER" ? "OTHER" : entry.role === "UNKNOWN" ? "OTHER" : entry.role,
  }));
}
