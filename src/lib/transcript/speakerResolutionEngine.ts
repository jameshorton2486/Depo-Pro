import type { Speaker } from "../../api/types";
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

const MODEL = "claude-sonnet-4-6";
const TEMPERATURE = 0;

function assertInvariant(): void {
  if (MODEL !== "claude-sonnet-4-6" || TEMPERATURE !== 0) {
    throw new Error("Speaker resolution must use claude-sonnet-4-6 at temperature 0.");
  }
}

function comparable(value: string): string {
  return value.replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

function surname(value: string): string {
  const parts = comparable(value).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function firstName(value: string): string {
  const parts = comparable(value).split(" ").filter(Boolean);
  return parts[0] ?? "";
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

function findWitnessSelfIdentification(
  utterances: SpeakerResolutionUtterance[],
  speakerId: string,
): SpeakerResolutionUtterance | null {
  return utterances.find((utterance) => {
    return utterance.speaker_id === speakerId && /^\s*my name is\b/i.test(utterance.text);
  }) ?? null;
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
