import { describe, expect, it } from "vitest";
import { licensingApi } from "./licensingApi";

describe("licensing account safety", () => {
  it("fails safely before making a request when account services are not configured", async () => {
    await expect(licensingApi.entitlement()).rejects.toThrow("Account services are unavailable in this environment.");
  });
});
