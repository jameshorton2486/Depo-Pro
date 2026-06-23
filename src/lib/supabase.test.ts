import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const getSession = vi.fn();
const getUser = vi.fn();
const setSession = vi.fn();
const signOut = vi.fn();
const onAuthStateChange = vi.fn();

let authStateListener: ((event: string, session: Session | null) => void) | null = null;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession,
      getUser,
      setSession,
      signOut,
      onAuthStateChange: onAuthStateChange.mockImplementation((listener) => {
        authStateListener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  })),
}));

function buildSession(): Session {
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
      created_at: "2026-06-22T00:00:00.000Z",
    },
  };
}

describe("supabase auth bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    authStateListener = null;
    getSession.mockReset();
    getUser.mockReset();
    setSession.mockReset();
    signOut.mockReset();
    onAuthStateChange.mockReset();
  });

  it("does not keep returning the initial null bootstrap session after sign-in", async () => {
    const session = buildSession();
    getSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session }, error: null })
      .mockResolvedValueOnce({ data: { session }, error: null });
    getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    const mod = await import("./supabase");

    await expect(mod.initializeSupabaseSession()).resolves.toBeNull();
    expect(authStateListener).not.toBeNull();

    authStateListener?.("SIGNED_IN", session);

    await expect(mod.getSupabaseClient("listRecentCases")).resolves.toBe(mod.supabase);
    await expect(mod.getSupabaseAccessToken()).resolves.toBe("access-token");
  });

  it("clears a stale local session when Supabase rejects it as invalid", async () => {
    const session = buildSession();
    getSession.mockResolvedValue({ data: { session }, error: null });
    getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: "JWT expired" },
    });
    signOut.mockResolvedValue({ error: null });

    const mod = await import("./supabase");

    await expect(mod.initializeSupabaseSession()).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mod.getAuthSnapshot().session).toBeNull();
  });
});
