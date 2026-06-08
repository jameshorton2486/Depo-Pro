import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFirm, searchFirms } from "./firmService";
import { resetMockDirectoryStore } from "../mocks/directoryStore";

const getSupabaseClientMock = vi.fn();
const isMockModeMock = vi.fn(() => false);

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
}));

vi.mock("../lib/runtime/mode", () => ({
  isMockMode: () => isMockModeMock(),
}));

describe("firmService mock mode", () => {
  beforeEach(() => {
    getSupabaseClientMock.mockReset();
    isMockModeMock.mockReset();
    isMockModeMock.mockReturnValue(false);
    resetMockDirectoryStore();
  });

  it("returns linked firm fixtures in mock mode without hitting Supabase", async () => {
    isMockModeMock.mockReturnValue(true);

    const firm = await getFirm("firm_mock_1");

    expect(getSupabaseClientMock).not.toHaveBeenCalled();
    expect(firm?.name).toBe("Brothers, Alvarado, Piazza & Cozort, P.C.");
    expect(firm?.city).toBe("San Antonio");
  });

  it("searches firm fixtures in mock mode without hitting Supabase", async () => {
    isMockModeMock.mockReturnValue(true);

    const firms = await searchFirms("Bardot");

    expect(getSupabaseClientMock).not.toHaveBeenCalled();
    expect(firms.map((firm) => firm.name)).toEqual(["Bardot Reporting, LLC"]);
  });
});
