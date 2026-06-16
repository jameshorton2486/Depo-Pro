import { describe, expect, it } from "vitest";

import { getDevAuthBypassConfig, getDevAuthMode } from "./supabase";

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

describe("getDevAuthMode", () => {
  it("stays disabled outside dev", () => {
    expect(getDevAuthMode({
      DEV: false,
      VITE_DEV_AUTH_BYPASS: "true",
      VITE_DEV_AUTH_BYPASS_EMAIL: "dev@example.com",
      VITE_DEV_AUTH_BYPASS_PASSWORD: "dev-password",
    })).toBe("disabled");
  });

  it("uses password bypass when explicitly enabled in dev", () => {
    expect(getDevAuthMode({
      DEV: true,
      VITE_DEV_AUTH_BYPASS: "true",
      VITE_DEV_AUTH_BYPASS_EMAIL: "dev@example.com",
      VITE_DEV_AUTH_BYPASS_PASSWORD: "dev-password",
    })).toBe("password-bypass");
  });

  it("uses password bypass automatically in dev when bypass credentials are present", () => {
    expect(getDevAuthMode({
      DEV: true,
      VITE_DEV_AUTH_BYPASS_EMAIL: "dev@example.com",
      VITE_DEV_AUTH_BYPASS_PASSWORD: "dev-password",
    })).toBe("password-bypass");
  });

  it("defaults to anonymous auth in dev when no explicit bypass path is available", () => {
    expect(getDevAuthMode({ DEV: true })).toBe("anonymous");
    expect(getDevAuthMode({
      DEV: true,
      VITE_DEV_AUTH_BYPASS: "false",
    })).toBe("anonymous");
  });
});
