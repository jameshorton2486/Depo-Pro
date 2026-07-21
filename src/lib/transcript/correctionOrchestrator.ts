import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import { buildEntityRegistry, findEntityMatch, listRegistryTerms } from "./entityRegistry";
import {
  AMBIGUOUS_FLAGS,
  DETERMINISTIC_PHRASE_CORRECTIONS,
  DETERMINISTIC_TOKEN_CORRECTIONS,
  looksLikeImplausibleMoney,
} from "./correctionRegistry";

export type DefectLayer =
  | "RETRANSCRIBE"
  | "DETERMINISTIC"
  | "AMBIGUOUS_FLAG"
  | "SPEAKER_ISSUE"
  | "LOW_CONFIDENCE"
  | "IMPLAUSIBLE_MONEY";

export interface TranscriptDefect {
  layer: DefectLayer;
  raw_token: string;
  corrected_token?: string;
  description: string;
  likely_meaning?: string;
  word_id: string;
  start_time: number;
  utterance_id: string;
  confidence?: number;
}

export interface SpeakerIssue {
  speaker_id: string;
  current_display_name: string;
  description: string;
  utterance_count: number;
}

export interface RetranscriptionCandidate {
  keyterm: string;
  reason: string;
  occurrence_count: number;
}

export interface CorrectionReportQueueItem {
  kind: "speaker" | "low_confidence" | "ambiguous" | "money";
  utterance_id?: string;
  word_id?: string;
  severity: "high" | "medium" | "low";
  description: string;
}

export interface CorrectionReport {
  job_id: string;
  generated_at: string;
  summary: {
    total_words: number;
    deterministic_corrections_applied: number;
    ambiguous_flags: number;
    low_confidence_words: number;
    implausible_money_flags: number;
    speaker_issues: number;
    retranscription_candidates: number;
  };
  deterministic_corrections: TranscriptDefect[];
  ambiguous_flags: TranscriptDefect[];
  low_confidence: TranscriptDefect[];
  implausible_money: TranscriptDefect[];
  speaker_issues: SpeakerIssue[];
  retranscription_candidates: RetranscriptionCandidate[];
  curated_review_queue?: CorrectionReportQueueItem[];
}

const LOW_CONFIDENCE_THRESHOLD = 0.70;

