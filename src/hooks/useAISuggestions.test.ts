import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptAISuggestion,
  acceptAllAISuggestions,
  loadAISuggestions,
  rejectAISuggestion,
} from "./useAISuggestions";

const { workspaceApiMock } = vi.hoisted(() => ({
  workspaceApiMock: {
    getAISuggestions: vi.fn(),
    resolveAISuggestion: vi.fn(),
    acceptAllAISuggestions: vi.fn(),
  },
}));

vi.mock("../api/workspaceService", () => ({
  workspaceApi: workspaceApiMock,
}));

describe("useAISuggestions helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads pending suggestions", async () => {
    workspaceApiMock.getAISuggestions.mockResolvedValue([{ word_id: "w1" }]);

    const result = await loadAISuggestions("tr_1");

    expect(workspaceApiMock.getAISuggestions).toHaveBeenCalledWith("tr_1");
    expect(result).toEqual([{ word_id: "w1" }]);
  });

  it("accepts, rejects, and accepts all suggestions", async () => {
    workspaceApiMock.resolveAISuggestion.mockResolvedValue({ ok: true });
    workspaceApiMock.acceptAllAISuggestions.mockResolvedValue({ accepted_count: 2 });

    await acceptAISuggestion("tr_1", "w1");
    await rejectAISuggestion("tr_1", "w2");
    await acceptAllAISuggestions("tr_1");

    expect(workspaceApiMock.resolveAISuggestion).toHaveBeenNthCalledWith(1, "tr_1", "w1", { action: "accept" });
    expect(workspaceApiMock.resolveAISuggestion).toHaveBeenNthCalledWith(2, "tr_1", "w2", { action: "reject" });
    expect(workspaceApiMock.acceptAllAISuggestions).toHaveBeenCalledWith("tr_1");
  });
});
