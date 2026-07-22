import { describe, expect, it } from "vitest";

import { classifyDepositionRegions } from "./depositionRegionEngine";

describe("depositionRegionEngine", () => {
  it("classifies caption, proceedings, testimony, and certification regions in sequence", () => {
    const regions = classifyDepositionRegions([
      { utteranceId: "u1", text: "CAUSE NO. 2026-CV-1042" },
      { utteranceId: "u2", text: "THE STATE OF TEXAS" },
      { utteranceId: "u2b", text: "COUNTY OF BEXAR" },
      { utteranceId: "u2c", text: "JORDAN ALVAREZ," },
      { utteranceId: "u3", text: "PROCEEDINGS" },
      { utteranceId: "u4", text: "We are on the record." },
      { utteranceId: "u5", text: "(Whereupon, the deposition commenced at 1:27 p.m.)" },
      { utteranceId: "u6", text: "EXAMINATION" },
      { utteranceId: "u7", text: "Q." },
      { utteranceId: "u8", text: "CHANGES AND SIGNATURE" },
      { utteranceId: "u9", text: "THE STATE OF TEXAS" },
      { utteranceId: "u10", text: "CAUSE NO. 2026-CV-1042" },
    ]);

    expect(regions.get("u1")).toBe("CAPTION");
    expect(regions.get("u2")).toBe("CAPTION");
    expect(regions.get("u2b")).toBe("CAPTION");
    expect(regions.get("u2c")).toBe("CAPTION");
    expect(regions.get("u3")).toBe("PROCEEDINGS");
    expect(regions.get("u4")).toBe("PROCEEDINGS");
    expect(regions.get("u5")).toBe("TESTIMONY");
    expect(regions.get("u6")).toBe("TESTIMONY");
    expect(regions.get("u7")).toBe("TESTIMONY");
    expect(regions.get("u8")).toBe("CERTIFICATION");
    expect(regions.get("u9")).toBe("CERTIFICATION");
    expect(regions.get("u10")).toBe("CERTIFICATION");
  });
});
