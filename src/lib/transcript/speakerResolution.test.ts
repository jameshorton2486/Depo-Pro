import { describe, expect, it } from "vitest";

import type { TranscriptSpeakerRow } from "../../api/transcriptRepository";
import { buildIndexMap } from "../../editor/speakerMapping";
import type { Database } from "../../types/database";
import { resolveSpeakers } from "./speakerResolution";

type SpeakerResolutionRow = Database["public"]["Tables"]["speaker_resolution_current"]["Row"];

function buildRawSpeaker(overrides: Partial<TranscriptSpeakerRow>): TranscriptSpeakerRow {
  return {
    id: "speaker-row",
    transcript_id: "tr_001",
    speaker_id: "spk_000",
    display_name: "spk_000",
    deepgram_speaker: 0,
    role: null,
    job_id: "job_001",
    speaker_index: 0,
    speaker_label: "spk_000",
    assigned_name: null,
    speaker_role: null,
    word_count: 10,
    ...overrides,
  };
}

function buildOverlayRow(overrides: Partial<SpeakerResolutionRow>): SpeakerResolutionRow {
  return {
    created_at: "2026-06-15T00:00:00Z",
    id: "overlay-row",
    owner_user_id: "owner_001",
    participant_id: "pty_001",
    raw_speaker_id: "spk_000",
    raw_speaker_index: 0,
    resolved_at: "2026-06-15T00:00:00Z",
    resolved_by: "user_001",
    resolved_label: "MR. NUNEZ",
    resolved_role: "examining_attorney",
    transcript_id: "tr_001",
    updated_at: "2026-06-15T00:00:00Z",
    ...overrides,
  };
}

describe("resolveSpeakers", () => {
  it("reproduces current label and role when no overlay exists", () => {
    const result = resolveSpeakers({
      rawSpeakers: [
        buildRawSpeaker({
          speaker_id: "spk_002",
          speaker_index: 2,
          display_name: "spk_002",
          speaker_label: "spk_002",
          assigned_name: "Marco Nunez",
          speaker_role: "attorney",
        }),
      ],
      overlay: [],
    });

    expect(result.participants).toEqual([
      expect.objectContaining({
        participantId: "raw:spk_002",
        role: "attorney",
        label: "Marco Nunez",
        name: "Marco Nunez",
        honorific: "",
        speakerIndices: [2],
        rawSpeakerIds: ["spk_002"],
      }),
    ]);
    expect(result.bySpeakerIndex.get(2)).toBe(result.participants[0]);
  });

  it("groups aliased raw speakers into one participant", () => {
    const result = resolveSpeakers({
      rawSpeakers: [
        buildRawSpeaker({ speaker_id: "spk_002", speaker_index: 2 }),
        buildRawSpeaker({ speaker_id: "spk_005", speaker_index: 5 }),
        buildRawSpeaker({ speaker_id: "spk_007", speaker_index: 7 }),
      ],
      overlay: [
        buildOverlayRow({ id: "ovl_002", participant_id: "pty_nunez", raw_speaker_id: "spk_002", raw_speaker_index: 2 }),
        buildOverlayRow({ id: "ovl_005", participant_id: "pty_nunez", raw_speaker_id: "spk_005", raw_speaker_index: 5 }),
        buildOverlayRow({ id: "ovl_007", participant_id: "pty_nunez", raw_speaker_id: "spk_007", raw_speaker_index: 7 }),
      ],
    });

    expect(result.participants).toHaveLength(1);
    expect(result.participants[0]).toEqual(
      expect.objectContaining({
        participantId: "pty_nunez",
        role: "examining_attorney",
        label: "MR. NUNEZ",
        honorific: "MR",
        name: "Nunez",
        speakerIndices: [2, 5, 7],
        rawSpeakerIds: ["spk_002", "spk_005", "spk_007"],
      }),
    );
    expect(result.bySpeakerIndex.get(2)).toBe(result.participants[0]);
    expect(result.bySpeakerIndex.get(5)).toBe(result.participants[0]);
    expect(result.bySpeakerIndex.get(7)).toBe(result.participants[0]);
  });

  it("mixes overlay-driven and raw fallback speakers", () => {
    const result = resolveSpeakers({
      rawSpeakers: [
        buildRawSpeaker({
          speaker_id: "spk_001",
          speaker_index: 1,
          assigned_name: "THE REPORTER",
          speaker_role: "reporter",
        }),
        buildRawSpeaker({
          speaker_id: "spk_002",
          speaker_index: 2,
          assigned_name: "Speaker Two",
          speaker_role: "other",
        }),
      ],
      overlay: [
        buildOverlayRow({
          participant_id: "pty_witness",
          raw_speaker_id: "spk_002",
          raw_speaker_index: 2,
          resolved_label: "DR. THOMAS",
          resolved_role: "witness",
        }),
      ],
    });

    expect(result.participants).toEqual([
      expect.objectContaining({
        participantId: "raw:spk_001",
        role: "reporter",
        label: "THE REPORTER",
        speakerIndices: [1],
      }),
      expect.objectContaining({
        participantId: "pty_witness",
        role: "witness",
        label: "DR. THOMAS",
        speakerIndices: [2],
      }),
    ]);
  });

  it("feeds buildIndexMap unchanged", () => {
    const resolved = resolveSpeakers({
      rawSpeakers: [
        buildRawSpeaker({ speaker_id: "spk_002", speaker_index: 2 }),
        buildRawSpeaker({ speaker_id: "spk_005", speaker_index: 5 }),
        buildRawSpeaker({ speaker_id: "spk_009", speaker_index: 9 }),
      ],
      overlay: [
        buildOverlayRow({ participant_id: "pty_nunez", raw_speaker_id: "spk_002", raw_speaker_index: 2 }),
        buildOverlayRow({ participant_id: "pty_nunez", raw_speaker_id: "spk_005", raw_speaker_index: 5 }),
        buildOverlayRow({
          participant_id: "pty_thomas",
          raw_speaker_id: "spk_009",
          raw_speaker_index: 9,
          resolved_label: "DR. THOMAS",
          resolved_role: "witness",
        }),
      ],
    });

    const indexMap = buildIndexMap(resolved.participants);

    expect(indexMap.get(2)?.qaMode).toBe("Q");
    expect(indexMap.get(5)?.label).toBe("MR. NUNEZ");
    expect(indexMap.get(9)).toEqual({
      role: "witness",
      name: "Thomas",
      honorific: "DR",
      label: "DR. THOMAS",
      qaMode: "A",
    });
  });

  it("is deterministic for identical input", () => {
    const rawSpeakers = [
      buildRawSpeaker({ speaker_id: "spk_005", speaker_index: 5 }),
      buildRawSpeaker({ speaker_id: "spk_002", speaker_index: 2 }),
    ];
    const overlay = [
      buildOverlayRow({ participant_id: "pty_nunez", raw_speaker_id: "spk_005", raw_speaker_index: 5 }),
      buildOverlayRow({ participant_id: "pty_nunez", raw_speaker_id: "spk_002", raw_speaker_index: 2 }),
    ];

    const first = resolveSpeakers({ rawSpeakers, overlay });
    const second = resolveSpeakers({ rawSpeakers, overlay });

    expect(first.participants).toEqual(second.participants);
    expect([...first.bySpeakerIndex.entries()]).toEqual([...second.bySpeakerIndex.entries()]);
  });
});
