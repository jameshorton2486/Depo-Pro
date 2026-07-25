import { describe, expect, it } from "vitest";

import { classifyRecovery } from "./recoveryPolicy";

describe("classifyRecovery", () => {
  it("recovers a job stuck mid-pipeline (chunk responses are stored)", () => {
    expect(classifyRecovery("processing")).toEqual({ kind: "recover" });
    expect(classifyRecovery("finalizing")).toEqual({ kind: "recover" });
    expect(classifyRecovery("failed")).toEqual({ kind: "recover" });
  });

  it("is a no-op for an already-complete transcript", () => {
    expect(classifyRecovery("complete")).toEqual({
      kind: "noop",
      reason: "transcript is already complete",
    });
  });

  it("refuses to recover a never-transcribed job (nothing stored to rebuild)", () => {
    const decision = classifyRecovery("queued");
    expect(decision.kind).toBe("refuse");
    expect(decision.kind === "refuse" && decision.reason).toContain("has not been transcribed");
  });
});
