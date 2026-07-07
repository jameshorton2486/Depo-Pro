import { describe, expect, it } from "vitest";
import { intakeReducer, initialIntakeState } from "../store/intakeReducer";
import { emptyCaseRecord, type CaseRecord } from "../types/case";
import { evaluateIntake } from "./intakeValidation";
import { buildUfmMetadata } from "../lib/ufm/buildUfmMetadata";
import { isCaseUfmReady } from "../lib/ufm/requiredFields";
import { buildFormattedTranscriptText, buildPrintableTranscriptHtml, buildWordTranscriptHtml } from "../lib/transcriptDownloads";
import { shouldEnableUtteranceWindowing, UTTERANCE_WINDOWING_THRESHOLD } from "../components/TranscriptEditor/TranscriptEditor";
import type { EditorDocument } from "../api/types";

function seedWorkflowReadyCase(): CaseRecord {
  const record = emptyCaseRecord("case_harness_001", "2026-07-05T12:00:00.000Z");
  record.caption.case_name.value = "Acme Logistics";
  record.caption.case_style.value = "Jordan Alvarez v. Acme Logistics, Inc.";
  record.caption.case_number.value = "2026-CV-1042";
  record.caption.court_name.value = "250th Judicial District Court";
  record.caption.county.value = "Travis County";
  record.session.deposition_date.value = "2026-07-01";
  record.session.location_state.value = "Texas";
  record.session.reporting_method.value = "machine_shorthand";
  record.reporter.name.value = "Miah Bardot";
  record.reporter.cert_number.value = "CSR-12129";
  record.proceeding.ordering_contact = "Dennis Bentley";
  record.witnesses = [{
    witness_id: "wit_1",
    name: { value: "Jordan Alvarez", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    role: { value: "WITNESS", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    title: { value: "Driver", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    employer: { value: "Acme Logistics", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    prefix_suffix: null,
    party_affiliation: { value: "plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    is_corporate_rep: false,
    corporate_entity: null,
    read_and_sign: { value: "read_and_sign", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    requires_interpreter: { value: false, source: "manual", confirmed: true, conflict: false, confidence_score: null },
    requires_videographer: { value: false, source: "manual", confirmed: true, conflict: false, confidence_score: null },
    spelling_corrections: [],
    email: null,
    phone: null,
  }];
  record.attorneys = [{
    attorney_id: "atty_1",
    name: { value: "Dennis Bentley", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    firm: { value: "Bentley Trial Group", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    function: { value: ["CUSTODIAL_ATTORNEY"], source: "manual", confirmed: true, conflict: false, confidence_score: null },
    representing: { value: "Plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    bar_number: { value: "24000001", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    address: "100 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    time_used: null,
    email: "dbentley@example.test",
    phone: "512-555-0100",
  }];
  return record;
}

function makeLargeDocument(utteranceCount: number): EditorDocument {
  const utterances: EditorDocument["utterances"] = [];
  const words: EditorDocument["words"] = [];

  for (let index = 0; index < utteranceCount; index += 1) {
    const utteranceId = `utt_${index + 1}`;
    const wordOne = `w_${index + 1}_1`;
    const wordTwo = `w_${index + 1}_2`;
    utterances.push({
      utterance_id: utteranceId,
      speaker_id: index % 2 === 0 ? "spk_q" : "spk_a",
      start_time: index,
      end_time: index + 1,
      word_ids: [wordOne, wordTwo],
    });
    words.push(
      {
        word_id: wordOne,
        text: index % 2 === 0 ? "Question" : "Answer",
        raw_text: index % 2 === 0 ? "Question" : "Answer",
        speaker_id: index % 2 === 0 ? "spk_q" : "spk_a",
        utterance_id: utteranceId,
        start_time: index,
        end_time: index + 0.4,
        confidence: 1,
        reviewed: true,
        edited: false,
      },
      {
        word_id: wordTwo,
        text: String(index + 1),
        raw_text: String(index + 1),
        speaker_id: index % 2 === 0 ? "spk_q" : "spk_a",
        utterance_id: utteranceId,
        start_time: index + 0.4,
        end_time: index + 0.8,
        confidence: 1,
        reviewed: true,
        edited: false,
      },
    );
  }

  return {
    job_id: "job_harness_001",
    media_url: "https://example.test/audio.mp3",
    duration: utteranceCount,
    speakers: [
      { speaker_id: "spk_q", display_name: "DENNIS BENTLEY", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk_a", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances,
    words,
  };
}

describe("workflow validation harness", () => {
  it("validates the synthetic workflow from intake through export and large-transcript readiness", () => {
    let state = {
      ...initialIntakeState(),
      record: seedWorkflowReadyCase(),
    };

    const intake = evaluateIntake(state.record, {
      hasNotice: true,
      hasScheduling: true,
      hasSupporting: true,
      hasAudio: true,
    });
    expect(intake.canProceed).toBe(true);

    state = intakeReducer(state, {
      type: "SET_STAGE",
      payload: { stage: "creation" },
    });
    expect(state.record.stage).toBe("creation");

    state = intakeReducer(state, {
      type: "ADD_EXHIBIT",
      payload: {
        exhibit: {
          label: "Exhibit 1",
          description: "Driver log",
          filename: "driver-log.pdf",
          file_url: "https://example.test/exhibits/driver-log.pdf",
          marked_by: "PLAINTIFF",
          admitted: true,
          page_reference: 12,
          line_reference: 4,
        },
      },
    });
    state = intakeReducer(state, {
      type: "SET_STAGE_COMPLETE",
      payload: { stage: "exhibits", complete: true },
    });
    expect(state.record.stage_completion.exhibits).toBe(true);

    expect(isCaseUfmReady(state.record)).toBe(true);
    const ufmEnvelope = buildUfmMetadata({
      record: state.record,
      provenance: [],
    });
    expect(ufmEnvelope.missing_required_fields).toEqual([]);

    state = intakeReducer(state, {
      type: "SET_STAGE_COMPLETE",
      payload: { stage: "ufm", complete: true },
    });
    state = intakeReducer(state, {
      type: "SET_CERTIFICATION",
      payload: {
        certification: {
          certification_date: "2026-07-05",
          certification_statement: "Ready for release.",
          checklist: {
            review_complete: true,
            speaker_mapping_complete: true,
            confidence_review_complete: true,
            exhibits_complete: state.record.stage_completion.exhibits,
            ufm_complete: state.record.stage_completion.ufm,
          },
          signature_hash: null,
        },
      },
    });

    const certification = state.record.certification;
    expect(certification?.checklist.exhibits_complete).toBe(true);
    expect(certification?.checklist.ufm_complete).toBe(true);
    expect(Object.values(certification?.checklist ?? {}).every(Boolean)).toBe(true);

    const largeDocument = makeLargeDocument(UTTERANCE_WINDOWING_THRESHOLD + 50);
    expect(shouldEnableUtteranceWindowing(largeDocument.utterances.length, false)).toBe(true);
    expect(shouldEnableUtteranceWindowing(largeDocument.utterances.length, true)).toBe(false);

    const transcriptText = buildFormattedTranscriptText(largeDocument, {
      structureConfirmed: true,
      record: state.record,
    });
    expect(transcriptText).toContain("Q. Question 1");
    expect(transcriptText).toContain(`A. Answer ${UTTERANCE_WINDOWING_THRESHOLD + 50}`);

    const wordHtml = buildWordTranscriptHtml("Harness Transcript", transcriptText);
    const printableHtml = buildPrintableTranscriptHtml("Harness Transcript", transcriptText);
    expect(wordHtml).toContain("<!DOCTYPE html>");
    expect(printableHtml).toContain("@page { margin: 0.75in; size: letter; }");
  });

  it("keeps zero-exhibit cases exportable once Stage 4 is explicitly completed", () => {
    let state = {
      ...initialIntakeState(),
      record: seedWorkflowReadyCase(),
    };

    state = intakeReducer(state, {
      type: "SET_STAGE_COMPLETE",
      payload: { stage: "exhibits", complete: true },
    });
    state = intakeReducer(state, {
      type: "SET_STAGE_COMPLETE",
      payload: { stage: "ufm", complete: true },
    });
    state = intakeReducer(state, {
      type: "SET_CERTIFICATION",
      payload: {
        certification: {
          certification_date: "2026-07-05",
          certification_statement: "Ready for release.",
          checklist: {
            review_complete: true,
            speaker_mapping_complete: true,
            confidence_review_complete: true,
            exhibits_complete: state.record.stage_completion.exhibits,
            ufm_complete: state.record.stage_completion.ufm,
          },
          signature_hash: null,
        },
      },
    });

    expect(state.record.exhibits).toEqual([]);
    expect(state.record.stage_completion.exhibits).toBe(true);
    expect(state.record.certification?.checklist.exhibits_complete).toBe(true);
    expect(Object.values(state.record.certification?.checklist ?? {}).every(Boolean)).toBe(true);
  });
});
