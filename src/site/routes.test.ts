import { describe, expect, it } from "vitest";
import { resolveSiteRoute } from "./routes";

describe("resolveSiteRoute", () => {
  it("resolves every public route", () => {
    expect(resolveSiteRoute("/")).toBe("home");
    expect(resolveSiteRoute("/features/")).toBe("features");
    expect(resolveSiteRoute("/pricing")).toBe("pricing");
    expect(resolveSiteRoute("/checkout")).toBe("checkout");
    expect(resolveSiteRoute("/help")).toBe("help");
    expect(resolveSiteRoute("/privacy")).toBe("privacy");
    expect(resolveSiteRoute("/terms")).toBe("terms");
    expect(resolveSiteRoute("/live")).toBe("live");
    expect(resolveSiteRoute("/account")).toBe("account");
    expect(resolveSiteRoute("/app")).toBe("workspace");
  });

  it("falls back safely to the public home page", () => {
    expect(resolveSiteRoute("/unknown")).toBe("home");
  });
});
