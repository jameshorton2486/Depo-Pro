import { describe, expect, it } from "vitest";

import { getDevAuthBypassConfig } from "./supabase";

describe("getDevAuthBypassConfig", () => {
  it("stays disabled when the bypass flag is unset or false", () => {
    expect(getDevAuthBypassConfig({ DEV: true })).toEqual({
      enabled: false,
      email: null,
      password: null,
    });

    expect(getDevAuthBypassConfig({
      DEV: true,
      VITE_DEV_AUTH_BYPASS: "false",
      VITE_DEV_AUTH_BYPASS_EMAIL: "dev@example.com",
      VITE_DEV_AUTH_BYPASS_PASSWORD: "secret",
    })).toEqual({
      enabled: false,
      email: "dev@example.com",
      password: "secret",
    });
  });

  it("supplies the fixed dev identity credentials when the bypass flag is on in dev", () => {
    expect(getDevAuthBypassConfig({
      DEV: true,
      VITE_DEV_AUTH_BYPASS: "true",
      VITE_DEV_AUTH_BYPASS_EMAIL: "dev@example.com",
      VITE_DEV_AUTH_BYPASS_PASSWORD: "dev-password",
    })).toEqual({
      enabled: true,
      email: "dev@example.com",
      password: "dev-password",
    });
  });
});
