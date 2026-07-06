// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const renderSpy = vi.fn();
const createRootSpy = vi.fn(() => ({ render: renderSpy }));
const configureClientSpy = vi.fn();
const initializeSupabaseSessionSpy = vi.fn();

let authListener: ((event: string, session: Session | null) => void) | null = null;

vi.mock("react-dom/client", () => ({
  createRoot: createRootSpy,
}));

vi.mock("./components/DepoEditor", () => ({
  DepoEditor: () => null,
}));

vi.mock("./api/client", () => ({
  configureClient: configureClientSpy,
}));

vi.mock("./lib/runtime/mode", () => ({
  isMockMode: () => false,
  isRealApiMode: () => false,
}));

vi.mock("./lib/supabase", () => ({
  initializeSupabaseSession: initializeSupabaseSessionSpy,
  supabase: {
    auth: {
      onAuthStateChange: (listener: (event: string, session: Session | null) => void) => {
        authListener = listener;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
    },
  },
}));

function buildSession(overrides?: Partial<Session>): Session {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    expires_at: 1_717_171_717,
    token_type: "bearer",
    user: {
      id: "user-1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-07-06T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("mountEditor auth-driven rerender guard", () => {
  beforeEach(() => {
    vi.resetModules();
    renderSpy.mockClear();
    createRootSpy.mockClear();
    configureClientSpy.mockClear();
    initializeSupabaseSessionSpy.mockReset();
    initializeSupabaseSessionSpy.mockResolvedValue(buildSession());
    authListener = null;
    document.body.innerHTML = '<div id="mount-root"></div>';
    delete window.DEPO_EDITOR_CONFIG;
    delete window.mountEditor;
  });

  it("ignores auth events when the effective session key is unchanged", async () => {
    const mod = await import("./main");

    await mod.mountEditor({
      mountSelector: "#mount-root",
      apiBaseUrl: "http://example.test",
      supabaseAccessToken: "access-token",
      supabaseRefreshToken: "refresh-token",
    });

    expect(createRootSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(authListener).not.toBeNull();

    authListener?.("TOKEN_REFRESHED", buildSession({
      access_token: "new-access-token",
      refresh_token: "refresh-token",
    }));

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it("rerenders when the effective session key changes", async () => {
    const mod = await import("./main");

    await mod.mountEditor({
      mountSelector: "#mount-root",
      apiBaseUrl: "http://example.test",
      supabaseAccessToken: "access-token",
      supabaseRefreshToken: "refresh-token",
    });

    authListener?.("SIGNED_IN", buildSession({
      refresh_token: "different-refresh-token",
    }));

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
