import type { Speaker, Word, EditorDocument } from "../api/types";
import type { CaseRecord } from "../types/case";
import type { ReviewStateFile, WorkingTranscriptFile } from "./types";

function cloneSpeaker(speaker: Speaker): Speaker {
  return { ...speaker };
}

function cloneWord(word: Word): Word {
  return { ...word };
}

function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function mergeReviewedFlags(
  words: readonly Word[],
  reviewState?: ReviewStateFile | null
): Word[] {
  if (!reviewState) {
    return words.map(cloneWord);
  }

  const reviewed = new Set(dedupe(reviewState.reviewed_word_ids));
  const unreviewed = new Set(dedupe(reviewState.unreviewed_word_ids));

  return words.map((word) => ({
    ...word,
    reviewed: reviewed.has(word.word_id) ? true : unreviewed.has(word.word_id) ? false : word.reviewed,
  }));
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function inferSpeakerRole(caseRecord: CaseRecord, speaker: Speaker): Speaker["role"] | undefined {
  if (speaker.role) return speaker.role;

  const label = normalize(speaker.display_name);
  if (!label) return speaker.role;

  if (label.includes("REPORTER")) return "REPORTER";
  if (label.includes("INTERPRETER")) return "INTERPRETER";
  if (label.includes("WITNESS")) return "WITNESS";
  if (label.includes("ATTORNEY")) return "ATTORNEY";

  const reporterName = normalize(caseRecord.reporter.name.value);
  if (reporterName && label === reporterName) return "REPORTER";

  const witnessNames = new Set(caseRecord.witnesses.map((w) => normalize(w.name.value)).filter(Boolean));
  if (witnessNames.has(label)) return "WITNESS";

  const attorneyNames = new Set(caseRecord.attorneys.map((a) => normalize(a.name.value)).filter(Boolean));
  if (attorneyNames.has(label)) return "ATTORNEY";

  const interpreterNames = new Set(caseRecord.interpreters.map((i) => normalize(i.name.value)).filter(Boolean));
  if (interpreterNames.has(label)) return "INTERPRETER";

  return speaker.role;
}

function mapSpeakers(caseRecord: CaseRecord, transcript: WorkingTranscriptFile): Speaker[] {
  return transcript.speakers.map((speaker) => ({
    ...cloneSpeaker(speaker),
    role: inferSpeakerRole(caseRecord, speaker) ?? speaker.role,
  }));
}

export function caseIdToJobId(caseId: string): string {
  return caseId;
}

export function caseToEditorDocument(
  caseRecord: CaseRecord,
  workingTranscript?: WorkingTranscriptFile | null,
  reviewState?: ReviewStateFile | null
): EditorDocument {
  const transcript = workingTranscript;

  const mediaUrl = transcript?.media_url ?? caseRecord.audio?.media_url ?? "";
  const duration = transcript?.duration ?? caseRecord.audio?.duration_seconds ?? 0;
  const utterances = transcript?.utterances.map((utterance) => ({ ...utterance })) ?? [];
  const words = mergeReviewedFlags(transcript?.words ?? [], reviewState);
  const speakers = transcript ? mapSpeakers(caseRecord, transcript) : [];

  return {
    job_id: caseIdToJobId(caseRecord.case_id),
    media_url: mediaUrl ?? "",
    duration: duration ?? 0,
    speakers,
    utterances,
    words,
  };
}
