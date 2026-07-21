import type { EditorDocument } from "../../api/types";

export interface BoundaryJobConfig {
  caseType?: string | null;
  proceedingType?: string | null;
}

export interface FormalOpeningResult {
  pre_record_cutoff_index: number;
  confidence: number;
  evidence: string[];
  authority: string;
}

export interface OffRecordSection {
  off_utterance_index: number;
  off_time: string;
  on_utterance_index: number;
  on_time: string;
  is_conclusion: boolean;
  section_type: "RECESS" | "RESUME" | "CONCLUSION" | "ZOOM_GAP";
  confidence: number;
  evidence: string[];
}

export interface OffRecordDetectionResult {
  off_record_sections: OffRecordSection[];
  post_record_start_index: number;
  metrics: Record<string, unknown>;
}

export interface PostRecordResult {
  post_record_start_index: number;
  on_record_spelling_indices: number[];
  confidence: number;
}

export interface SpellingSessionResult {
  formatted_text: string;
  confirmed_spellings: Record<string, string>;
  apply_before_utterance_index: number;
}

export interface BoundaryAiClient {
  completeJson<T>(input: {
    promptId: "1-A" | "1-B" | "1-C" | "1-D";
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<T>;
}

export interface BoundaryUtteranceView {
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  text: string;
  excluded_from_output?: boolean;
  exclusion_reason?: "PRE_RECORD" | "OFF_RECORD" | "POST_RECORD" | null;
  is_synthetic?: boolean;
}

type BoundaryAwareUtterance = EditorDocument["utterances"][number] & {
  excluded_from_output?: boolean | null;
  exclusion_reason?: "PRE_RECORD" | "OFF_RECORD" | "POST_RECORD" | null;
  is_synthetic?: boolean | null;
};

const MODEL = "claude-sonnet-4-6";
const TEMPERATURE = 0;

function assertBoundaryModelInvariant(): void {
  if (MODEL !== "claude-sonnet-4-6" || TEMPERATURE !== 0) {
    throw new Error("Boundary Engine must use claude-sonnet-4-6 at temperature 0.");
  }
}

function serializeUtterances(utterances: BoundaryUtteranceView[]): string {
  return utterances
    .map((utterance, index) => `[${index}] ${utterance.start_time.toFixed(2)}-${utterance.end_time.toFixed(2)} ${utterance.text}`)
    .join("\n");
}

export async function detectFormalOpening(
  utterances: BoundaryUtteranceView[],
  jobConfig: BoundaryJobConfig,
  client: BoundaryAiClient,
): Promise<FormalOpeningResult> {
  assertBoundaryModelInvariant();
  const result = await client.completeJson<FormalOpeningResult>({
    promptId: "1-A",
    system: "Boundary engine prompt 1-A",
    user: JSON.stringify({ jobConfig, utterances: serializeUtterances(utterances) }),
    maxTokens: 512,
  });

  return result.pre_record_cutoff_index < 0
    ? {
        pre_record_cutoff_index: 0,
        confidence: result.confidence,
        evidence: result.evidence,
        authority: "NEEDS_MANUAL_BOUNDARY_REVIEW",
      }
    : result;
}

export async function detectOffRecordSections(
  utterances: BoundaryUtteranceView[],
  integrityMetrics: Record<string, unknown>,
  jobConfig: BoundaryJobConfig,
  client: BoundaryAiClient,
): Promise<OffRecordDetectionResult> {
  assertBoundaryModelInvariant();
  return client.completeJson<OffRecordDetectionResult>({
    promptId: "1-B",
    system: "Boundary engine prompt 1-B",
    user: JSON.stringify({ jobConfig, integrityMetrics, utterances: serializeUtterances(utterances) }),
    maxTokens: 2048,
  });
}

export async function detectPostRecordContent(
  utterances: BoundaryUtteranceView[],
  jobConfig: BoundaryJobConfig,
  client: BoundaryAiClient,
): Promise<PostRecordResult> {
  assertBoundaryModelInvariant();
  return client.completeJson<PostRecordResult>({
    promptId: "1-C",
    system: "Boundary engine prompt 1-C",
    user: JSON.stringify({ jobConfig, utterances: serializeUtterances(utterances) }),
    maxTokens: 512,
  });
}

export async function formatSpellingSession(
  spellingUtterances: BoundaryUtteranceView[],
  jobConfig: BoundaryJobConfig,
  client: BoundaryAiClient,
): Promise<SpellingSessionResult> {
  assertBoundaryModelInvariant();
  return client.completeJson<SpellingSessionResult>({
    promptId: "1-D",
    system: "Boundary engine prompt 1-D",
    user: JSON.stringify({ jobConfig, utterances: serializeUtterances(spellingUtterances) }),
    maxTokens: 1024,
  });
}

export function applyPreRecordCutoff(
  utterances: BoundaryUtteranceView[],
  result: FormalOpeningResult,
): BoundaryUtteranceView[] {
  return utterances.map((utterance, index) => (
    index < result.pre_record_cutoff_index
      ? { ...utterance, excluded_from_output: true, exclusion_reason: "PRE_RECORD" }
      : utterance
  ));
}

export function applyPostRecordCutoff(
  utterances: BoundaryUtteranceView[],
  result: PostRecordResult,
): BoundaryUtteranceView[] {
  return utterances.map((utterance, index) => (
    index >= result.post_record_start_index
      ? { ...utterance, excluded_from_output: true, exclusion_reason: "POST_RECORD" }
      : utterance
  ));
}

export function applyOffRecordSections(
  utterances: BoundaryUtteranceView[],
  result: OffRecordDetectionResult,
): BoundaryUtteranceView[] {
  const excluded = new Set<string>();
  for (const section of result.off_record_sections) {
    for (let index = section.off_utterance_index; index < section.on_utterance_index; index += 1) {
      const utterance = utterances[index];
      if (utterance) {
        excluded.add(utterance.utterance_id);
      }
    }
  }

  return utterances.map((utterance) => (
    excluded.has(utterance.utterance_id)
      ? { ...utterance, excluded_from_output: true, exclusion_reason: "OFF_RECORD" }
      : utterance
  ));
}

function formatEventTime(value: string): string {
  const normalized = value.trim();
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

export function generateSyntheticParentheticals(
  sections: OffRecordSection[],
): BoundaryUtteranceView[] {
  const parentheticals: BoundaryUtteranceView[] = [];
  const emitted = new Set<string>();
  let syntheticIndex = 0;

  const append = (event: Omit<BoundaryUtteranceView, "utterance_id">, dedupeKey: string) => {
    if (emitted.has(dedupeKey)) return;
    emitted.add(dedupeKey);
    syntheticIndex += 1;
    parentheticals.push({ ...event, utterance_id: `synthetic_boundary_${syntheticIndex}` });
  };

  for (const section of sections) {
    if (section.section_type === "CONCLUSION" || section.is_conclusion) {
      append({
        speaker_id: "spk_synthetic_boundary",
        start_time: section.on_utterance_index,
        end_time: section.on_utterance_index,
        text: `(Whereupon, the deposition was concluded at ${formatEventTime(section.off_time)})`,
        is_synthetic: true,
      }, `CONCLUSION:${section.off_utterance_index}:${section.on_utterance_index}:${section.off_time}`);
      continue;
    }

    if (section.section_type === "ZOOM_GAP") {
      append({
        speaker_id: "spk_synthetic_boundary",
        start_time: section.off_utterance_index,
        end_time: section.off_utterance_index,
        text: "(Whereupon, a brief interruption in the remote proceedings occurred.)",
        is_synthetic: true,
      }, `ZOOM_GAP:${section.off_utterance_index}:${section.on_utterance_index}`);
      continue;
    }

    append({
      speaker_id: "spk_synthetic_boundary",
      start_time: section.off_utterance_index,
      end_time: section.off_utterance_index,
      text: `(Whereupon, a recess was taken at ${formatEventTime(section.off_time)})`,
      is_synthetic: true,
    }, `RECESS:${section.off_utterance_index}:${section.off_time}`);
    append({
      speaker_id: "spk_synthetic_boundary",
      start_time: section.on_utterance_index,
      end_time: section.on_utterance_index,
      text: `(Whereupon, the proceedings resumed at ${formatEventTime(section.on_time)})`,
      is_synthetic: true,
    }, `RESUME:${section.on_utterance_index}:${section.on_time}`);
  }

  return parentheticals;
}
export function canEditUtterance(utterance: BoundaryUtteranceView): boolean {
  return utterance.is_synthetic !== true;
}

export function mapDocumentToBoundaryUtterances(document: EditorDocument): BoundaryUtteranceView[] {
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  return document.utterances.map((utterance) => ({
    utterance_id: utterance.utterance_id,
    speaker_id: utterance.speaker_id,
    start_time: utterance.start_time,
    end_time: utterance.end_time,
    text: utterance.word_ids.map((wordId) => wordById.get(wordId)?.text ?? "").join(" ").trim(),
    excluded_from_output: (utterance as BoundaryAwareUtterance).excluded_from_output ?? undefined,
    exclusion_reason: (utterance as BoundaryAwareUtterance).exclusion_reason ?? null,
    is_synthetic: (utterance as BoundaryAwareUtterance).is_synthetic ?? undefined,
  }));
}
