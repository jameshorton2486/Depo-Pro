// Gate 0 P3 — regression: the legacy loadTranscriptSnapshot loader must retrieve the full
// row set past PostgREST's default 1000-row cap. Exercises the extracted pagination helper
// with a fake page runner simulating a >1000-row table, so no live Supabase is needed.
import { describe, expect, it, vi } from "vitest";
import { fetchAllRowsPaginated, TRANSCRIPT_ROW_PAGE_SIZE } from "./transcriptRepository";

// A fake table of N rows served through .range(from, to) semantics (inclusive bounds).
function fakeRunner(total: number) {
  const table = Array.from({ length: total }, (_, i) => ({ id: i }));
  return vi.fn(async (from: number, to: number) => ({
    data: table.slice(from, to + 1),
    error: null as unknown,
  }));
}

describe("fetchAllRowsPaginated", () => {
  it("retrieves every row past the 1000-row cap (2500 rows over 3 pages)", async () => {
    const run = fakeRunner(2500);
    const rows = (await fetchAllRowsPaginated(run)) as Array<{ id: number }>;
    expect(rows).toHaveLength(2500);
    expect(rows[0].id).toBe(0);
    expect(rows[2499].id).toBe(2499); // tail not dropped
    // 3 pages: [0..999], [1000..1999], [2000..2499] (short page ends the loop).
    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenNthCalledWith(1, 0, TRANSCRIPT_ROW_PAGE_SIZE - 1);
    expect(run).toHaveBeenNthCalledWith(3, 2000, 2999);
  });

  it("stops after a single short page", async () => {
    const run = fakeRunner(10);
    const rows = await fetchAllRowsPaginated(run);
    expect(rows).toHaveLength(10);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("returns empty for an empty table", async () => {
    const run = fakeRunner(0);
    expect(await fetchAllRowsPaginated(run)).toEqual([]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("makes exactly one extra page when the total is an exact multiple of the page size", async () => {
    const run = fakeRunner(TRANSCRIPT_ROW_PAGE_SIZE);
    const rows = await fetchAllRowsPaginated(run);
    expect(rows).toHaveLength(TRANSCRIPT_ROW_PAGE_SIZE);
    // Full first page forces a second (empty) page to confirm the end.
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("throws on a page error without swallowing it", async () => {
    const run = vi.fn(async () => ({ data: null, error: new Error("boom") }));
    await expect(fetchAllRowsPaginated(run)).rejects.toThrow("boom");
  });
});
