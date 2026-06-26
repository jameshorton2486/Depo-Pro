import { describe, expect, it } from "vitest";

import { getSpeakerClusterBadgeLabel } from "./SpeakerPanel";

describe("SpeakerPanel", () => {
  it("renders a CUSTOM badge label for synthetic speakers", () => {
    expect(getSpeakerClusterBadgeLabel({
      speaker_id: "spk_custom",
      display_name: "THE VIDEOGRAPHER",
      deepgram_speaker: null,
      role: "OTHER",
    })).toBe("CUSTOM");
  });

  it("renders a numbered SPK badge label for diarized speakers", () => {
    expect(getSpeakerClusterBadgeLabel({
      speaker_id: "spk_001",
      display_name: "Speaker 1",
      deepgram_speaker: 1,
      role: "OTHER",
    })).toBe("SPK 1");
  });
});
