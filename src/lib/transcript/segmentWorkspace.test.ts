import { describe, expect, it } from "vitest";

import { resolveSegmentWorkspaceSelection } from "./segmentWorkspace";

describe("resolveSegmentWorkspaceSelection", () => {
  it("returns completed segments in sequence order and defaults to the first segment", () => {
    const selection = resolveSegmentWorkspaceSelection([
      { transcript_id: "tr_002", sequence_index: 2, status: "completed" },
      { transcript_id: "tr_000", sequence_index: 0, status: "completed" },
      { transcript_id: "tr_001", sequence_index: 1, status: "completed" },
    ]);

    expect(selection.ordered.map((row) => row.transcript_id)).toEqual([
      "tr_000",
      "tr_001",
      "tr_002",
    ]);
    expect(selection.selected?.transcript_id).toBe("tr_000");
    expect(selection.previous).toBeNull();
    expect(selection.next?.transcript_id).toBe("tr_001");
  });

  it("moves prev and next around the selected segment", () => {
    const selection = resolveSegmentWorkspaceSelection([
      { transcript_id: "tr_000", sequence_index: 0, status: "completed" },
      { transcript_id: "tr_001", sequence_index: 1, status: "completed" },
      { transcript_id: "tr_002", sequence_index: 2, status: "completed" },
    ], "tr_001");

    expect(selection.selected?.transcript_id).toBe("tr_001");
    expect(selection.previous?.transcript_id).toBe("tr_000");
    expect(selection.next?.transcript_id).toBe("tr_002");
  });
});
