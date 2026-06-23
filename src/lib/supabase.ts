import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase =
  hasSupabaseEnv
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!hasSupabaseEnv) {
  console.error("Supabase env vars missing — see .env.example");
}

export class AuthRequiredError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

type AuthSnapshot = {
  loading: boolean;
  session: Session | null;
};

const listeners = new Set<() => void>();
let authBootstrapPromise: Promise<Session | null> | null = null;
let authSnapshot: AuthSnapshot = {
  loading: hasSupabaseEnv,
  session: null,
};

function emitAuthSnapshot() {
  for (const listener of listeners) {
    listener();
  }
}

function setAuthSnapshot(next: AuthSnapshot) {
  authSnapshot = next;
  emitAuthSnapshot();
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    authBootstrapPromise = null;
    setAuthSnapshot({ loading: false, session });
  });
}

export function getAuthSnapshot(): AuthSnapshot {
  return authSnapshot;
}

export function subscribeAuthState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function initializeSupabaseSession(tokens?: {
  accessToken?: string;
  refreshToken?: string;
}) {
  if (!supabase) {
    setAuthSnapshot({ loading: false, session: null });
    return null;
  }

  if (tokens?.accessToken && tokens?.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (error) {
      throw error;
    }
    const session = await validateSupabaseSession(data.session);
    setAuthSnapshot({ loading: false, session });
    return session;
  }

  return ensureSupabaseSession();
}

function isInvalidSessionError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (status === 401 || status === 403) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("jwt")
    || normalized.includes("session")
    || normalized.includes("refresh token")
    || normalized.includes("invalid claim")
    || normalized.includes("auth")
  );
}

async function clearLocalSupabaseSession() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    console.warn("[DEPO-PRO] Failed to clear local Supabase session:", error);
  }

  authBootstrapPromise = null;
  setAuthSnapshot({ loading: false, session: null });
}

async function validateSupabaseSession(session: Session | null): Promise<Session | null> {
  if (!supabase || !session) {
    return session;
  }

  const { data, error } = await supabase.auth.getUser(session.access_token);
  if (error) {
    if (!isInvalidSessionError(error)) {
      throw error;
    }

    await clearLocalSupabaseSession();
    return null;
  }

  if (!data.user) {
    await clearLocalSupabaseSession();
    return null;
  }

  return session;
}

async function ensureSupabaseSession(): Promise<Session | null> {
  if (!supabase) {
    setAuthSnapshot({ loading: false, session: null });
    return null;
  }

  if (authBootstrapPromise) {
    return authBootstrapPromise;
  }

  authBootstrapPromise = (async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }

    const session = await validateSupabaseSession(sessionData.session ?? null);
    setAuthSnapshot({ loading: false, session });
    return session;
  })();

  try {
    return await authBootstrapPromise;
  } catch (error) {
    setAuthSnapshot({ loading: false, session: null });
    throw error;
  } finally {
    authBootstrapPromise = null;
  }
}

export async function signOutSupabaseSession() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const session = await ensureSupabaseSession();
  return session?.access_token ?? null;
}

if (typeof window !== "undefined" && import.meta.env.MODE !== "test") {
  void ensureSupabaseSession();
}

export async function getSupabaseClient(operation: string) {
  if (!supabase) {
    throw new Error(
      `Supabase unavailable for ${operation}. Supabase env vars missing — see .env.example`
    );
  }
  const session = await ensureSupabaseSession();
  if (!session) {
    throw new AuthRequiredError(`Authentication is required for ${operation}.`);
  }
  return supabase;
}
