import { describe, expect, it, vi } from "vitest";

import type { CaseRecord } from "../../types/case";
import {
  confirmSpeakerMap,
  detectExamTransitions,
  mapInitialSpeakers,
  overrideAttributions,
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

describe("speakerResolutionEngine", () => {
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