export function buildCorrectionReport(
  document: EditorDocument,
  record?: CaseRecord | null
): CorrectionReport {
  const deterministicCorrections: TranscriptDefect[] = [];
  const ambiguousFlags: TranscriptDefect[] = [];
  const lowConfidence: TranscriptDefect[] = [];
  const implausibleMoney: TranscriptDefect[] = [];
  const speakerIssues: SpeakerIssue[] = [];
  const flaggedSpeakerIds = new Set<string>();
  const retranscriptionCandidates = new Map<string, RetranscriptionCandidate>();
  const entityRegistry = buildEntityRegistry(record);

  for (let i = 0; i < document.words.length; i += 1) {
    const word = document.words[i];
    const previousToken = document.words[i - 1]?.text;
    const nextToken = document.words[i + 1]?.text;

    if (word.confidence < LOW_CONFIDENCE_THRESHOLD) {
      lowConfidence.push({
        layer: "LOW_CONFIDENCE",
        raw_token: word.raw_text,
        description: `Low ASR confidence: ${(word.confidence * 100).toFixed(0)}%`,
        word_id: word.word_id,
        start_time: word.start_time,
        utterance_id: word.utterance_id,
        confidence: word.confidence,
      });
    }

    if (looksLikeImplausibleMoney(word.text)) {
      implausibleMoney.push({
        layer: "IMPLAUSIBLE_MONEY",
        raw_token: word.raw_text,
        description: `Implausible amount ${word.text} — possible decimal-shift ASR error`,
        word_id: word.word_id,
        start_time: word.start_time,
        utterance_id: word.utterance_id,
      });
    }

    for (const correction of DETERMINISTIC_TOKEN_CORRECTIONS) {
      if (word.raw_text !== correction.match) {
        continue;
      }
      if (
        correction.requiresPrecedingPattern
        && !correction.requiresPrecedingPattern.test(previousToken ?? "")
      ) {
        continue;
      }
      if (
        correction.requiresFollowingPattern
        && !correction.requiresFollowingPattern.test(nextToken ?? "")
      ) {
        continue;
      }

      deterministicCorrections.push({
        layer: "DETERMINISTIC",
        raw_token: word.raw_text,
        corrected_token: correction.replacement,
        description: correction.reason,
        word_id: word.word_id,
        start_time: word.start_time,
        utterance_id: word.utterance_id,
      });

      const existing = retranscriptionCandidates.get(correction.replacement);
      if (existing) {
        existing.occurrence_count += 1;
      } else {
        retranscriptionCandidates.set(correction.replacement, {
          keyterm: correction.replacement,
          reason: `Deepgram garbled "${correction.replacement}" as "${correction.match}"`,
          occurrence_count: 1,
        });
      }
      break;
    }

    const ambiguousRule = AMBIGUOUS_FLAGS.find(
      (flag) => word.raw_text.toLowerCase() === flag.match.toLowerCase()
    );
    if (ambiguousRule && !findEntityMatch(entityRegistry, word.raw_text)) {
      ambiguousFlags.push({
        layer: "AMBIGUOUS_FLAG",
        raw_token: word.raw_text,
        description: ambiguousRule.reason,
        likely_meaning: ambiguousRule.likelyMeaning,
        word_id: word.word_id,
        start_time: word.start_time,
        utterance_id: word.utterance_id,
        confidence: word.confidence,
      });
    }
  }

  const utteranceTextMap = buildUtteranceTextMap(document);
  const utteranceById = new Map(document.utterances.map((utterance) => [utterance.utterance_id, utterance]));
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));

  for (const correction of DETERMINISTIC_PHRASE_CORRECTIONS) {
    const pattern = new RegExp(
      correction.match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi"
    );

    for (const [utteranceId, text] of utteranceTextMap) {
      if (!pattern.test(text)) {
        continue;
      }
      pattern.lastIndex = 0;
      const utterance = utteranceById.get(utteranceId);
      const firstWordId = utterance?.word_ids[0] ?? "";
      const firstWord = wordById.get(firstWordId);

      deterministicCorrections.push({
        layer: "DETERMINISTIC",
        raw_token: correction.match,
        corrected_token: correction.replacement,
        description: correction.reason,
        word_id: firstWordId,
        start_time: firstWord?.start_time ?? 0,
        utterance_id: utteranceId,
      });

      const existing = retranscriptionCandidates.get(correction.replacement);
      if (existing) {
        existing.occurrence_count += 1;
      } else {
        retranscriptionCandidates.set(correction.replacement, {
          keyterm: correction.replacement,
          reason: `Deepgram garbled "${correction.replacement}" as "${correction.match}"`,
          occurrence_count: 1,
        });
      }
    }
  }

  for (const speaker of document.speakers) {
    if (flaggedSpeakerIds.has(speaker.speaker_id)) {
      continue;
    }

    const utteranceCount = document.utterances.filter(
      (utterance) => utterance.speaker_id === speaker.speaker_id
    ).length;

    if (utteranceCount === 0) {
      continue;
    }

    const hasNoRole = !speaker.role;
    const isGeneric =
      /^SPEAKER\s+\d+$/i.test(speaker.display_name) ||
      /^SPEAKER\s+CUSTOM$/i.test(speaker.display_name) ||
      /^spk_/i.test(speaker.display_name);

    if (hasNoRole || isGeneric) {
      const description = isGeneric
        ? `Generic speaker label — identity not confirmed (${utteranceCount} utterances)`
        : `Speaker has no role assigned (${utteranceCount} utterances)`;

      speakerIssues.push({
        speaker_id: speaker.speaker_id,
        current_display_name: speaker.display_name,
        description,
        utterance_count: utteranceCount,
      });
      flaggedSpeakerIds.add(speaker.speaker_id);
    }
  }

  if (record) {
    addCaseRecordRetranscriptionCandidates(document, record, retranscriptionCandidates);
  }

  for (const keyterm of listRegistryTerms(entityRegistry, ["witness", "attorney", "law_firm", "party", "employer"])) {
    if (!retranscriptionCandidates.has(keyterm)) {
      const normalized = keyterm.toLowerCase();
      const fullText = document.words.map((word) => word.raw_text).join(" ").toLowerCase();
      if (!fullText.includes(normalized) && normalized.length > 3) {
        retranscriptionCandidates.set(keyterm, {
          keyterm,
          reason: `Case entity "${keyterm}" not found in transcript — add as keyterm`,
          occurrence_count: 0,
        });
      }
    }
  }

  const curatedReviewQueue: CorrectionReportQueueItem[] = [
    ...speakerIssues.map((issue) => ({
      kind: "speaker" as const,
      severity: "high" as const,
      description: issue.description,
    })),
    ...ambiguousFlags.slice(0, 20).map((issue) => ({
      kind: "ambiguous" as const,
      utterance_id: issue.utterance_id,
      word_id: issue.word_id,
      severity: "medium" as const,
      description: issue.description,
    })),
    ...lowConfidence
      .filter((issue) => issue.confidence != null && issue.confidence < 0.55)
      .slice(0, 20)
      .map((issue) => ({
        kind: "low_confidence" as const,
        utterance_id: issue.utterance_id,
        word_id: issue.word_id,
        severity: "medium" as const,
        description: issue.description,
      })),
    ...implausibleMoney.map((issue) => ({
      kind: "money" as const,
      utterance_id: issue.utterance_id,
      word_id: issue.word_id,
      severity: "high" as const,
      description: issue.description,
    })),
  ];

  return {
    job_id: document.job_id,
    generated_at: new Date().toISOString(),
    summary: {
      total_words: document.words.length,
      deterministic_corrections_applied: deterministicCorrections.length,
      ambiguous_flags: ambiguousFlags.length,
      low_confidence_words: lowConfidence.length,
      implausible_money_flags: implausibleMoney.length,
      speaker_issues: speakerIssues.length,
      retranscription_candidates: retranscriptionCandidates.size,
    },
    deterministic_corrections: deterministicCorrections,
    ambiguous_flags: ambiguousFlags,
    low_confidence: lowConfidence,
    implausible_money: implausibleMoney,
    speaker_issues: speakerIssues,
    retranscription_candidates: [...retranscriptionCandidates.values()]
      .sort((left, right) => right.occurrence_count - left.occurrence_count),
    curated_review_queue: curatedReviewQueue,
  };
}

