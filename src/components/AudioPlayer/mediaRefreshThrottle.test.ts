import { describe, expect, it } from "vitest";

import { MEDIA_REFRESH_THROTTLE_MS, shouldRefreshMediaUrl } from "./mediaRefreshThrottle";

describe("shouldRefreshMediaUrl", () => {
  it("allows the first refresh attempt", () => {
    expect(shouldRefreshMediaUrl(null, 1_000)).toBe(true);
  });

  it("blocks attempts inside the throttle window", () => {
    expect(shouldRefreshMediaUrl(1_000, 1_000 + MEDIA_REFRESH_THROTTLE_MS - 1)).toBe(false);
  });

  it("allows attempts once the throttle window elapses", () => {
    expect(shouldRefreshMediaUrl(1_000, 1_000 + MEDIA_REFRESH_THROTTLE_MS)).toBe(true);
  });
});
