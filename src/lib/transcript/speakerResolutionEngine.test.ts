import { describe, expect, it, vi } from "vitest";

import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import {
  buildDisplayDocument,
  confirmSpeakerMap,
  detectExamTransitions,
  mapInitialSpeakers,
  overrideAttributions,
  resolveStoredSpeakerSemantic,
  type SpeakerResolutionClient,
  type SpeakerResolutionStore,
  type SpeakerResolutionUtterance,
} from "./speakerResolutionEngine";

function makeUtterances(): SpeakerResolutionUtterance[] {
  return [
    { utterance_index: 0, speaker_id: "spk_000", text: "Today is April 30, 2026. The time is 1:31 p.m." },
    { utterance_index: 1, speaker_id: "spk_001", text: "Good afternoon. My name is Dennis Maloney. I represent the plaintiff." },
    { utterance_index: 2, speaker_id: "spk_002", text: "My name is Mohammad Etminan." },
    { utterance_index: 3, speaker_id: "spk_002", text: "I was driving north on the highway." },
  ];
}

function makeRecord(): CaseRecord {
  return {
    witnesses: [{ name: { value: "Mohammad Etminan" }, role: { value: "WITNESS" } }],
    attorneys: [{ attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } }],
  } as unknown as CaseRecord;
}

function makeDisplayDocumentFixture(): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "https://example.test/audio.wav",
    duration: 30,
    speakers: [
      { speaker_id: "spk-0", display_name: "Speaker 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-1", display_name: "Speaker 1", deepgram_speaker: 1, role: "OTHER" },
      { speaker_id: "spk-2", display_name: "Speaker 2", deepgram_speaker: 2, role: "OTHER" },
      { speaker_id: "spk-3", display_name: "Speaker 3", deepgram_speaker: 3, role: "OTHER" },
    ],
    utterances: [
      { utterance_id: "utt-1", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1", "w2", "w3", "w4"] },
      { utterance_id: "utt-2", speaker_id: "spk-1", start_time: 1, end_time: 2, word_ids: ["w5", "w6", "w7"] },
      { utterance_id: "utt-3", speaker_id: "spk-2", start_time: 2, end_time: 3, word_ids: ["w8", "w9", "w10", "w11", "w12"] },
      { utterance_id: "utt-4", speaker_id: "spk-3", start_time: 3, end_time: 4, word_ids: ["w13", "w14"] },
    ],
    words: [
      { word_id: "w1", text: "Good", raw_text: "Good", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "We", raw_text: "We", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "are on the record.", raw_text: "are on the record.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "This", raw_text: "This", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.4, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "is cause number", raw_text: "is cause number", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "123.", raw_text: "123.", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "Good", raw_text: "Good", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
      { word_id: "w9", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.8, end_time: 0.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w10", text: "Dennis", raw_text: "Dennis", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.9, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w11", text: "Bentley", raw_text: "Bentley", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 1.0, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w12", text: "for the plaintiff.", raw_text: "for the plaintiff.", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w13", text: "I", raw_text: "I", speaker_id: "spk-3", utterance_id: "utt-4", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w14", text: "do.", raw_text: "do.", speaker_id: "spk-3", utterance_id: "utt-4", start_time: 1.3, end_time: 1.4, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

describe("speakerResolutionEngine", () => {
  it("owns deterministic display-label resolution for workspace consumers", () => {
    const displayDocument = buildDisplayDocument(makeDisplayDocumentFixture(), {
      reporter: { name: { value: "Nellie Bardel" } },
      witnesses: [{ name: { value: "Mohammad Etminan, M.D." }, prefix_suffix: "Dr.", role: { value: "EXPERT" } }],
      attorneys: [
        { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
        { attorney_id: "a2", name: { value: "Ramon Krishnan" }, role: { value: "OPPOSING" } },
      ],
    } as unknown as CaseRecord);
    const speakerMap = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker]));

    expect(speakerMap.get("spk-0")?.display_name).toBe("THE VIDEOGRAPHER");
    expect(speakerMap.get("spk-1")?.display_name).toBe("THE REPORTER");
    expect(speakerMap.get("spk-2")?.display_name).toBe("MR. BENTLEY");
    expect(speakerMap.get("spk-3")?.display_name).toBe("DR. ETMINAN");
  });

  it("protects reporter labels from attorney-name overrides", () => {
    const document = makeDisplayDocumentFixture();
    document.words.find((word) => word.word_id === "w6")!.text = "This is cause number Dennis Bentley licensed in Texas district court";

    const displayDocument = buildDisplayDocument(document, {
      reporter: { name: { value: "Nellie Bardel" } },
      witnesses: [{ name: { value: "Mohammad Etminan, M.D." }, prefix_suffix: "Dr.", role: { value: "EXPERT" } }],
      attorneys: [
        { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
        { attorney_id: "a2", name: { value: "Ramon Krishnan" }, role: { value: "OPPOSING" } },
      ],
    } as unknown as CaseRecord);
    const speakerMap = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker]));

    expect(speakerMap.get("spk-1")?.display_name).toBe("THE REPORTER");
    expect(speakerMap.get("spk-1")?.role).toBe("REPORTER");
  });

  it("protects videographer labels from attorney-name overrides", () => {
    const document = makeDisplayDocumentFixture();
    document.words.find((word) => word.word_id === "w4")!.text = "are on the record Dennis Bentley today's date the time is now";

    const displayDocument = buildDisplayDocument(document, {
      reporter: { name: { value: "Nellie Bardel" } },
      witnesses: [{ name: { value: "Mohammad Etminan, M.D." }, prefix_suffix: "Dr.", role: { value: "EXPERT" } }],
      attorneys: [
        { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
        { attorney_id: "a2", name: { value: "Ramon Krishnan" }, role: { value: "OPPOSING" } },
      ],
    } as unknown as CaseRecord);
    const speakerMap = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker]));

    expect(speakerMap.get("spk-0")?.display_name).toBe("THE VIDEOGRAPHER");
    expect(speakerMap.get("spk-0")?.role).toBe("OTHER");
  });

  it("labels non-physician witnesses as the witness", () => {
    const record = {
      reporter: { name: { value: "Nellie Bardel" } },
      witnesses: [{ name: { value: "Jane Doe" }, prefix_suffix: null, role: { value: "WITNESS" } }],
      attorneys: [
        { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
      ],
    } as unknown as CaseRecord;

    const displayDocument = buildDisplayDocument(makeDisplayDocumentFixture(), record);
    const speakerMap = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker.display_name]));

    expect(speakerMap.get("spk-3")).toBe("THE WITNESS");
  });

  it("renders SPEAKER CUSTOM for synthetic speakers with no deepgram cluster", () => {
    const document = makeDisplayDocumentFixture();
    document.speakers.push({
      speaker_id: "spk-custom",
      display_name: "Speaker 9",
      deepgram_speaker: null,
      role: "OTHER",
    });
    document.utterances.push({
      utterance_id: "utt-custom",
      speaker_id: "spk-custom",
      start_time: 4,
      end_time: 5,
      word_ids: ["w-custom-1", "w-custom-2"],
    });
    document.words.push(
      { word_id: "w-custom-1", text: "Maybe", raw_text: "Maybe", speaker_id: "spk-custom", utterance_id: "utt-custom", start_time: 1.4, end_time: 1.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-custom-2", text: "later.", raw_text: "later.", speaker_id: "spk-custom", utterance_id: "utt-custom", start_time: 1.5, end_time: 1.6, confidence: 1, reviewed: false, edited: false },
    );

    const displayDocument = buildDisplayDocument(document, {
      reporter: { name: { value: "Nellie Bardel" } },
      witnesses: [{ name: { value: "Mohammad Etminan, M.D." }, prefix_suffix: "Dr.", role: { value: "EXPERT" } }],
      attorneys: [
        { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
      ],
    } as unknown as CaseRecord);
    const speakerMap = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker.display_name]));

    expect(speakerMap.get("spk-custom")).toBe("SPEAKER CUSTOM");
  });

  it("does not crash speaker inference when a speaker has no deepgram cluster", () => {
    const document = makeDisplayDocumentFixture();
    document.speakers[0] = { ...document.speakers[0], deepgram_speaker: null };

    expect(() => buildDisplayDocument(document, {
      reporter: { name: { value: "Nellie Bardel" } },
      witnesses: [{ name: { value: "Mohammad Etminan, M.D." }, prefix_suffix: "Dr.", role: { value: "EXPERT" } }],
      attorneys: [
        { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
      ],
    } as unknown as CaseRecord)).not.toThrow();
  });

  it("owns stored speaker semantic normalization for upstream snapshot consumers", () => {
    expect(resolveStoredSpeakerSemantic({
      speaker_id: "spk-1",
      assigned_name: "Mr. Bentley",
      speaker_label: "Speaker 0",
      display_name: "Speaker 0",
      speaker_index: 0,
      speaker_role: "attorney",
    })).toEqual({
      speaker_id: "spk-1",
      display_name: "MR. BENTLEY",
      deepgram_speaker: 0,
      role: "ATTORNEY",
    });

    expect(resolveStoredSpeakerSemantic({
      speaker_id: "spk-2",
      assigned_name: null,
      speaker_label: "Speaker 4",
      display_name: "Speaker 4",
      speaker_index: 4,
      speaker_role: "other",
    })).toEqual({
      speaker_id: "spk-2",
      display_name: "SPEAKER 4",
      deepgram_speaker: 4,
      role: "OTHER",
    });
  });

  it("writes the proposed map and awaits verification after 2-A completes", async () => {
    const writeCurrentMap = vi.fn().mockResolvedValue(undefined);
    const updatePipelineState = vi.fn().mockResolvedValue(undefined);
    const client: SpeakerResolutionClient = {
      completeJson: vi.fn().mockResolvedValue({
        speaker_map: {
          spk_000: {
            display_name: "THE REPORTER",
            role: "REPORTER",
            confidence: 0.99,
            evidence: "opening",
            authority: "FORMAL_OPENING_DETECTED",
          },
        },
        diarization_issues: [],
        speakers_unresolved: [],
        metrics: { speakers_mapped: 1, high_confidence: 1, ambiguous: 0, collapsed_clusters: 0 },
      }),
    };

    await mapInitialSpeakers(makeUtterances(), makeRecord(), client, {
      transcript_id: "tr_123",
      writeCurrentMap,
      updatePipelineState,
    });

    expect(writeCurrentMap).toHaveBeenCalled();
    expect(updatePipelineState).toHaveBeenCalledWith({
      transcript_id: "tr_123",
      pipeline_state: "AWAITING_SPEAKER_VERIFICATION",
      speaker_map_verified: false,
    });
  });

  it("assigns witness role from self-identification", async () => {
    const client: SpeakerResolutionClient = {
      completeJson: vi.fn().mockResolvedValue({
        speaker_map: {
          spk_002: {
            display_name: "UNKNOWN",
            role: "WITNESS",
            confidence: 0.91,
            evidence: "My name is Mohammad Etminan.",
            authority: "SELF_IDENTIFICATION",
          },
        },
        diarization_issues: [],
        speakers_unresolved: [],
        metrics: { speakers_mapped: 1, high_confidence: 1, ambiguous: 0, collapsed_clusters: 0 },
      }),
    };

    const result = await mapInitialSpeakers(makeUtterances(), makeRecord(), client);
    expect(result.speaker_map.spk_002?.role).toBe("WITNESS");
    expect(result.speaker_map.spk_002?.display_name).toBe("THE WITNESS");
  });

  it("applies metadata name authority for Maloney to Bentley", async () => {
    const client: SpeakerResolutionClient = {
      completeJson: vi.fn().mockResolvedValue({
        speaker_map: {
          spk_001: {
            display_name: "MR.  MALONEY",
            role: "ATTORNEY",
            confidence: 0.9,
            evidence: "My name is Dennis Maloney.",
            authority: "SELF_IDENTIFICATION",
          },
        },
        diarization_issues: [],
        speakers_unresolved: [],
        metrics: { speakers_mapped: 1, high_confidence: 1, ambiguous: 0, collapsed_clusters: 0 },
      }),
    };

    const result = await mapInitialSpeakers(makeUtterances(), makeRecord(), client);
    expect(result.speaker_map.spk_001?.display_name).toBe("MR.  BENTLEY");
    expect(result.speaker_map.spk_001?.name_correction_applied).toContain("MALONEY");
  });

  it("flags diarization collapse when one speaker contains multiple roles", async () => {
    const utterances: SpeakerResolutionUtterance[] = [
      { utterance_index: 0, speaker_id: "spk_001", text: "Today is April 30, 2026. The time is 1:31 p.m." },
      { utterance_index: 1, speaker_id: "spk_001", text: "Please state your name for the record?" },
      { utterance_index: 2, speaker_id: "spk_001", text: "I was driving north on the highway." },
    ];
    const client: SpeakerResolutionClient = {
      completeJson: vi.fn().mockResolvedValue({
        speaker_map: {
          spk_001: {
            display_name: "UNKNOWN",
            role: "UNKNOWN",
            confidence: 0.5,
            evidence: "mixed content",
            authority: "AMBIGUOUS",
          },
        },
        diarization_issues: [],
        speakers_unresolved: ["spk_001"],
        metrics: { speakers_mapped: 0, high_confidence: 0, ambiguous: 1, collapsed_clusters: 0 },
      }),
    };

    const result = await mapInitialSpeakers(utterances, makeRecord(), client);
    expect(result.diarization_issues).toHaveLength(1);
    expect(result.diarization_issues[0]?.collapsed_cluster).toBe("spk_001");
  });

  it("does not run overrides before verification", async () => {
    const client: SpeakerResolutionClient = {
      completeJson: vi.fn(),
    };

    const result = await overrideAttributions(makeUtterances(), {}, makeRecord(), client, false);
    expect(result).toEqual([]);
    expect(client.completeJson).not.toHaveBeenCalled();
  });

  it("does not run exam transition detection before verification", async () => {
    const client: SpeakerResolutionClient = {
      completeJson: vi.fn(),
    };

    const result = await detectExamTransitions(makeUtterances(), {}, client, false);
    expect(result.transitions).toEqual([]);
    expect(client.completeJson).not.toHaveBeenCalled();
  });

  it("marks speaker map verified on confirm", async () => {
    const store: SpeakerResolutionStore = {
      writeCurrentMap: vi.fn(),
      updatePipelineState: vi.fn().mockResolvedValue(undefined),
    };

    await confirmSpeakerMap("tr_123", store);
    expect(store.updatePipelineState).toHaveBeenCalledWith({
      transcript_id: "tr_123",
      pipeline_state: "SPEAKER_VERIFIED",
      speaker_map_verified: true,
    });
  });
});
