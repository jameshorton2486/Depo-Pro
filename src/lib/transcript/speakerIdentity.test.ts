import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import type { ResolvedSpeakerView } from "./resolvedSpeakers";
import {
  buildTranscriptSpeakerIdentityMap,
  buildUnresolvedSpeakerLabel,
  isGenericSpeakerLabel,
} from "./speakerIdentity";

function buildRecord() {
  const record = emptyCaseRecord("case_identity", "2026-06-16T12:00:00.000Z");
  record.reporter.name.value = "Mia Bardot";
  record.witnesses = [{
    witness_id: "wit_001",
    name: { value: "Heath Thomas", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    role: { value: "WITNESS", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    title: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    prefix_suffix: "Mr",
    party_affiliation: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    is_corporate_rep: false,
    corporate_entity: null,
    read_and_sign: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    requires_interpreter: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    requires_videographer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    spelling_corrections: [],
    email: null,
    phone: null,
  }];
  record.attorneys = [
    {
      attorney_id: "atty_001",
      name: { value: "Steven Nunez", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      function: { value: ["EXAMINING_ATTORNEY"], source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    },
    {
      attorney_id: "atty_002",
      name: { value: "Lucia Zhan", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      role: { value: "OPPOSING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      function: { value: ["DEFENDING_ATTORNEY"], source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    },
  ];
  return record;
}

function buildDocument(): EditorDocument {
  return {
    job_id: "tr_identity",
    media_url: "",
    duration: 90,
    speakers: [
      { speaker_id: "spk-reporter", display_name: "Speaker 0", deepgram_speaker: 0, role: "REPORTER" },
      { speaker_id: "spk-attorney-q", display_name: "Speaker 1", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-witness", display_name: "Speaker 2", deepgram_speaker: 2, role: "WITNESS" },
      { speaker_id: "spk-attorney-d", display_name: "Speaker 3", deepgram_speaker: 3, role: "ATTORNEY" },
    ],
    utterances: [
      { utterance_id: "utt-1", speaker_id: "spk-reporter", start_time: 0, end_time: 1, word_ids: ["w-1", "w-2"] },
      { utterance_id: "utt-2", speaker_id: "spk-attorney-q", start_time: 1, end_time: 2, word_ids: ["w-3", "w-4", "w-5", "w-6"] },
      { utterance_id: "utt-3", speaker_id: "spk-witness", start_time: 2, end_time: 3, word_ids: ["w-7", "w-8"] },
      { utterance_id: "utt-4", speaker_id: "spk-attorney-d", start_time: 3, end_time: 4, word_ids: ["w-9"] },
    ],
    words: [
      { word_id: "w-1", text: "Good", raw_text: "Good", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-2", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-3", text: "Please", raw_text: "Please", speaker_id: "spk-attorney-q", utterance_id: "utt-2", start_time: 1, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-4", text: "state", raw_text: "state", speaker_id: "spk-attorney-q", utterance_id: "utt-2", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-5", text: "your", raw_text: "your", speaker_id: "spk-attorney-q", utterance_id: "utt-2", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-6", text: "name?", raw_text: "name?", speaker_id: "spk-attorney-q", utterance_id: "utt-2", start_time: 1.3, end_time: 1.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-7", text: "Heath", raw_text: "Heath", speaker_id: "spk-witness", utterance_id: "utt-3", start_time: 2, end_time: 2.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-8", text: "Thomas.", raw_text: "Thomas.", speaker_id: "spk-witness", utterance_id: "utt-3", start_time: 2.1, end_time: 2.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-9", text: "Objection.", raw_text: "Objection.", speaker_id: "spk-attorney-d", utterance_id: "utt-4", start_time: 3, end_time: 3.1, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

const RESOLVED_SPEAKERS: ResolvedSpeakerView[] = [
  {
    speaker_id: "raw:spk-reporter",
    participantId: "raw:spk-reporter",
    display_name: "Speaker 0",
    deepgram_speaker: 0,
    role: "REPORTER",
    rawSpeakerIds: ["spk-reporter"],
    speakerIndices: [0],
  },
  {
    speaker_id: "raw:spk-attorney-q",
    participantId: "raw:spk-attorney-q",
    display_name: "Speaker 1",
    deepgram_speaker: 1,
    role: "ATTORNEY",
    rawSpeakerIds: ["spk-attorney-q"],
    speakerIndices: [1],
  },
  {
    speaker_id: "raw:spk-witness",
    participantId: "raw:spk-witness",
    display_name: "Speaker 2",
    deepgram_speaker: 2,
    role: "WITNESS",
    rawSpeakerIds: ["spk-witness"],
    speakerIndices: [2],
  },
  {
    speaker_id: "raw:spk-attorney-d",
    participantId: "raw:spk-attorney-d",
    display_name: "Speaker 3",
    deepgram_speaker: 3,
    role: "ATTORNEY",
    rawSpeakerIds: ["spk-attorney-d"],
    speakerIndices: [3],
  },
];

describe("speakerIdentity", () => {
  it("uses only deterministic CaseRecord ties and does not auto-name generic attorney clusters", () => {
    const identities = buildTranscriptSpeakerIdentityMap(buildDocument(), RESOLVED_SPEAKERS, buildRecord());

    expect(identities.get("spk-reporter")).toMatchObject({
      identityKey: "reporter",
      transcriptLabel: "THE REPORTER",
    });
    expect(identities.get("spk-witness")).toMatchObject({
      name: "Heath Thomas",
      transcriptLabel: "MR. THOMAS",
    });
    expect(identities.get("spk-attorney-q")?.transcriptLabel).toBe(buildUnresolvedSpeakerLabel(1));
    expect(identities.get("spk-attorney-d")?.transcriptLabel).toBe(buildUnresolvedSpeakerLabel(3));
  });

  it("keeps generic fallbacks when no deterministic case metadata exists", () => {
    const identities = buildTranscriptSpeakerIdentityMap(buildDocument(), RESOLVED_SPEAKERS, null);

    expect(identities.get("spk-reporter")?.transcriptLabel).toBe(buildUnresolvedSpeakerLabel(0));
    expect(identities.get("spk-attorney-q")?.transcriptLabel).toBe(buildUnresolvedSpeakerLabel(1));
    expect(identities.get("spk-witness")?.transcriptLabel).toBe(buildUnresolvedSpeakerLabel(2));
  });

  it("preserves an explicit reporter label without defaulting generic reporter-role clusters", () => {
    const document = buildDocument();
    document.speakers = [
      { speaker_id: "spk-reporter-explicit", display_name: "THE REPORTER", deepgram_speaker: 0, role: "REPORTER" },
      { speaker_id: "spk-reporter-generic", display_name: "Speaker 9", deepgram_speaker: 9, role: "REPORTER" },
    ];
    document.utterances = [];
    document.words = [];

    const identities = buildTranscriptSpeakerIdentityMap(document, [
      {
        speaker_id: "raw:spk-reporter-explicit",
        participantId: "raw:spk-reporter-explicit",
        display_name: "THE REPORTER",
        deepgram_speaker: 0,
        role: "REPORTER",
        rawSpeakerIds: ["spk-reporter-explicit"],
        speakerIndices: [0],
      },
      {
        speaker_id: "raw:spk-reporter-generic",
        participantId: "raw:spk-reporter-generic",
        display_name: "Speaker 9",
        deepgram_speaker: 9,
        role: "REPORTER",
        rawSpeakerIds: ["spk-reporter-generic"],
        speakerIndices: [9],
      },
    ], null);

    expect(identities.get("spk-reporter-explicit")?.transcriptLabel).toBe("THE REPORTER");
    expect(identities.get("spk-reporter-generic")?.transcriptLabel).toBe(buildUnresolvedSpeakerLabel(9));
  });

  it("uses the CaseRecord spelling on deterministic exact name matches", () => {
    const document = buildDocument();
    document.speakers = [
      { speaker_id: "spk-attorney-exact", display_name: "Lucia Zhan", deepgram_speaker: 4, role: "ATTORNEY" },
      { speaker_id: "spk-attorney-misspelled", display_name: "Lucia Zahn", deepgram_speaker: 5, role: "ATTORNEY" },
    ];
    document.utterances = [];
    document.words = [];

    const identities = buildTranscriptSpeakerIdentityMap(document, [
      {
        speaker_id: "raw:spk-attorney-exact",
        participantId: "raw:spk-attorney-exact",
        display_name: "Lucia Zhan",
        deepgram_speaker: 4,
        role: "ATTORNEY",
        rawSpeakerIds: ["spk-attorney-exact"],
        speakerIndices: [4],
      },
      {
        speaker_id: "raw:spk-attorney-misspelled",
        participantId: "raw:spk-attorney-misspelled",
        display_name: "Lucia Zahn",
        deepgram_speaker: 5,
        role: "ATTORNEY",
        rawSpeakerIds: ["spk-attorney-misspelled"],
        speakerIndices: [5],
      },
    ], buildRecord());

    expect(identities.get("spk-attorney-exact")).toMatchObject({
      name: "Lucia Zhan",
      transcriptLabel: "ZHAN",
    });
    expect(identities.get("spk-attorney-misspelled")?.transcriptLabel).toBe(buildUnresolvedSpeakerLabel(5));
  });

  it("recognizes generic speaker labels", () => {
    expect(isGenericSpeakerLabel("Speaker 1")).toBe(true);
    expect(isGenericSpeakerLabel("MR. NUNEZ")).toBe(false);
  });
});