function buildUtteranceTextMap(document: EditorDocument): Map<string, string> {
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  const map = new Map<string, string>();

  for (const utterance of document.utterances) {
    const text = utterance.word_ids
      .map((id) => wordById.get(id)?.raw_text ?? "")
      .join(" ")
      .toLowerCase();
    map.set(utterance.utterance_id, text);
  }

  return map;
}

function addCaseRecordRetranscriptionCandidates(
  document: EditorDocument,
  record: CaseRecord,
  candidates: Map<string, RetranscriptionCandidate>
): void {
  const fullText = document.words.map((word) => word.raw_text).join(" ").toLowerCase();

  for (const witness of record.witnesses ?? []) {
    const name = witness.name?.value;
    if (!name) {
      continue;
    }
    const parts = name.toLowerCase().split(/\s+/);
    const surname = parts[parts.length - 1];
    if (surname && surname.length > 3 && !fullText.includes(surname) && !candidates.has(name)) {
      candidates.set(name, {
        keyterm: name,
        reason: `Witness name "${name}" not found in transcript — add as keyterm`,
        occurrence_count: 0,
      });
    }
  }

  for (const attorney of record.attorneys ?? []) {
    const name = attorney.name?.value;
    if (!name) {
      continue;
    }
    const parts = name.toLowerCase().split(/\s+/);
    const surname = parts[parts.length - 1];
    if (surname && surname.length > 3 && !fullText.includes(surname) && !candidates.has(name)) {
      candidates.set(name, {
        keyterm: name,
        reason: `Attorney name "${name}" not found in transcript — add as keyterm`,
        occurrence_count: 0,
      });
    }
  }
}
