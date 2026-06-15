import { describe, expect, it } from "vitest";

import type { Database } from "./database";

describe("database speaker resolution overlay types", () => {
  it("exposes the current and history tables with the expected keys", () => {
    const currentRow: Database["public"]["Tables"]["speaker_resolution_current"]["Row"] = {
      id: "00000000-0000-0000-0000-000000000001",
      transcript_id: "tr_001",
      raw_speaker_id: "spk_002",
      raw_speaker_index: 2,
      participant_id: "pty_nunez",
      resolved_role: "examining_attorney",
      resolved_label: "MR. NUNEZ",
      resolved_by: "00000000-0000-0000-0000-000000000010",
      resolved_at: "2026-06-15T00:00:00Z",
      owner_user_id: "00000000-0000-0000-0000-000000000010",
      created_at: "2026-06-15T00:00:00Z",
      updated_at: "2026-06-15T00:00:00Z",
    };

    const historyRow: Database["public"]["Tables"]["speaker_resolution_history"]["Row"] = {
      resolution_id: "00000000-0000-0000-0000-000000000002",
      transcript_id: "tr_001",
      raw_speaker_id: "spk_005",
      raw_speaker_index: 5,
      participant_id: "pty_nunez",
      resolved_role: "examining_attorney",
      resolved_label: "MR. NUNEZ",
      resolved_by: "00000000-0000-0000-0000-000000000010",
      resolved_at: "2026-06-15T00:01:00Z",
      supersedes_resolution_id: null,
      owner_user_id: "00000000-0000-0000-0000-000000000010",
      created_at: "2026-06-15T00:01:00Z",
    };

    expect(currentRow.raw_speaker_id).toBe("spk_002");
    expect(historyRow.participant_id).toBe("pty_nunez");
  });
});
