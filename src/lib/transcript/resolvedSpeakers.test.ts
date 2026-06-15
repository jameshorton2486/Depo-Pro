import { describe, expect, it } from "vitest";

import type { TranscriptSpeakerRow } from "../../api/transcriptRepository";
import type { Database } from "../../types/database";
import {
  buildParticipantId,
  buildResolvedSpeakerViews,
  isResolvedSpeakerMappingComplete,
} from "./resolvedSpeakers";

type SpeakerResolutionCurrentRow =
  Database["public"]["Tables"]["speaker_resolution_current"]["Row"];

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

function buildOverlayRow(overrides: Partial<SpeakerResolutionCurrentRow>): SpeakerResolutionCurrentRow {
  return {
    created_at: "2026-06-15T00:00:00Z",
    id: "overlay-row",
    owner_user_id: "owner_001",
    participant_id: "pty_attorney_mr_nunez",
    raw_speaker_id: "spk_000",
    raw_speaker_index: 0,
    resolved_at: "2026-06-15T00:00:00Z",
    resolved_by: "user_001",
    resolved_label: "MR. NUNEZ",
    resolved_role: "attorney",
    transcript_id: "tr_001",
    updated_at: "2026-06-15T00:00:00Z",
    ...overrides,
  };
}

describe("resolvedSpeakers", () => {
  it("preserves the current panel view when the overlay is empty", () => {
    const resolved = buildResolvedSpeakerViews([
      buildRawSpeaker({
        speaker_id: "spk_002",
        speaker_index: 2,
        display_name: "Speaker 2",
        speaker_label: "Speaker 2",
        assigned_name: "Speaker 2",
        speaker_role: "attorney",
      }),
    ], []);

    expect(resolved).toEqual([
      expect.objectContaining({
        participantId: "raw:spk_002",
        speaker_id: "raw:spk_002",
        display_name: "Speaker 2",
        role: "ATTORNEY",
        rawSpeakerIds: ["spk_002"],
        speakerIndices: [2],
      }),
    ]);
  });

  it("normalizes participant ids from resolved labels rather than raw speaker ids", () => {
    expect(buildParticipantId("ATTORNEY", "MR. NUNEZ")).toBe("pty_attorney_mr_nunez");
    expect(buildParticipantId("ATTORNEY", "Mr. Nunez")).toBe("pty_attorney_mr_nunez");
    expect(buildParticipantId("ATTORNEY", "Speaker 2")).not.toBe("pty_attorney_mr_nunez");
  });

  it("counts resolved participants rather than raw labels for confirmation", () => {
    const resolved = buildResolvedSpeakerViews([
      buildRawSpeaker({ speaker_id: "spk_002", speaker_index: 2 }),
      buildRawSpeaker({ speaker_id: "spk_005", speaker_index: 5 }),
    ], [
      buildOverlayRow({ raw_speaker_id: "spk_002", raw_speaker_index: 2 }),
      buildOverlayRow({ raw_speaker_id: "spk_005", raw_speaker_index: 5 }),
    ]);

    expect(resolved).toHaveLength(1);
    expect(isResolvedSpeakerMappingComplete(resolved)).toBe(true);
  });
});
